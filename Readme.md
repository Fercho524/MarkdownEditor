# Markdown Editor

La aplicación debe tener un estado global y configuración guardada en un archivo .json con cualquier ruta, con todas las configuraciones importantes, en este caso son las siguientes:

```json
{
    "currentOpenedFiles": [], /*Pestañas abiertas*/
    "currentFile": "", /*Pestaña actual*/
    "favoriteDirs": [], /*Repositorios de notas, sólo rutas de carpetas*/
    "currentBaseDir": "", /*El directorio base, antes BASE_DIR*/
    "currentDir": "", /*El subdirectorio actual*/
    "fileHistory": [], /*El historial de notas*/
    "globalThemeCSSPath": "", /*el archivo css donde está el tema del editor*/
    "editorThemeCSSPath": "", /*el archivo css de la vista markdown*/
    "editorMonospaceFont": "", /*la fuente del editor de markdown*/
    "editorLanguage": "", /*el idioma, pero sólo es un string hoy*/
    "dateFormat": "", /*formato de fecha*/
    "sintaxTheme": "", /*coloreado de sintaxis para el markdown*/
    "pdfSize": "A4", /*tamaño del papel para exportar el pdf*/
    "editorFontSize": "", /*tamaño del editor*/
    "autosave": true, /*autoguardado de todos los archivos abiertos*/
    "keybindings": [
        {
            "keys": [/*los keybindings deben coincidir con las admitidas por el evento keydown*/
                "ctrl",
                "s"
            ],
            "action": "save-file" /*estas son acciones del ipc-main*/
        }
    ]
}
```

Para esto es necesario implementar las siguientes funciones, al menos para las partes más importantes.

- Se debe resaltar el archivo actual
- Se deben poder abrir múltiples pestañas
- Se debe permitir cambiar el directorio base entre los directorios base favoritos con un dropdown.
- Se debe guardar el historial de archivos en un array con longitud máxima de 100, así como añadir botones para retroceder o avanzar en el historial de manera circular.
- Finalmente se deben configurar los keybindings, creo que los únicos implementados son ctrl+s para guardar, y ctrl+v para pegar las imágenes.

Reconstruye el código actual para implementar el estado configurable con un archivo .json además de los detalles de la interfaz. Este es el código actual, recuerda no eliminar funciones ya que no aceptaré un código con errores.

## index.html

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
  <title>Explorador de Archivos</title>

  <link rel="stylesheet" href="katex/katex.min.css" />
  <script src="katex/katex.min.js"></script>
  <script src="katex/contrib/auto-render.js"></script>

  <link rel="stylesheet" href="index.css" />
  <link rel="stylesheet" href="editor.css" />
</head>

<body>
  <div class="app-container">
    
    <div class="column" id="dirsColumn">
      <div class="toolbar">
        <button id="newDirBtn">+ Carpeta</button>
      </div>
      <ul id="dirs"></ul>
    </div>

    <div class="column" id="filesColumn">
      <div class="toolbar">
        <button id="newFileBtn">+ Archivo</button>
      </div>
      <ul id="files"></ul>
    </div>

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
  </div>

  <!-- Modal -->
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

  <script src="renderer.js"></script>
  <script src="markdown.js"></script>
</body>
</html>


## index.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { app, BrowserWindow, ipcMain, Menu } = require('electron');


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
    const { dirs, files } = listEntries();
    return { dirs, files, currentDir };
});


ipcMain.handle('change-directory', (ev, name) => {
    // Salir al directorio padre
    const target = name === '..'
        ? path.dirname(currentDir)
        : path.join(currentDir, name);

    // Verifica que no salga del directorio base
    if (!ensureInsideBase(target)) return;

    // Cambia el currentdir
    if (fs.existsSync(target) && fs.lstatSync(target).isDirectory()) {
        currentDir = target;
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
    return fs.readFileSync(p, 'utf-8');
});


ipcMain.handle('save-file', (ev, fileName, content) => {
    const p = path.join(currentDir, fileName);
    fs.writeFileSync(p, content, 'utf-8');
    return { success: true };
});


ipcMain.handle('create-file', (ev, name) => {
    const p = path.join(currentDir, name);
    fs.writeFileSync(p, '', 'utf-8');
});


ipcMain.handle('create-directory', (ev, name) => {
    const p = path.join(currentDir, name);
    fs.mkdirSync(p);
});


ipcMain.handle('rename-item', (ev, oldName, newName) => {
    const oldP = path.join(currentDir, oldName);
    const newP = path.join(currentDir, newName);
    fs.renameSync(oldP, newP);
});


ipcMain.handle('delete-item', (ev, name) => {
    const p = path.join(currentDir, name);

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

    // — Inicializar currentDir para que html2MarkDown pueda usarlo al renderizar imágenes —
    window.api.getDirectoryData().then(data => {
        window.currentDir = data.currentDir;
    });

   


    // Función de tu compilador (simplificada para ejemplos)
    function html2MarkDown(md) {
        let html = md;

        const rules = [
            // Matemáticas (KaTeX)
            //{ re: /\$\$([\s\S]+?)\$\$/gm, tpl: '<div class="katex-display">\\[ $1 \\]</div>' },
            //{ re: /\$([^\$\n]+?)\$/g, tpl: '<span class="katex-inline">\\( $1 \\)</span>' },

            // Encabezados
            { re: /^#{6}\s+(.*)$/gm, tpl: '<h6>$1</h6>' },
            { re: /^#{5}\s+(.*)$/gm, tpl: '<h5>$1</h5>' },
            { re: /^#{4}\s+(.*)$/gm, tpl: '<h4>$1</h4>' },
            { re: /^#{3}\s+(.*)$/gm, tpl: '<h3>$1</h3>' },
            { re: /^#{2}\s+(.*)$/gm, tpl: '<h2>$1</h2>' },
            { re: /^#{1}\s+(.*)$/gm, tpl: '<h1>$1</h1>' },
            { re: /`([^`\n]+?)`/g, tpl: '<code>$1</code>' },

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

        html = html.replace(
            /<img src="([^"]+)" alt="([^"]+)">/g,
            (m, src, alt) => {
                if (!/^[a-z]+:\/\//i.test(src)) {
                    src = `file://${window.currentDir}/${src}`;
                }
                return `<img src="${src}" alt="${alt}">`;
            }
        );


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

        html = html.replace(/\n\n/g, '<br/><br/>');


        return html;
    }

    function renderMarkdown() {
        mdRender.innerHTML = html2MarkDown(mdArea.value);

        renderMathInElement(mdRender, {
            // Ajusta delimitadores si quieres $$…$$ para display y $…$ inline
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
            ],
            // Ignora etiquetas donde no quieras renderizar (p.ej., dentro de <code>)
            ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre']
        });
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

    mdArea.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            document.getElementById('saveBtn').click();
        }
    });

    // — Tabulación dentro del textarea —
    mdArea.addEventListener('keydown', e => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = mdArea.selectionStart;
            const end = mdArea.selectionEnd;
            mdArea.value = mdArea.value.slice(0, start) + '\t' + mdArea.value.slice(end);
            mdArea.selectionStart = mdArea.selectionEnd = start + 1;
        }
    });

    // — Pegar imágenes desde portapapeles —
    mdArea.addEventListener('paste', async e => {
        for (const item of e.clipboardData.items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const blob = item.getAsFile();
                const reader = new FileReader();
                reader.onload = async () => {
                    const base64 = reader.result.split(',')[1];
                    const relPath = await window.api.saveClipboardImage(base64);
                    const cursor = mdArea.selectionStart;
                    const snippet = `![pasted image](${relPath})`;
                    mdArea.setRangeText(snippet, cursor, cursor, 'end');
                    renderMarkdown();
                };
                reader.readAsDataURL(blob);
            }
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
    onContextMenuAction: (cb) => ipcRenderer.on('context-menu-action', (e, data) => cb(data)),
    saveClipboardImage: (base64) => ipcRenderer.invoke('save-clipboard-image', base64)
});

## rendered.js

let currentFile = null;
const data = window.api.getDirectoryData();
window.currentDir = data.currentDir;

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

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmBtn.click();
      }
    });

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

function highlightActiveFile(fileName) {
  document.querySelectorAll('#files li').forEach(li => {
      li.classList.toggle('active', li.textContent === fileName);
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

  highlightActiveFile(currentFile)
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

Aún quedan algunos errores :
- No se resalta el archivo abierto
- las imágenes ya no se renderizan correctamente, esto debido a problemas con la ruta actual, recuerda que las imágenes para un documento están en "basedir/currentdir/.resources" no sólo en "basedir/.resources" de ese modo las imágenes no se visualizan.
- Al momento de abrir un archivo nuevo este no se renderiza al momento. 
- Todos los botones de la toolbar dejaron de funcionar.


Estos son los errores en la consola

Uncaught ReferenceError: require is not defined
    at preload.js:1:40
2renderer.js:324 Uncaught (in promise) ReferenceError: renderMarkdown is not defined
    at fillEditor (renderer.js:324:5)
    at openFile (renderer.js:224:5)
markdown.js:130 Uncaught ReferenceError: currentFile is not defined
    at HTMLTextAreaElement.<anonymous> (markdown.js:130:9)
3renderer.js:324 Uncaught (in promise) ReferenceError: renderMarkdown is not defined
    at fillEditor (renderer.js:324:5)
    at openFile (renderer.js:224:5)
10markdown.js:130 Uncaught ReferenceError: currentFile is not defined
    at HTMLTextAreaElement.<anonymous> (markdown.js:130:9)
d9f6733562b5f51b.png:1 
            
           Failed to load resource: net::ERR_FILE_NOT_FOUND

Corrige los archivos rendered.js y markdown.js para evitar estos errores, responde en chat sin errores de sintaxis

## rendered.js
// === rendered.js ===

(async () => {
  // --- Estado local ---
  let configState = await window.api.getConfig();
  let openTabs = [...configState.currentOpenedFiles];
  let history = [...configState.fileHistory];
  let currentFile = configState.currentFile || null;

  let fileStates = {};


  // --- Utilidades para rutas ---
  function splitPath(filePath) {
    return filePath.split('/').filter(Boolean);
  }

  async function navigateToFileDir(filePath) {
    const parts = splitPath(filePath);
    const fileName = parts.pop();

    // Cambiar al base directory
    await window.api.changeBaseDir(configState.currentBaseDir);

    // Navegar recursivamente por cada subdirectorio
    for (const dir of parts) {
      await window.api.changeDirectory(dir);
    }

    return fileName;
  }

  // --- Inicialización ---
  async function init() {
    await setupBaseDirDropdown();
    setupHistoryButtons();
    setupCreateButtons();
    setupContextMenu();
    setupSaveButton();

    await render();
    renderTabs();
  }

  // --- Configuración de UI ---
  async function setupBaseDirDropdown() {
    const select = document.getElementById('baseDirSelect');
    configState.favoriteDirs.forEach(dir => {
      const opt = document.createElement('option');
      opt.value = dir;
      opt.textContent = dir;
      select.appendChild(opt);
    });

    select.value = configState.currentBaseDir;
    select.addEventListener('change', async () => {
      const newBase = select.value;

      // Reset de estado
      openTabs = [];
      history = [];
      currentFile = null;
      configState.currentBaseDir = newBase;
      configState.currentDir = newBase;
      configState.currentOpenedFiles = [];
      configState.fileHistory = [];
      configState.currentFile = '';

      await window.api.changeBaseDir(newBase);
      await window.api.updateConfig(configState);

      clearEditor();
      await render();
      renderTabs();
    });
  }

  function setupHistoryButtons() {
    document.getElementById('backBtn').addEventListener('click', () => navigateHistory(-1));
    document.getElementById('forwardBtn').addEventListener('click', () => navigateHistory(1));
  }

  function setupCreateButtons() {
    document.getElementById('newDirBtn').addEventListener('click', async () => {
      const name = await askForInput('Nombre de la nueva carpeta:');
      if (!name) return;
      await window.api.createDirectory(name);
      await render();
      renderTabs();
    });

    document.getElementById('newFileBtn').addEventListener('click', async () => {
      const name = await askForInput('Nombre del nuevo archivo (.txt/.md):');
      if (!name) return;
      await window.api.createFile(name);
      await render();
      renderTabs();
    });
  }

  function setupContextMenu() {
    window.api.onContextMenuAction(async ({ action, name }) => {
      if (action === 'rename') {
        const nuevo = await askForInput(`Renombrar "${name}" a:`, name);
        if (nuevo && nuevo !== name) {
          await window.api.renameItem(name, nuevo);

          // Actualizar rutas en pestañas e historial
          openTabs = openTabs.map(p => p.replace(new RegExp(`/${name}$`), `/${nuevo}`));
          history = history.map(p => p.replace(new RegExp(`/${name}$`), `/${nuevo}`));
        }
      }
      else if (action === 'delete') {
        if (confirm(`¿Borrar "${name}"? Esto NO se puede deshacer.`)) {
          await window.api.deleteItem(name);

          // Filtrar pestañas e historial
          openTabs = openTabs.filter(p => !p.endsWith(`/${name}`));
          history = history.filter(p => !p.endsWith(`/${name}`));

          if (currentFile && currentFile.endsWith(`/${name}`)) {
            currentFile = null;
            clearEditor();
          }
        }
      }

      // Persistir cambios de pestañas e historial
      await window.api.updateConfig({
        currentOpenedFiles: openTabs,
        fileHistory: history
      });

      await render();
      renderTabs();
    });
  }

  function setupSaveButton() {
    document.getElementById('saveBtn').addEventListener('click', async () => {
      const content = document.getElementById('editor').value;
      if (!currentFile) return;
      await window.api.saveFile(currentFile, content);
      alert('¡Guardado exitoso!');
    });
  }

  // --- Renderizado de directorios y archivos ---
  async function render() {
    const { dirs, files, currentDir } = await window.api.getDirectoryData();

    // Carpetas
    const dirUl = document.getElementById('dirs');
    dirUl.innerHTML = '';
    ['..', ...dirs].forEach(name => {
      const li = document.createElement('li');
      li.textContent = name;
      li.onclick = async () => {
        await window.api.changeDirectory(name);
        currentFile = null;
        clearEditor();
        await render();
        renderTabs();
      };
      li.oncontextmenu = e => {
        e.preventDefault();
        if (name !== '..') window.api.showDirContextMenu(name);
      };
      dirUl.appendChild(li);
    });

    // Archivos
    const fileUl = document.getElementById('files');
    fileUl.innerHTML = '';
    files.forEach(name => {
      const relDir = currentDir.replace(configState.currentBaseDir + '/', '');
      const pathStr = relDir ? `${relDir}/${name}` : name;
      const li = document.createElement('li');

      li.textContent = name;
      li.onclick = () => openFile(pathStr, true);

      li.oncontextmenu = e => {
        e.preventDefault();
        window.api.showFileContextMenu(name);
      };
      fileUl.appendChild(li);
    });
  }

  // --- Pestañas ---
  function renderTabs() {
    const tabsUl = document.getElementById('tabs');
    tabsUl.innerHTML = '';

    openTabs.forEach(pathStr => {
      const parts = splitPath(pathStr);
      const label = parts.pop();

      const li = document.createElement('li');
      li.classList.toggle('active', pathStr === currentFile);
      li.innerHTML = `
        <span class="tab-label">${label}</span>
        <span class="tab-close">×</span>
      `;

      li.querySelector('.tab-label').addEventListener('click', () => openFile(pathStr, false));
      li.querySelector('.tab-close').addEventListener('click', e => {
        e.stopPropagation();
        closeTab(pathStr);
      });

      li.onclick = () => openFile(name, true);

      tabsUl.appendChild(li);
    });
  }

  // --- Apertura y cierre de pestañas ---
  async function openFile(pathStr, addToHistory) {
    const fileName = await navigateToFileDir(pathStr);
    const content = await window.api.readFile(fileName);

    fillEditor(content);
    currentFile = pathStr;

    // Añadir a pestañas si es nuevo
    if (!openTabs.includes(pathStr)) {
      const last = openTabs[openTabs.length - 1];

      if (last && fileStates[last] && fileStates[last].edited === false) {
        openTabs[openTabs.length - 1] = pathStr;         // reemplaza
      } else {
        openTabs.push(pathStr);                          // añade normalmente
      }

      await window.api.updateConfig({ currentOpenedFiles: openTabs });
    }

    // Historial
    if (addToHistory) {
      history.push(pathStr);
      if (history.length > 100) history.shift();
      await window.api.updateConfig({ fileHistory: history });
    }

    // Estado actual en config
    await window.api.updateConfig({ currentFile: pathStr });

    renderTabs();
    document.getElementById('backBtn').disabled = history.length <= 1;
    document.getElementById('forwardBtn').disabled = history.length <= 1;
  }

  function closeTab(pathStr) {
    openTabs = openTabs.filter(p => p !== pathStr);
    window.api.updateConfig({ currentOpenedFiles: openTabs });

    if (currentFile === pathStr) {
      if (openTabs.length > 0) {
        openFile(openTabs[openTabs.length - 1], false);
      } else {
        currentFile = null;
        clearEditor();
      }
    }

    renderTabs();
  }

  // --- Historial circular ---
  function navigateHistory(offset) {
    if (history.length <= 1 || !currentFile) return;
    const idx = history.lastIndexOf(currentFile);
    const newIdx = (idx + offset + history.length) % history.length;
    openFile(history[newIdx], false);
  }

  // --- Editor ---
  function clearEditor() {
    const edt = document.getElementById('editor');
    const btn = document.getElementById('saveBtn');
    edt.value = '';
    edt.disabled = true;
    btn.disabled = true;
  }

  function setViewMode(mode) {
    const mdArea = document.getElementById('editor');
    const mdRender = document.getElementById('content');
    const toggleBtn = document.getElementById('toggleViewBtn');

    if (mode === 'render') {
      mdArea.style.display = 'none';
      mdRender.style.display = 'block';
      toggleBtn.textContent = 'Vista Dividida';
    } else if (mode === 'markdown') {
      mdArea.style.display = 'block';
      mdRender.style.display = 'none';
      toggleBtn.textContent = 'Vista HTML';
    } else { // split
      mdArea.style.display = 'block';
      mdRender.style.display = 'block';
      toggleBtn.textContent = 'Vista Markdown';
    }
    fileStates[currentFile].viewMode = mode;
  }

  function fillEditor(text) {
    const edt = document.getElementById('editor');
    const btn = document.getElementById('saveBtn');
    edt.value = text;
    edt.disabled = false;
    btn.disabled = false;
    window.fillEditor = fillEditor;

    // inicializa el estado si no existe
    if (!fileStates[currentFile]) {
      fileStates[currentFile] = { viewMode: 'split', edited: false };
    }
    // forzamos vista dividida al abrir
    setViewMode('split');
    // render inmediato
    renderMarkdown();

    // resaltar en el file list
    highlightActiveFile(currentFile);
  }

  // --- Diálogo de entrada ---
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

      dialog.onclose = () => {
        resolve(dialog.returnValue === 'confirm' ? input.value.trim() || null : null);
      };

      dialog.showModal();
    });
  }

  // --- Iniciar ---
  init();
})();


## markdown.js

document.addEventListener('DOMContentLoaded', () => {
    const mdArea = document.getElementById('editor');
    const mdRender = document.getElementById('content');
    const toggleBtn = document.getElementById('toggleViewBtn');
    let viewMode = 'render'; // 'split' | 'markdown' | 'render'
    let keybindings = [];

    // Cargar keybindings desde config
    window.api.getConfig().then(cfg => {
        keybindings = cfg.keybindings || [];
    });

    window.api.getDirectoryData().then(data => {
        window.currentDir = data.currentDir;
    });

    function html2MarkDown(md) {
        let html = md;

        const rules = [
            // Matemáticas (KaTeX)
            //{ re: /\$\$([\s\S]+?)\$\$/gm, tpl: '<div class="katex-display">\\[ $1 \\]</div>' },
            //{ re: /\$([^\$\n]+?)\$/g, tpl: '<span class="katex-inline">\\( $1 \\)</span>' },

            // Encabezados
            { re: /^#{6}\s+(.*)$/gm, tpl: '<h6>$1</h6>' },
            { re: /^#{5}\s+(.*)$/gm, tpl: '<h5>$1</h5>' },
            { re: /^#{4}\s+(.*)$/gm, tpl: '<h4>$1</h4>' },
            { re: /^#{3}\s+(.*)$/gm, tpl: '<h3>$1</h3>' },
            { re: /^#{2}\s+(.*)$/gm, tpl: '<h2>$1</h2>' },
            { re: /^#{1}\s+(.*)$/gm, tpl: '<h1>$1</h1>' },
            { re: /`([^`\n]+?)`/g, tpl: '<code>$1</code>' },

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

        html = html.replace(
            /<img src="([^"]+)" alt="([^"]+)">/g,
            (m, src, alt) => {
                if (!/^[a-z]+:\/\//i.test(src)) {
                    src = `file://${window.currentDir}/${src}`;
                }
                return `<img src="${src}" alt="${alt}">`;
            }
        );


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

        html = html.replace(/\n\n/g, '<br/><br/>');


        return html;
    }

    function renderMarkdown() {
        mdRender.innerHTML = html2MarkDown(mdArea.value);
        renderMathInElement(mdRender, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
            ],
            ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre']
        });
    }

    mdArea.addEventListener('input', () => {
        renderMarkdown();
        if (currentFile) {
            fileStates[currentFile].edited = true;
        }
    });

    toggleBtn.addEventListener('click', () => {
        if (viewMode === 'split') {
            mdArea.style.display = 'block';
            mdRender.style.display = 'none';
            toggleBtn.textContent = 'Vista Markdown';
            viewMode = 'markdown';
        } else if (viewMode === 'markdown') {
            mdArea.style.display = 'none';
            mdRender.style.display = 'block';
            toggleBtn.textContent = 'Vista HTML';
            viewMode = 'render';
        } else {
            mdArea.style.display = 'block';
            mdRender.style.display = 'block';
            toggleBtn.textContent = 'Vista Dividida';
            viewMode = 'split';
        }
    });

    // Keybindings genéricos
    mdArea.addEventListener('keydown', e => {
        keybindings.forEach(kb => {
            const hasCtrl = kb.keys.includes('ctrl') && (e.ctrlKey || e.metaKey);
            const hasShift = kb.keys.includes('shift') && e.shiftKey;
            const hasAlt = kb.keys.includes('alt') && e.altKey;
            const keyMatch = kb.keys.includes(e.key.toLowerCase());
            if (hasCtrl && hasShift === !!kb.keys.includes('shift') && hasAlt === !!kb.keys.includes('alt') && keyMatch) {
                if (kb.action === 'save-file') {
                    e.preventDefault();
                    document.getElementById('saveBtn').click();
                }
                // para paste-image dejamos que el evento paste maneje todo
            }
        });
    });

    // Tab dentro del textarea
    mdArea.addEventListener('keydown', e => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = mdArea.selectionStart;
            const end = mdArea.selectionEnd;
            mdArea.value = mdArea.value.slice(0, start) + '\t' + mdArea.value.slice(end);
            mdArea.selectionStart = mdArea.selectionEnd = start + 1;
        }
    });

    // Pegar imágenes
    mdArea.addEventListener('paste', async e => {
        for (const item of e.clipboardData.items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const blob = item.getAsFile();
                const reader = new FileReader();
                reader.onload = async () => {
                    const base64 = reader.result.split(',')[1];
                    const relPath = await window.api.saveClipboardImage(base64);
                    const cursor = mdArea.selectionStart;
                    const snippet = `![pasted image](${relPath})`;
                    mdArea.setRangeText(snippet, cursor, cursor, 'end');
                    renderMarkdown();
                };
                reader.readAsDataURL(blob);
            }
        }
    });

    // Integración con fillEditor de renderer.js
    if (typeof window.fillEditor === 'function') {
        const origFill = window.fillEditor;
        window.fillEditor = text => {
            origFill(text);
            mdArea.value = text;
            renderMarkdown();
            toggleBtn.disabled = false;
            viewMode = 'render';
            mdArea.style.display = 'none';
            mdRender.style.display = 'block';
            toggleBtn.textContent = 'Vista Dividida';
        };
    }
});
