const { OLLAMA_BASE_URL, OLLAMA_EMBED_MODEL } = require('./config');

async function embedText(text, modelOverride = null) {
  const model = modelOverride || OLLAMA_EMBED_MODEL;
  const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: text
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Embedding request failed: ${res.status}${body ? ` - ${body.slice(0, 180)}` : ''}`);
  }

  const data = await res.json();
  return data.embedding;
}

module.exports = {
  embedText
};
