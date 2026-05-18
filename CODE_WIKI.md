# FlowMark Editor - Code Wiki

## 1. 项目概述

### 1.1 项目简介
FlowMark Editor 是一款专为 AI 辅助写作场景设计的轻量级本地 Markdown 编辑器，采用 Electron 框架构建，支持跨平台运行（macOS、Windows）。

### 1.2 核心特性
- **本地优先**: 完全离线运行，无云端服务器，数据完全保存在本地
- **所见即所得**: 采用 ContentEditable 实现的可视化编辑器
- **文件透明**: 直接读写本地 `.md` 文件，无加密或私有格式
- **轻量架构**: 单工作区设计，低内存占用
- **主题系统**: 支持浅色、深色、护眼主题
- **搜索功能**: 工作区全文搜索和文档内搜索

### 1.3 技术栈
- **框架**: Electron 31.x
- **前端**: HTML5 + CSS3 + Vanilla JavaScript（无框架）
- **构建工具**: electron-builder
- **测试**: Jest（单元测试）+ Playwright（端到端测试）

---

## 2. 项目架构

### 2.1 目录结构
```
markdown-editor/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── main.js             # 主进程入口
│   │   └── preload.js          # 预加载脚本（安全桥接）
│   └── renderer/               # 渲染进程
│       ├── index.html          # 主页面
│       ├── scripts/
│       │   └── app.js          # 应用主逻辑
│       └── styles/
│           └── main.css        # 全局样式
├── package.json
├── forge.config.js
├── jest.config.js
├── playwright.config.js
└── electron-launcher.sh
```

### 2.2 进程架构

#### 主进程（Main Process）
- 文件路径: `src/main/main.js`
- 职责:
  - 应用生命周期管理
  - 窗口创建和管理
  - 菜单栏创建
  - 文件系统操作（读写、删除、重命名等）
  - 工作区管理
  - 项目搜索功能
  - IPC 通信处理

#### 预加载脚本（Preload Script）
- 文件路径: `src/main/preload.js`
- 职责:
  - 通过 Context Bridge 安全暴露 API
  - 隔离主进程和渲染进程
  - 提供必要的文件系统和窗口操作接口

#### 渲染进程（Renderer Process）
- 文件路径: `src/renderer/scripts/app.js`
- 职责:
  - UI 渲染和交互
  - Markdown 编辑器实现
  - 文件树组件
  - 大纲视图
  - 格式工具栏
  - 各种菜单和对话框管理

---

## 3. 主要模块详解

### 3.1 主进程模块

#### 核心功能模块
```javascript
// src/main/main.js 主要功能点
1. createWindow()          // 创建主窗口
2. createMenu()            // 创建应用菜单栏
3. readDirRecursive()      // 递归读取目录
4. IPC 事件处理程序        // 处理渲染进程的请求
```

#### IPC 通信通道
| 通道名称 | 方向 | 功能 |
|---------|------|------|
| `select-workspace` | R→M | 选择工作区目录 |
| `get-workspace` | R→M | 获取当前工作区 |
| `read-directory` | R→M | 读取目录结构 |
| `read-file` | R→M | 读取文件内容 |
| `write-file` | R→M | 写入文件内容 |
| `create-item` | R→M | 创建文件或目录 |
| `rename-item` | R→M | 重命名文件或目录 |
| `delete-item` | R→M | 删除文件或目录（移至回收站） |
| `copy-file` | R→M | 复制文件 |
| `write-image-file` | R→M | 写入图片文件 |
| `get-file-stat` | R→M | 获取文件状态 |
| `create-directory` | R→M | 创建目录 |
| `show-item-in-folder` | R→M | 在文件管理器中显示 |
| `select-image` | R→M | 选择图片文件 |
| `search-project` | R→M | 项目全文搜索 |
| `window-minimize` | R→M | 最小化窗口 |
| `window-maximize` | R→M | 最大化/还原窗口 |
| `window-close` | R→M | 关闭窗口 |
| `menu-event` | M→R | 菜单事件通知 |

---

### 3.2 渲染进程模块

#### 状态管理
```javascript
// app.js - 核心状态变量
let currentWorkspace = null;          // 当前工作区路径
let currentFilePath = null;            // 当前打开文件
let currentFileName = null;            // 当前文件名
let currentFileContent = null;        // 当前文件内容
let saveTimeout = null;                // 自动保存定时器
let isSaving = false;                  // 保存状态
let isLoading = false;                 // 加载状态
let contextMenuTarget = null;          // 右键菜单目标
let slashPanelVisible = false;         // 斜杠命令面板状态
let slashSelectedIndex = 0;            // 斜杠命令选中索引
let slashFilter = '';                  // 斜杠命令过滤
let lastModifiedTime = null;           // 文件最后修改时间
let assetsFolderPath = null;           // 图片资源文件夹
let expandedFolders = new Set();       // 已展开文件夹集合
let currentTheme = 'light';            // 当前主题
let isOutlineEnabled = false;          // 大纲启用状态
let isReadingMode = false;             // 阅读模式
let currentZoom = 100;                 // 缩放级别
let currentFontSize = 16;              // 字体大小
```

#### 主要功能模块

##### 1. 初始化与事件绑定
- `init()` / `doInit()`: 应用初始化
- `bindEvents()`: 绑定所有事件监听器
- `restoreUserSettings()`: 从 localStorage 恢复用户设置
- `saveWorkspaceToStorage()`: 保存工作区设置

##### 2. 工作区管理
- `openWorkspace()`: 打开工作区选择对话框
- `restorePersistentWorkspace()`: 恢复持久化的工作区
- `clearWorkspaceStorage()`: 清除工作区缓存

##### 3. 文件树组件
- `renderFileTreeFromData()`: 从数据渲染文件树
- `createTreeItem()`: 创建单个树节点
- `toggleFolder()`: 展开/折叠文件夹
- `selectFile()`: 选择文件
- `refreshFileTree()`: 刷新文件树
- `searchFilesInTree()`: 在文件树中搜索

##### 4. 编辑器组件
- `loadFile()`: 加载文件
- `saveCurrentFile()`: 保存当前文件
- `handleEditorInput()`: 处理编辑器输入
- `handleEditorKeydown()`: 处理编辑器键盘事件
- `handleSelectionChange()`: 处理选择变化（显示格式工具栏）
- `updateOutline()`: 更新大纲视图
- `debouncedRenderPreview()`: 防抖渲染预览

##### 5. 格式操作
- `wrapSelection()`: 包裹选中文本（粗体、斜体等）
- `insertHeading()`: 插入标题
- `insertList()`: 插入列表
- `insertCodeBlock()`: 插入代码块
- `insertBlockquote()`: 插入引用
- `insertLink()`: 插入链接
- `insertImage()`: 插入图片
- `insertTable()`: 插入表格

##### 6. 斜杠命令系统
- `slashCommands`: 预定义的斜杠命令配置
- `showSlashPanel()`: 显示斜杠命令面板
- `hideSlashPanel()`: 隐藏斜杠命令面板
- `selectSlashItem()`: 选择斜杠命令项

##### 7. 工具栏与菜单
- `formatToolbar`: 格式工具栏（选择文本后显示）
- `contextMenu`: 右键菜单
- `imageContextMenu`: 图片右键菜单
- `tableContextMenu`: 表格右键菜单

##### 8. 对话框
- `showDialog()`: 显示通用对话框
- `showConfirmDialog()`: 显示确认对话框
- `showAboutDialog()`: 显示关于对话框
- `showTableDialog()`: 显示表格插入对话框
- `showConflictDialog()`: 显示文件冲突对话框

##### 9. 搜索功能
- `toggleProjectSearchPanel()`: 切换项目搜索面板
- `handleProjectSearch()`: 处理项目搜索
- `renderProjectSearchResults()`: 渲染搜索结果
- `toggleSearchPanel()`: 切换文档内搜索面板
- `handleSearchInput()`: 处理搜索输入

##### 10. 主题与视图
- `setTheme()`: 设置主题
- `updateThemeUI()`: 更新主题 UI
- `toggleOutline()`: 切换大纲显示
- `toggleReadingMode()`: 切换阅读模式
- `adjustZoom()`: 调整缩放
- `adjustFontSize()`: 调整字体大小
- `setViewMode()`: 设置视图模式（编辑/预览/双栏）

##### 11. 表格功能
- `initTableResize()`: 初始化表格调整大小
- `insertTableRow()`: 插入表格行
- `insertTableColumn()`: 插入表格列
- `deleteTableRow()`: 删除表格行
- `deleteTableColumn()`: 删除表格列

---

## 4. 关键类与函数

### 4.1 主进程关键函数

#### `createWindow()`
```javascript
// 功能: 创建应用主窗口
// 位置: src/main/main.js
// 参数: 无
// 返回: 无
// 窗口配置:
//   - 尺寸: 1280x800
//   - 最小尺寸: 900x600
//   - 无边框: frame: false
//   - 安全设置: contextIsolation: true, nodeIntegration: false
```

#### `readDirRecursive(dirPath)`
```javascript
// 功能: 递归读取目录，返回排序后的文件树
// 位置: src/main/main.js
// 参数:
//   - dirPath: string - 目录路径
// 返回: Promise<Array> - 目录树结构
// 排序规则: 文件夹在前，文件在后，按名称排序
// 过滤: 跳过隐藏文件（以 . 开头）
```

#### `searchProject(workspace, query, options)`
```javascript
// 功能: 在工作区内执行全文搜索
// 位置: src/main/main.js
// 参数:
//   - workspace: string - 工作区路径
//   - query: string - 搜索关键词
//   - options: object - 可选配置（maxResults, maxFiles）
// 返回: Promise<Object> - 搜索结果
```

---

### 4.2 渲染进程关键函数

#### `init()`
```javascript
// 功能: 应用初始化入口
// 位置: src/renderer/scripts/app.js
// 流程:
//   1. 等待 DOM 加载完成
//   2. 调用 doInit() 进行实际初始化
```

#### `doInit()`
```javascript
// 功能: 执行实际的初始化工作
// 位置: src/renderer/scripts/app.js
// 流程:
//   1. 获取 DOM 元素引用
//   2. 绑定事件监听器
//   3. 恢复用户设置
//   4. 更新大纲视图
//   5. 初始化编辑器状态
//   6. 渲染最近文件列表
```

#### `loadFile(filePath, fileName)`
```javascript
// 功能: 加载并显示指定文件
// 位置: src/renderer/scripts/app.js
// 参数:
//   - filePath: string - 文件完整路径
//   - fileName: string - 文件名
// 流程:
//   1. 通过 IPC 读取文件内容
//   2. 解析 HTML 到编辑器
//   3. 更新 UI 状态
//   4. 更新大纲
//   5. 渲染预览（如果启用）
//   6. 添加到最近文件
```

#### `saveCurrentFile()`
```javascript
// 功能: 保存当前文件
// 位置: src/renderer/scripts/app.js
// 流程:
//   1. 将编辑器 HTML 转换为 Markdown
//   2. 通过 IPC 写入文件
//   3. 更新保存状态指示器
//   4. 更新文件最后修改时间
```

#### `updateOutline()`
```javascript
// 功能: 更新大纲视图
// 位置: src/renderer/scripts/app.js
// 流程:
//   1. 扫描编辑器中的 H1-H3 标题
//   2. 生成大纲项
//   3. 渲染到大纲面板
```

#### `handleProjectSearch()`
```javascript
// 功能: 处理项目搜索
// 位置: src/renderer/scripts/app.js
// 流程:
//   1. 获取搜索关键词
//   2. 调用主进程搜索 API
//   3. 渲染搜索结果
//   4. 绑定结果点击事件
```

---

## 5. 数据结构

### 5.1 文件树节点结构
```javascript
{
  name: string,              // 文件/文件夹名称
  path: string,              // 完整路径
  isDirectory: boolean,      // 是否为文件夹
  children: Array|null       // 子节点（仅文件夹）
}
```

### 5.2 斜杠命令结构
```javascript
{
  id: string,                // 命令 ID
  title: string,             // 显示标题
  description: string,       // 描述
  icon: string,              // 图标
  action: Function           // 执行函数
}
```

### 5.3 搜索结果结构
```javascript
{
  success: boolean,
  results: Array<{
    path: string,           // 文件路径
    name: string,           // 文件名
    matches: Array<{
      lineNumber: number,   // 行号
      line: string,         // 行内容
      matchStart: number,   // 匹配起始位置
      matchEnd: number      // 匹配结束位置
    }>
  }>,
  totalMatches: number,     // 总匹配数
  totalFiles: number        // 匹配文件数
}
```

---

## 6. 依赖关系

### 6.1 生产依赖
无（Electron 内置所有必需功能）

### 6.2 开发依赖
```json
{
  "@electron-forge/cli": "^7.2.0",
  "@electron-forge/maker-dmg": "^7.2.0",
  "@electron-forge/maker-zip": "^7.11.1",
  "@playwright/test": "^1.60.0",
  "@types/jest": "^30.0.0",
  "electron": "^31.7.7",
  "electron-builder": "^24.9.1",
  "jest": "^30.4.2"
}
```

---

## 7. UI 组件与样式

### 7.1 主题系统

#### 浅色主题（默认）
- 主背景: `#FFFFFF`
- 次要背景: `#F7F8FA`
- 主文字: `#1A1A1A`
- 次要文字: `#6B7280`
- 强调色: `#3B82F6`

#### 深色主题
- 主背景: `#1E1E1E`
- 次要背景: `#252526`
- 主文字: `#CCCCCC`
- 次要文字: `#858585`
- 强调色: `#0D7CF0`

#### 护眼主题（Sepia）
- 主背景: `#F4ECD8`
- 次要背景: `#EDE4CF`
- 主文字: `#5B4636`
- 次要文字: `#7A6552`
- 强调色: `#8B7355`

### 7.2 主要 UI 组件

| 组件 | CSS 类名 | 功能 |
|-----|---------|------|
| 侧边栏 | `.sidebar` | 文件树和搜索 |
| 文件树 | `.file-tree` | 显示工作区文件 |
| 编辑器容器 | `.editor-container` | 编辑器主容器 |
| 工具栏 | `.toolbar` | 顶部工具栏 |
| 编辑器内容 | `.editor-content` | 可编辑区域 |
| 预览内容 | `.preview-content` | Markdown 预览 |
| 大纲面板 | `.outline-panel` | 文档大纲 |
| 格式工具栏 | `.format-toolbar` | 选中文字时显示 |
| 右键菜单 | `.context-menu` | 右键菜单 |
| 斜杠命令面板 | `.slash-panel` | 斜杠命令选择 |

---

## 8. 项目运行方式

### 8.1 开发环境启动

```bash
# 安装依赖
npm install

# 开发模式启动（使用 Electron Forge）
npm run start:forge

# 或直接使用 Electron
npm start
```

### 8.2 构建打包

```bash
# 构建 macOS 应用
npm run build:mac

# 构建 Windows 应用
npm run build:win

# 使用 Electron Forge 打包
npm run make

# 或使用 electron-builder
npm run build
```

### 8.3 测试

```bash
# 运行单元测试
npm test

# 运行端到端测试
npm run test:e2e

# 运行端到端测试（带 UI）
npm run test:e2e:ui

# 运行所有测试
npm run test:all
```

### 8.4 输出产物

- macOS: `dist/FlowMark Editor-1.0.0-arm64.dmg`
- Windows: `dist/FlowMark Editor-1.0.0.exe`

---

## 9. 开发指南

### 9.1 添加新的斜杠命令

在 `app.js` 中的 `slashCommands` 数组添加新项:

```javascript
const slashCommands = [
  // ... 现有命令
  {
    id: 'my-command',
    title: '我的命令',
    description: '命令描述',
    icon: '📝',
    action: () => {
      // 实现你的功能
    }
  }
];
```

### 9.2 添加新的 IPC 处理程序

1. 在 `main.js` 中添加处理程序:
```javascript
ipcMain.handle('my-channel', async (event, ...args) => {
  // 处理逻辑
  return result;
});
```

2. 在 `preload.js` 中暴露 API:
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  // ... 现有 API
  myFunction: (...args) => ipcRenderer.invoke('my-channel', ...args)
});
```

3. 在 `app.js` 中使用:
```javascript
const result = await window.electronAPI.myFunction(...args);
```

### 9.3 添加新主题

1. 在 `main.css` 中添加 CSS 变量:
```css
[data-theme="my-theme"] {
  --bg-primary: #...;
  --bg-secondary: #...;
  /* ... 其他变量 */
}
```

2. 在 `app.js` 中更新主题下拉和逻辑

---

## 10. 注意事项与安全

### 10.1 安全实践
- ✅ 启用 `contextIsolation`
- ✅ 禁用 `nodeIntegration`
- ✅ 使用预加载脚本安全暴露 API
- ✅ 不使用 `eval()` 或类似函数
- ✅ 正确验证用户输入

### 10.2 文件处理
- 文件操作通过主进程执行
- 删除操作使用系统回收站而非永久删除
- 支持检测外部文件修改
- 自动保存延迟 2 秒以减少磁盘 IO

### 10.3 性能优化
- 使用防抖（debounce）处理频繁操作
- 文件树虚拟滚动（大目录）
- 搜索结果分页/限制

---

## 11. 常见问题

### Q: 如何切换工作区？
A: 使用菜单栏 "文件" → "打开工作区" 或侧边栏的 "+" 按钮。

### Q: 图片保存在哪里？
A: 图片保存在工作区根目录下的 `.flowmark-assets/` 隐藏文件夹中。

### Q: 如何启用大纲视图？
A: 使用工具栏的大纲按钮或菜单栏 "视图" → "大纲"。

### Q: 支持哪些 Markdown 语法？
A: 支持基本的 Markdown 语法，包括标题、列表、引用、代码块、表格、链接、图片等。

---

## 12. 版本信息

- 当前版本: 1.0.0
- Electron 版本: 31.7.7
- Node.js 版本: 随 Electron 打包
- 许可证: MIT

---

*文档最后更新: 2026-05-18*
