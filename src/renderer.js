let config;
let openTabs = [];
let history = [];
let currentFilePath = null;
let currentFileName = null;
let fileStates = {}; // { [path]: { viewMode, edited } }

// Helpers
function splitPath(p) {
  return p.split('/').filter(Boolean);
}

async function navigateToFileDir(pathStr) {
  const parts = splitPath(pathStr);
  const fileName = parts.pop();
  await window.api.changeBaseDir(config.currentBaseDir);
  for (const d of parts) await window.api.changeDirectory(d);
  const data = await window.api.getDirectoryData();
  window.currentDir = data.currentDir;
  return fileName;
}


// UI: Render de directorios y archivos —
async function renderDirFiles() {
  const { dirs, files, currentDir } = await window.api.getDirectoryData();

  const dirUl = document.getElementById('dirs');
  const fileUl = document.getElementById('files');

  dirUl.innerHTML = '';

  // Funcionalidad a cada directorio
  ['..', ...dirs].forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;
    li.onclick = async () => {
      await window.api.changeDirectory(name);
      currentFilePath = null;
      clearEditor();
      await renderDirFiles();
      renderTabs();
      updateHistoryButtons();
    };
    li.oncontextmenu = e => {
      e.preventDefault();
      if (name !== '..') window.api.showDirContextMenu(name);
    };
    dirUl.appendChild(li);
  });

  fileUl.innerHTML = '';

  // Funcionalidad a cada archivo
  files.forEach(name => {
    const rel = currentDir.replace(config.currentBaseDir + '/', '');
    const pathStr = rel ? `${rel}/${name}` : name;
    const li = document.createElement('li');
    li.textContent = name;
    li.dataset.path = pathStr;

    // Active file highlight
    if (pathStr === currentFilePath) li.classList.add('active');
    li.onclick = () => openFile(pathStr, true);
    li.oncontextmenu = e => {
      e.preventDefault();
      window.api.showFileContextMenu(name);
    };
    fileUl.appendChild(li);
  });
}

function renderTabs() {
  const tabsUl = document.getElementById('tabs');
  tabsUl.innerHTML = '';
  openTabs.forEach(pathStr => {
    const parts = splitPath(pathStr);
    const label = parts.pop();
    const li = document.createElement('li');
    li.classList.toggle('active', pathStr === currentFilePath);
    li.innerHTML = `
      <span class="tab-label">${label}</span>
      <span class="tab-close">×</span>
    `;
    li.querySelector('.tab-label').onclick = () => openFile(pathStr, false);
    li.querySelector('.tab-close').onclick = e => {
      e.stopPropagation();
      closeTab(pathStr);
    };
    tabsUl.appendChild(li);
  });
}

function highlightActiveFile() {
  document.querySelectorAll('#files li').forEach(li => {
    li.classList.toggle('active', li.dataset.path === currentFilePath);
  });
}


// — Editor —
function clearEditor() {
  const edt = document.getElementById('editor');
  const btn = document.getElementById('saveBtn');
  edt.value = '';
  edt.disabled = true;
  btn.disabled = true;
}

function fillEditor(text) {
  const edt = document.getElementById('editor');
  const btn = document.getElementById('saveBtn');
  const toggleBtn = document.getElementById('toggleViewBtn');

  edt.value = text;
  edt.disabled = false;
  btn.disabled = false;
  toggleBtn.disabled = false;

  if (!fileStates[currentFilePath]) {
    fileStates[currentFilePath] = { viewMode: 'split', edited: false };
  }

  edt.dispatchEvent(new Event('input'));
}

function setViewMode(mode) {
  const mdArea = document.getElementById('editor');
  const mdRender = document.getElementById('content');
  const toggle = document.getElementById('toggleViewBtn');

  if (mode === 'render') {
    mdArea.style.display = 'none';
    mdRender.style.display = 'block';
    toggle.textContent = 'Vista Markdown';
  } else if (mode === 'markdown') {
    mdArea.style.display = 'block';
    mdRender.style.display = 'none';
    toggle.textContent = 'Vista HTML';
  } else {
    mdArea.style.display = 'block';
    mdRender.style.display = 'block';
    toggle.textContent = 'Vista Dividida';
  }
  fileStates[currentFilePath].viewMode = mode;
}

// — Archivos —
async function openFile(pathStr, addHistory) {
  const fileName = await navigateToFileDir(pathStr);
  const content = await window.api.readFile(fileName);

  currentFilePath = pathStr;
  currentFileName = fileName;

  if (!fileStates[currentFilePath]) {
    fileStates[currentFilePath] = { viewMode: 'split', edited: false };
  }

  fillEditor(content);

  const idx = openTabs.indexOf(pathStr);
  if (idx === -1) {
    const last = openTabs[openTabs.length - 1];
    if (last && !fileStates[last]?.edited) {
      openTabs[openTabs.length - 1] = pathStr;
    } else {
      openTabs.push(pathStr);
    }
  } else {
    if (fileStates[pathStr].edited) {
      openTabs.splice(idx, 1);
      openTabs.push(pathStr);
    }
  }

  await window.api.updateConfig({ currentOpenedFiles: openTabs });

  if (addHistory) {
    // Mover el path al final del historial (el más reciente), eliminando duplicados
    history = history.filter(p => p !== pathStr);
    history.push(pathStr);

    if (history.length > 100) history.shift();
    await window.api.updateConfig({ fileHistory: history });
  }

  await window.api.updateConfig({ currentFile: pathStr });

  renderTabs();
  highlightActiveFile();
  updateHistoryButtons();
}


function closeTab(pathStr) {
  openTabs = openTabs.filter(p => p !== pathStr);
  window.api.updateConfig({ currentOpenedFiles: openTabs });
  if (currentFilePath === pathStr) {
    if (openTabs.length) openFile(openTabs[openTabs.length - 1], false);
    else { currentFilePath = null; clearEditor(); }
  }
  renderTabs();
}

// — Historial —
function navigateHistory(offset) {
  if (history.length <= 1 || !currentFilePath) return;
  const idx = history.lastIndexOf(currentFilePath);
  const newIdx = (idx + offset + history.length) % history.length;
  openFile(history[newIdx], false);
}

function updateHistoryButtons() {
  document.getElementById('backBtn').disabled = history.length <= 1;
  document.getElementById('forwardBtn').disabled = history.length <= 1;
}


// — UI: Toolbar & diálogo —
function bindToolbarEvents() {
  document.getElementById('saveBtn').addEventListener('click', async () => {
    if (!currentFileName) return;
    const content = document.getElementById('editor').value;
    await window.api.saveFile(currentFileName, content);
    alert('¡Guardado exitoso!');
    fileStates[currentFilePath].edited = false;
  });

  document.getElementById('toggleViewBtn').addEventListener('click', () => {
    if (!currentFilePath) return;
    const st = fileStates[currentFilePath];
    const next = st.viewMode === 'split' ? 'markdown'
      : st.viewMode === 'markdown' ? 'render'
        : 'split';
    setViewMode(next);
  });

  document.getElementById('newDirBtn').addEventListener('click', async () => {
    const name = await askForInput('Nombre de la nueva carpeta:');
    if (!name) return;
    await window.api.createDirectory(name);
    await renderDirFiles(); renderTabs(); updateHistoryButtons();
  });

  document.getElementById('newFileBtn').addEventListener('click', async () => {
    const name = await askForInput('Nombre del nuevo archivo (.txt/.md):');
    if (!name) return;
    await window.api.createFile(name);
    await renderDirFiles(); renderTabs(); updateHistoryButtons();
  });

  document.getElementById('backBtn').addEventListener('click', () => navigateHistory(-1));
  document.getElementById('forwardBtn').addEventListener('click', () => navigateHistory(1));
}

function askForInput(title, defaultValue = '') {
  return new Promise(resolve => {
    const dialog = document.getElementById('inputDialog');
    const label = document.getElementById('dialogLabel');
    const input = document.getElementById('dialogInput');
    const confirmBtn = document.getElementById('confirmBtn');
    label.textContent = title;
    input.value = defaultValue;
    input.onkeydown = e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmBtn.click();
      }
    };
    dialog.onclose = () =>
      resolve(dialog.returnValue === 'confirm' ? input.value.trim() || null : null);
    dialog.showModal();
  });
}


// — Context menu —
function bindContextMenuHandler() {
  window.api.onContextMenuAction(async ({ action, name }) => {
    if (action === 'rename') {
      const nuevo = await askForInput(`Renombrar "${name}" a:`, name);
      if (nuevo && nuevo !== name) {
        await window.api.renameItem(name, nuevo);
        openTabs = openTabs.map(p => p.replace(new RegExp(`/${name}$`), `/${nuevo}`));
        history = history.map(p => p.replace(new RegExp(`/${name}$`), `/${nuevo}`));
        await window.api.updateConfig({ currentOpenedFiles: openTabs, fileHistory: history });
      }
    }
    if (action === 'delete') {
      if (confirm(`¿Borrar "${name}"? Esto NO se puede deshacer.`)) {
        await window.api.deleteItem(name);
        openTabs = openTabs.filter(p => !p.endsWith(`/${name}`));
        history = history.filter(p => !p.endsWith(`/${name}`));
        if (currentFilePath && currentFilePath.endsWith(`/${name}`)) {
          currentFilePath = null;
          clearEditor();
        }
        await window.api.updateConfig({ currentOpenedFiles: openTabs, fileHistory: history });
      }
    }
    await renderDirFiles();
    renderTabs();
    updateHistoryButtons();
  });
}



// — Inicialización —
async function init() {
  config = await window.api.getConfig();

  // Base Dir changing
  const baseDirSelect = document.getElementById('baseDirSelect');
  baseDirSelect.innerHTML = '';

  document.querySelectorAll('a[href]').forEach(link => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const url = link.getAttribute('href');
      window.electronAPI.openExternalLink(url);
    });
  });

  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (a && a.href.startsWith('http')) {
      e.preventDefault();
      window.electronAPI.openExternalLink(a.href);
    }
  });

  config.favoriteDirs.forEach(dir => {
    const opt = document.createElement('option');
    opt.value = dir;
    opt.textContent = dir.split('/').pop();
    if (dir === config.currentBaseDir) opt.selected = true;
    baseDirSelect.appendChild(opt);
  });

  document.getElementById('openSettingsBtn').addEventListener('click', () => {
    window.api.openSettings();
  });

  baseDirSelect.addEventListener('change', async e => {
    const newBase = e.target.value;

    // 1) Llama al main y actualiza local y en config
    await window.api.changeBaseDir(newBase);
    config.currentBaseDir = newBase;
    config.currentDir = newBase;

    // 2) Limpia TODO el estado del directorio viejo
    openTabs = [];
    history = [];
    fileStates = {};
    currentFilePath = null;
    currentFileName = null;

    // 3) Persiste en config.json
    await window.api.updateConfig({
      currentBaseDir: newBase,
      currentDir: newBase,
      currentOpenedFiles: [],
      fileHistory: [],
      currentFile: null
    });

    // 4) Limpia interfaz y renderiza el nuevo base
    clearEditor();
    renderTabs();
    updateHistoryButtons();
    await renderDirFiles();
  });


  openTabs = [...config.currentOpenedFiles];
  history = [...config.fileHistory];
  currentFilePath = config.currentFile || null;

  await renderDirFiles();
  renderTabs();
  updateHistoryButtons();
  bindToolbarEvents();
  bindContextMenuHandler();
}

init();
