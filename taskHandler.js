const axios = require('axios');
const config = require('./config');

let agentState = 'idle';
let taskProgress = 0;

function sendMessage(chatId, message) {
    const { bot } = require('./bot');
    bot.sendMessage({
      chat_id: chatId,
      text: {
          content: message
      },
      msgtype: 'text'
    });
}

function startTask(chatId, task) {
  agentState = 'working';
  taskProgress = 0;
  sendMessage(chatId, "Starting task... 🤓🤓");
  simulateTaskProgress(chatId, task);
}

function simulateTaskProgress(chatId, task) {
  if (taskProgress < 100) {
    taskProgress += 20;
    setTimeout(() => {
      if (taskProgress <= 20) {
        sendMessage(chatId, "Searching for issues... 🌐💭⏳️");
      } else if (taskProgress <= 40) {
        sendMessage(chatId, "Reading repo files... 💻📂");
      } else if (taskProgress <= 60) {
        sendMessage(chatId, "Analyzing repo... 👍🏽📝🤔");
      } else if (taskProgress <= 80) {
        sendMessage(chatId, "Proposing fixes... 💭👨‍🔧🥷");
      } else {
        sendMessage(chatId, "Creating PR... 📝🧐");
      }
      simulateTaskProgress(chatId, task);
    }, 1000);
  } else {
    completeTask(chatId);
  }
}

function completeTask(chatId) {
  agentState = 'idle';
  sendMessage(chatId, "Task complete! I’ve made changes and created a PR.");
}

async function handleFind(chatId, fileName) {
  try {
    const repo = config.GITHUB_REPO_NAME || "ICholding.cloud";
    const response = await axios.get(`https://api.github.com/repos/ICholding/${repo}/contents`, {
      headers: { Authorization: `token ${config.GITHUB_TOKEN}` },
    });

    const file = response.data.find(file => file.name === fileName);
    if (file) {
      sendMessage(chatId, `File found: ${fileName}\nLocation: ${file.download_url}`);
    } else {
      sendMessage(chatId, `Could not find file: ${fileName}`);
    }
  } catch (error) {
    sendMessage(chatId, "Error finding the file. Please try again.");
  }
}

async function scanRepo(chatId) {
  sendMessage(chatId, "Scanning repository...");
  startTask(chatId, "scan");
}

async function showHelp(chatId) {
  const helpMessage = `
Available commands:
- "scan the repo"
- "find the file <filename>"
- "help"
  `;
  sendMessage(chatId, helpMessage);
}

module.exports = {
  sendMessage,
  startTask,
  handleFind,
  showHelp,
  scanRepo,
};
