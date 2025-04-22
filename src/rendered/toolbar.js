function bindToolbarEvents() {
  document.getElementById('saveBtn').onclick = async () => {
    if (!currentFileName) return;
    const content = document.getElementById('editor').value;
    await window.api.saveFile(currentFileName, content);
    alert('¡Guardado exitoso!');
    fileStates[currentFilePath].edited = false;
  };

  document.getElementById('toggleViewBtn').onclick = () => {
    if (!currentFilePath) return;
    const st = fileStates[currentFilePath];
    const next = st.viewMode === 'split' ? 'markdown'
      : st.viewMode === 'markdown' ? 'render'
        : 'split';
    setViewMode(next);
  };

  document.getElementById('newDirBtn').onclick = async () => {
    const name = await askForInput('Nombre de la nueva carpeta:');
    if (!name) return;
    await window.api.createDirectory(name);
    await renderDirFiles();
    renderTabs();
    updateHistoryButtons();
  };

  document.getElementById('newFileBtn').onclick = async () => {
    const name = await askForInput('Nombre del nuevo archivo (.txt/.md):');
    if (!name) return;
    await window.api.createFile(name);
    await renderDirFiles();
    renderTabs();
    updateHistoryButtons();
  };

  document.getElementById('backBtn').onclick = () => navigateHistory(-1);
  document.getElementById('forwardBtn').onclick = () => navigateHistory(1);

  // Cambio de directorio base
  document.getElementById('baseDirSelect').onchange = async e => {
    const newBase = e.target.value;
    await window.api.changeBaseDir(newBase);
    config.currentBaseDir = newBase;
    config.currentDir = newBase;
    openTabs = []; history = []; fileStates = {}; currentFilePath = null; currentFileName = null;
    await window.api.updateConfig({
      currentBaseDir: newBase,
      currentDir: newBase,
      currentOpenedFiles: [],
      fileHistory: [],
      currentFile: null
    });
    clearEditor();
    renderTabs();
    updateHistoryButtons();
    await renderDirFiles();
  };

  // Botón configuración
  document.getElementById('openSettingsBtn').onclick = () => {
    window.api.openSettings();
  };
}

// Context menu
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

// Historial circular
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
