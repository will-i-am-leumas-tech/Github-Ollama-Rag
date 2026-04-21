const fs = require('fs');
const path = require('path');
const { getLocalRepoPath, cloneRepo } = require('./repoManager');
const { FUNCTION_INDEX_ARCHIVE_ROOT } = require('./config');
const { repoKey, safeReadJson, writeJson, ensureDir } = require('./utils');

const FUNCTION_MESH_PATHS = [
  process.env.LEUMAS_FUNCTION_MESH_PATH,
  process.env.LEUMAS_FUNCTION_SHARING_ROOT,
  process.env.FUNCTION_SHARING_ROOT,
  '/mnt/d/Leumas/NPM/leumas-function-sharing',
  '/mnt/d/leumas/npm/leumas-function-sharing',
].filter(Boolean);

function loadFunctionMesh() {
  try {
    return require('leumas-function-mesh');
  } catch (packageError) {
    for (const root of FUNCTION_MESH_PATHS) {
      try {
        return require(path.join(root, 'src', 'index.js'));
      } catch {
        // Try the next configured or well-known local checkout.
      }
    }

    throw new Error(
      `Unable to load leumas-function-mesh. Install it or set LEUMAS_FUNCTION_SHARING_ROOT. ${packageError.message}`
    );
  }
}

function getFunctionIndexPath(owner, repo) {
  return path.join(getLocalRepoPath(owner, repo), '.leumas', 'functionIndex.json');
}

function getArchivedFunctionIndexPath(owner, repo) {
  return path.join(FUNCTION_INDEX_ARCHIVE_ROOT, `${repoKey(owner, repo)}.json`);
}

function getFunctionIndexHistoryDir(owner, repo) {
  return path.join(FUNCTION_INDEX_ARCHIVE_ROOT, 'history', repoKey(owner, repo));
}

function getArchiveMeta(owner, repo) {
  const archivePath = getArchivedFunctionIndexPath(owner, repo);
  try {
    const stat = fs.statSync(archivePath);
    return {
      archivePath,
      archivedAt: stat.mtime.toISOString(),
    };
  } catch {
    return {
      archivePath,
      archivedAt: '',
    };
  }
}

function readFunctionIndex(owner, repo) {
  const localPath = getFunctionIndexPath(owner, repo);
  const localIndex = safeReadJson(localPath, null);
  if (localIndex) {
    return {
      index: localIndex,
      source: 'local',
      indexPath: localPath,
      ...getArchiveMeta(owner, repo),
    };
  }

  const archive = getArchiveMeta(owner, repo);
  const archivedIndex = safeReadJson(archive.archivePath, null);
  if (archivedIndex) {
    return {
      index: archivedIndex,
      source: 'archive',
      indexPath: archive.archivePath,
      ...archive,
    };
  }

  return {
    index: null,
    source: '',
    indexPath: '',
    ...archive,
  };
}

function summarizeFunctionIndex(indexRecord) {
  const record = indexRecord && Object.prototype.hasOwnProperty.call(indexRecord, 'index')
    ? indexRecord
    : { index: indexRecord, source: '', indexPath: '', archivePath: '', archivedAt: '' };
  const index = record.index;
  const entries = Array.isArray(index?.entries)
    ? index.entries.map((entry) => ({
      id: entry.id,
      type: entry.type || 'unknown',
      relativePath: entry.relativePath || '',
      exportName: entry.exportName || '',
      signature: entry.signature || '',
      language: entry.language || '',
      runtime: entry.runtime || '',
      callable: Boolean(entry.callable),
      io: entry.io || null,
      executionKind: entry.execution?.kind || '',
    }))
    : [];

  return {
    indexed: Boolean(index),
    source: record.source || '',
    indexPath: record.indexPath || '',
    archivePath: record.archivePath || '',
    archivedAt: record.archivedAt || '',
    project: index?.project || null,
    summary: index?.summary || { totals: { total: 0 } },
    entries,
  };
}

function archiveFunctionIndex(owner, repo, index) {
  const archivePath = getArchivedFunctionIndexPath(owner, repo);
  const historyDir = getFunctionIndexHistoryDir(owner, repo);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const historyPath = path.join(historyDir, `${timestamp}.json`);

  ensureDir(path.dirname(archivePath));
  ensureDir(historyDir);
  writeJson(archivePath, index);
  writeJson(historyPath, index);

  return {
    archivePath,
    historyPath,
    archivedAt: new Date().toISOString(),
  };
}

async function indexRepoFunctions(owner, repo) {
  const clone = cloneRepo(owner, repo);
  const { indexProject } = loadFunctionMesh();
  const index = await indexProject({ rootDir: clone.repoPath });
  const archive = archiveFunctionIndex(owner, repo, index);
  return {
    clone,
    ...summarizeFunctionIndex({
      index,
      source: 'local',
      indexPath: getFunctionIndexPath(owner, repo),
      archivePath: archive.archivePath,
      archivedAt: archive.archivedAt,
    }),
  };
}

module.exports = {
  getFunctionIndexPath,
  getArchivedFunctionIndexPath,
  readFunctionIndex,
  summarizeFunctionIndex,
  archiveFunctionIndex,
  indexRepoFunctions,
  loadFunctionMesh,
};
