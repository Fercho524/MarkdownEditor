// === notebar.js ===

// Inicializa el select de directorios base
async function initializeBaseDirSelect() {
  const select = document.getElementById('baseDirSelect');
  select.innerHTML = '';

  const favoriteDirs = config.favoriteDirs || [];
  favoriteDirs.forEach(dir => {
    const option = document.createElement('option');
    option.value = dir;
    const parts = splitPath(dir);
    option.textContent = parts[parts.length - 1] || dir;
    if (dir === config.currentBaseDir) option.selected = true;
    select.appendChild(option);
  });
}

// Render de directorios y archivos con estilo PhotonKit
async function renderDirFiles() {
  const { dirs, files, currentDir } = await window.api.getDirectoryData();
  const dirUl = document.getElementById('dirs');
  const fileUl = document.getElementById('files');

  // Aplicar clases de PhotonKit
  dirUl.classList.add('list-group');
  fileUl.classList.add('list-group');

  dirUl.innerHTML = '';
  ['..', ...dirs].forEach(name => {
    const li = document.createElement('li');
    li.classList.add('list-group-item');
    const icon = document.createElement('i');
    icon.classList.add('icon', name === '..' ? 'icon-level-up' : 'icon-folder');
    li.append(icon);
    const span = document.createElement('span'); span.textContent = name; li.append(span);
    li.onclick = async () => {
      await window.api.changeDirectory(name);
      currentFilePath = null;
      clearEditor();
      await renderDirFiles();
      renderTabs();
      updateHistoryButtons();
    };
    li.oncontextmenu = e => { e.preventDefault(); if (name !== '..') window.api.showDirContextMenu(name); };
    dirUl.appendChild(li);
  });

  fileUl.innerHTML = '';
  files.forEach(name => {
    const rel = currentDir.replace(config.currentBaseDir + '/', '');
    const pathStr = rel ? `${rel}/${name}` : name;
    const li = document.createElement('li');
    li.classList.add('list-group-item'); li.dataset.path = pathStr;
    const icon = document.createElement('i'); icon.classList.add('icon', 'icon-note'); li.append(icon);
    const span = document.createElement('span'); span.textContent = name; li.append(span);
    li.classList.toggle('active', pathStr === currentFilePath);
    li.onclick = () => openFile(pathStr, true);
    li.oncontextmenu = e => { e.preventDefault(); window.api.showFileContextMenu(name); };
    fileUl.appendChild(li);
  });
}

// Limpia el editor
function clearEditor() {
  const edt = document.getElementById('editor');
  const btn = document.getElementById('saveBtn');
  edt.value = '';
  edt.disabled = true;
  btn.disabled = true;
}

// Carga un texto en el editor
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

// Cambia el modo de vista
function setViewMode(mode) {
  const mdArea = document.getElementById('editor');
  const mdRender = document.getElementById('content');
  const toggle = document.getElementById('toggleViewBtn');
  const container = document.getElementById('editorContainer');

  // Limpiar todas las clases previas
  container.classList.remove('split-view');

  if (mode === 'render') {
    mdArea.style.display = 'none';
    mdRender.style.display = 'block';
    toggle.innerHTML = '<span class="icon icon-doc-text"></span>'; // icono markdown
  } else if (mode === 'markdown') {
    mdArea.style.display = 'block';
    mdRender.style.display = 'none';
    toggle.innerHTML = '<span class="icon icon-eye"></span>'; // icono HTML preview
  } else {
    mdArea.style.display = 'block';
    mdRender.style.display = 'block';
    container.classList.add('split-view');
    toggle.innerHTML = '<span class="icon icon-layout"></span>'; // icono dividido
  }

  // Actualizar el modo de vista en los estados
  fileStates[currentFilePath].viewMode = mode;
}

// Abre una nota
async function openFile(pathStr, addHistory) {
  const fileName = await navigateToFileDir(pathStr);
  const content = await window.api.readFile(fileName);

  // Guarda el archivo anterior para posible limpieza
  const previousFile = currentFilePath;

  currentFilePath = pathStr;
  currentFileName = fileName;

  // Inicializa el estado si es la primera vez
  if (!fileStates[currentFilePath]) {
    fileStates[currentFilePath] = { viewMode: 'split', edited: false };
  }

  fillEditor(content);

  // Aplica split‐view si corresponde
  if (fileStates[currentFilePath].viewMode === 'split') {
    document.getElementById('editorContainer').classList.add('split-view');
  }

  // — Evitar duplicados: solo añadimos si no está —
  if (!openTabs.includes(pathStr)) {
    openTabs.push(pathStr);
    await window.api.updateConfig({ currentOpenedFiles: openTabs });
  }

  // — Si cambiamos de archivo y el anterior no fue editado, lo quitamos —
  if (previousFile && previousFile !== pathStr && !fileStates[previousFile].edited) {
    const i = openTabs.indexOf(previousFile);
    if (i !== -1) {
      openTabs.splice(i, 1);
      await window.api.updateConfig({ currentOpenedFiles: openTabs });
    }
  }

  // Historial
  if (addHistory) {
    history = history.filter(p => p !== pathStr).concat(pathStr);
    if (history.length > 100) history.shift();
    await window.api.updateConfig({ fileHistory: history });
  }

  // Archivo actual en config
  await window.api.updateConfig({ currentFile: pathStr });

  // Re‑render UI
  renderTabs();
  highlightActiveFile();
  updateHistoryButtons();
}





// Inicialización
(async function init() {
  config = await window.api.getConfig();
  openTabs = [...config.currentOpenedFiles];
  history = [...config.fileHistory];
  currentFilePath = config.currentFile || null;

  initializeBaseDirSelect();
  await renderDirFiles();
  renderTabs();
  updateHistoryButtons();
  bindToolbarEvents();
  bindContextMenuHandler();
})();
