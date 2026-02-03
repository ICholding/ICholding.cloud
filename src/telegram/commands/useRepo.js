import { setRepo } from '../sessions.js';
import { octokit } from '../../github/client.js';

export default async (ctx) => {
  const text = ctx.message.text.trim();
  const args = text.split(/\s+/);
  const repoName = args[1];

  if (!repoName) {
    return ctx.reply('Please provide a valid repository name. Usage: `/use <repo_name>`', { parse_mode: 'Markdown' });
  }

  try {
    // Check if the repo exists (defaulting to ICholding as owner)
    const owner = 'ICholding';
    const { data } = await octokit.rest.repos.get({
      owner,
      repo: repoName,
    });

    setRepo(ctx.chat.id, owner, repoName);

    ctx.reply(`✅ Successfully bound to repository: *${repoName}*\n\nDetails:\n- Name: ${data.name}\n- Owner: ${data.owner.login}`, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Error binding repo:', error);
    ctx.reply(`Failed to bind to repository: *${repoName}*. Please ensure the repository exists and try again.`, { parse_mode: 'Markdown' });
  }
};
