const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');

// Config Directory
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Config inválido, recreando...', e);
  }
  const defaultConfig = {
    currentOpenedFiles: [],
    currentFile: '',
    favoriteDirs: [path.resolve('/home/darkplayer/Descargas/Notas')],
    currentBaseDir: path.resolve('/home/darkplayer/Descargas/Notas'),
    currentDir: path.resolve('/home/darkplayer/Descargas/Notas'),
    fileHistory: [],
    globalThemeCSSPath: '',
    editorThemeCSSPath: '',
    editorMonospaceFont: '',
    editorLanguage: '',
    dateFormat: '',
    sintaxTheme: '',
    pdfSize: 'A4',
    editorFontSize: '',
    autosave: true,
    keybindings: [
      { keys: ['ctrl', 's'], action: 'save-file' },
      { keys: ['ctrl', 'v'], action: 'paste-image' }
    ]
  };
  fs.mkdirSync(userDataPath, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  return defaultConfig;
}

function saveConfig() {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}


// User Notes Directory
app.setName('MarkdownEditor');

let config = loadConfig();
let currentBaseDir = config.currentBaseDir || (config.favoriteDirs[0] || path.resolve('/home/darkplayer/Descargas/Notas'));
let currentDir = config.currentDir || currentBaseDir;

function ensureInsideBase(target) {
  return target.startsWith(currentBaseDir);
}


function createWindow() {
  const win = new BrowserWindow({
    width: 1000, height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    // si no es la propia página de la app:
    if (url !== win.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.loadURL(`file://${path.join(__dirname, 'index.html')}`);

  ipcMain.handle('open-settings', () => {
    // Si prefieres abrir en la misma ventana:
    win.loadFile('settings.html');
    // Si quisieras ventana nueva, invocarías createSettingsWindow()
  });

  ipcMain.handle('navigate-to', (event, page) => {
    // Carga index.html o settings.html según page
    win.loadFile(page);
  });
}

function createSettingsWindow() {
  const cfgWin = new BrowserWindow({
    width: 600, height: 700,
    title: 'Configuración',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  cfgWin.loadURL(`file://${path.join(__dirname, 'settings.html')}`);
}

app.whenReady().then(createWindow);


// Global App Settings
ipcMain.handle('get-config', () => config);

ipcMain.handle('update-config', (ev, updates) => {
  config = { ...config, ...updates };
  saveConfig();
  return config;
});

ipcMain.handle('change-base-dir', (ev, newBase) => {
  if (config.favoriteDirs.includes(newBase)) {
    currentBaseDir = newBase;
    currentDir = newBase;
    config.currentBaseDir = newBase;
    config.currentDir = newBase;
    saveConfig();
  }
});


// Directory Management
ipcMain.handle('create-directory', (ev, name) => {
  fs.mkdirSync(path.join(currentDir, name));
});

ipcMain.handle('delete-item', (ev, name) => {
  const p = path.join(currentDir, name);
  if (fs.lstatSync(p).isDirectory()) fs.rmdirSync(p, { recursive: true });
  else fs.unlinkSync(p);
});

ipcMain.handle('get-directory-data', () => {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
  const files = entries.filter(e => e.isFile() && /\.(txt|md)$/i.test(e.name)).map(e => e.name);
  return { dirs, files, currentDir };
});

ipcMain.handle('change-directory', (ev, name) => {
  const target = name === '..' ? path.dirname(currentDir) : path.join(currentDir, name);
  if (!ensureInsideBase(target)) return;
  if (fs.existsSync(target) && fs.lstatSync(target).isDirectory()) {
    currentDir = target;
    config.currentDir = currentDir;
    saveConfig();
  }
});


// File Functions
ipcMain.handle('read-file', (ev, fileName) => {
  return fs.readFileSync(path.join(currentDir, fileName), 'utf-8');
});

ipcMain.handle('save-file', (ev, fileName, content) => {
  fs.writeFileSync(path.join(currentDir, fileName), content, 'utf-8');
  return { success: true };
});

ipcMain.handle('create-file', (ev, name) => {
  fs.writeFileSync(path.join(currentDir, name), '', 'utf-8');
});

ipcMain.handle('rename-item', (ev, oldName, newName) => {
  fs.renameSync(path.join(currentDir, oldName), path.join(currentDir, newName));
});


// Editor Features
ipcMain.handle('save-clipboard-image', async (ev, base64Data) => {
  const resDir = path.join(currentDir, '.resources');

  if (!fs.existsSync(resDir)) fs.mkdirSync(resDir);
  const name = crypto.randomBytes(8).toString('hex') + '.png';
  const filePath = path.join(resDir, name);
  fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
  return path.join('.resources', name).replace(/\\\\/g, '/');
});

ipcMain.handle('markdown-compile', (html) => {
  return html;
})


// Context Menus
ipcMain.handle('show-dir-context-menu', (ev, name) => {
  const win = BrowserWindow.fromWebContents(ev.sender);
  const menu = Menu.buildFromTemplate([
    { label: 'Renombrar', click: () => win.webContents.send('context-menu-action', { action: 'rename', name }) },
    { label: 'Borrar', click: () => win.webContents.send('context-menu-action', { action: 'delete', name }) }
  ]);
  menu.popup({ window: win });
});

ipcMain.handle('show-file-context-menu', (ev, name) => {
  const win = BrowserWindow.fromWebContents(ev.sender);
  const menu = Menu.buildFromTemplate([
    { label: 'Renombrar', click: () => win.webContents.send('context-menu-action', { action: 'rename', name }) },
    { label: 'Borrar', click: () => win.webContents.send('context-menu-action', { action: 'delete', name }) }
  ]);
  menu.popup({ window: win });
});



ipcMain.handle('open-external-link', async (event, url) => {
  await shell.openExternal(url);
});



