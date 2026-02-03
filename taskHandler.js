const { sendMessageToDingTalk } = require('./dingTalkClient');
const { getOpenPullRequests } = require('./githubIntegration');
const config = require('./config');

async function handleMessage(chatId, message) {
  const text = message.toLowerCase();

  if (text.includes('scan repo')) {
    const repoName = config.GITHUB_REPO_NAME;
    sendMessageToDingTalk(chatId, `🔍 Scanning repository: ${repoName}...`);
    
    try {
      const openPRs = await getOpenPullRequests(repoName);
      if (openPRs.length > 0) {
        const prInfo = openPRs.map(pr => `PR #${pr.number}: ${pr.title}`).join('\n');
        sendMessageToDingTalk(chatId, `✅ Scan Complete. Open Pull Requests:\n${prInfo}`);
      } else {
        sendMessageToDingTalk(chatId, '✅ Scan Complete. No open pull requests found.');
      }
    } catch (error) {
      sendMessageToDingTalk(chatId, '❌ Error during scan. Check logs.');
    }
  } else if (text.includes('help')) {
    const helpMessage = `
--- ICholding Automation Bot ---
Available Commands:
- "scan repo": Scans the linked GitHub repo for PRs.
- "help": Shows this menu.
    `;
    sendMessageToDingTalk(chatId, helpMessage);
  } else {
    sendMessageToDingTalk(chatId, "🤖 I'm listening. Type 'scan repo' to check status or 'help' for commands.");
  }
}

module.exports = {
  handleMessage,
};
