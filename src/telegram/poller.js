import { Telegraf } from 'telegraf';
import { isAllowedSender } from './security.js';
import { handleCommand } from './commands.js';
import { getSession } from './sessions.js';
import { 
  stopTask, 
  cancelTask, 
  editTask, 
  resumeTask 
} from './taskControl.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new Telegraf(TOKEN);

// Global middleware for Admin check
bot.use(async (ctx, next) => {
  if (ctx.message && !isAllowedSender(ctx.message)) {
    console.log(`Blocked unauthorized access: ${ctx.from.id}`);
    return;
  }
  return next();
});

// Helper for sending messages (matching existing commands.js signature)
const sendMessage = (chatId, text) => bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown', disable_web_page_preview: true });
const editMessage = (chatId, messageId, text) => bot.telegram.editMessageText(chatId, messageId, undefined, text, { parse_mode: 'Markdown', disable_web_page_preview: true });

// Basic /start
bot.start(async (ctx) => {
  const chatId = ctx.chat.id;
  const session = getSession(chatId);
  
  // Set paired automatically as per new directive
  session.paired = true;

  if (!session.repo) {
    await ctx.reply("Welcome to Software Janitor! 🧹\n\nPlease bind a repository to start:\n`/use owner/repo` (e.g., `/use ICholding/myrepo`)", { parse_mode: 'Markdown' });
  } else {
    await ctx.reply(`Janitor active for *${session.repo.owner}/${session.repo.name}*.\nType /status to check repo status.`, { parse_mode: 'Markdown' });
  }
});

// Control commands as native / commands
bot.command('stop', async (ctx) => {
  const ok = stopTask(ctx.chat.id);
  if (!ok) return ctx.reply('No running task to stop.');
  await ctx.reply('*⏸ Stop requested.*\nChoose: /cancel, /resume, or send `EDIT <plan>`', { parse_mode: 'Markdown' });
});

bot.command('cancel', async (ctx) => {
  const ok = cancelTask(ctx.chat.id);
  await ctx.reply(ok ? '🧯 Cancelled.' : 'No active task.');
});

bot.command('resume', async (ctx) => {
  const ok = resumeTask(ctx.chat.id);
  if (!ok) return ctx.reply('No stopped task to resume.');
  await ctx.reply('▶️ Resuming task...');
  // Note: Command triggers need re-integration via handleCommand call or similar
});

// Handle text commands and EDIT updates
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  const chatId = ctx.chat.id;
  
  if (text.startsWith('/')) {
    // Telegraf commands like /status, /use
    return handleCommand(ctx.message, text, sendMessage, editMessage);
  }

  // Handle "EDIT <approach>" without prefix
  if (text.toUpperCase().startsWith('EDIT ')) {
    const newApproach = text.substring(5).trim();
    editTask(chatId, newApproach);
    return ctx.reply(`📝 Updated approach queued:\n_${newApproach}_`);
  }

  // Fallback to legacy command handler for non-prefixed or other logic
  await handleCommand(ctx.message, text, sendMessage, editMessage);
});

export async function startPolling() {
  console.log('🟦 Polling started (Telegraf)…');
  bot.launch({
    polling: {
      interval: 300,
      timeout: 10,
      limit: 100
    }
  }).catch(err => {
    console.error("Bot launch error:", err);
  });

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
