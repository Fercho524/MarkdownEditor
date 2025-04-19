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
