import { Telegraf } from 'telegraf';
import listrepos from './commands/listrepos.js';
import useRepo from './commands/useRepo.js';
import status from './commands/status.js';
import scan from './commands/scan.js';
import fileRead from './commands/fileRead.js';
import approvePR from './commands/approvePR.js';
import * as taskControls from './commands/taskControls.js';
import { isAllowedSender } from './security.js';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Admin check middleware
bot.use(async (ctx, next) => {
  if (ctx.message && !isAllowedSender(ctx.message)) {
    console.log(`Blocked unauthorized access: ${ctx.from.id}`);
    return;
  }
  return next();
});

// Command Routing
bot.command('start', (ctx) => {
  ctx.reply('Welcome to the IC Software Janitor Bot! 🧹\n\nPlease use `/listrepos` to see your repositories or `/use <repo_name>` to begin.', { parse_mode: 'Markdown' });
});

bot.command('listrepos', listrepos);
bot.command('use', useRepo);
bot.command('status', status);
bot.command('scan', scan);
bot.command('file', fileRead);
bot.command('approve', approvePR);
bot.command('stop', taskControls.stop);
bot.command('cancel', taskControls.cancel);
bot.command('resume', taskControls.resume);

// Fallback for text without commands (like "EDIT <plan>")
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  // Pass through to legacy-style logic if we want, or just handle edits
  if (text.toUpperCase().startsWith('EDIT ')) {
    // We could import editTask from taskControl directly here
    ctx.reply('📝 Updated approach noted. (Use /resume to restart with this plan)');
  }
});

export function startBot() {
  console.log('🟦 Software Janitor Bot starting (Telegraf Modular Mode)…');
  bot.launch({
    polling: {
      interval: 300,
      timeout: 10,
      limit: 100,
    }
  }).catch(err => {
    console.error("Bot launch error:", err);
  });

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
