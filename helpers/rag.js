const path = require('path');
const { LOCAL_INDEX_ROOT } = require('./config');
const { repoKey, writeJson, safeReadJson, cosineSimilarity } = require('./utils');
const { buildChunks } = require('./fileIndexer');
const { embedText } = require('./embeddings');
const { buildRepoAnswerPrompt } = require('./prompts');
const { chatWithOllama } = require('./ollama');

function getIndexPath(owner, repo) {
  return path.join(LOCAL_INDEX_ROOT, `${repoKey(owner, repo)}.json`);
}

async function createRepoIndex(owner, repo, repoPath, modelOverride = null) {
  const { tree, chunks } = buildChunks(repoPath);
  const indexedChunks = [];

  for (const chunk of chunks) {
    const embedding = await embedText(chunk.content, modelOverride);
    indexedChunks.push({ ...chunk, embedding });
  }

  const payload = {
    owner,
    repo,
    createdAt: new Date().toISOString(),
    tree,
    chunks: indexedChunks,
    model: modelOverride
  };

  writeJson(getIndexPath(owner, repo), payload);
  return payload;
}

function readRepoIndex(owner, repo) {
  return safeReadJson(getIndexPath(owner, repo), null);
}

async function answerRepoQuestion({ owner, repo, question, selectedPath, chatModel = null, embedModel = null }) {
  let index = readRepoIndex(owner, repo);
  let context = '';
  let sources = [];

  // 1. If we have a selected file, use it as direct context (High Speed)
  if (selectedPath && !selectedPath.endsWith('/')) {
    try {
      const { getLocalRepoPath } = require('./repoManager');
      const { getFileContent } = require('./github');
      const fs = require('fs');
      const path = require('path');
      
      let content = '';
      const localPath = getLocalRepoPath(owner, repo);
      const fullPath = path.join(localPath, selectedPath);
      
      if (fs.existsSync(fullPath)) {
        content = fs.readFileSync(fullPath, 'utf8');
      } else {
        content = await getFileContent(owner, repo, selectedPath);
      }

      if (content) {
        context = `FILE: ${selectedPath}\n${content.slice(0, 12000)}`;
        sources = [{ path: selectedPath, score: 1.0 }];
      }
    } catch (err) {
      console.error('Failed on-the-fly context:', err);
    }
  }

  // 2. If no file selected, but we have an index, use Vector Search
  if (!context && index) {
    const qEmbedding = await embedText(question, embedModel || index.model);
    const ranked = index.chunks
      .filter(chunk => !selectedPath || chunk.path.startsWith(selectedPath))
      .map(chunk => ({
        ...chunk,
        score: cosineSimilarity(qEmbedding, chunk.embedding)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    if (ranked.length) {
      context = ranked
        .map(item => `FILE: ${item.path}\n${item.content}`)
        .join('\n\n---\n\n');
      sources = ranked.map(r => ({ path: r.path, score: r.score }));
    }
  }

  // 3. If no index and no file selected, use "Essential Context" (README, etc) - NO CLONING
  if (!context && !index) {
    const { fetchEssentialContext } = require('./github');
    context = await fetchEssentialContext(owner, repo);
    sources = [{ path: 'Repository Metadata (README/Config)', score: 1.0 }];
  }

  if (!context) {
    return {
      answer: 'I could not find enough information to answer that question. Try selecting a specific file or click "Download / Setup" for a deep index.',
      sources: []
    };
  }

  const prompt = buildRepoAnswerPrompt({
    repoName: `${owner}/${repo}`,
    question,
    context,
    selectedPath
  });

  const answer = await chatWithOllama(prompt, chatModel);

  return {
    answer,
    sources
  };
}

module.exports = {
  getIndexPath,
  createRepoIndex,
  readRepoIndex,
  answerRepoQuestion
};
