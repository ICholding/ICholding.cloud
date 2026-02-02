const ADMIN_ID = String(process.env.TELEGRAM_ADMIN_ID);
const ALLOW_GROUPS = String(process.env.ALLOW_GROUPS || 'false') === 'true';

export function isAllowedSender(msg) {
  const fromId = msg?.from?.id ? String(msg.from.id) : null;
  if (!fromId) return false;
  if (fromId !== ADMIN_ID) return false;

  const chatType = msg?.chat?.type; // "private", "group", "supergroup", "channel"
  if (!ALLOW_GROUPS && chatType !== 'private') return false;

  return true;
}

export function normalizeText(msg) {
  return (msg?.text || '').trim();
}
