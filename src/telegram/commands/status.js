import { getSession } from '../sessions.js';
import { octokit } from '../../github/client.js';

export default async (ctx) => {
  const session = getSession(ctx.chat.id);
  
  if (!session.repo) {
    return ctx.reply('📌 Repo not set. Use: `/use <repo_name>`', { parse_mode: 'Markdown' });
  }

  const { owner, name: repoName } = session.repo;

  try {
    const { data } = await octokit.rest.repos.get({
      owner,
      repo: repoName,
    });

    const pending = session.pending ? `\n🧾 *Pending PR:* \`${session.pending.branch}\` (awaiting /approve)` : '';

    ctx.reply(`✅ Repository *${repoName}* is up and running.\n\nDetails:\n- Stars: ${data.stargazers_count}\n- Forks: ${data.forks_count}${pending}`, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error fetching repo status:', error);
    ctx.reply('Failed to fetch the repository status. Please try again later.');
  }
};
