import { stopTask, cancelTask, resumeTask, getTask } from '../taskControl.js';

export const stop = async (ctx) => {
  const ok = stopTask(ctx.chat.id);
  if (!ok) return ctx.reply('No running task to stop.');
  ctx.reply('✅ Task stopped. Use `/resume` or `/cancel`.', { parse_mode: 'Markdown' });
};

export const cancel = async (ctx) => {
  const ok = cancelTask(ctx.chat.id);
  ctx.reply(ok ? '🧯 Task cancelled and workspace cleared.' : 'No active task to cancel.');
};

export const resume = async (ctx) => {
  const task = getTask(ctx.chat.id);
  if (!task || task.status !== 'stopped') return ctx.reply('No stopped task to resume.');
  
  // Resuming logic: in a full implementation, we re-trigger the command logic.
  // For this modular setup, we notify the user.
  resumeTask(ctx.chat.id);
  ctx.reply('▶️ Task resuming...', { parse_mode: 'Markdown' });
};
