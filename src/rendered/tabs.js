function renderTabs() {
  const tabsUl = document.getElementById('tabs');
  tabsUl.className = 'tab-group';
  tabsUl.innerHTML = '';

  openTabs.forEach(pathStr => {
    // Ignorar la pestaña temporal (null)
    if (pathStr === null) return;

    const parts = splitPath(pathStr);
    const label = parts.pop();

    const li = document.createElement('li');
    li.className = 'tab-item';
    if (pathStr === currentFilePath) li.classList.add('active');

    const innerDiv = document.createElement('div');
    innerDiv.className = 'tab-inner';
    innerDiv.style.display = 'flex';
    innerDiv.style.alignItems = 'center';
    innerDiv.style.justifyContent = 'space-between';
    innerDiv.style.width = '100%';
    innerDiv.style.gap = '8px';
    innerDiv.style.pointerEvents = 'auto';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    labelSpan.style.flex = '1';
    labelSpan.style.cursor = 'pointer';

    // Abrir archivo (clic izquierdo)
    li.onclick = (e) => {
      if (e.button === 0) openFile(pathStr, false);
    };

    // Cerrar con clic medio
    li.onauxclick = (e) => {
      if (e.button === 1) {
        e.preventDefault();
        closeTab(pathStr);
      }
    };

    // Botón de cerrar
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-tab';
    closeBtn.innerHTML = '&times;';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'transparent';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.pointerEvents = 'auto'; // Importante

    closeBtn.addEventListener('mousedown', (e) => {
      closeTab(pathStr);
    });

    innerDiv.appendChild(labelSpan);
    innerDiv.appendChild(closeBtn);
    li.appendChild(innerDiv);
    tabsUl.appendChild(li);
  });
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

function highlightActiveFile() {
  document.querySelectorAll('#files li').forEach(li => {
    li.classList.toggle('active', li.dataset.path === currentFilePath);
  });
}
