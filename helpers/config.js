const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  OLLAMA_CHAT_MODEL: process.env.OLLAMA_CHAT_MODEL || 'llama3.1',
  OLLAMA_EMBED_MODEL: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  LOCAL_REPO_ROOT: process.env.LOCAL_REPO_ROOT || path.join(process.cwd(), 'data', 'repos'),
  LOCAL_INDEX_ROOT: process.env.LOCAL_INDEX_ROOT || path.join(process.cwd(), 'data', 'indexes'),
  FUNCTION_INDEX_ARCHIVE_ROOT: process.env.FUNCTION_INDEX_ARCHIVE_ROOT || path.join(process.cwd(), 'data', 'function-indexes'),
  CACHE_ROOT: path.join(process.cwd(), 'data', 'cache'),
  MAX_FILE_SIZE_BYTES: Number(process.env.MAX_FILE_SIZE_BYTES || 300000),
  MAX_CHUNK_SIZE: Number(process.env.MAX_CHUNK_SIZE || 1400),
  CHUNK_OVERLAP: Number(process.env.CHUNK_OVERLAP || 200)
};
