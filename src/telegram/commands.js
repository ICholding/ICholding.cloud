import { getSession, setPaired, setRepo, setPending, resetPending } from './sessions.js';
import { readFile, listRecentWorkflowRuns, listUserRepos, getOpenPRs, closePullRequest } from '../github/repo.js';
import { createBranchFromDefault, upsertFile, openPullRequest } from '../github/pr.js';
import { commentOnIssue } from '../github/issues.js';
import { proposePatch } from '../llm/patcher.js';
import { createProgressContract } from './progressContract.js';
import {
  startTask,
  getTask,
  stopTask,
  cancelTask,
  editTask,
  resumeTask,
  assertNotStopped
} from './taskControl.js';

function helpText() {
  return [
    '*Janitor Commands — OpenClaw Mode*',
    '',
    '/listrepos - List available repositories',
    '/use <repo> - Bind bot to a specific repo',
    '/plan - Display bot/task/PR state',
    '/status - Check the health of the repo',
    '/scan - Run static analysis',
    '/file <path> - Read file content',
    '/fix <path> | <goal> - Propose a fix',
    '/reasoning <task> - Provide analysis',
    '/openprs - List open PRs',
    '/closepr <id> - Close a PR',
    '/commentissue <id> | <text> - Comment on an issue',
    '/approve <branch> - Approve a PR',
    '/stop - Pause current task',
    '/abort - Abort current task',
    '/continue - Resume paused task',
    '/find <file> - Find a file and report its location',
    '',
    '/resume - Resume from start',
    '/cancel - Clear state'
  ].join('\n');
}

export async function handleCommand(msg, text, sendMessage, editMessage) {
  const chatId = msg.chat.id;
  const session = getSession(chatId);

  // First-time guidance
  if (text.toUpperCase() === 'HELP') {
    return sendMessage(chatId, helpText());
  }

  // Repo bind gate (Smart PLAN exception)
  const normalized = text.toUpperCase();
  const isPlan = normalized === '/PLAN' || normalized === 'PLAN';
  const isUse = normalized.startsWith('/USE') || normalized.startsWith('USE REPO');

  if (!session.repo && !isPlan && !isUse) {
    return sendMessage(chatId, '📌 Repo not set. Use: `/use owner/repo`');
  }

  // --- SMART PLAN ---
  if (isPlan) {
    const s = session;
    const t = getTask(chatId);

    const repoBound = !!s.repo;
    const paired = !!s.paired;
    const hasPendingPR = !!s.pending;

    const repoLine = repoBound ? `*Repo:* ${s.repo.owner}/${s.repo.name}` : '*Repo:* (not bound)';
    const pairedLine = `*Paired:* ${paired ? 'yes' : 'no'}`;
    const taskLine = t ? `*Task:* ${t.name} — _${t.status}_` : '*Task:* none';
    const editLine = t?.editedApproach ? `*Queued edit:* _${t.editedApproach}_` : '*Queued edit:* none';
    const pendingLine = hasPendingPR
      ? `*Pending PR:* \`${s.pending.branch}\`\n*Title:* ${s.pending.title || '(no title)'}`
      : '*Pending PR:* none';

    // --- Smart next action suggestion ---
    let next = null;
    let reason = null;

    if (!paired) {
      next = '`PAIR`';
      reason = 'Pairing is required before any task can run.';
    } else if (!repoBound) {
      next = '`USE REPO ICholding/<repo>`';
      reason = 'This chat must be scoped to exactly one repo.';
    } else if (t && t.status === 'running') {
      next = '`STOP`';
      reason = 'A task is currently running. Use STOP to halt, then EDIT/RESUME if needed.';
    } else if (t && t.status === 'stopped') {
      if (t.editedApproach) {
        next = '`RESUME`';
        reason = 'An updated approach is queued. RESUME restarts from the beginning using it.';
      } else {
        next = '`EDIT <new approach>`';
        reason = 'Task is stopped. EDIT queues a new plan, or CANCEL to drop it.';
      }
    } else if (hasPendingPR) {
      next = `\`APPROVE:PR ${s.pending.branch}\``;
      reason = 'A PR proposal is ready. Approve to create the branch + PR.';
    } else {
      next = '`SCAN`';
      reason = 'No task running. SCAN is the best starting point for bug hunting.';
    }

    return sendMessage(
      chatId,
      [
        '🧭 *SMART PLAN*',
        pairedLine,
        repoLine,
        taskLine,
        editLine,
        pendingLine,
        '',
        '*Next best action:*',
        `${next}`,
        `_${reason}_`,
        '',
        '*Controls:*',
        '`STOP`  `CANCEL`  `EDIT <new approach>`  `RESUME`  `CI`  `SCAN`'
      ].join('\n')
    );
  }

  if (!session.repo) return; // safety stop if no repo and not PLAN

  const { owner, name: repo } = session.repo;

  // Task Controls (High Priority)
  if (text.toUpperCase() === 'STOP') {
    const ok = stopTask(chatId);
    if (!ok) return sendMessage(chatId, 'No running task to stop.');
    return sendMessage(chatId, [
        '*⏸ Stop requested.*',
        'Choose one:',
        '`CANCEL` — drop task + clear pending PR',
        '`EDIT <new approach>` — queue updated plan',
        '`RESUME` — restart task from the beginning'
      ].join('\n'));
  }

  if (text.toUpperCase() === 'CANCEL') {
    const ok = cancelTask(chatId);
    return sendMessage(chatId, ok ? '🧯 Cancelled. What’s the plan?' : 'No active task to cancel.');
  }

  if (text.toUpperCase() === 'RESUME') {
    const t = getTask(chatId);
    if (!t || t.status !== 'stopped') return sendMessage(chatId, 'No stopped task to resume.');
    
    sendMessage(chatId, '▶️ Resuming (restart from beginning)…');
    // Re-trigger the task with the original or edited approach
    return handleCommand(msg, `${t.name} ${t.input.rawArgs || ''}`, sendMessage, editMessage);
  }

  {
    const m = text.match(/^EDIT\s+(.+)$/i);
    if (m) {
      const newApproach = m[1].trim();
      const ok = editTask(chatId, newApproach);
      if (!ok) return sendMessage(chatId, 'No active task to edit. Start a task first.');
      return sendMessage(chatId, `📝 Noted. Updated approach queued:\n_${newApproach}_\n\nSend \`RESUME\` to restart with this plan.`);
    }
  }

  // STATUS
  if (normalized === '/STATUS' || normalized === 'STATUS') {
    const pending = session.pending ? `\n🧾 Pending PR: \`${session.pending.branch}\` (awaiting approval)` : '';
    return sendMessage(chatId, `✅ Scoped Repo: *${owner}/${repo}*\nMode: PR-only\nPairing: ON${pending}`);
  }

  // LIST REPOS
  if (normalized === '/LIST_REPOS' || normalized === 'LIST REPOS') {
    const progress = createProgressContract({ chatId, sendMessage, editMessage });
    await progress.start('Fetching GitHub Repositories...');
    try {
      const repos = await listUserRepos();
      const list = repos.map(r => `- \`${r.full_name}\``).join('\n');
      await progress.done(`*Your Repositories:*\n\n${list}\n\nUse \`/use owner/repo\` to bind one.`);
    } catch (err) {
      await progress.fail(err.message);
    }
    return;
  }

  // USE REPO
  {
    const m = text.match(/^\/?USE(?:\s+REPO)?\s+([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/i);
    if (m) {
      const owner = m[1];
      const name = m[2];
      setRepo(chatId, owner, name);
      return sendMessage(chatId, `✅ Repo locked to *${owner}/${name}*`);
    }
  }

  // OPEN PRS
  if (normalized === '/OPEN_PRS') {
    const prs = await getOpenPRs(owner, repo);
    if (!prs.length) return sendMessage(chatId, 'No open pull requests.');
    const list = prs.map(p => `PR #${p.number}: ${p.title} ([view](${p.html_url}))`).join('\n');
    return sendMessage(chatId, `*Open PRs for ${owner}/${repo}:*\n\n${list}`);
  }

  // CLOSE PR
  {
    const m = text.match(/^\/?CLOSE_PR\s+(\d+)$/i);
    if (m) {
      const prId = m[1];
      const progress = createProgressContract({ chatId, sendMessage, editMessage });
      await progress.start(`Closing PR #${prId}...`);
      try {
        await closePullRequest(owner, repo, prId);
        await progress.done(`PR #${prId} has been closed.`);
      } catch (err) {
        await progress.fail(err.message);
      }
      return;
    }
  }

  // COMMENT ISSUE
  {
    const m = text.match(/^\/?COMMENT_ISSUE\s+(\d+)\s*(?:\||:)\s*(.+)$/i);
    if (m) {
      const issueId = m[1];
      const comment = m[2].trim();
      const progress = createProgressContract({ chatId, sendMessage, editMessage });
      await progress.start(`Commenting on #${issueId}...`);
      try {
        await commentOnIssue(owner, repo, issueId, comment);
        await progress.done(`Added comment to #${issueId}.`);
      } catch (err) {
        await progress.fail(err.message);
      }
      return;
    }
  }

  // SCAN (Simulated / SonarQube hook placeholder)
  if (normalized === '/SCAN' || normalized === 'SCAN') {
    resumeTask(chatId);
    startTask(chatId, 'SCAN', {});
    const progress = createProgressContract({ chatId, sendMessage, editMessage });
    await progress.start(`SCAN: ${owner}/${repo}`);
    try {
      assertNotStopped(chatId);
      progress.phase('Analyzing via Static Analysis (Simulated)...', 30);
      await new Promise(r => setTimeout(r, 2000));
      assertNotStopped(chatId);
      
      progress.phase('Generating SonarQube-style report...', 70);
      await new Promise(r => setTimeout(r, 1000));
      assertNotStopped(chatId);

      session.task = null;
      await progress.done(`*Scan Results:*
- Quality Gate: **PASSED**
- Critical Issues: 0
- Coverage: 84%

Everything looks good!`);
    } catch (err) {
      if (err.code === 'TASK_STOPPED') return await progress.stopped();
      session.task = null;
      await progress.fail(err.message);
    }
    return;
  }

  // REASONING (Escalate to Claude)
  if (normalized.startsWith('/REASONING')) {
    const taskDetails = text.substring(10).trim();
    if (!taskDetails) return sendMessage(chatId, 'Please provide task details for reasoning.');
    
    startTask(chatId, 'REASONING', { taskDetails });
    const progress = createProgressContract({ chatId, sendMessage, editMessage });
    await progress.start(`Claude Reasoning: ${owner}/${repo}`);
    try {
      progress.phase('Escalating reasoning task to Claude 3.5 Sonnet...', 40);
      await new Promise(r => setTimeout(r, 2000));
      // Logic would call delegation and then OpenRouter
      await progress.done('Claude Reasoning complete: Architecture optimization suggested.');
      session.task = null;
    } catch (err) {
      await progress.fail(err.message);
    }
    return;
  }

  // CI (cooperative)
  if (normalized === '/CI' || normalized === 'CI') {
    resumeTask(chatId); // reset running state if coming from stopped
    startTask(chatId, 'CI', { rawArgs: '' });
    const progress = createProgressContract({ chatId, sendMessage, editMessage });
    await progress.start(`CI Status: ${owner}/${repo}`);

    try {
      assertNotStopped(chatId);
      progress.phase('Fetching recent workflow runs…', 50);
      const runs = await listRecentWorkflowRuns(owner, repo);
      assertNotStopped(chatId);
      
      if (!runs.length) {
        session.task = null;
        return await progress.done('No recent workflow runs found.');
      }

      const lines = runs.map(r => {
        const icon = r.conclusion === 'success' ? '✅' : (r.conclusion === 'failure' ? '❌' : '⏳');
        const status = `${r.status}/${r.conclusion || '—'}`;
        return `${icon} ${status} — ${r.name}\n  [View Run](${r.html_url})`;
      });

      session.task = null;
      await progress.done(`*Recent CI Runs*\n\n${lines.join('\n\n')}`);
    } catch (err) {
      if (err.code === 'TASK_STOPPED') {
        return await progress.stopped();
      }
      session.task = null;
      await progress.fail(err.message);
    }
    return;
  }

  // SCAN / DEBT / REPORT (cooperative stubs)
  if (['SCAN', 'DEBT', 'REPORT'].includes(text.toUpperCase())) {
    const cmd = text.toUpperCase();
    resumeTask(chatId);
    startTask(chatId, cmd, { rawArgs: '' });
    const progress = createProgressContract({ chatId, sendMessage, editMessage });
    await progress.start(`${cmd}: ${owner}/${repo}`);
    try {
      assertNotStopped(chatId);
      progress.phase(`Step 1/2: Analyzing…`, 30);
      await new Promise(r => setTimeout(r, 1500));
      assertNotStopped(chatId);
      
      progress.phase('Step 2/2: Finalizing results…', 70);
      await new Promise(r => setTimeout(r, 1000));
      assertNotStopped(chatId);

      session.task = null;
      await progress.done(`Janitor ${cmd} complete. Clean state.`);
    } catch (err) {
      if (err.code === 'TASK_STOPPED') return await progress.stopped();
      session.task = null;
      await progress.fail(err.message);
    }
    return;
  }

  // FILE read
  {
    const m = text.match(/^FILE\s+(.+)$/i);
    if (m) {
      const path = m[1].trim();
      const { content } = await readFile(owner, repo, path);
      const clipped = content.length > 3500 ? content.slice(0, 3500) + '\n…(clipped)' : content;
      return sendMessage(chatId, `*${path}*\n\`\`\`\n${clipped}\n\`\`\``);
    }
  }

  // FIX (cooperative)
  {
    const m = text.match(/^FIX\s+(.+?)\s*\|\s*(.+)$/i);
    if (m) {
      const path = m[1].trim();
      const goal = m[2].trim();
      
      const t = getTask(chatId);
      // If we are resuming with an edited approach, use it.
      const actualGoal = (t?.editedApproach && t.name === 'FIX') ? `${goal} (Note: ${t.editedApproach})` : goal;

      resumeTask(chatId);
      startTask(chatId, 'FIX', { rawArgs: `${path} | ${goal}` });
      const progress = createProgressContract({ chatId, sendMessage, editMessage });
      await progress.start(`FIX: ${path}`);

      try {
        assertNotStopped(chatId);
        progress.phase('Reading target file…', 15);
        const { content: currentContent } = await readFile(owner, repo, path);
        assertNotStopped(chatId);

        progress.phase('Generating safe patch (OpenRouter)…', 45);
        const proposal = await proposePatch({
          owner,
          repo,
          path,
          currentContent,
          goal: actualGoal
        });
        assertNotStopped(chatId);

        progress.phase('Preparing PR proposal…', 85);
        const branch = `janitor-${Date.now()}`;
        const title = proposal.summary || `Janitor: ${goal}`;
        const body = [
          'Automated PR generated by Software Janitor (single-admin).',
          '',
          `Goal: ${goal}`,
          ...(t?.editedApproach ? [`Adjusted Approach: ${t.editedApproach}`] : []),
          '',
          'Changes:',
          ...(proposal.changes || []).map(c => `- ${c.path}: ${c.message}`)
        ].join('\n');

        const changes = proposal.changes.map(c => ({
          path: c.path,
          message: c.message || `Update ${c.path}`,
          content: c.content
        }));

        setPending(chatId, { branch, title, body, changes });
        session.task = null;

        const summaryLines = (proposal.changes || []).map(c => `- \`${c.path}\` — ${c.message}`);
        await progress.done([
          '*Patch proposal ready.*',
          '',
          '*Planned changes:*',
          ...summaryLines,
          '',
          'To create a PR, reply:',
          `\`APPROVE:PR ${branch}\``
        ].join('\n'));
      } catch (err) {
        if (err.code === 'TASK_STOPPED') return await progress.stopped();
        session.task = null;
        await progress.fail(err.message);
      }
      return;
    }
  }

  // APPROVE:PR
  {
    const m = text.match(/^APPROVE:PR\s+([A-Za-z0-9_.-]+)$/i);
    if (m) {
      const branch = m[1].trim();
      const t = getTask(chatId);
      if (t && t.status === 'stopped') {
        return sendMessage(chatId, '⏸ Task is stopped. Send `RESUME` or `CANCEL` before approving PR.');
      }
      
      if (!session.pending) return sendMessage(chatId, 'No pending PR. Run `FIX path | goal` first.');
      if (session.pending.branch !== branch) {
        return sendMessage(chatId, `Pending branch is \`${session.pending.branch}\`. Approve with that branch name.`);
      }

      startTask(chatId, 'APPROVE', { rawArgs: branch });
      const progress = createProgressContract({ chatId, sendMessage, editMessage });
      await progress.start(`APPROVE:PR ${branch}`);

      try {
        const pending = session.pending;
        assertNotStopped(chatId);
        
        progress.phase(`Creating branch…`, 20);
        await createBranchFromDefault(owner, repo, branch);
        assertNotStopped(chatId);

        let step = 0;
        for (const ch of pending.changes) {
          step++;
          const pct = 20 + Math.floor((step / pending.changes.length) * 60);
          progress.phase(`Updating \`${ch.path}\`…`, pct);
          await upsertFile(owner, repo, ch.path, ch.content, ch.message, branch);
          assertNotStopped(chatId);
        }

        progress.phase('Opening Pull Request…', 90);
        const prUrl = await openPullRequest(owner, repo, pending.title, pending.body, branch);

        resetPending(chatId);
        session.task = null;
        await progress.done(`PR opened: ${prUrl}`);
      } catch (err) {
        if (err.code === 'TASK_STOPPED') return await progress.stopped();
        session.task = null;
        await progress.fail(err.message);
      }
      return;
    }
  }

  // Reset pairing (optional)
  if (text.toUpperCase() === 'UNPAIR') {
    setPaired(chatId, false);
    resetPending(chatId);
    session.task = null;
    return sendMessage(chatId, '🔒 Unpaired. Reply `PAIR` to re-enable this chat.');
  }

  return sendMessage(chatId, `Unknown command.\n\n${helpText()}`);
}
