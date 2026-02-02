import { getSession } from './sessions.js';

export function startTask(chatId, name, input = {}) {
  const s = getSession(chatId);
  s.task = {
    id: `${name}-${Date.now()}`,
    name,
    status: 'running',          // running | stopped
    stopRequested: false,
    editedApproach: null,       // string
    input                       // task-specific (e.g., path/goal)
  };
  return s.task;
}

export function getTask(chatId) {
  return getSession(chatId).task;
}

export function stopTask(chatId) {
  const s = getSession(chatId);
  if (!s.task || s.task.status !== 'running') return false;
  s.task.status = 'stopped';
  s.task.stopRequested = true;
  return true;
}

export function cancelTask(chatId) {
  const s = getSession(chatId);
  if (!s.task) return false;
  s.task = null;
  s.pending = null; // safety: drop any pending PR proposal too
  return true;
}

export function editTask(chatId, newApproach) {
  const s = getSession(chatId);
  if (!s.task) return false;
  s.task.editedApproach = newApproach;
  s.task.status = 'stopped';
  s.task.stopRequested = true;
  return true;
}

export function resumeTask(chatId) {
  const s = getSession(chatId);
  if (!s.task || s.task.status !== 'stopped') return false;
  s.task.status = 'running';
  s.task.stopRequested = false;
  return true;
}

/**
 * Cooperative checkpoint: tasks must call this between awaited steps.
 */
export function assertNotStopped(chatId) {
  const t = getTask(chatId);
  if (t?.stopRequested) {
    const err = new Error('TASK_STOPPED');
    err.code = 'TASK_STOPPED';
    throw err;
  }
}
