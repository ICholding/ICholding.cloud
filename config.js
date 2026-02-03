require('dotenv').config();

const config = {
  DINGTALK_APP_KEY: process.env.DINGTALK_APP_KEY,
  DINGTALK_APP_SECRET: process.env.DINGTALK_APP_SECRET,
  DINGTALK_AGENT_ID: process.env.DINGTALK_AGENT_ID,
  DINGTALK_ACCESS_TOKEN: process.env.DINGTALK_ACCESS_TOKEN,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  GITHUB_REPO_NAME: process.env.GITHUB_REPO_NAME || 'ICholding.cloud',
};

module.exports = config;
