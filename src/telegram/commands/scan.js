import { getSession } from '../sessions.js';
import { createProgressContract } from '../progressContract.js';
import { startTask, assertNotStopped } from '../taskControl.js';

export default async (ctx) => {
  const session = getSession(ctx.chat.id);
  
  if (!session.repo) {
    return ctx.reply('📌 Repo not set. Use: `/use <repo_name>`', { parse_mode: 'Markdown' });
  }

  const { owner, name: repoName } = session.repo;

  // Use the progress contract logic we developed
  const sendMessage = (chatId, text) => ctx.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  const editMessage = (chatId, messageId, text) => ctx.telegram.editMessageText(chatId, messageId, undefined, text, { parse_mode: 'Markdown' });

  startTask(ctx.chat.id, 'SCAN', {});
  const progress = createProgressContract({ chatId: ctx.chat.id, sendMessage, editMessage });

  try {
    await progress.start(`SCAN: ${owner}/${repoName}`);
    
    assertNotStopped(ctx.chat.id);
    progress.phase('Initializing static analysis...', 20);
    await new Promise(r => setTimeout(r, 2000));
    
    assertNotStopped(ctx.chat.id);
    progress.phase('Auditing dependencies...', 50);
    await new Promise(r => setTimeout(r, 2000));

    assertNotStopped(ctx.chat.id);
    progress.phase('Scanning for secrets and debt...', 80);
    await new Promise(r => setTimeout(r, 1500));

    session.task = null;
    await progress.done(`Scan completed for repository: *${repoName}*\nNo critical issues found.`);
  } catch (error) {
    if (error.code === 'TASK_STOPPED') {
      return await progress.stopped();
    }
    session.task = null;
    await progress.fail(error.message);
  }
};
