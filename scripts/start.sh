#!/bin/bash
set -euo pipefail

# Ensure environment variables are set before running
if [[ -z "${TELEGRAM_BOT_TOKEN:-}" || -z "${GITHUB_TOKEN:-}" || -z "${OPENROUTER_API_KEY:-}" ]]; then
  echo "Missing required environment variables. Please set TELEGRAM_BOT_TOKEN, GITHUB_TOKEN, and OPENROUTER_API_KEY."
  exit 1
fi

# Install dependencies (if not already installed)
if [ ! -d "node_modules" ]; then
  yarn install
fi

# Start the bot
echo "🚀 Starting the Software Janitor Bot (OpenClaw Mode)..."
npm start
