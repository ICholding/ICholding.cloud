const DingTalkBot = require('dingtalk-bot-sdk');
const { handleFind, scanRepo, showHelp, sendMessage } = require('./taskHandler');
const config = require('./config');

const bot = new DingTalkBot({
  token: config.DINGTALK_API_KEY,
  secret: config.DINGTALK_SECRET,
});

bot.on('message', async (message) => {
  const chatId = message.chatId; // Adjusted for dingtalk-bot-sdk
  const text = message.text.content.trim().toLowerCase();

  if (text.includes('scan') && text.includes('repo')) {
    await scanRepo(chatId);
  } else if (text.includes('find') && text.includes('file')) {
    const fileName = text.split('file')[1]?.trim();
    await handleFind(chatId, fileName);
  } else if (text.includes('help')) {
    await showHelp(chatId);
  } else {
    await sendMessage(chatId, "Sorry, I didn’t catch that. Type 'help' to see what I can do!");
  }
});

module.exports = { bot };
