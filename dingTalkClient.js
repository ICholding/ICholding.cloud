const axios = require('axios');
const config = require('./config');

async function getAccessToken() {
  try {
    const response = await axios.get(`https://oapi.dingtalk.com/gettoken`, {
      params: {
        appkey: config.DINGTALK_APP_KEY,
        appsecret: config.DINGTALK_APP_SECRET,
      },
    });

    if (response.data.errcode === 0) {
      return response.data.access_token;
    } else {
      throw new Error(`Failed to retrieve DingTalk access token: ${response.data.errmsg}`);
    }
  } catch (error) {
    console.error('Error fetching DingTalk access token:', error);
    throw error;
  }
}

async function sendMessageToDingTalk(chatId, message) {
  try {
    const accessToken = await getAccessToken();

    const response = await axios.post(
      `https://oapi.dingtalk.com/chat/send?access_token=${accessToken}`,
      {
        chatid: chatId,
        msg: {
          msgtype: 'text',
          text: {
            content: message,
          },
        },
      }
    );

    if (response.data.errcode !== 0) {
      throw new Error(`Failed to send message to DingTalk: ${response.data.errmsg}`);
    }

    console.log('Message sent to DingTalk successfully');
  } catch (error) {
    console.error('Error sending message to DingTalk:', error);
  }
}

module.exports = {
  sendMessageToDingTalk,
};
