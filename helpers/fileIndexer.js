const fs = require('fs');
const path = require('path');
const { MAX_FILE_SIZE_BYTES, MAX_CHUNK_SIZE, CHUNK_OVERLAP } = require('./config');
const { isTextLikeFile } = require('./utils');

const SKIP_DIRS = new Set(['.git', '.leumas', 'node_modules', 'dist', 'build', '.next', '.cache', 'coverage']);

function walk(dir, base = dir, results = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    const relative = path.relative(base, full).replace(/\\/g, '/');

    if (SKIP_DIRS.has(item.name)) continue;

    if (item.isDirectory()) {
      results.push({ type: 'tree', path: relative });
      walk(full, base, results);
    } else {
      results.push({ type: 'blob', path: relative });
    }
  }
  return results;
}

function chunkText(text, filePath) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + MAX_CHUNK_SIZE, text.length);
    chunks.push({
      path: filePath,
      content: text.slice(start, end),
      start,
      end
    });
    if (end === text.length) break;
    start = Math.max(end - CHUNK_OVERLAP, 0);
  }
  return chunks;
}

function buildChunks(repoPath) {
  const tree = walk(repoPath);
  const chunks = [];

  for (const item of tree) {
    if (item.type !== 'blob') continue;
    if (!isTextLikeFile(item.path)) continue;

    const fullPath = path.join(repoPath, item.path);
    const stat = fs.statSync(fullPath);
    if (stat.size > MAX_FILE_SIZE_BYTES) continue;

    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      chunks.push(...chunkText(content, item.path));
    } catch {
      // ignore unreadable files
    }
  }

  return { tree, chunks };
}

module.exports = {
  walk,
  chunkText,
  buildChunks
};
