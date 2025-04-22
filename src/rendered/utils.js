// === utils.js ===
let config;
let openTabs = [];
let history = [];
let currentFilePath = null;
let currentFileName = null;
let fileStates = {}; // { [path]: { viewMode, edited } }

// splitPath y navigateToFileDir
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

// Diálogo genérico
function askForInput(title, defaultValue = '') {
  return new Promise(resolve => {
    const dialog     = document.getElementById('inputDialog');
    const label      = document.getElementById('dialogLabel');
    const input      = document.getElementById('dialogInput');
    const confirmBtn = document.getElementById('confirmBtn');
    label.textContent = title;
    input.value       = defaultValue;
    input.onkeydown   = e => {
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
