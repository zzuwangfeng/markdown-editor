const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectWorkspace: () => ipcRenderer.invoke('select-workspace'),
  getWorkspace: () => ipcRenderer.invoke('get-workspace'),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  createItem: (parentPath, name, isDirectory) => ipcRenderer.invoke('create-item', parentPath, name, isDirectory),
  renameItem: (oldPath, newName) => ipcRenderer.invoke('rename-item', oldPath, newName),
  deleteItem: (itemPath) => ipcRenderer.invoke('delete-item', itemPath),
  copyFile: (src, dest) => ipcRenderer.invoke('copy-file', src, dest),
  writeImageFile: (dir, name, base64Data) => ipcRenderer.invoke('write-image-file', dir, name, base64Data),
  getFileStat: (filePath) => ipcRenderer.invoke('get-file-stat', filePath),
  createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),
  showItemInFolder: (itemPath) => ipcRenderer.invoke('show-item-in-folder', itemPath),
  selectImage: () => ipcRenderer.invoke('select-image'),
  // 监听菜单事件
  onMenuEvent: (callback) => ipcRenderer.on('menu-event', (event, action) => callback(action))
});
