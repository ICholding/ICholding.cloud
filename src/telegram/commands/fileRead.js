import { getSession } from '../sessions.js';
import { readFile } from '../../github/repo.js';

export default async (ctx) => {
  const text = ctx.message.text.trim();
  const filePath = text.split(/\s+/)[1];

  if (!filePath) {
    return ctx.reply('Please provide the path to the file. Usage: `/file <path/tg/file>`', { parse_mode: 'Markdown' });
  }

  const session = getSession(ctx.chat.id);
  if (!session.repo) {
    return ctx.reply('📌 Repo not set. Use: `/use <repo_name>`', { parse_mode: 'Markdown' });
  }

  const { owner, name: repo } = session.repo;

  try {
    const { content } = await readFile(owner, repo, filePath);
    const clipped = content.length > 3500 ? content.slice(0, 3500) + '\n…(clipped)' : content;
    ctx.reply(`*${filePath}*\n\`\`\`\n${clipped}\n\`\`\``, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error reading file:', error);
    ctx.reply(`Failed to read file: \`${filePath}\`. Ensure the path is correct.`, { parse_mode: 'Markdown' });
  }
};
