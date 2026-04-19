const { OLLAMA_BASE_URL, OLLAMA_CHAT_MODEL } = require('./config');

async function listModels() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.models || [];
  } catch {
    return [];
  }
}

async function chatWithOllama(prompt, modelOverride = null) {
  const model = modelOverride || OLLAMA_CHAT_MODEL;
  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ollama chat failed: ${res.status}${body ? ` - ${body.slice(0, 180)}` : ''}`);
  }

  const data = await res.json();
  return data.response || '';
}

module.exports = {
  chatWithOllama,
  listModels
};
