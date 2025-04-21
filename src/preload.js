const { contextBridge, ipcRenderer,shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openExternalLink: (url) => ipcRenderer.invoke('open-external-link', url)
});

contextBridge.exposeInMainWorld('api', {
  openExternal: (url) => shell.openExternal(url),
  navigateTo: page => ipcRenderer.invoke('navigate-to', page),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  getDirectoryData:     () => ipcRenderer.invoke('get-directory-data'),
  changeDirectory:      n  => ipcRenderer.invoke('change-directory', n),
  changeBaseDir:        b  => ipcRenderer.invoke('change-base-dir', b),
  getConfig:            () => ipcRenderer.invoke('get-config'),
  updateConfig:         u  => ipcRenderer.invoke('update-config', u),
  readFile:             f  => ipcRenderer.invoke('read-file', f),
  saveFile:             (f,c) => ipcRenderer.invoke('save-file', f, c),
  createFile:           n  => ipcRenderer.invoke('create-file', n),
  createDirectory:      n  => ipcRenderer.invoke('create-directory', n),
  renameItem:           (o,n) => ipcRenderer.invoke('rename-item', o, n),
  deleteItem:           n  => ipcRenderer.invoke('delete-item', n),
  showDirContextMenu:   n  => ipcRenderer.invoke('show-dir-context-menu', n),
  showFileContextMenu:  n  => ipcRenderer.invoke('show-file-context-menu', n),
  onContextMenuAction:  cb => ipcRenderer.on('context-menu-action', (e, data) => cb(data)),
  saveClipboardImage:   b64=> ipcRenderer.invoke('save-clipboard-image', b64)
});
