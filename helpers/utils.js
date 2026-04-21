const fs = require('fs');
const path = require('path');
const { LOCAL_REPO_ROOT, LOCAL_INDEX_ROOT, FUNCTION_INDEX_ARCHIVE_ROOT, CACHE_ROOT } = require('./config');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function ensureBaseDirs() {
  ensureDir(LOCAL_REPO_ROOT);
  ensureDir(LOCAL_INDEX_ROOT);
  ensureDir(FUNCTION_INDEX_ARCHIVE_ROOT);
  ensureDir(CACHE_ROOT);
}

function normalizeRepoInput(input = '') {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const githubUrlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (githubUrlMatch) {
    return {
      owner: githubUrlMatch[1],
      repo: githubUrlMatch[2].replace(/\.git$/, '')
    };
  }

  const pairMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (pairMatch) {
    return {
      owner: pairMatch[1],
      repo: pairMatch[2].replace(/\.git$/, '')
    };
  }

  return null;
}

function repoKey(owner, repo) {
  return `${owner}__${repo}`;
}

function safeReadJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function isTextLikeFile(fileName) {
  return /\.(js|jsx|ts|tsx|json|md|txt|html|css|scss|yml|yaml|env|py|java|c|cpp|rs|go|php|rb|sh)$/i.test(fileName);
}

function cosineSimilarity(a = [], b = []) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function sanitizeRelativePath(inputPath = '') {
  const normalized = path.posix.normalize(String(inputPath).replace(/\\/g, '/'));
  if (!normalized || normalized.startsWith('..') || normalized.includes('/../')) {
    throw new Error('Invalid file path');
  }
  return normalized;
}

module.exports = {
  ensureDir,
  ensureBaseDirs,
  normalizeRepoInput,
  repoKey,
  safeReadJson,
  writeJson,
  isTextLikeFile,
  cosineSimilarity,
  sanitizeRelativePath
};
