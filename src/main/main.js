// FlowMark Editor - 主进程
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let currentWorkspace = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 创建 macOS 顶部菜单栏
function createMenu() {
  const template = [
    {
      label: 'FlowMark',
      submenu: [
        { label: '关于 FlowMark', role: 'about' },
        { type: 'separator' },
        { label: '偏好设置', accelerator: 'Cmd+,', click: () => mainWindow.webContents.send('menu-event', 'settings') },
        { type: 'separator' },
        { label: '退出', accelerator: 'Cmd+Q', role: 'quit' }
      ]
    },
    {
      label: '文件',
      submenu: [
        { label: '新建文件', accelerator: 'Cmd+N', click: () => mainWindow.webContents.send('menu-event', 'new-file') },
        { label: '打开工作区', accelerator: 'Cmd+O', click: () => mainWindow.webContents.send('menu-event', 'open-workspace') },
        { type: 'separator' },
        { label: '保存', accelerator: 'Cmd+S', click: () => mainWindow.webContents.send('menu-event', 'save') },
        { type: 'separator' },
        { label: '关闭标签', accelerator: 'Cmd+W', role: 'close' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'Cmd+Z', role: 'undo' },
        { label: '重做', accelerator: 'Cmd+Shift+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'Cmd+X', role: 'cut' },
        { label: '复制', accelerator: 'Cmd+C', role: 'copy' },
        { label: '粘贴', accelerator: 'Cmd+V', role: 'paste' },
        { type: 'separator' },
        { label: '全选', accelerator: 'Cmd+A', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '侧边栏', accelerator: 'Cmd+B', click: () => mainWindow.webContents.send('menu-event', 'toggle-sidebar') },
        { label: '大纲', accelerator: 'Cmd+Shift+O', click: () => mainWindow.webContents.send('menu-event', 'toggle-outline') },
        { type: 'separator' },
        { label: '放大', accelerator: 'Cmd+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'Cmd+-', role: 'zoomOut' },
        { label: '重置缩放', accelerator: 'Cmd+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: '切换全屏', accelerator: 'Ctrl+Cmd+F', role: 'togglefullscreen' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        { label: '关于', click: () => mainWindow.webContents.send('menu-event', 'about') }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('select-workspace', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    currentWorkspace = result.filePaths[0];
    return currentWorkspace;
  }
  return null;
});

ipcMain.handle('get-workspace', () => {
  return currentWorkspace;
});

ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const result = await Promise.all(items.map(async (item) => {
      const fullPath = path.join(dirPath, item.name);
      const isDirectory = item.isDirectory();
      const name = item.name;

      if (!isDirectory && !name.endsWith('.md')) {
        return null;
      }

      let children = null;
      if (isDirectory) {
        try {
          const subItems = await fs.promises.readdir(fullPath, { withFileTypes: true });
          children = subItems
            .filter(subItem => {
              if (subItem.isDirectory()) return true;
              return subItem.name.endsWith('.md');
            })
            .map(subItem => ({
              name: subItem.name,
              path: path.join(fullPath, subItem.name),
              isDirectory: subItem.isDirectory()
            }));
        } catch (e) {
          children = [];
        }
      }

      return { name, path: fullPath, isDirectory, children };
    }));

    return result.filter(item => item !== null);
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading file:', error);
    return '';
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    await fs.promises.writeFile(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing file:', error);
    return false;
  }
});

ipcMain.handle('create-item', async (event, parentPath, name, isDirectory) => {
  try {
    const fullPath = path.join(parentPath, name);
    if (isDirectory) {
      await fs.promises.mkdir(fullPath, { recursive: true });
    } else {
      await fs.promises.writeFile(fullPath, '', 'utf-8');
    }
    return { success: true, path: fullPath };
  } catch (error) {
    console.error('Error creating item:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rename-item', async (event, oldPath, newName) => {
  try {
    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, newName);
    await fs.promises.rename(oldPath, newPath);
    return { success: true, path: newPath };
  } catch (error) {
    console.error('Error renaming item:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-item', async (event, itemPath) => {
  try {
    const stats = await fs.promises.stat(itemPath);
    if (stats.isDirectory()) {
      await fs.promises.rm(itemPath, { recursive: true });
    } else {
      await fs.promises.unlink(itemPath);
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting item:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('copy-file', async (event, src, dest) => {
  try {
    await fs.promises.copyFile(src, dest);
    return { success: true };
  } catch (error) {
    console.error('Error copying file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-image-file', async (event, dir, name, base64Data) => {
  try {
    await fs.promises.mkdir(dir, { recursive: true });
    const buffer = Buffer.from(base64Data, 'base64');
    const filePath = path.join(dir, name);
    await fs.promises.writeFile(filePath, buffer);
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error writing image file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-file-stat', async (event, filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    return { success: true, mtime: stats.mtime.getTime(), size: stats.size };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-directory', async (event, dirPath) => {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
    return { success: true };
  } catch (error) {
    console.error('Error creating directory:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('show-item-in-folder', async (event, itemPath) => {
  try {
    const { shell } = require('electron');
    shell.showItemInFolder(itemPath);
    return { success: true };
  } catch (error) {
    console.error('Error showing item in folder:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const fileName = path.basename(filePath);
    return { filePath, fileName };
  }
  return null;
});