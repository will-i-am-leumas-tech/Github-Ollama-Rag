const fs = require('fs');
const path = require('path');
const { normalizeRepoInput, sanitizeRelativePath } = require('./utils');
const { getRepoMeta, getRepoTree, getFileContent } = require('./github');
const { cloneRepo, getLocalRepoPath, repoExistsLocally } = require('./repoManager');
const { createRepoIndex, readRepoIndex, answerRepoQuestion } = require('./rag');
const { listModels } = require('./ollama');
const { readFunctionIndex, summarizeFunctionIndex, indexRepoFunctions } = require('./functionIndex');
const { walk } = require('./fileIndexer');

function registerRoutes(app) {
  app.get('/api/ollama/models', async (req, res) => {
    try {
      const models = await listModels();
      res.json({ models });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/parse-repo', (req, res) => {
    const parsed = normalizeRepoInput(req.body.input || '');
    if (!parsed) return res.status(400).json({ error: 'Invalid repo input' });
    res.json(parsed);
  });

  app.get('/api/repo/:owner/:repo/meta', async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const meta = await getRepoMeta(owner, repo);
      const local = repoExistsLocally(owner, repo);
      const indexed = !!readRepoIndex(owner, repo);
      res.json({ meta, local, indexed });
    } catch (error) {
      if (error.message.includes('404')) {
        return res.status(404).json({ error: 'GitHub repository not found' });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/repo/:owner/:repo/setup', async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const { embedModel } = req.body;
      const clone = cloneRepo(owner, repo);
      const index = await createRepoIndex(owner, repo, clone.repoPath, embedModel);
      res.json({ ok: true, clone, indexedChunks: index.chunks.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/repo/:owner/:repo/functions', async (req, res) => {
    try {
      const { owner, repo } = req.params;
      res.json(summarizeFunctionIndex(readFunctionIndex(owner, repo)));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/repo/:owner/:repo/functions/index', async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const result = await indexRepoFunctions(owner, repo);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/repo/:owner/:repo/tree', async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const repoPath = getLocalRepoPath(owner, repo);
      const index = readRepoIndex(owner, repo);
      
      if (fs.existsSync(repoPath)) {
        return res.json({ tree: index?.tree || walk(repoPath), local: true });
      }
      
      // If not local, fetch from GitHub
      const meta = await getRepoMeta(owner, repo);
      const tree = await getRepoTree(owner, repo, meta.default_branch);
      res.json({ tree, local: false });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/repo/:owner/:repo/file', async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const relativeFilePath = sanitizeRelativePath(req.query.path || '');
      const repoPath = getLocalRepoPath(owner, repo);
      
      if (fs.existsSync(repoPath)) {
        const fullPath = path.resolve(repoPath, relativeFilePath);
        const repoRoot = path.resolve(repoPath);

        if (!fullPath.startsWith(repoRoot)) {
          return res.status(400).json({ error: 'Invalid file path' });
        }
        const content = fs.readFileSync(fullPath, 'utf8');
        return res.json({ path: relativeFilePath, content });
      }

      // If not local, fetch from GitHub
      const content = await getFileContent(owner, repo, relativeFilePath);
      res.json({ path: relativeFilePath, content });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/repo/:owner/:repo/chat', async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const question = String(req.body.question || '').trim();
      const selectedPath = req.body.selectedPath ? sanitizeRelativePath(String(req.body.selectedPath)) : '';
      const { chatModel, embedModel } = req.body;
      if (!question) return res.status(400).json({ error: 'Question is required' });
      const result = await answerRepoQuestion({ owner, repo, question, selectedPath, chatModel, embedModel });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = {
  registerRoutes
};
