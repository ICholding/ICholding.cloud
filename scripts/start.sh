#!/usr/bin/env bash
set -euo pipefail

node -e "['TELEGRAM_BOT_TOKEN','TELEGRAM_ADMIN_ID','GITHUB_TOKEN','OPENROUTER_API_KEY','OPENROUTER_MODEL'].forEach(k=>{if(!process.env[k]){console.error('Missing env:',k);process.exit(1)}})"

npm run start
