const { GITHUB_TOKEN } = require('./config');

async function githubFetch(url) {
  const headers = {
    'User-Agent': 'Leumas-Repo-RAG',
    'Accept': 'application/vnd.github+json'
  };

  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub request failed: ${res.status}${text ? ` - ${text.slice(0, 180)}` : ''}`);
  }
  return res.json();
}

async function getRepoMeta(owner, repo) {
  return githubFetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
}

async function getRepoTree(owner, repo, branch = 'main') {
  const data = await githubFetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  return data.tree
    .filter(item => item.type === 'tree' || item.type === 'blob')
    .map(item => ({
      path: item.path,
      type: item.type
    }));
}

async function getFileContent(owner, repo, path) {
  const data = await githubFetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path)}`);
  if (Array.isArray(data)) {
    throw new Error('Path is a directory, not a file');
  }
  if (data.encoding === 'base64') {
    return Buffer.from(data.content, 'base64').toString('utf8');
  }
  return ''; // or handle other encodings
}

async function fetchEssentialContext(owner, repo) {
  // Try to find README and other high-value files
  const tree = await getRepoTree(owner, repo);
  const coreFiles = tree
    .filter(f => f.type === 'blob')
    .filter(f => {
      const name = f.path.toLowerCase();
      return name === 'readme.md' || 
             name === 'package.json' || 
             name === 'go.mod' || 
             name === 'requirements.txt' ||
             name === 'cargo.toml';
    })
    .slice(0, 3); // Top 3 most important files

  let context = '';
  for (const file of coreFiles) {
    try {
      const content = await getFileContent(owner, repo, file.path);
      context += `\nFILE: ${file.path}\n${content.slice(0, 5000)}\n---\n`;
    } catch {
      // ignore individual fetch failures
    }
  }
  return context;
}

module.exports = {
  getRepoMeta,
  getRepoTree,
  getFileContent,
  fetchEssentialContext
};
