/**
 * Progress Contract v1
 * Standard lifecycle for agent task progress.
 *
 * start(title)         -> initializes spinner message
 * phase(text, percent) -> updates spinner text + optional percent
 * done(summary)        -> final success message (replaces spinner)
 * fail(error)          -> final failure message (replaces spinner)
 */

import { CONFIG } from './config.js';

const FRAMES = ['◐', '◓', '◑', '◒'];

export function createProgressContract({
  chatId,
  sendMessage,
  editMessage,
  throttleMs = CONFIG.throttleMs
}) {
  let messageId = null;
  let frameIndex = 0;
  let timer = null;
  let stopped = false;

  let title = '';
  let phaseText = 'Starting…';
  let percent = null;

  function render() {
    const spinner = FRAMES[frameIndex % FRAMES.length];
    const pct = percent !== null ? ` \`${percent}%\`` : '';
    return `*${spinner} ${title}*${pct}\n${phaseText}`;
  }

  async function start(t) {
    title = t;
    const msg = await sendMessage(chatId, render());
    messageId = msg.message_id;

    timer = setInterval(async () => {
      if (stopped) return;
      frameIndex++;
      try {
        await editMessage(chatId, messageId, render());
      } catch {
        // ignore transient Telegram edit errors
      }
    }, throttleMs);
  }

  function phase(text, pct = null) {
    phaseText = text;
    if (pct !== null) {
      percent = Math.max(0, Math.min(100, pct));
    }
  }

  async function done(summary) {
    stopped = true;
    if (timer) clearInterval(timer);
    await editMessage(
      chatId,
      messageId,
      `*✅ ${title} complete*\n${summary}`
    );
  }

  async function fail(error) {
    stopped = true;
    if (timer) clearInterval(timer);
    await editMessage(
      chatId,
      messageId,
      `*❌ ${title} failed*\n${String(error)}`
    );
  }

  async function stoppedMethod(msg = 'Stopped. Reply with `/cancel`, `EDIT …`, or `/resume`.') {
    stopped = true;
    if (timer) clearInterval(timer);
    if (messageId) {
      await editMessage(chatId, messageId, `*⏸ ${title} stopped*\n${msg}`);
    } else {
      await sendMessage(chatId, `*⏸ ${title} stopped*\n${msg}`);
    }
  }

  async function coolOff() {
    const originalPhase = phaseText;
    const originalPercent = percent;
    phase(`${CONFIG.emojis.cooloff} Cool off dodging MCP police...`, originalPercent);
    await new Promise(r => setTimeout(r, CONFIG.cooldownMs));
    phase(originalPhase, originalPercent);
  }

  return { start, phase, done, fail, stopped: stoppedMethod, coolOff };
}
