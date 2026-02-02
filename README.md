# openclaw-telegram-janitor

Telegram-based repo management and "Bug Buster" workflow.

## Commands
### Setup
- `PAIR`: Pair the bot with the chat.
- `USE REPO <owner/repo>`: Bind the chat to a specific repository.
- `STATUS`: Check the current status of the bot and the bound repository.

### Read-only tasks
- `CI`: Check recent workflow runs.
- `FILE <path>`: Read a file from the repository.

### Write (PR-only)
- `FIX <path> | <goal>`: Propose a fix and plan via LLM.
- `APPROVE:PR <branch-name>`: Approve and create the PR.

## Deployment
Use the provided `render.yaml` for deployment on Render.
