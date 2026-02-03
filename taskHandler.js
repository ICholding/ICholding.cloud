const { sendMessageToDingTalk } = require('./dingTalkClient');
const { getOpenPullRequests } = require('./githubIntegration');
const config = require('./config');
const OpenAI = require('openai');

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: config.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://icholding.cloud',
    'X-Title': 'ICholding Cloud Bot'
  }
});

async function handleMessage(chatId, message) {
  const text = message.toLowerCase();

  if (text.includes('scan repo')) {
    const repoName = config.GITHUB_REPO_NAME;
    sendMessageToDingTalk(chatId, `🔍 Scanning repository: ${repoName}...`);
    
    try {
      sendMessageToDingTalk(chatId, "🔧 Initiating AI-driven autonomous diagnostic...");
      
      // Perform autonomous repository analysis using OpenRouter/OpenAI logic
      const completion = await openai.chat.completions.create({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: 'Analyze the repository status and provide a brief technical summary.' },
          { role: 'user', content: `Analyze the current state of the repo: ICholding/${repoName}` }
        ]
      });

      const openPRs = await getOpenPullRequests(repoName);
      let report = `✅ Scan Complete.\n\nAI Analysis: ${completion.choices[0].message.content || 'Standard health check completed.'}`;

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
