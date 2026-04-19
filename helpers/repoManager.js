const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { LOCAL_REPO_ROOT } = require('./config');
const { repoKey } = require('./utils');

function getLocalRepoPath(owner, repo) {
  return path.join(LOCAL_REPO_ROOT, repoKey(owner, repo));
}

function repoExistsLocally(owner, repo) {
  return fs.existsSync(getLocalRepoPath(owner, repo));
}

function cloneRepo(owner, repo) {
  const repoPath = getLocalRepoPath(owner, repo);
  if (fs.existsSync(repoPath)) {
    return { repoPath, alreadyExists: true };
  }

  const url = `https://github.com/${owner}/${repo}.git`;
  execFileSync('git', ['clone', url, repoPath], { stdio: 'inherit' });
  return { repoPath, alreadyExists: false };
}

module.exports = {
  getLocalRepoPath,
  repoExistsLocally,
  cloneRepo
};
