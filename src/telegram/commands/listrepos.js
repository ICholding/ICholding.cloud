import { listUserRepos } from '../../github/repo.js';

export default async (ctx) => {
  try {
    const repos = await listUserRepos();
    let repoList = "*Available repositories:*\n";
    repos.forEach((repo) => {
      repoList += `- \`${repo.name}\`\n`;
    });

    ctx.reply(repoList, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error fetching repos:', error);
    ctx.reply('Failed to fetch repositories. Please try again later.');
  }
};
