import { octokit } from './client.js';

/**
 * Adds a comment to a GitHub issue or pull request.
 */
export async function commentOnIssue(owner, repo, issue_number, body) {
  const { data } = await octokit.issues.createComment({
    owner,
    repo,
    issue_number,
    body
  });
  return data;
}
