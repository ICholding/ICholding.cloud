#!/bin/bash
set -euo pipefail

echo "🔍 Validating Enterprise Environment..."

if [[ -z "${DINGTALK_APP_KEY:-}" || -z "${DINGTALK_APP_SECRET:-}" || -z "${GITHUB_TOKEN:-}" ]]; then
  echo "❌ ERROR: Missing required environment variables (DINGTALK_APP_KEY, DINGTALK_APP_SECRET, GITHUB_TOKEN)."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  yarn install
fi

echo "🚀 Starting the GitHub Automation Bot (DingTalk Enterprise Mode)..."
npm start
