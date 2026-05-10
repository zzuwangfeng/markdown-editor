// FlowMark Editor - 主进程
const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let currentWorkspace = null;

/**
 * 递归读取目录，返回排序后的子项数组（包含嵌套children）
 */
async function readDirRecursive(dirPath) {
  try {
    const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const result = [];

    for (const item of items) {
      if (item.name.startsWith('.')) continue;

      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        const children = await readDirRecursive(fullPath);
        result.push({
          name: item.name,
          path: fullPath,
          isDirectory: true,
          children: children
        });
      } else if (item.name.endsWith('.md')) {
        result.push({
          name: item.name,
          path: fullPath,
          isDirectory: false,
          children: null
        });
      }
    }

    // 排序：文件夹在前，文件在后
    result.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  } catch (e) {
    return [];
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
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
        {
          label: '主题',
          submenu: [
            { label: '浅色', click: () => mainWindow.webContents.send('menu-event', 'theme-light') },
            { label: '深色', click: () => mainWindow.webContents.send('menu-event', 'theme-dark') }
          ]
        },
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
        { label: '开发者工具', accelerator: 'Cmd+Option+I', role: 'toggleDevTools' },
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
      // 跳过隐藏文件（以 . 开头的文件/文件夹）
      if (item.name.startsWith('.')) {
        return null;
      }

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
          const mapped = [];
          for (const subItem of subItems) {
            // 跳过隐藏文件
            if (subItem.name.startsWith('.')) continue;
            if (subItem.isDirectory()) {
              // 递归读取子目录
              const subDirPath = path.join(fullPath, subItem.name);
              const subChildren = await readDirRecursive(subDirPath);
              mapped.push({
                name: subItem.name,
                path: subDirPath,
                isDirectory: true,
                children: subChildren
              });
            } else if (subItem.name.endsWith('.md')) {
              mapped.push({
                name: subItem.name,
                path: path.join(fullPath, subItem.name),
                isDirectory: false,
                children: null
              });
            }
          }
          // 子目录排序：文件夹在前，文件在后
          mapped.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
          });
          children = mapped;
        } catch (e) {
          children = [];
        }
      }

      return { name, path: fullPath, isDirectory, children };
    }));

    // 排序：文件夹在前，文件在后，按名字排序
    const filtered = result.filter(item => item !== null);
    filtered.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return filtered;
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
    console.log('[delete-item] shell type:', typeof shell);
    console.log('[delete-item] shell keys:', Object.keys(shell));
    console.log('[delete-item] shell.moveItemToTrash:', typeof shell.moveItemToTrash);
    console.log('[delete-item] shell.trashItem:', typeof shell.trashItem);
    console.log('[delete-item] path:', itemPath);
    // 尝试使用 trashItem (新版 API)
    if (typeof shell.trashItem === 'function') {
      await shell.trashItem(itemPath);
      console.log('[delete-item] moved to trash via trashItem');
      return { success: true };
    } else if (typeof shell.moveItemToTrash === 'function') {
      const result = shell.moveItemToTrash(itemPath);
      console.log('[delete-item] result:', result);
      return { success: result };
    } else {
      throw new Error('Neither trashItem nor moveItemToTrash available');
    }
  } catch (error) {
    console.error('Error moving to trash:', error);
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

// 项目全文搜索
ipcMain.handle('search-project', async (event, workspace, query, options = {}) => {
  try {
    const { maxResults = 500, maxFiles = 50 } = options;
    const results = [];
    const fileMatches = new Map();

    // 递归扫描目录中的 md 文件
    async function scanDirectory(dirPath) {
      if (results.length >= maxResults) return;

      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) break;

        // 跳过隐藏文件和非 md 文件
        if (entry.name.startsWith('.') || (!entry.isDirectory() && !entry.name.endsWith('.md'))) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // 递归扫描子目录
          await scanDirectory(fullPath);
        } else {
          // 读取文件内容进行匹配
          try {
            const content = await fs.promises.readFile(fullPath, 'utf-8');
            const lines = content.split('\n');
            const fileMatchResults = [];

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const lowerLine = line.toLowerCase();
              const lowerQuery = query.toLowerCase();
              let index = -1;

              while ((index = lowerLine.indexOf(lowerQuery, index + 1)) !== -1) {
                fileMatchResults.push({
                  lineNumber: i + 1,
                  line,
                  matchStart: index,
                  matchEnd: index + query.length
                });

                if (fileMatchResults.length >= 20) break; // 每个文件最多20个匹配
              }

              if (fileMatchResults.length >= 20) break;
            }

            if (fileMatchResults.length > 0) {
              fileMatches.set(fullPath, {
                path: fullPath,
                name: entry.name,
                matches: fileMatchResults
              });
            }
          } catch (e) {
            // 跳过无法读取的文件
          }
        }
      }
    }

    await scanDirectory(workspace);

    // 转换为结果数组
    for (const [, fileResult] of fileMatches) {
      results.push(fileResult);
      if (results.length >= maxFiles) break;
    }

    return {
      success: true,
      results,
      totalMatches: results.reduce((sum, r) => sum + r.matches.length, 0),
      totalFiles: results.length
    };
  } catch (error) {
    console.error('Search error:', error);
    return { success: false, error: error.message, results: [] };
  }
});