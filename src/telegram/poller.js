import fetch from 'node-fetch';
import { isAllowedSender, normalizeText } from './security.js';
import { handleCommand } from './commands.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

async function tg(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram API error: ${method} ${JSON.stringify(json)}`);
  return json.result;
}

export async function sendMessage(chatId, text) {
  // Keep it Markdown-friendly but safe
  return tg('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true
  });
}

export async function editMessage(chatId, messageId, text) {
  return tg('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true
  });
}

export async function startPolling() {
  let offset = 0;

  console.log('🟦 Polling started (long polling)…');

  while (true) {
    try {
      const updates = await tg('getUpdates', {
        offset,
        timeout: 50,
        allowed_updates: ['message']
      });

      for (const u of updates) {
        offset = u.update_id + 1;
        const msg = u.message;
        if (!msg) continue;

        if (!isAllowedSender(msg)) continue;

        const text = normalizeText(msg);
        if (!text) continue;

        await handleCommand(msg, text, sendMessage, editMessage);
      }
    } catch (err) {
      console.error('Polling error:', err?.message || err);
      // short backoff
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}
