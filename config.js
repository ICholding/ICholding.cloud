require('dotenv').config();

const config = {
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  DINGTALK_API_KEY: process.env.DINGTALK_API_KEY,
  DINGTALK_SECRET: process.env.DINGTALK_SECRET,
  GITHUB_REPO_NAME: process.env.GITHUB_REPO_NAME,
};

module.exports = config;
