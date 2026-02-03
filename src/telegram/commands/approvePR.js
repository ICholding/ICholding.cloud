import { getSession, resetPending } from '../sessions.js';
import { octokit } from '../../github/client.js';
import { createBranchFromDefault, upsertFile, openPullRequest } from '../../github/pr.js';
import { createProgressContract } from '../progressContract.js';
import { startTask, assertNotStopped } from '../taskControl.js';

export default async (ctx) => {
  const text = ctx.message.text.trim();
  const prBranch = text.split(/\s+/)[1];

  const session = getSession(ctx.chat.id);
  
  if (!session.pending) {
    return ctx.reply('No pending PR. Run a task that generates a PR proposal first.', { parse_mode: 'Markdown' });
  }

  if (prBranch && session.pending.branch !== prBranch) {
     return ctx.reply(`Pending branch is \`${session.pending.branch}\`. Please approve with the correct branch name.`, { parse_mode: 'Markdown' });
  }

  const { owner, name: repo } = session.repo;
  const branch = session.pending.branch;

  const sendMessage = (chatId, text) => ctx.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  const editMessage = (chatId, messageId, text) => ctx.telegram.editMessageText(chatId, messageId, undefined, text, { parse_mode: 'Markdown' });

  startTask(ctx.chat.id, 'APPROVE', { branch });
  const progress = createProgressContract({ chatId: ctx.chat.id, sendMessage, editMessage });

  try {
    await progress.start(`Approving and Opening PR: ${branch}`);
    const pending = session.pending;
    
    assertNotStopped(ctx.chat.id);
    progress.phase(`Creating branch...`, 20);
    await createBranchFromDefault(owner, repo, branch);

    let step = 0;
    for (const ch of pending.changes) {
      step++;
      const pct = 20 + Math.floor((step / pending.changes.length) * 60);
      assertNotStopped(ctx.chat.id);
      progress.phase(`Updating \`${ch.path}\`...`, pct);
      await upsertFile(owner, repo, ch.path, ch.content, ch.message, branch);
    }

    assertNotStopped(ctx.chat.id);
    progress.phase('Opening Pull Request...', 90);
    const prUrl = await openPullRequest(owner, repo, pending.title, pending.body, branch);

    resetPending(ctx.chat.id);
    session.task = null;
    await progress.done(`PR successfully opened: ${prUrl}`);

  } catch (error) {
    if (error.code === 'TASK_STOPPED') return await progress.stopped();
    session.task = null;
    await progress.fail(error.message);
  }
};
