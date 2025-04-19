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
