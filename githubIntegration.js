const axios = require('axios');
const config = require('./config');

async function getOpenPullRequests(repoName) {
  try {
    const response = await axios.get(`https://api.github.com/repos/ICholding/${repoName}/pulls`, {
      headers: {
        Authorization: `token ${config.GITHUB_TOKEN}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching open PRs from GitHub:', error);
    throw error;
  }
}

module.exports = {
  getOpenPullRequests,
};
