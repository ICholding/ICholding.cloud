import { getSession } from '../sessions.js';
import { octokit } from '../../github/client.js';

export default async (ctx) => {
  const text = ctx.message.text.trim();
  const args = text.split(/\s+/);
  const fileName = args[1];

  if (!fileName) {
    return ctx.reply('Please provide a file name to find. Usage: `/find <file_name>`', { parse_mode: 'Markdown' });
  }

  const session = getSession(ctx.chat.id);
  if (!session.repo) {
    return ctx.reply('📌 Repo not set. Use: `/use <repo_name>`', { parse_mode: 'Markdown' });
  }

  const { owner, name: repo } = session.repo;

  try {
    // Search for code file in the repository
    const { data } = await octokit.rest.search.code({
      q: `filename:${fileName} repo:${owner}/${repo}`
    });

    if (data.total_count > 0) {
      const file = data.items[0];
      ctx.reply(`✅ File found: *${fileName}*\nLocation: [View on GitHub](${file.html_url})`, { parse_mode: 'Markdown' });
    } else {
      ctx.reply(`❌ File not found: \`${fileName}\` in ${owner}/${repo}`, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Error finding file:', error);
    ctx.reply('Error finding the file. Please try again.');
  }
};
