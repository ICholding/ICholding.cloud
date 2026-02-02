import { octokit } from './client.js';

export async function getRepo(owner, repo) {
  const { data } = await octokit.repos.get({ owner, repo });
  return data;
}

export async function getDefaultBranch(owner, repo) {
  const r = await getRepo(owner, repo);
  return r.default_branch;
}

export async function getBranchHeadSha(owner, repo, branch) {
  const { data } = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  return data.object.sha;
}

export async function readFile(owner, repo, path, ref) {
  const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
  if (Array.isArray(data)) throw new Error('Path is a directory');
  const content = Buffer.from(data.content, data.encoding).toString('utf8');
  return { content, sha: data.sha };
}

export async function listRecentWorkflowRuns(owner, repo) {
  // returns recent runs (requires Actions: Read)
  const { data } = await octokit.actions.listWorkflowRunsForRepo({
    owner,
    repo,
    per_page: 5
  });
  return data.workflow_runs || [];
}
