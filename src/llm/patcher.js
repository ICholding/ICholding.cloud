import { openrouterChat } from './openrouter.js';

export async function proposePatch({ owner, repo, path, currentContent, goal }) {
  const system = `
You are "Software Janitor" (single-admin automation). 
Rules:
- Propose minimal-risk changes.
- Do NOT change external behavior unless the goal explicitly requires it.
- Prefer small refactors, null guards, error handling, typing improvements.
- Output MUST be valid JSON with keys: summary, changes[].
- Each change: { "path": "...", "message": "...", "content": "FULL_NEW_FILE_CONTENT" }.
No markdown. No extra keys.
`;

  const user = `
Repo: ${owner}/${repo}
Target file: ${path}
Goal: ${goal}

CURRENT FILE CONTENT:
<<<
${currentContent}
>>>
`;

  const raw = await openrouterChat([
    { role: 'system', content: system.trim() },
    { role: 'user', content: user.trim() }
  ]);

  // Best-effort JSON parse
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`LLM did not return valid JSON. Raw:\n${raw.slice(0, 2000)}`);
  }

  if (!parsed?.changes?.length) {
    throw new Error(`LLM returned no changes. Raw:\n${raw.slice(0, 2000)}`);
  }

  return parsed;
}
