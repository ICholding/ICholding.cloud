import { handleCommand } from '../commands.js';

export default async (ctx) => {
  // Utilizing the existing help text logic from commands.js
  return handleCommand(ctx.message, 'HELP', 
    (chatId, text) => ctx.reply(text, { parse_mode: 'Markdown' }),
    (chatId, messageId, text) => ctx.telegram.editMessageText(chatId, messageId, undefined, text, { parse_mode: 'Markdown' })
  );
};
