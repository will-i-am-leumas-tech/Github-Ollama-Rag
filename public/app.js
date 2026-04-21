const app = document.getElementById('app');

function getRouteRepo() {
  const match = window.location.pathname.match(/^\/repo\/([^/]+)\/([^/?#]+)/);
  if (!match) return null;
  return { owner: decodeURIComponent(match[1]), repo: decodeURIComponent(match[2]) };
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function appendChat(role, text) {
  const chatLog = document.getElementById('chatLog');
  if (!chatLog) return;
  const div = document.createElement('div');
  const isUser = role.toLowerCase() === 'you';
  div.className = `chat-msg ${isUser ? 'user' : 'assistant'}`;
  div.innerHTML = `<strong>${escapeHtml(role)}</strong><div>${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function replaceLastChat(role, text) {
  const chatLog = document.getElementById('chatLog');
  if (!chatLog) return;
  const last = chatLog.lastElementChild;
  if (!last) return appendChat(role, text);
  const isUser = role.toLowerCase() === 'you';
  last.className = `chat-msg ${isUser ? 'user' : 'assistant'}`;
  last.innerHTML = `<strong>${escapeHtml(role)}</strong><div>${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderSearchPage() {
  app.innerHTML = `
    <div class="page">
      <div class="search-container">
        <div class="brand">Leumas Repo RAG</div>
        <p class="subtle">Ask Ollama questions about any GitHub repo locally.</p>
        <div class="search-row">
          <input id="repoInput" class="input" placeholder="owner/repo or https://github.com/owner/repo" autofocus />
          <button id="goBtn" class="btn btn-primary">Load Repo</button>
        </div>
        <p id="errorBox" class="subtle" style="color: var(--danger); margin-top: 16px;"></p>
      </div>
    </div>
  `;

  const input = document.getElementById('repoInput');
  const btn = document.getElementById('goBtn');
  const errorBox = document.getElementById('errorBox');

  async function submit() {
    errorBox.textContent = '';
    try {
      const data = await api('/api/parse-repo', {
        method: 'POST',
        body: JSON.stringify({ input: input.value })
      });
      window.location.href = `/repo/${encodeURIComponent(data.owner)}/${encodeURIComponent(data.repo)}`;
    } catch (error) {
      errorBox.textContent = error.message;
    }
  }

  btn.onclick = submit;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') submit();
  });
}

async function renderRepoPage(owner, repo) {
  app.innerHTML = `
    <div class="page">
      <div class="header-nav">
        <button id="homeBtn" class="btn">← Back</button>
        <div class="header-title" style="flex: 1;">${escapeHtml(owner)} / ${escapeHtml(repo)}</div>
        <button id="functionIndexBtn" class="btn btn-primary">Index Functions</button>
        <div class="model-selectors" style="display: flex; gap: 8px; align-items: center;">
          <span class="subtle" style="font-size: 11px;">Model:</span>
          <select id="modelSelect" class="input" style="padding: 2px 4px; font-size: 12px; height: 24px; min-width: 120px;">
            <option value="">Loading models...</option>
          </select>
        </div>
      </div>
      <div class="repo-layout">
        <div class="panel sidebar">
          <div class="panel-header">
            Files
            <button id="setupBtn" class="btn mini">Download / Setup</button>
          </div>
          <div class="panel-content">
            <div id="treeBox"></div>
          </div>
        </div>

        <div class="panel viewer">
          <div id="viewerHeader" class="viewer-header">Select a file...</div>
          <div class="panel-content" style="padding: 0;">
            <div id="viewerBox">
              <div style="padding: 40px; text-align: center;" class="subtle">
                Select a file from the sidebar to view its content.
              </div>
            </div>
          </div>
        </div>

        <div class="panel chat-panel">
          <div class="panel-header">
            Ollama Assistant
            <div class="status-row">
              <span id="localBadge" class="badge">Checking...</span>
            </div>
          </div>
          <div id="chatLog" class="chat-log"></div>
          <div class="chat-footer">
            <div class="chat-input-wrap">
              <textarea id="chatInput" class="chat-input" placeholder="Ask a question about this repository..."></textarea>
              <div style="display: flex; justify-content: flex-end;">
                <button id="chatBtn" class="btn btn-primary">Send</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="functionPanel" class="function-panel">
        <div class="panel-header">
          <button id="functionPanelToggle" class="panel-title-btn" title="Toggle function index" aria-expanded="true">
            <span id="functionPanelChevron" class="panel-chevron">▾</span>
            <span>Function Index</span>
            <span id="functionSummary" class="subtle"></span>
          </button>
          <div class="status-row">
            <span id="functionIndexBadge" class="badge">Checking...</span>
          </div>
        </div>
        <div id="functionList" class="function-list">
          <div class="function-empty subtle"><span class="spinner"></span> Loading function index...</div>
        </div>
      </div>
    </div>
  `;

  const treeBox = document.getElementById('treeBox');
  const viewerBox = document.getElementById('viewerBox');
  const viewerHeader = document.getElementById('viewerHeader');
  const setupBtn = document.getElementById('setupBtn');
  const homeBtn = document.getElementById('homeBtn');
  const chatBtn = document.getElementById('chatBtn');
  const chatInput = document.getElementById('chatInput');
  const localBadge = document.getElementById('localBadge');
  const modelSelect = document.getElementById('modelSelect');
  const functionIndexBtn = document.getElementById('functionIndexBtn');
  const functionPanel = document.getElementById('functionPanel');
  const functionPanelToggle = document.getElementById('functionPanelToggle');
  const functionPanelChevron = document.getElementById('functionPanelChevron');
  const functionList = document.getElementById('functionList');
  const functionSummary = document.getElementById('functionSummary');
  const functionIndexBadge = document.getElementById('functionIndexBadge');

  let selectedPath = '';
  const functionPanelStorageKey = `functionPanelCollapsed:${owner}/${repo}`;

  // Load available models
  async function loadOllamaModels() {
    try {
      const { models } = await api('/api/ollama/models');
      if (models && models.length) {
        modelSelect.innerHTML = models.map(m => `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`).join('');

        // Try to select a good default
        const defaultModel = models.find(m => m.name.includes('llama3.1')) || models.find(m => m.name.includes('llama3')) || models[0];
        if (defaultModel) modelSelect.value = defaultModel.name;
      } else {
        modelSelect.innerHTML = '<option value="">No models found</option>';
      }
    } catch (err) {
      modelSelect.innerHTML = '<option value="">Error loading</option>';
    }
  }
  loadOllamaModels();

  homeBtn.onclick = () => { window.location.href = '/'; };

  function setFunctionPanelCollapsed(collapsed) {
    functionPanel.classList.toggle('collapsed', collapsed);
    functionPanelToggle.setAttribute('aria-expanded', String(!collapsed));
    functionPanelChevron.textContent = collapsed ? '▸' : '▾';
    localStorage.setItem(functionPanelStorageKey, collapsed ? '1' : '0');
  }

  functionPanelToggle.onclick = () => {
    setFunctionPanelCollapsed(!functionPanel.classList.contains('collapsed'));
  };
  setFunctionPanelCollapsed(localStorage.getItem(functionPanelStorageKey) === '1');

  function renderFunctionState(message, options = {}) {
    const showSpinner = options.spinner !== false;
    const color = options.danger ? ' style="color: var(--danger);"' : '';
    functionList.innerHTML = `
      <div class="function-empty subtle"${color}>
        ${showSpinner ? '<span class="spinner"></span>' : ''}
        <span>${escapeHtml(message)}</span>
      </div>
    `;
  }

  function renderIoContract(io) {
    if (!io) return '';
    const inputs = Array.isArray(io.inputs) && io.inputs.length
      ? io.inputs.map(input => `${escapeHtml(input.name || 'arg')}: ${escapeHtml(input.type || 'unknown')}`).join(', ')
      : 'none';
    const output = io.output?.type || 'unknown';
    return `
      <div class="function-contract">
        <span>Inputs: ${inputs}</span>
        <span>Output: ${escapeHtml(output)}</span>
      </div>
    `;
  }

  function renderFunctionIndex(data) {
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const totals = data.summary?.totals || {};
    const callableCount = totals.callable ?? entries.filter(entry => entry.callable).length;

    functionSummary.textContent = entries.length
      ? ` ${entries.length} found · ${callableCount} callable`
      : '';
    functionIndexBadge.textContent = data.indexed ? 'Indexed' : 'Not indexed';
    if (data.source === 'archive') functionIndexBadge.textContent = 'Archived';

    if (!data.indexed) {
      renderFunctionState('No function index yet.');
      return;
    }

    if (!entries.length) {
      renderFunctionState('No functions found.', { spinner: false });
      return;
    }

    functionList.innerHTML = entries
      .slice()
      .sort((a, b) => {
        return String(a.relativePath || '').localeCompare(String(b.relativePath || ''))
          || String(a.exportName || '').localeCompare(String(b.exportName || ''));
      })
      .map(entry => {
        const signature = entry.signature || '';
        const label = `${entry.exportName || '(anonymous)'}${signature}`;
        const runtime = entry.language || entry.runtime || 'unknown';
        const execution = entry.executionKind ? `<span class="badge">${escapeHtml(entry.executionKind)}</span>` : '';
        return `
          <div class="function-row">
            <div class="function-main">
              <div class="function-name">${escapeHtml(label)}</div>
              <div class="function-path">${escapeHtml(entry.relativePath || '')}</div>
              ${renderIoContract(entry.io)}
            </div>
            <div class="function-meta">
              <span class="badge">${escapeHtml(entry.type || 'unknown')}</span>
              <span class="badge">${escapeHtml(runtime)}</span>
              ${execution}
              ${entry.callable ? '<span class="badge callable">Callable</span>' : ''}
            </div>
          </div>
        `;
      })
      .join('');
  }

  async function loadFunctionIndex() {
    renderFunctionState('Loading function index...');
    try {
      const data = await api(`/api/repo/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/functions`);
      renderFunctionIndex(data);
    } catch (error) {
      functionIndexBadge.textContent = 'Error';
      renderFunctionState(`Error: ${error.message}`, { danger: true, spinner: false });
    }
  }

  functionIndexBtn.onclick = async () => {
    functionIndexBtn.disabled = true;
    functionIndexBtn.textContent = 'Indexing...';
    functionIndexBadge.textContent = 'Indexing...';
    renderFunctionState('Indexing repository functions...');
    try {
      const data = await api(`/api/repo/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/functions/index`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      renderFunctionIndex(data);
      localBadge.textContent = 'Local ✅';
      setupBtn.textContent = 'Re-index';
      await refreshTree();
    } catch (error) {
      functionIndexBadge.textContent = 'Failed';
      renderFunctionState(`Error: ${error.message}`, { danger: true, spinner: false });
    } finally {
      functionIndexBtn.disabled = false;
      functionIndexBtn.textContent = 'Index Functions';
    }
  };

  async function refreshTree() {
    try {
      const data = await api(`/api/repo/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tree`);
      if (!data.tree || !data.tree.length) {
        treeBox.innerHTML = '<p class="subtle" style="padding: 16px;">Repo content not available.</p>';
        return;
      }

      const root = { name: '', type: 'tree', children: {} };
      data.tree.forEach(item => {
        const parts = item.path.split('/');
        let current = root;
        parts.forEach((part, idx) => {
          if (!current.children[part]) {
            current.children[part] = {
              name: part,
              path: parts.slice(0, idx + 1).join('/'),
              type: (idx === parts.length - 1) ? item.type : 'tree',
              children: {}
            };
          }
          current = current.children[part];
        });
      });

      function renderNode(node, name) {
        if (!name) {
          return Object.keys(node.children)
            .sort((a, b) => {
              const na = node.children[a], nb = node.children[b];
              if (na.type !== nb.type) return na.type === 'tree' ? -1 : 1;
              return a.localeCompare(b);
            })
            .map(childName => renderNode(node.children[childName], childName))
            .join('');
        }
        const isFolder = node.type === 'tree';
        return `
          <div class="tree-node" data-path="${escapeHtml(node.path)}">
            <div class="tree-item ${selectedPath === node.path ? 'selected' : ''}" data-path="${escapeHtml(node.path)}" data-type="${node.type}">
              <span class="tree-expander ${isFolder ? '' : 'subtle'} ${isFolder ? 'can-open' : ''}" style="visibility: ${isFolder ? 'visible' : 'hidden'}">▶</span>
              <span class="tree-icon">${isFolder ? '📁' : '📄'}</span>
              <span class="tree-item-name">${escapeHtml(name)}</span>
            </div>
            ${isFolder ? `<div class="tree-folder-content" data-path="${escapeHtml(node.path)}">${
              Object.keys(node.children)
                .sort((a, b) => {
                  const na = node.children[a], nb = node.children[b];
                  if (na.type !== nb.type) return na.type === 'tree' ? -1 : 1;
                  return a.localeCompare(b);
                })
                .map(childName => renderNode(node.children[childName], childName))
                .join('')
            }</div>` : ''}
          </div>
        `;
      }

      treeBox.innerHTML = renderNode(root, '');

      treeBox.querySelectorAll('.tree-item').forEach(el => {
        el.onclick = async (e) => {
          e.stopPropagation();
          const path = el.dataset.path;
          const type = el.dataset.type;

          treeBox.querySelectorAll('.tree-item').forEach(i => i.classList.remove('selected'));
          el.classList.add('selected');
          selectedPath = path;

          const breadcrumbs = path.split('/').map((part, i, arr) => {
            const p = arr.slice(0, i + 1).join('/');
            return `<span class="breadcrumb" data-path="${escapeHtml(p)}">${escapeHtml(part)}</span>`;
          }).join(' / ');

          if (type === 'tree') {
            const content = el.parentElement.querySelector('.tree-folder-content');
            const expander = el.querySelector('.tree-expander');
            if (content) {
              content.classList.toggle('open');
              expander.classList.toggle('open');
            }
            viewerHeader.innerHTML = breadcrumbs;
            viewerBox.innerHTML = `<div style="padding: 40px; text-align: center;" class="subtle">Folder: <strong>${escapeHtml(selectedPath)}</strong><br>Select a file to view content.</div>`;
          } else {
            try {
              const file = await api(`/api/repo/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/file?path=${encodeURIComponent(path)}`);
              viewerHeader.innerHTML = breadcrumbs;
              viewerBox.innerHTML = `<pre class="file-content">${escapeHtml(file.content)}</pre>`;
            } catch (err) {
              viewerBox.innerHTML = `<div style="padding: 40px; color: var(--danger)">Error: ${escapeHtml(err.message)}</div>`;
            }
          }

          viewerHeader.querySelectorAll('.breadcrumb').forEach(b => {
            b.onclick = () => {
              const targetPath = b.dataset.path;
              const parts = targetPath.split('/');
              for (let i = 1; i <= parts.length; i++) {
                const p = parts.slice(0, i).join('/');
                const folderContent = treeBox.querySelector(`.tree-folder-content[data-path="${p}"]`);
                const folderExpander = treeBox.querySelector(`.tree-node[data-path="${p}"] .tree-expander`);
                if (folderContent && !folderContent.classList.contains('open')) {
                  folderContent.classList.add('open');
                  folderExpander?.classList.add('open');
                }
              }
              const targetEl = treeBox.querySelector(`.tree-item[data-path="${targetPath}"]`);
              if (targetEl) targetEl.click();
            };
          });
        };
      });
    } catch (err) {
      treeBox.innerHTML = '<p class="subtle" style="padding: 16px;">Failed to load tree.</p>';
    }
  }

  setupBtn.onclick = async () => {
    setupBtn.disabled = true;
    setupBtn.textContent = 'Setting up...';
    try {
      const embedModel = modelSelect.value;
      await api(`/api/repo/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/setup`, { 
        method: 'POST',
        body: JSON.stringify({ embedModel })
      });
      setupBtn.textContent = 'Re-index';
      localBadge.textContent = 'Local ✅';
      await refreshTree();
    } catch (error) {
      setupBtn.textContent = 'Setup Failed';
      alert(error.message);
    } finally {
      setupBtn.disabled = false;
    }
  };

  chatBtn.onclick = async () => {
    const question = chatInput.value.trim();
    if (!question) return;
    appendChat('You', question);
    chatInput.value = '';

    const isLocal = localBadge.textContent.includes('Local');
    appendChat('Assistant', 'Thinking...');

    try {
      const chatModel = modelSelect.value;
      const embedModel = modelSelect.value;
      const result = await api(`/api/repo/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/chat`, {
        method: 'POST',
        body: JSON.stringify({ question, selectedPath, chatModel, embedModel })
      });      // Update local badge if it was a preview
      if (!isLocal) {
        localBadge.textContent = 'Local ✅';
        setupBtn.textContent = 'Re-index';
        await refreshTree();
      }

      const sourceText = result.sources?.length ? `\n\nSources:\n${result.sources.map(s => `- ${s.path}`).join('\n')}` : '';
      replaceLastChat('Assistant', `${result.answer}${sourceText}`);
    } catch (error) {
      replaceLastChat('Assistant', error.message);
    }
  };
  chatInput.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') chatBtn.click();
  });

  try {
    const metaData = await api(`/api/repo/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/meta`);
    localBadge.textContent = metaData.local ? 'Local ✅' : 'Preview 🌐';
    if (metaData.local) setupBtn.textContent = 'Re-index';
    await refreshTree();
    await loadFunctionIndex();
  } catch (err) {
    app.innerHTML = `<div class="search-container"><h2 style="color:var(--danger)">Repo not found</h2><button class="btn" onclick="location.href='/'">Go Back</button></div>`;
  }
}

const routeRepo = getRouteRepo();
if (routeRepo) renderRepoPage(routeRepo.owner, routeRepo.repo);
else renderSearchPage();
