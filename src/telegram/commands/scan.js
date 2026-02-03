import { getSession } from '../sessions.js';
import { createProgressContract } from '../progressContract.js';
import { startTask, assertNotStopped } from '../taskControl.js';
import { CONFIG } from '../config.js';

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
    progress.phase(`${CONFIG.emojis.working} Working...`, 10);
    await new Promise(r => setTimeout(r, 1000));

    assertNotStopped(ctx.chat.id);
    progress.phase(`${CONFIG.emojis.searching} Searching...`, 30);
    await new Promise(r => setTimeout(r, 1500));

    assertNotStopped(ctx.chat.id);
    // Cool off simulation
    await progress.coolOff();
    
    assertNotStopped(ctx.chat.id);
    progress.phase(`${CONFIG.emojis.reading} Reading file...`, 50);
    await new Promise(r => setTimeout(r, 1500));

    assertNotStopped(ctx.chat.id);
    progress.phase(`${CONFIG.emojis.analyzing} Analyzing findings...`, 70);
    await new Promise(r => setTimeout(r, 1500));

    assertNotStopped(ctx.chat.id);
    progress.phase(`${CONFIG.emojis.strategy} Devising strategy...`, 90);
    await new Promise(r => setTimeout(r, 1500));

    assertNotStopped(ctx.chat.id);
    progress.phase(`${CONFIG.emojis.notes} Creating notes...`, 95);
    await new Promise(r => setTimeout(r, 1000));

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
