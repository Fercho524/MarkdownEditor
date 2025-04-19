const crypto = require('crypto');
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const BASE_DIR = path.resolve('/home/darkplayer/Descargas/Notas'); // ← AJUSTA tu carpeta here
let currentDir = BASE_DIR;

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    win.loadURL(`file://${path.join(__dirname, 'index.html')}`);
    console.log('Directorio base:', BASE_DIR);
}

app.whenReady().then(createWindow);

// —— Helpers ——————————————————————————————————————————

function listEntries() {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    const files = entries
        .filter(e => e.isFile() && /\.(txt|md)$/i.test(e.name))
        .map(e => e.name);
    return { dirs, files };
}

function ensureInsideBase(target) {
    return target.startsWith(BASE_DIR);
}

// —— IPC Handlers ——————————————————————————————————————

ipcMain.handle('get-directory-data', () => {
    console.log('Listando en:', currentDir);
    const { dirs, files } = listEntries();
    console.log('  → Carpetas:', dirs);
    console.log('  → Archivos:', files);
    return { dirs, files, currentDir };
});

ipcMain.handle('change-directory', (ev, name) => {
    const target = name === '..'
        ? path.dirname(currentDir)
        : path.join(currentDir, name);
    if (!ensureInsideBase(target)) return;
    if (fs.existsSync(target) && fs.lstatSync(target).isDirectory()) {
        currentDir = target;
        console.log('Cambiado a:', currentDir);
    }
});

ipcMain.handle('save-clipboard-image', async (ev, base64Data) => {
    const resDir = path.join(currentDir, '.resources');
    if (!fs.existsSync(resDir)) fs.mkdirSync(resDir);
    const name = crypto.randomBytes(8).toString('hex') + '.png';
    const filePath = path.join(resDir, name);
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    // devolver ruta relativa para Markdown
    return path.join('.resources', name).replace(/\\\\/g, '/');
});

ipcMain.handle('read-file', (ev, fileName) => {
    const p = path.join(currentDir, fileName);
    console.log('Leyendo archivo:', p);
    return fs.readFileSync(p, 'utf-8');
});

ipcMain.handle('save-file', (ev, fileName, content) => {
    const p = path.join(currentDir, fileName);
    console.log('Guardando archivo:', p);
    fs.writeFileSync(p, content, 'utf-8');
    return { success: true };
});

ipcMain.handle('create-file', (ev, name) => {
    const p = path.join(currentDir, name);
    console.log('Creando archivo:', p);
    fs.writeFileSync(p, '', 'utf-8');
});

ipcMain.handle('create-directory', (ev, name) => {
    const p = path.join(currentDir, name);
    console.log('Creando carpeta:', p);
    fs.mkdirSync(p);
});

ipcMain.handle('rename-item', (ev, oldName, newName) => {
    const oldP = path.join(currentDir, oldName);
    const newP = path.join(currentDir, newName);
    console.log(`Renombrando "${oldName}" → "${newName}"`);
    fs.renameSync(oldP, newP);
});

ipcMain.handle('delete-item', (ev, name) => {
    const p = path.join(currentDir, name);
    console.log('Borrando:', p);
    if (fs.lstatSync(p).isDirectory()) {
        fs.rmdirSync(p, { recursive: true });
    } else {
        fs.unlinkSync(p);
    }
});

// Menú contextual para carpetas
ipcMain.handle('show-dir-context-menu', (ev, name) => {
    const win = BrowserWindow.fromWebContents(ev.sender);
    const menu = Menu.buildFromTemplate([
        {
            label: 'Renombrar',
            click: () => win.webContents.send('context-menu-action', { action: 'rename', name })
        },
        {
            label: 'Borrar',
            click: () => win.webContents.send('context-menu-action', { action: 'delete', name })
        }
    ]);
    menu.popup({ window: win });
});

// Menú contextual para archivos
ipcMain.handle('show-file-context-menu', (ev, name) => {
    const win = BrowserWindow.fromWebContents(ev.sender);
    const menu = Menu.buildFromTemplate([
        {
            label: 'Renombrar',
            click: () => win.webContents.send('context-menu-action', { action: 'rename', name })
        },
        {
            label: 'Borrar',
            click: () => win.webContents.send('context-menu-action', { action: 'delete', name })
        }
    ]);
    menu.popup({ window: win });
});
