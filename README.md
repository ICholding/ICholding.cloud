# icholding-dingtalk-bot

DingTalk-based repository management and autonomous workflow via OpenClaw. Rebranded from the legacy Telegram architecture to a unified enterprise automation system.

## Commands

### Natural Language Interface
The bot processes natural language inputs directly:
- **"scan the repo"**: Initiates a full repository analysis and health check.
- **"find the file <filename>"**: Locates specific files and returns their download context.
- **"help"**: Displays the current operational command set.

### Task Management
- **Automated Feedback**: The bot provides real-time progress updates through DingTalk during multi-stage OpenClaw tasks (Scanning -> Analysis -> Fixing -> PR).
- **GitHub Integration**: Autonomous PR creation and issue identification.

## Deployment

### Render Configuration
Use the provided `render.yaml` for zero-friction deployment.

**Required Environment Variables:**
- `DINGTALK_API_KEY`: Your DingTalk bot webhook token.
- `DINGTALK_SECRET`: Signature secret for HMAC verification.
- `GITHUB_TOKEN`: Your GitHub Administrative token.
- `OPENROUTER_API_KEY`: API key for AI-driven task analysis.
- `GITHUB_REPO_NAME`: Target repository (defaults to `ICholding.cloud`).

## System Architecture
- **NLP Engine**: Integrated via OpenRouter.
- **Execution Layer**: Node.js with `dingtalk-bot-sdk`.
- **Autonomy**: Powered by OpenClaw for repository-level intelligence.

---
© 2026 IC Holding. All rights reserved.
