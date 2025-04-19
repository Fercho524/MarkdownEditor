# Código actual

Las correcciones que te pedí han sido implementadas con éxito, pero aún quedan algunas partes importantes para tener un MVP.  

1. Al momento de renombrar o crear archivo/carpeta se debería poder presionar enter y que automáticamente se confirme la acción, al hacer esto el modal desaparece, y tener que presionar el botón ok es algo engorroso.
2. El inline code no se visualiza correctamente.
3. Al momento de hacer un salto de línea en el textarea, este no se ve reflejado en el html final, lo cual sería tan fácil como reemplzar los saltos de línea \n con etiquetas <br/>

## Index.html

<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
    <title>Explorador de Archivos</title>
    <!-- Estilos generales -->
    <link rel="stylesheet" href="index.css">
    <link rel="stylesheet" href="custom.css">
    <!-- Estilos del editor Markdown -->
    <link rel="stylesheet" href="editor.css">
</head>

<body>
    <!-- Columna de directorios -->
    <div class="column" id="dirsColumn">
        <div class="toolbar">
            <button id="newDirBtn">+ Carpeta</button>
        </div>
        <ul id="dirs"></ul>
    </div>
    <!-- Columna de archivos -->
    <div class="column" id="filesColumn">
        <div class="toolbar">
            <button id="newFileBtn">+ Archivo</button>
        </div>
        <ul id="files"></ul>
    </div>
    <!-- Columna del editor / Markdown -->
    <div class="column" id="editorColumn">
        <div class="toolbar">
            <button id="saveBtn" disabled>Guardar</button>
            <button id="toggleViewBtn" disabled>Vista Dividida</button>
        </div>
        <div id="editorContainer">
            <textarea id="editor" disabled placeholder="Selecciona un archivo..."></textarea>
            <div id="content" class="rendered"></div>
        </div>
    </div>
    <!-- Modal de entrada para crear/renombrar -->
    <dialog id="inputDialog">
        <form method="dialog">
            <p id="dialogLabel">Etiqueta</p>
            <input id="dialogInput" class="dlg-input" type="text" />
            <div class="dlg-buttons">
                <button id="cancelBtn" value="cancel">Cancelar</button>
                <button id="confirmBtn" value="confirm">OK</button>
            </div>
        </form>
    </dialog>
    <!-- Lógica de la app -->
    <script src="renderer.js"></script>
    <!-- Compilador Markdown (externo para cumplir CSP) -->
    <script src="markdown.js"></script>
</body>

</html>

## Index.js

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

## markdown.js

document.addEventListener('DOMContentLoaded', () => {
    const mdArea = document.getElementById('editor');
    const mdRender = document.getElementById('content');
    const toggleBtn = document.getElementById('toggleViewBtn');
    let viewMode = 'render'; // 'split' | 'markdown' | 'render'

    // Función de tu compilador (simplificada para ejemplos)
    function html2MarkDown(md) {
        let html = md;

        const rules = [
            // Matemáticas (KaTeX)
            { re: /\$\$([\s\S]+?)\$\$/gm, tpl: '<div class="katex-display">\\[ $1 \\]</div>' },
            { re: /\$([^\$\n]+?)\$/g, tpl: '<span class="katex-inline">\\( $1 \\)</span>' },

            // Encabezados
            { re: /^#{6}\s+(.*)$/gm, tpl: '<h6>$1</h6>' },
            { re: /^#{5}\s+(.*)$/gm, tpl: '<h5>$1</h5>' },
            { re: /^#{4}\s+(.*)$/gm, tpl: '<h4>$1</h4>' },
            { re: /^#{3}\s+(.*)$/gm, tpl: '<h3>$1</h3>' },
            { re: /^#{2}\s+(.*)$/gm, tpl: '<h2>$1</h2>' },
            { re: /^#{1}\s+(.*)$/gm, tpl: '<h1>$1</h1>' },

            // Código en bloque
            { re: /^```(?:\w*)\n([\s\S]*?)```$/gm, tpl: '<pre>$1</pre>' },
            // Código inline
            { re: /``([^`]+)``/g, tpl: '<code>$1</code>' },

            // Blockquotes
            { re: /^>\s+(.*)$/gm, tpl: '<blockquote>$1</blockquote>' },

            // Separador horizontal
            { re: /^-{3,}$/gm, tpl: '<hr>' },

            // Imágenes y enlaces
            { re: /!\[([^\]]+)\]\(([^)]+)\)/g, tpl: '<img src="$2" alt="$1">' },
            { re: /\[([^\]]+)\]\(([^)]+)\)/g, tpl: '<a href="$2">$1</a>' },

            // Negrita e itálica
            { re: /\*\*(.*?)\*\*/g, tpl: '<b>$1</b>' },
            { re: /\*(.*?)\*/g, tpl: '<i>$1</i>' },

            // Listas: marcamos <li> para luego envolver
            { re: /^\s*\d+\.\s+(.*)$/gm, tpl: '<li class="ol">$1</li>' },
            { re: /^\s*[-*]\s+(.*)$/gm, tpl: '<li class="ul">$1</li>' },
        ];

        // Aplicar reglas generales
        rules.forEach(r => {
            html = html.replace(r.re, r.tpl);
        });

        // Envolver listas en <ol> y <ul>
        html = html.replace(
            /((?:<li class="ol">[\s\S]*?<\/li>\s*)+)/g,
            match => '<ol>\n' + match.trim() + '\n</ol>'
        );
        html = html.replace(
            /((?:<li class="ul">[\s\S]*?<\/li>\s*)+)/g,
            match => '<ul>\n' + match.trim() + '\n</ul>'
        );
        html = html.replace(/ class="(?:ol|ul)"/g, '');

        // Tablas: procesar bloque completo
        html = html.replace(
            /(^\|.+\|[\r\n]+^\|(?:\s*:?-+:?\s*\|)+[\r\n]+(?:\|.*\|(?:[\r\n]+|$))+)/gm,
            tableBlock => {
                const lines = tableBlock.trim().split(/\r?\n/);
                // Cabecera
                const headers = lines[0].slice(1, -1).split('|').map(s => s.trim());
                // Filas de datos (descartar separador)
                const dataLines = lines.slice(2);
                const rows = dataLines.map(line =>
                    line.slice(1, -1).split('|').map(s => s.trim())
                );
                // Construir HTML
                let out = '<table>\n<thead>\n<tr>';
                headers.forEach(cell => { out += `<th>${cell}</th>`; });
                out += '</tr>\n</thead>\n<tbody>\n';
                rows.forEach(row => {
                    out += '<tr>';
                    row.forEach(cell => { out += `<td>${cell}</td>`; });
                    out += '</tr>\n';
                });
                out += '</tbody>\n</table>';
                return out;
            }
        );

        return html;
    }

    function renderMarkdown() {
        mdRender.innerHTML = html2MarkDown(mdArea.value);
    }

    // Cada vez que el usuario escribe
    mdArea.addEventListener('input', () => {
        renderMarkdown();
    });

    // Alternar vistas
    toggleBtn.addEventListener('click', () => {
        if (viewMode === 'split') {
            // Solo Markdown
            mdArea.style.display = 'block';
            mdRender.style.display = 'none';
            toggleBtn.textContent = 'Vista Markdown';
            viewMode = 'markdown';
        } else if (viewMode === 'markdown') {
            // Solo renderizado
            mdArea.style.display = 'none';
            mdRender.style.display = 'block';
            toggleBtn.textContent = 'Vista HTML';
            viewMode = 'render';
        } else {
            // Dividida
            mdArea.style.display = 'block';
            mdRender.style.display = 'block';
            toggleBtn.textContent = 'Vista Dividida';
            viewMode = 'split';
        }
    });

    // Interceptar fillEditor de renderer.js para inicializar Markdown
    if (typeof window.fillEditor === 'function') {
        const origFill = window.fillEditor;
        window.fillEditor = (text) => {
            origFill(text);

            // cargamos el texto en el textarea y el render
            mdArea.value = text;
            renderMarkdown();

            // habilitamos el toggle
            toggleBtn.disabled = false;

            // vista inicial: SOLO RENDER
            viewMode = 'render';
            mdArea.style.display = 'none';
            mdRender.style.display = 'block';
            toggleBtn.textContent = 'Vista Dividida';
        };
    }
});

## preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getDirectoryData: () => ipcRenderer.invoke('get-directory-data'),
    changeDirectory: (n) => ipcRenderer.invoke('change-directory', n),
    readFile: (f) => ipcRenderer.invoke('read-file', f),
    saveFile: (f, c) => ipcRenderer.invoke('save-file', f, c),
    createFile: (n) => ipcRenderer.invoke('create-file', n),
    createDirectory: (n) => ipcRenderer.invoke('create-directory', n),
    renameItem: (o, n) => ipcRenderer.invoke('rename-item', o, n),
    deleteItem: (n) => ipcRenderer.invoke('delete-item', n),
    showDirContextMenu: (n) => ipcRenderer.invoke('show-dir-context-menu', n),
    showFileContextMenu: (n) => ipcRenderer.invoke('show-file-context-menu', n),
    onContextMenuAction: (cb) => ipcRenderer.on('context-menu-action', (e, data) => cb(data))
});


## rendered.js

let currentFile = null;

// Función reutilizable para pedir un texto al usuario
function askForInput(title, defaultValue = '') {
  return new Promise(resolve => {
    const dialog = document.getElementById('inputDialog');
    const label = document.getElementById('dialogLabel');
    const input = document.getElementById('dialogInput');
    const cancelBtn = document.getElementById('cancelBtn');
    const confirmBtn = document.getElementById('confirmBtn');

    label.textContent = title;
    input.value = defaultValue;

    // Al cerrar
    dialog.onclose = () => {
      // value="confirm" viene si se cliqueó OK
      if (dialog.returnValue === 'confirm') {
        resolve(input.value.trim() || null);
      } else {
        resolve(null);
      }
    };

    dialog.showModal();
  });
}

async function render() {
  const data = await window.api.getDirectoryData();

  const { dirs, files } = await window.api.getDirectoryData();
  const dirUl = document.getElementById('dirs');
  const fileUl = document.getElementById('files');


  // Render carpetas
  dirUl.innerHTML = '';
  ['..', ...dirs].forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;
    li.onclick = async () => {
      await window.api.changeDirectory(name);
      currentFile = null;
      clearEditor();
      render();
    };
    li.oncontextmenu = e => {
      e.preventDefault();
      if (name !== '..') window.api.showDirContextMenu(name);
    };
    dirUl.appendChild(li);
  });

  // Render archivos
  fileUl.innerHTML = '';
  files.forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;
    li.onclick = async () => {
      currentFile = name;
      const txt = await window.api.readFile(name);
      fillEditor(txt);
    };
    li.oncontextmenu = e => {
      e.preventDefault();
      window.api.showFileContextMenu(name);
    };
    fileUl.appendChild(li);
  });
}

// Completa y activa el editor
function fillEditor(text) {
  const edt = document.getElementById('editor');
  const btn = document.getElementById('saveBtn');
  edt.value = text;
  edt.disabled = false;
  btn.disabled = false;
}

// Limpia y desactiva el editor
function clearEditor() {
  const edt = document.getElementById('editor');
  const btn = document.getElementById('saveBtn');
  edt.value = '';
  edt.disabled = true;
  btn.disabled = true;
}

// Maneja renombrar / borrar desde el menú contextual
window.api.onContextMenuAction(async ({ action, name }) => {
  if (action === 'rename') {
    const nuevo = await askForInput(`Renombrar "${name}" a:`, name);
    if (nuevo && nuevo !== name) {
      await window.api.renameItem(name, nuevo);
      render();
    }
  } else if (action === 'delete') {
    const ok = confirm(`¿Borrar "${name}"? Esto NO se puede deshacer.`);
    if (ok) {
      await window.api.deleteItem(name);
      render();
    }
  }
});

// Crear carpeta
document.getElementById('newDirBtn').onclick = async () => {
  const name = await askForInput('Nombre de la nueva carpeta:');
  if (name) {
    await window.api.createDirectory(name);
    render();
  }
};

// Crear archivo
document.getElementById('newFileBtn').onclick = async () => {
  const name = await askForInput('Nombre del nuevo archivo (.txt/.md):');
  if (name) {
    await window.api.createFile(name);
    render();
  }
};

// Guardar cambios
document.getElementById('saveBtn').onclick = async () => {
  const content = document.getElementById('editor').value;
  await window.api.saveFile(currentFile, content);
  alert('¡Guardado exitoso!');
};

render();
