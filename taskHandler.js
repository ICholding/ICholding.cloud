const { sendMessageToDingTalk } = require('./dingTalkClient');
const { getOpenPullRequests } = require('./githubIntegration');
const config = require('./config');
const OpenClaw = require('openclaw');

const claw = new OpenClaw({
  apiKey: config.OPENROUTER_API_KEY,
  githubToken: config.GITHUB_TOKEN
});

async function handleMessage(chatId, message) {
  const text = message.toLowerCase();

  if (text.includes('scan repo')) {
    const repoName = config.GITHUB_REPO_NAME;
    sendMessageToDingTalk(chatId, `🔍 Scanning repository: ${repoName}...`);
    
    try {
      sendMessageToDingTalk(chatId, "🔧 Initiating OpenClaw autonomous diagnostic...");
      
      // Perform autonomous repository analysis
      const analysis = await claw.analyze({
        repo: `ICholding/${repoName}`,
        branch: 'master'
      });

      const openPRs = await getOpenPullRequests(repoName);
      let report = `✅ Scan Complete.\n\nOpenClaw Analysis: ${analysis.summary || 'Standard health check completed.'}`;

      if (openPRs.length > 0) {
        const prInfo = openPRs.map(pr => `PR #${pr.number}: ${pr.title}`).join('\n');
        report += `\n\nOpen Pull Requests:\n${prInfo}`;
      }

      sendMessageToDingTalk(chatId, report);
    } catch (error) {
      console.error(error);
      sendMessageToDingTalk(chatId, '❌ Error during OpenClaw scan. Check system logs.');
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
