const sessions = new Map();

/**
 * Session shape:
 * {
 *   paired: boolean,
 *   repo: { owner, name } | null,
 *   pending: { branch, title, body, changes: [{path, content, message}] } | null
 * }
 */
export function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { paired: false, repo: null, pending: null });
  }
  return sessions.get(chatId);
}

export function resetPending(chatId) {
  const s = getSession(chatId);
  s.pending = null;
}

export function setRepo(chatId, owner, name) {
  const s = getSession(chatId);
  s.repo = { owner, name };
  s.pending = null; // switching repo clears pending work
}

export function setPaired(chatId, paired = true) {
  const s = getSession(chatId);
  s.paired = paired;
}

export function setPending(chatId, pending) {
  const s = getSession(chatId);
  s.pending = pending;
}
