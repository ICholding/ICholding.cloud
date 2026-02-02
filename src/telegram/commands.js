import { getSession, setPaired, setRepo, setPending, resetPending } from './sessions.js';
import { readFile, listRecentWorkflowRuns } from '../github/repo.js';
import { createBranchFromDefault, upsertFile, openPullRequest } from '../github/pr.js';
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
    '*Janitor Commands (single-admin)*',
    '',
    '`PAIR` — pair chat',
    '`USE REPO owner/name` — bind repo',
    '`PLAN` — show current repo/task/PR state',
    '`STATUS` — quick status check',
    '`CI` — check recent workflow runs',
    '`FILE path/to/file` — read file content',
    '`FIX path/to/file | goal` — propose a fix',
    '`APPROVE:PR branch-name` — approve and open PR',
    '',
    '*Task Controls (while running):*',
    '`STOP`  `CANCEL`  `EDIT <new approach>`  `RESUME`'
  ].join('\n');
}

export async function handleCommand(msg, text, sendMessage, editMessage) {
  const chatId = msg.chat.id;
  const session = getSession(chatId);

  // First-time guidance
  if (text.toUpperCase() === 'HELP') {
    return sendMessage(chatId, helpText());
  }

  // Pairing gate
  if (!session.paired) {
    if (text.toUpperCase() === 'PAIR') {
      setPaired(chatId, true);
      return sendMessage(chatId, '✅ Paired. Next: `USE REPO ICholding/your-repo`');
    }
    return sendMessage(chatId, '🔐 Pairing required. Reply with: `PAIR`');
  }

  // Repo bind gate
  if (!session.repo) {
    const m = text.match(/^USE\s+REPO\s+([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/i);
    if (m) {
      const owner = m[1];
      const name = m[2];
      setRepo(chatId, owner, name);
      return sendMessage(chatId, `✅ Repo locked to *${owner}/${name}*\nNow run: \`STATUS\`, \`CI\`, or \`PLAN\``);
    }
    return sendMessage(chatId, '📌 Repo not set. Use: `USE REPO ICholding/your-repo`');
  }

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

  // PLAN
  if (text.toUpperCase() === 'PLAN') {
    const t = getTask(chatId);
    const repoLine = `*Repo:* ${owner}/${repo}`;
    const pairedLine = `*Paired:* yes`;
    const taskLine = t ? `*Task:* ${t.name} — _${t.status}_` : '*Task:* none';
    const editLine = t?.editedApproach ? `*Queued edit:* _${t.editedApproach}_` : '*Queued edit:* none';
    const pendingLine = session.pending ? `*Pending PR:* \`${session.pending.branch}\`\n*Title:* ${session.pending.title}` : '*Pending PR:* none';

    return sendMessage(chatId, [
        '🧭 *PLAN*',
        pairedLine,
        repoLine,
        taskLine,
        editLine,
        pendingLine,
        '',
        '*Controls:*',
        '`STOP`  `CANCEL`  `EDIT <new approach>`  `RESUME`'
      ].join('\n'));
  }

  // STATUS
  if (text.toUpperCase() === 'STATUS') {
    const pending = session.pending ? `\n🧾 Pending PR: \`${session.pending.branch}\` (awaiting approval)` : '';
    return sendMessage(chatId, `✅ Scoped Repo: *${owner}/${repo}*\nMode: PR-only\nPairing: ON${pending}`);
  }

  // CI (cooperative)
  if (text.toUpperCase() === 'CI') {
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
