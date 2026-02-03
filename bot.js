const DingTalkBot = require('dingtalk-robot-sdk');
const { handleMessage } = require('./taskHandler');
const config = require('./config');

// Initialize DingTalk Bot
const bot = new DingTalkBot({
  accessToken: config.DINGTALK_ACCESS_TOKEN || config.DINGTALK_APP_KEY,
  secret: config.DINGTALK_APP_SECRET,
});

bot.on('message', async (message) => {
  const chatId = message.conversationId || (message.chat && message.chat.id);
  const text = (message.text && message.text.content) ? message.text.content.trim() : '';

  if (text) {
    await handleMessage(chatId, text);
  }
});

console.log('🚀 DingTalk Bot Lifecycle Started...');
if (typeof bot.start === 'function') {
  bot.start();
}
