import { octokit } from './client.js';
import { getDefaultBranch, getBranchHeadSha, readFile } from './repo.js';

export async function createBranchFromDefault(owner, repo, newBranch) {
  const base = await getDefaultBranch(owner, repo);
  const baseSha = await getBranchHeadSha(owner, repo, base);

  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${newBranch}`,
    sha: baseSha
  });

  return { baseBranch: base, baseSha };
}

export async function upsertFile(owner, repo, path, content, message, branch) {
  // If file exists, include sha. If not, omit sha (create new file).
  let sha;
  try {
    const existing = await readFile(owner, repo, path, branch);
    sha = existing.sha;
  } catch (_) {
    sha = undefined;
  }

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch,
    ...(sha ? { sha } : {})
  });
}

export async function openPullRequest(owner, repo, title, body, headBranch) {
  const base = await getDefaultBranch(owner, repo);
  const { data } = await octokit.pulls.create({
    owner,
    repo,
    title,
    body,
    head: headBranch,
    base
  });
  return data.html_url;
}
