const axios = require('axios');
const config = require('./config');

async function scanRepo(chatId, repoName) {
  try {
      // In a real scenario, this would trigger a more complex analysis
    const response = await axios.get(`https://api.github.com/repos/ICholding/${repoName}/contents`, {
      headers: { Authorization: `token ${config.GITHUB_TOKEN}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error scanning the repo:", error);
    throw error;
  }
}

async function findFileInRepo(chatId, repoName, fileName) {
  const response = await axios.get(`https://api.github.com/repos/ICholding/${repoName}/contents`, {
    headers: { Authorization: `token ${config.GITHUB_TOKEN}` },
  });

  const file = response.data.find(file => file.name === fileName);
  return file;
}

module.exports = {
  scanRepo,
  findFileInRepo,
};
