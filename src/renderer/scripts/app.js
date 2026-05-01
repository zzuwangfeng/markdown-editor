// FlowMark Editor - 主应用文件
// 功能：Markdown WYSIWYG 编辑器，提供实时预览、文件管理等功能
(function() {
  'use strict';

  // ========================================
  // 状态变量 - 保存应用当前状态
  // ========================================
  let currentWorkspace = null;      // 当前工作区路径
  let currentFilePath = null;        // 当前打开文件的完整路径
  let currentFileName = null;        // 当前打开文件的名称
  let currentFileContent = null;      // 当前文件内容（用于检测修改）
  let saveTimeout = null;             // 自动保存定时器
  let isSaving = false;              // 是否正在保存
  let contextMenuTarget = null;      // 右键菜单目标文件/文件夹
  let slashPanelVisible = false;     // 斜杠命令面板是否可见
  let slashSelectedIndex = 0;        // 斜杠命令面板选中索引
  let slashFilter = '';             // 斜杠命令面板过滤文本
  let lastModifiedTime = null;       // 文件最后修改时间（用于检测外部修改）
  let fileWatcherInterval = null;    // 文件监控定时器
  let assetsFolderPath = null;       // 图片资源文件夹路径
  let isPreviewMode = false;         // 是否启用实时预览

  // ========================================
  // DOM 元素引用 - 在 init() 中初始化
  // ========================================
  let sidebar, fileTree, emptyState, workspaceName;
  let btnAdd, dropdownMenu, editor, editorPlaceholder;
  let currentFileNameEl, saveStatus, wordCount, lineInfo;
  let outlineList, contextMenu, formatToolbar;
  let slashPanel, slashList;
  let conflictOverlay, conflictMessage;
  let tableDialogOverlay, imageProgress;
  let btnPreview, previewContent;
  let dialogOverlay, dialogTitle, dialogInput;
  let dialogCancel, dialogConfirm;
  let confirmOverlay, confirmTitle, confirmMessage;
  let confirmCancel, confirmOk;

  // ========================================
  // 斜杠命令配置 - 输入 / 唤起命令面板
  // ========================================
  const slashCommands = [
    { id: 'h1', title: '一级标题', description: '大标题', icon: 'H1', action: () => insertHeading(1) },
    { id: 'h2', title: '二级标题', description: '中标题', icon: 'H2', action: () => insertHeading(2) },
    { id: 'h3', title: '三级标题', description: '小标题', icon: 'H3', action: () => insertHeading(3) },
    { id: 'bold', title: '加粗', description: '文字加粗', icon: 'B', action: () => wrapSelection('strong') },
    { id: 'italic', title: '斜体', description: '文字斜体', icon: 'I', action: () => wrapSelection('em') },
    { id: 'strikethrough', title: '删除线', description: '文字删除线', icon: 'S', action: () => wrapSelection('s') },
    { id: 'code', title: '行内代码', description: '行内代码片段', icon: '</>', action: () => wrapSelection('code') },
    { id: 'codeblock', title: '代码块', description: '多行代码', icon: '{ }', action: () => insertCodeBlock() },
    { id: 'link', title: '链接', description: '超链接', icon: '🔗', action: () => insertLink() },
    { id: 'image', title: '图片', description: '插入本地图片', icon: '🖼', action: () => insertImage() },
    { id: 'table', title: '表格', description: '插入表格', icon: '⊞', action: () => showTableDialog() },
    { id: 'ul', title: '无序列表', description: '项目符号列表', icon: '•', action: () => insertList('ul') },
    { id: 'ol', title: '有序列表', description: '数字编号列表', icon: '1.', action: () => insertList('ol') },
    { id: 'todo', title: '待办清单', description: '可勾选的任务列表', icon: '☐', action: () => insertTodoList() },
    { id: 'blockquote', title: '引用', description: '引用块', icon: '"', action: () => insertBlockquote() },
    { id: 'hr', title: '分割线', description: '水平分隔线', icon: '—', action: () => insertHorizontalRule() },
  ];

  // ========================================
  // SVG 图标定义
  // ========================================
  const icons = {
    folder: `<svg class="tree-item-icon" viewBox="0 0 18 18" fill="none">
      <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3.172a1.5 1.5 0 0 1 1.06.44l.658.658H14.5A1.5 1.5 0 0 1 16 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 2 12.5v-8z" stroke="currentColor" stroke-width="1.3"/>
    </svg>`,
    file: `<svg class="tree-item-icon" viewBox="0 0 18 18" fill="none">
      <path d="M10 1.5H5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5V6L10 1.5z" stroke="currentColor" stroke-width="1.3"/>
      <path d="M10 1.5v4.5h4.5" stroke="currentColor" stroke-width="1.3"/>
    </svg>`,
    arrow: `<svg class="tree-item-expand" viewBox="0 0 18 18" fill="none">
      <path d="M7 4l4 5-4 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  };

  // ========================================
  // 初始化入口
  // ========================================
  async function init() {
    // 等待 DOM 加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', doInit);
    } else {
      doInit();
    }
  }

  // ========================================
  // DOM 初始化和数据绑定
  // ========================================
  function doInit() {
    // 获取所有 DOM 元素引用
    sidebar = document.getElementById('sidebar');
    fileTree = document.getElementById('file-tree');
    emptyState = document.getElementById('empty-state');
    workspaceName = document.getElementById('workspace-name');
    btnAdd = document.getElementById('btn-add');
    dropdownMenu = document.getElementById('dropdown-menu');
    editor = document.getElementById('editor');
    editorPlaceholder = document.getElementById('editor-placeholder');
    currentFileNameEl = document.getElementById('current-file-name');
    saveStatus = document.getElementById('save-status');
    wordCount = document.getElementById('word-count');
    lineInfo = document.getElementById('line-info');
    outlineList = document.getElementById('outline-list');
    contextMenu = document.getElementById('context-menu');
    formatToolbar = document.getElementById('format-toolbar');
    slashPanel = document.getElementById('slash-panel');
    slashList = document.getElementById('slash-list');
    conflictOverlay = document.getElementById('conflict-overlay');
    conflictMessage = document.getElementById('conflict-message');
    tableDialogOverlay = document.getElementById('table-dialog-overlay');
    imageProgress = document.getElementById('image-progress');
    btnPreview = document.getElementById('btn-preview');
    previewContent = document.getElementById('preview-content');
    dialogOverlay = document.getElementById('dialog-overlay');
    dialogTitle = document.getElementById('dialog-title');
    dialogInput = document.getElementById('dialog-input');
    dialogCancel = document.getElementById('dialog-cancel');
    dialogConfirm = document.getElementById('dialog-confirm');
    confirmOverlay = document.getElementById('confirm-overlay');
    confirmTitle = document.getElementById('confirm-title');
    confirmMessage = document.getElementById('confirm-message');
    confirmCancel = document.getElementById('confirm-cancel');
    confirmOk = document.getElementById('confirm-ok');

    // 绑定所有事件监听器
    bindEvents();

    // 更新目录大纲
    updateOutline();

    // 默认启用预览模式
    btnPreview.classList.add('active');
    isPreviewMode = true;
  }

  // ========================================
  // 事件绑定
  // ========================================
  function bindEvents() {
    // 预览按钮
    btnPreview.addEventListener('click', togglePreview);

    // 添加按钮（下拉菜单触发）
    btnAdd.addEventListener('click', handleAddClick);

    // 下拉菜单项目点击
    dropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => handleDropdownAction(item.dataset.action));
    });

    // 点击其他区域关闭下拉菜单
    document.addEventListener('click', hideDropdownMenu);

    // 编辑器输入事件
    editor.addEventListener('input', handleEditorInput);
    editor.addEventListener('keyup', handleEditorKeyup);
    editor.addEventListener('mouseup', handleSelectionChange);
    editor.addEventListener('keyup', handleSelectionChange);
    editor.addEventListener('paste', handlePaste);
    editor.addEventListener('drop', handleDrop);
    editor.addEventListener('dragover', handleDragOver);
    editor.addEventListener('keydown', handleEditorKeydown);
    editor.addEventListener('input', handleEditorInputForSlash);

    // 上下文菜单和斜杠面板
    document.addEventListener('click', hideContextMenu);
    document.addEventListener('click', hideSlashPanel);
    document.addEventListener('keydown', handleGlobalKeydown);

    // 插入菜单按钮
    document.querySelectorAll('.menu-btn').forEach(btn => {
      btn.addEventListener('click', () => executeMenuCommand(btn.dataset.cmd));
    });

    // 格式化工具栏按钮
    formatToolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
      btn.addEventListener('click', () => handleFormat(btn.dataset.format));
    });

    // 上下文菜单项
    contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => handleContextMenuAction(item.dataset.action));
    });

    // 对话框按钮
    dialogCancel.addEventListener('click', hideDialog);
    dialogConfirm.addEventListener('click', confirmDialog);
    dialogInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') confirmDialog();
      if (e.key === 'Escape') hideDialog();
    });

    // 确认对话框
    confirmCancel.addEventListener('click', hideConfirm);
    confirmOk.addEventListener('click', async () => {
      if (confirmCallback) await confirmCallback();
      hideConfirm();
    });

    // 冲突对话框按钮
    document.getElementById('conflict-overwrite').addEventListener('click', () => handleConflict('overwrite'));
    document.getElementById('conflict-keep').addEventListener('click', () => handleConflict('keep'));
    document.getElementById('conflict-reload').addEventListener('click', () => handleConflict('reload'));

    // 表格对话框
    document.getElementById('table-cancel').addEventListener('click', hideTableDialog);
    document.getElementById('table-insert').addEventListener('click', insertTableFromDialog);
  }

  // ========================================
  // 工作区相关功能
  // ========================================

  /**
   * 打开工作区选择文件夹
   */
  async function openWorkspace() {
    const path = await window.electronAPI.selectWorkspace();
    if (path) {
      currentWorkspace = path;
      assetsFolderPath = path + '/.flowmark-assets';
      workspaceName.textContent = path.split(/[\\/]/).pop() || path;
      emptyState.style.display = 'none';
      await ensureAssetsFolder();
      await refreshFileTree();
      startFileWatcher();
    }
  }

  /**
   * 处理添加按钮点击
   * - 未选择工作区：打开文件夹选择对话框
   * - 已选择工作区：显示下拉菜单
   */
  function handleAddClick(e) {
    e.stopPropagation();

    if (!currentWorkspace) {
      openWorkspace();
      return;
    }

    dropdownMenu.classList.toggle('visible');
  }

  /**
   * 隐藏下拉菜单
   */
  function hideDropdownMenu(e) {
    if (!e.target.closest('.add-dropdown')) {
      dropdownMenu.classList.remove('visible');
    }
  }

  /**
   * 处理下拉菜单操作
   */
  async function handleDropdownAction(action) {
    dropdownMenu.classList.remove('visible');

    switch (action) {
      case 'new-file':
        createNewFile();
        break;
      case 'new-folder':
        createNewFolder();
        break;
      case 'change-workspace':
        openWorkspace();
        break;
    }
  }

  // ========================================
  // 文件和文件夹操作
  // ========================================

  /**
   * 创建新文件
   * 验证：非空、去除首尾空格、检查非法字符
   */
  async function createNewFile() {
    showDialog('新建文件', '', async name => {
      // 去除首尾空格
      const trimmedName = name ? name.trim() : '';

      // 验证：名字不能为空
      if (!trimmedName) {
        showConfirm('错误', '文件名不能为空', null);
        return;
      }

      // 验证：不能包含非法字符
      const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
      if (invalidChars.test(trimmedName)) {
        showConfirm('错误', '文件名不能包含特殊字符', null);
        return;
      }

      // 验证：名字长度限制（100字符）
      if (trimmedName.length > 100) {
        showConfirm('错误', '文件名不能超过100个字符', null);
        return;
      }

      const fileName = trimmedName.endsWith('.md') ? trimmedName : trimmedName + '.md';

      // 检查是否已存在（简单检查文件名部分）
      const exists = await checkItemExists(currentWorkspace, fileName);
      if (exists) {
        showConfirm('错误', `"${fileName}" 已存在`, null);
        return;
      }

      const result = await window.electronAPI.createItem(currentWorkspace, fileName, false);
      if (result.success) {
        await refreshFileTree();
        await openFile(result.path);
      } else {
        showConfirm('错误', `创建文件失败：${result.error || '未知错误'}`, null);
      }
    });
  }

  /**
   * 创建新文件夹
   * 验证：非空、去除首尾空格、检查非法字符
   */
  async function createNewFolder() {
    showDialog('新建文件夹', '', async name => {
      // 去除首尾空格
      const trimmedName = name ? name.trim() : '';

      // 验证：名字不能为空
      if (!trimmedName) {
        showConfirm('错误', '文件夹名不能为空', null);
        return;
      }

      // 验证：不能包含非法字符
      const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
      if (invalidChars.test(trimmedName)) {
        showConfirm('错误', '文件夹名不能包含特殊字符', null);
        return;
      }

      // 验证：名字长度限制（100字符）
      if (trimmedName.length > 100) {
        showConfirm('错误', '文件夹名不能超过100个字符', null);
        return;
      }

      // 检查是否已存在
      const exists = await checkItemExists(currentWorkspace, trimmedName);
      if (exists) {
        showConfirm('错误', `"${trimmedName}" 已存在`, null);
        return;
      }

      const result = await window.electronAPI.createItem(currentWorkspace, trimmedName, true);
      if (result.success) {
        await refreshFileTree();
      } else {
        showConfirm('错误', `创建文件夹失败：${result.error || '未知错误'}`, null);
      }
    });
  }

  /**
   * 检查工作区中是否已存在同名项
   */
  async function checkItemExists(parentPath, name) {
    try {
      const items = await window.electronAPI.readDirectory(parentPath);
      return items.some(item => item.name === name);
    } catch (e) {
      return false;
    }
  }

  /**
   * 确保资源文件夹存在
   */
  async function ensureAssetsFolder() {
    if (currentWorkspace) {
      try {
        await window.electronAPI.createDirectory(assetsFolderPath);
      } catch (e) {
        // 文件夹可能已存在
      }
    }
  }

  // ========================================
  // 文件监控和保存
  // ========================================

  /**
   * 启动文件监控定时器
   */
  function startFileWatcher() {
    if (fileWatcherInterval) clearInterval(fileWatcherInterval);
    fileWatcherInterval = setInterval(checkFileChanges, 2000);
  }

  /**
   * 检测外部文件修改
   */
  async function checkFileChanges() {
    if (!currentFilePath || isSaving) return;

    try {
      const stat = await window.electronAPI.getFileStat(currentFilePath);
      if (stat && lastModifiedTime && stat.mtime > lastModifiedTime) {
        showConflictDialog();
        clearInterval(fileWatcherInterval);
      }
    } catch (e) {
      // 忽略错误
    }
  }

  /**
   * 显示冲突对话框
   */
  function showConflictDialog() {
    conflictMessage.textContent = `"${currentFileName}" 已被外部软件修改。请选择如何处理：`;
    conflictOverlay.classList.add('visible');
  }

  /**
   * 处理冲突解决
   */
  async function handleConflict(action) {
    conflictOverlay.classList.remove('visible');

    switch (action) {
      case 'overwrite':
        await saveCurrentFile();
        break;
      case 'keep':
        lastModifiedTime = Date.now();
        break;
      case 'reload':
        await loadFile(currentFilePath, currentFileName);
        break;
    }

    startFileWatcher();
  }

  // ========================================
  // 文件树管理
  // ========================================

  /**
   * 刷新文件树
   */
  async function refreshFileTree() {
    if (!currentWorkspace) return;

    const items = await window.electronAPI.readDirectory(currentWorkspace);
    fileTree.innerHTML = '';

    if (items.length === 0) {
      fileTree.innerHTML = '<div class="empty-state"><p>工作区为空</p></div>';
      return;
    }

    items.forEach(item => {
      const el = createTreeItem(item);
      fileTree.appendChild(el);
    });
  }

  /**
   * 创建文件树节点
   */
  function createTreeItem(item) {
    const div = document.createElement('div');
    div.className = 'tree-item';
    div.dataset.path = item.path;
    div.dataset.isDirectory = item.isDirectory;

    const content = document.createElement('div');
    content.className = 'tree-item-content';

    if (item.isDirectory) {
      content.innerHTML = `${icons.arrow}<span class="tree-item-name">${item.name}</span>`;
    } else {
      content.innerHTML = `${icons.file}<span class="tree-item-name">${item.name}</span>`;
    }

    content.addEventListener('click', e => handleTreeItemClick(e, item));
    content.addEventListener('contextmenu', e => showContextMenu(e, item));

    div.appendChild(content);

    // 子节点
    if (item.isDirectory && item.children && item.children.length > 0) {
      const children = document.createElement('div');
      children.className = 'tree-children';
      item.children.forEach(child => {
        children.appendChild(createTreeItem(child));
      });
      div.appendChild(children);

      // 展开/折叠箭头
      content.querySelector('.tree-item-expand')?.addEventListener('click', e => {
        e.stopPropagation();
        const arrow = content.querySelector('.tree-item-expand');
        arrow.classList.toggle('expanded');
        children.classList.toggle('expanded');
      });
    }

    return div;
  }

  /**
   * 处理文件树项点击
   */
  async function handleTreeItemClick(e, item) {
    if (item.isDirectory) return;

    // 保存当前文件
    if (currentFilePath && !isSaving) {
      await saveCurrentFile();
    }

    // 更新选中状态
    document.querySelectorAll('.tree-item-content.selected').forEach(el => {
      el.classList.remove('selected');
    });
    e.currentTarget.classList.add('selected');

    // 加载文件
    await loadFile(item.path, item.name);
  }

  /**
   * 打开文件
   */
  async function openFile(filePath) {
    const fileName = filePath.split('/').pop();
    await loadFile(filePath, fileName);
  }

  /**
   * 加载文件内容
   */
  async function loadFile(filePath, fileName) {
    currentFilePath = filePath;
    currentFileName = fileName;
    currentFileNameEl.textContent = fileName;

    const content = await window.electronAPI.readFile(filePath);
    currentFileContent = content;

    const stat = await window.electronAPI.getFileStat(filePath);
    lastModifiedTime = stat ? stat.mtime : Date.now();

    editor.innerHTML = markdownToHtml(content);
    editorPlaceholder.style.display = content ? 'none' : 'block';

    // 同步侧边栏选中状态
    syncSidebarSelection(filePath);

    updateOutline();
    updateStats();
  }

  /**
   * 同步侧边栏选中状态
   */
  function syncSidebarSelection(filePath) {
    // 清除之前的选中
    document.querySelectorAll('.tree-item-content.selected').forEach(el => {
      el.classList.remove('selected');
    });

    // 查找并选中当前文件
    const treeItems = document.querySelectorAll('.tree-item');
    treeItems.forEach(item => {
      if (item.dataset.path === filePath) {
        item.querySelector('.tree-item-content').classList.add('selected');
        // 展开父文件夹
        let parent = item.parentElement;
        while (parent && parent.classList.contains('tree-children')) {
          parent.classList.add('expanded');
          const parentTreeItem = parent.parentElement;
          if (parentTreeItem && parentTreeItem.querySelector('.tree-item-expand')) {
            parentTreeItem.querySelector('.tree-item-expand').classList.add('expanded');
          }
          parent = parent.parentElement;
        }
      }
    });
  }

  /**
   * 保存当前文件
   */
  async function saveCurrentFile() {
    if (!currentFilePath) return;

    isSaving = true;
    const content = htmlToMarkdown(editor.innerHTML);
    const success = await window.electronAPI.writeFile(currentFilePath, content);

    if (success) {
      currentFileContent = content;
      const stat = await window.electronAPI.getFileStat(currentFilePath);
      lastModifiedTime = stat ? stat.mtime : Date.now();
      showSaveStatus();
    }
    isSaving = false;
  }

  /**
   * 显示保存状态
   */
  function showSaveStatus() {
    saveStatus.textContent = '已保存';
    saveStatus.classList.add('visible');
    setTimeout(() => {
      saveStatus.classList.remove('visible');
    }, 2000);
  }

  // ========================================
  // 编辑器输入处理
  // ========================================

  /**
   * 处理编辑器输入
   */
  function handleEditorInput() {
    editorPlaceholder.style.display = editor.innerHTML ? 'none' : 'block';
    updateStats();
    updateOutline();

    // 实时预览
    if (isPreviewMode) {
      renderPreview();
    }

    // 自动保存（防抖）
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (currentFilePath) {
        saveCurrentFile();
      }
    }, 1500);
  }

  /**
   * 处理斜杠命令输入
   */
  function handleEditorInputForSlash() {
    if (!slashPanelVisible) return;

    const text = getTextBeforeCursor();
    const slashIndex = text.lastIndexOf('/');
    if (slashIndex !== -1) {
      slashFilter = text.substring(slashIndex + 1);
    } else {
      slashFilter = '';
    }

    const filtered = slashCommands.filter(cmd =>
      cmd.title.includes(slashFilter) || cmd.description.includes(slashFilter)
    );

    if (filtered.length === 0) {
      hideSlashPanel();
      return;
    }

    slashSelectedIndex = 0;
    renderSlashList();
  }

  /**
   * 获取光标前的文本
   */
  function getTextBeforeCursor() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return '';
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent.substring(0, range.startOffset);
    }
    return '';
  }

  // ========================================
  // 命令面板
  // ========================================

  /**
   * 显示斜杠命令面板
   */
  function showSlashPanel() {
    slashPanelVisible = true;
    slashSelectedIndex = 0;
    slashFilter = '';
    renderSlashList();
    slashPanel.classList.add('visible');
  }

  /**
   * 隐藏斜杠命令面板
   */
  function hideSlashPanel() {
    slashPanelVisible = false;
    slashPanel.classList.remove('visible');
  }

  /**
   * 渲染斜杠命令列表
   */
  function renderSlashList() {
    const filtered = slashCommands.filter(cmd =>
      cmd.title.includes(slashFilter) || cmd.description.includes(slashFilter)
    );

    slashList.innerHTML = '';

    filtered.forEach((cmd, index) => {
      const item = document.createElement('div');
      item.className = 'slash-item' + (index === slashSelectedIndex ? ' selected' : '');
      item.innerHTML = `
        <span class="slash-icon">${cmd.icon}</span>
        <div class="slash-text">
          <span class="slash-title">${cmd.title}</span>
          <span class="slash-desc">${cmd.description}</span>
        </div>
      `;
      item.addEventListener('click', () => {
        slashSelectedIndex = index;
        executeSlashCommand();
      });
      item.addEventListener('mouseenter', () => {
        slashSelectedIndex = index;
        updateSlashSelection();
      });
      slashList.appendChild(item);
    });
  }

  /**
   * 更新斜杠命令选中状态
   */
  function updateSlashSelection() {
    const items = slashList.querySelectorAll('.slash-item');
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === slashSelectedIndex);
    });
  }

  /**
   * 执行斜杠命令
   */
  function executeSlashCommand() {
    const filtered = slashCommands.filter(cmd =>
      cmd.title.includes(slashFilter) || cmd.description.includes(slashFilter)
    );

    if (filtered[slashSelectedIndex]) {
      deleteSlashChar();
      hideSlashPanel();
      filtered[slashSelectedIndex].action();
    }
  }

  /**
   * 删除斜杠字符
   */
  function deleteSlashChar() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const offset = range.startOffset;
      const beforeSlash = text.lastIndexOf('/', offset - 1);
      if (beforeSlash !== -1) {
        node.textContent = text.substring(0, beforeSlash) + text.substring(offset);
        range.setStart(node, beforeSlash);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }

  // ========================================
  // 格式化操作
  // ========================================

  /**
   * 执行菜单命令
   */
  function executeMenuCommand(cmd) {
    const cmdMap = {
      'h1': () => insertHeading(1),
      'h2': () => insertHeading(2),
      'h3': () => insertHeading(3),
      'bold': () => wrapSelection('strong'),
      'italic': () => wrapSelection('em'),
      'underline': () => wrapSelection('u'),
      'strikethrough': () => wrapSelection('s'),
      'code': () => wrapSelection('code'),
      'codeblock': () => insertCodeBlock(),
      'link': () => insertLink(),
      'image': () => insertImage(),
      'ul': () => insertList('ul'),
      'ol': () => insertList('ol'),
      'todo': () => insertTodoList(),
      'blockquote': () => insertBlockquote(),
      'hr': () => insertHorizontalRule(),
      'table': () => showTableDialog(),
    };

    if (cmdMap[cmd]) {
      cmdMap[cmd]();
    }
  }

  /**
   * 处理编辑器按键
   */
  function handleEditorKeydown(e) {
    // 显示斜杠命令面板
    if (e.key === '/' && !slashPanelVisible) {
      e.preventDefault();
      showSlashPanel();
      return;
    }

    // ESC 关闭面板
    if (e.key === 'Escape' && slashPanelVisible) {
      hideSlashPanel();
    }

    // 导航斜杠面板
    if (slashPanelVisible) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateSlashPanel(1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateSlashPanel(-1);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        executeSlashCommand();
        return;
      }
    }
  }

  /**
   * 导航斜杠面板
   */
  function navigateSlashPanel(direction) {
    const items = slashList.querySelectorAll('.slash-item');
    if (items.length === 0) return;

    slashSelectedIndex = Math.max(0, Math.min(items.length - 1, slashSelectedIndex + direction));
    updateSlashSelection();
  }

  /**
   * 在光标位置插入 HTML
   */
  function insertHTMLAtCursor(html) {
    editor.focus();
    const selection = window.getSelection();
    if (!selection.rangeCount) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const range = selection.getRangeAt(0);
    range.collapse(true);

    const container = document.createElement('div');
    container.innerHTML = html;
    const fragment = document.createDocumentFragment();

    while (container.firstChild) {
      fragment.appendChild(container.firstChild);
    }

    range.insertNode(fragment);

    // 移动光标到插入内容之后
    const lastNode = fragment.lastChild;
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    handleEditorInput();
  }

  /**
   * 插入标题
   */
  function insertHeading(level) {
    insertHTMLAtCursor(`<h${level}>标题</h${level}>`);
  }

  /**
   * 包裹选中文本
   */
  function wrapSelection(tag) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const selectedText = selection.toString();

    if (selectedText) {
      // 保存选区
      const savedRanges = [];
      for (let i = 0; i < selection.rangeCount; i++) {
        savedRanges.push(selection.getRangeAt(i).cloneRange());
      }

      // 恢复选区
      selection.removeAllRanges();
      savedRanges.forEach(r => selection.addRange(r));

      // 使用浏览器原生命令
      switch (tag) {
        case 'strong':
          document.execCommand('bold', false, null);
          break;
        case 'em':
          document.execCommand('italic', false, null);
          break;
        case 'u':
          document.execCommand('underline', false, null);
          break;
        case 's':
          document.execCommand('strikeThrough', false, null);
          break;
        default: {
          const range = selection.getRangeAt(0);
          const wrapper = document.createElement(tag);
          wrapper.textContent = selectedText;
          range.deleteContents();
          range.insertNode(wrapper);
          range.setStartAfter(wrapper);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } else {
      // 无选区，插入空标签
      editor.focus();
      const wrapper = document.createElement(tag);
      wrapper.innerHTML = ' ';
      insertHTMLAtCursor(wrapper.outerHTML);
    }

    editor.focus();
    handleEditorInput();
  }

  /**
   * 插入代码块
   */
  function insertCodeBlock() {
    editor.focus();
    const selection = window.getSelection();
    if (selection.rangeCount === 0) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.addRange(range);
    }
    insertHTMLAtCursor('<pre class="code-block"><code></code></pre>');
  }

  /**
   * 插入链接
   */
  function insertLink() {
    editor.focus();
    const selection = window.getSelection();
    const selectedText = selection.toString() || '链接文本';

    let savedRange = null;
    if (selection.rangeCount > 0) {
      savedRange = selection.getRangeAt(0).cloneRange();
    }

    const url = prompt('请输入链接地址：', 'https://');

    if (savedRange) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }

    if (url) {
      const html = `<a href="${url}" target="_blank">${selectedText}</a>`;
      insertHTMLAtCursor(html);
    }
  }

  /**
   * 插入图片
   */
  async function insertImage() {
    if (!currentWorkspace) {
      alert('请先打开工作区');
      return;
    }

    try {
      const result = await window.electronAPI.selectImage();
      if (result && result.filePath) {
        const relativePath = await saveImageToAssets(result.filePath);
        const html = `<img src="${relativePath}" alt="${result.fileName}" class="md-image">`;
        editor.focus();
        insertHTMLAtCursor(html);
      }
    } catch (e) {
      console.error('Insert image error:', e);
      alert('插入图片失败');
    }
  }

  /**
   * 保存图片到资源文件夹
   */
  async function saveImageToAssets(imagePath) {
    const fileName = generateImageFileName(imagePath);
    const destPath = assetsFolderPath + '/' + fileName;
    await window.electronAPI.copyFile(imagePath, destPath);
    return '.flowmark-assets/' + fileName;
  }

  /**
   * 生成唯一图片文件名
   */
  function generateImageFileName(originalPath) {
    const ext = originalPath.split('.').pop() || 'png';
    const timestamp = Date.now();
    const hash = Math.random().toString(36).substring(2, 8);
    return `image-${timestamp}-${hash}.${ext}`;
  }

  /**
   * 显示表格对话框
   */
  function showTableDialog() {
    document.getElementById('table-rows').value = 3;
    document.getElementById('table-cols').value = 3;
    tableDialogOverlay.classList.add('visible');
  }

  /**
   * 隐藏表格对话框
   */
  function hideTableDialog() {
    tableDialogOverlay.classList.remove('visible');
  }

  /**
   * 从对话框插入表格
   */
  function insertTableFromDialog() {
    const rows = parseInt(document.getElementById('table-rows').value) || 3;
    const cols = parseInt(document.getElementById('table-cols').value) || 3;
    hideTableDialog();

    editor.focus();
    const selection = window.getSelection();
    if (!selection.rangeCount) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    insertTable(rows, cols);
  }

  /**
   * 插入表格 HTML
   */
  function insertTable(rows, cols) {
    let html = '<table class="md-table">';

    // 表头
    html += '<thead><tr>';
    for (let i = 0; i < cols; i++) {
      html += `<th data-label="列${i + 1}">列${i + 1}</th>`;
    }
    html += '</tr></thead>';

    // 表体
    html += '<tbody>';
    for (let i = 0; i < rows - 1; i++) {
      html += '<tr>';
      for (let j = 0; j < cols; j++) {
        const label = j === 0 ? `行${i + 1}` : '';
        html += `<td data-label="${label}">${label}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';

    insertHTMLAtCursor(html);
  }

  /**
   * 插入列表
   */
  function insertList(type) {
    const tag = type === 'ul' ? 'ul' : 'ol';
    const html = `<${tag}><li></li></${tag}>`;
    insertHTMLAtCursor(html);
  }

  /**
   * 插入待办清单
   */
  function insertTodoList() {
    const html = '<ul class="task-list"><li class="task-item"><input type="checkbox"> 待办事项</li></ul>';
    insertHTMLAtCursor(html);
  }

  /**
   * 插入引用块
   */
  function insertBlockquote() {
    insertHTMLAtCursor('<blockquote></blockquote>');
  }

  /**
   * 插入水平分割线
   */
  function insertHorizontalRule() {
    insertHTMLAtCursor('<hr>');
  }

  /**
   * 处理粘贴事件
   */
  async function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await pasteImage(file);
        }
        return;
      }
    }
  }

  /**
   * 粘贴图片
   */
  async function pasteImage(file) {
    if (!currentWorkspace) {
      alert('请先打开工作区');
      return;
    }

    showImageProgress();

    try {
      const timestamp = Date.now();
      const hash = Math.random().toString(36).substring(2, 8);
      const ext = file.name?.split('.').pop() || 'png';
      const fileName = `paste-${timestamp}-${hash}.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      await window.electronAPI.writeImageFile(assetsFolderPath, fileName, base64);
      const relativePath = '.flowmark-assets/' + fileName;
      const html = `<img src="${relativePath}" alt="${fileName}" class="md-image">`;

      insertHTMLAtCursor(html);
    } catch (e) {
      console.error('Paste image error:', e);
    }

    hideImageProgress();
  }

  /**
   * 显示/隐藏图片插入进度
   */
  function showImageProgress() {
    imageProgress.classList.add('visible');
  }

  function hideImageProgress() {
    imageProgress.classList.remove('visible');
  }

  /**
   * 处理拖拽事件
   */
  function handleDragOver(e) {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  /**
   * 处理文件放下
   */
  async function handleDrop(e) {
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        await pasteImage(file);
        return;
      }
    }
  }

  /**
   * 处理键盘抬起
   */
  function handleEditorKeyup(e) {
    const text = getTextBeforeCursor();
    if (!text) return;

    const lines = text.split('\n');
    const currentLine = lines[lines.length - 1];
    // 检查标题快捷方式
    if (currentLine === '#' && !e.shiftKey) {
      // 等待更多输入
    }
  }

  /**
   * 处理选择变化
   */
  function handleSelectionChange() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && document.activeElement === editor) {
      showFormatToolbar();
    } else {
      hideFormatToolbar();
    }
  }

  /**
   * 显示格式工具栏
   */
  function showFormatToolbar() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    formatToolbar.style.top = `${rect.top - 44}px`;
    formatToolbar.style.left = `${rect.left + rect.width / 2 - formatToolbar.offsetWidth / 2}px`;
    formatToolbar.classList.add('visible');

    updateToolbarActiveStates();
  }

  /**
   * 隐藏格式工具栏
   */
  function hideFormatToolbar() {
    formatToolbar.classList.remove('visible');
  }

  /**
   * 更新工具栏激活状态
   */
  function updateToolbarActiveStates() {
    const btn = (format) => formatToolbar.querySelector(`[data-format="${format}"]`);

    btn('bold')?.classList.toggle('active', document.queryCommandState('bold'));
    btn('italic')?.classList.toggle('active', document.queryCommandState('italic'));
    btn('underline')?.classList.toggle('active', document.queryCommandState('underline'));
  }

  /**
   * 处理格式化
   */
  function handleFormat(format) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    switch (format) {
      case 'bold':
        document.execCommand('bold', false, null);
        break;
      case 'italic':
        document.execCommand('italic', false, null);
        break;
      case 'underline':
        document.execCommand('underline', false, null);
        break;
      case 'strikethrough':
        document.execCommand('strikeThrough', false, null);
        break;
      case 'link':
        insertLink();
        break;
      case 'code':
        wrapSelection('code');
        break;
    }

    editor.focus();
    handleEditorInput();
    updateToolbarActiveStates();
  }

  // ========================================
  // 全局快捷键
  // ========================================

  /**
   * 处理全局键盘事件
   */
  function handleGlobalKeydown(e) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdKey = isMac ? e.metaKey : e.ctrlKey;

    if (cmdKey) {
      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault();
          if (currentFilePath) saveCurrentFile();
          break;
        case 'b':
          if (document.activeElement === editor) {
            e.preventDefault();
            handleFormat('bold');
          }
          break;
        case 'i':
          if (document.activeElement === editor) {
            e.preventDefault();
            handleFormat('italic');
          }
          break;
        case 'u':
          if (document.activeElement === editor) {
            e.preventDefault();
            handleFormat('underline');
          }
          break;
        case 'k':
          if (document.activeElement === editor) {
            e.preventDefault();
            insertLink();
          }
          break;
        case 'p':
          e.preventDefault();
          togglePreview();
          break;
        case 'o':
          e.preventDefault();
          openWorkspace();
          break;
        case 'n':
          e.preventDefault();
          createNewFile();
          break;
      }
    }

    // ESC 关闭命令面板
    if (e.key === 'Escape' && slashPanelVisible) {
      hideSlashPanel();
    }
  }

  // ========================================
  // 预览和大纲
  // ========================================

  /**
   * 切换预览模式
   */
  function togglePreview() {
    isPreviewMode = !isPreviewMode;

    if (isPreviewMode) {
      previewContent.classList.remove('hidden');
      btnPreview.classList.add('active');
      renderPreview();
    } else {
      previewContent.classList.add('hidden');
      btnPreview.classList.remove('active');
    }
  }

  /**
   * 渲染预览
   */
  function renderPreview() {
    const clone = editor.cloneNode(true);
    const placeholder = clone.querySelector('.editor-placeholder');
    if (placeholder) placeholder.remove();
    previewContent.innerHTML = clone.innerHTML;
  }

  /**
   * 更新大纲目录
   */
  function updateOutline() {
    const headings = editor.querySelectorAll('h1, h2, h3');
    outlineList.innerHTML = '';

    if (headings.length === 0) {
      outlineList.innerHTML = '<div class="outline-empty">暂无标题</div>';
      return;
    }

    headings.forEach((heading, index) => {
      if (!heading.id) {
        heading.id = `heading-${index}`;
      }

      const item = document.createElement('div');
      item.className = `outline-item ${heading.tagName.toLowerCase()}`;
      item.innerHTML = `<span class="outline-item-text">${heading.textContent}</span>`;
      item.addEventListener('click', () => {
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.querySelectorAll('.outline-item.active').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
      });
      outlineList.appendChild(item);
    });
  }

  /**
   * 更新统计信息
   */
  function updateStats() {
    const text = editor.innerText || '';
    const chars = text.replace(/\s/g, '').length;
    wordCount.textContent = `${chars} 字`;

    // 计算行号
    const content = editor.innerHTML;
    const lineBreaks = (content.match(/<br\s*\/?>/gi) || []).length;
    const paragraphs = (content.match(/<\/(p|h\d|blockquote|li|div)>/gi) || []).length;
    const currentLine = Math.min(paragraphs + lineBreaks + 1, 1);
    lineInfo.textContent = `行 ${currentLine || 1}`;
  }

  // ========================================
  // 上下文菜单
  // ========================================

  /**
   * 显示上下文菜单
   */
  function showContextMenu(e, item) {
    e.preventDefault();
    e.stopPropagation();

    contextMenuTarget = item;

    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.classList.add('visible');
  }

  /**
   * 隐藏上下文菜单
   */
  function hideContextMenu() {
    contextMenu.classList.remove('visible');
    contextMenuTarget = null;
  }

  /**
   * 处理上下文菜单操作
   */
  async function handleContextMenuAction(action) {
    if (!contextMenuTarget) return;

    const item = contextMenuTarget;
    const parentPath = currentWorkspace;

    hideContextMenu();

    switch (action) {
      case 'new-file':
        showDialog('新建文件', '', async name => {
          if (name) {
            const ext = name.endsWith('.md') ? '' : '.md';
            await window.electronAPI.createItem(parentPath, name + ext, false);
            await refreshFileTree();
          }
        });
        break;

      case 'new-folder':
        showDialog('新建文件夹', '', async name => {
          if (name) {
            await window.electronAPI.createItem(parentPath, name, true);
            await refreshFileTree();
          }
        });
        break;

      case 'show-in-folder':
        window.electronAPI.showItemInFolder(item.path);
        break;

      case 'rename':
        showDialog('重命名', item.name, async newName => {
          if (newName && newName !== item.name) {
            const dir = item.path.substring(0, item.path.lastIndexOf('/'));
            if (!item.isDirectory && !newName.endsWith('.md')) {
              await window.electronAPI.renameItem(item.path, newName + '.md');
            } else {
              await window.electronAPI.renameItem(item.path, newName);
            }
            await refreshFileTree();
          }
        });
        break;

      case 'delete':
        showConfirm('确认删除', `确定要删除 "${item.name}" 吗？此操作不可撤销。`, async () => {
          await window.electronAPI.deleteItem(item.path);
          if (currentFilePath === item.path) {
            currentFilePath = null;
            currentFileName = null;
            editor.innerHTML = '';
            currentFileNameEl.textContent = '未打开文件';
          }
          await refreshFileTree();
        });
        break;
    }
  }

  // ========================================
  // 对话框
  // ========================================

  let dialogCallback = null;

  /**
   * 显示输入对话框
   */
  function showDialog(title, defaultValue, callback) {
    dialogTitle.textContent = title;
    dialogInput.value = defaultValue;
    dialogCallback = callback;
    dialogOverlay.classList.add('visible');
    setTimeout(() => dialogInput.focus(), 50);
  }

  /**
   * 隐藏对话框
   */
  function hideDialog() {
    dialogOverlay.classList.remove('visible');
    dialogCallback = null;
  }

  /**
   * 确认对话框输入
   */
  function confirmDialog() {
    if (dialogCallback) {
      dialogCallback(dialogInput.value);
    }
    hideDialog();
  }

  let confirmCallback = null;

  /**
   * 显示确认对话框
   */
  function showConfirm(title, message, callback) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmCallback = callback;
    confirmOverlay.classList.add('visible');
  }

  /**
   * 隐藏确认对话框
   */
  function hideConfirm() {
    confirmOverlay.classList.remove('visible');
    confirmCallback = null;
  }

  // ========================================
  // Markdown 转换
  // ========================================

  /**
   * Markdown 转 HTML
   */
  function markdownToHtml(md) {
    if (!md) return '';

    let html = md;

    // 保护现有 HTML 元素
    const placeholders = [];
    let idx = 0;

    // 保护表格
    html = html.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (match) => {
      placeholders.push(match);
      return `__PH_${idx++}__`;
    });

    // 保护代码块
    html = html.replace(/<pre class="code-block">[\s\S]*?<\/pre>/gi, (match) => {
      placeholders.push(match);
      return `__PH_${idx++}__`;
    });

    // 保护任务列表
    html = html.replace(/<ul class="task-list">[\s\S]*?<\/ul>/gi, (match) => {
      placeholders.push(match);
      return `__PH_${idx++}__`;
    });

    // HTML 转义
    html = html.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');

    // 恢复占位符
    placeholders.forEach((content, i) => {
      const unescaped = content.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      html = html.replace(`__PH_${i}__`, unescaped);
    });

    // 代码块
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>');

    // 表格
    html = parseMarkdownTable(html);

    // 任务列表
    html = html.replace(/^- \[ \] (.+)$/gm, '<div class="task-item"><input type="checkbox" disabled> $1</div>');
    html = html.replace(/^- \[x\] (.+)$/gm, '<div class="task-item"><input type="checkbox" checked disabled> $1</div>');

    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 标题
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // 粗体
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // 斜体
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    // 删除线
    html = html.replace(/~~([^~]+)~~/g, '<s>$1</s>');

    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // 图片
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-image">');

    // 水平线
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^\*\*\*$/gm, '<hr>');
    html = html.replace(/^___$/gm, '<hr>');

    // 引用
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // 无序列表
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = consolidateLists(html, 'ul');

    // 有序列表
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = consolidateLists(html, 'ol');

    // 段落
    html = html.split('\n\n').map(p => {
      if (p.match(/^<(h[1-6]|blockquote|pre|ul|ol|li|hr|div)/i)) return p;
      if (p.trim()) return `<p>${p.replace(/\n/g, '<br>')}</p>`;
      return '';
    }).join('');

    // 清理
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<br><br>/g, '<br>');

    return html;
  }

  /**
   * 解析 Markdown 表格
   */
  function parseMarkdownTable(html) {
    const tableRegex = /\|(.+)\|\n\|[:\- ]+\|\n((?:\|.+\|\n?)+)/g;
    return html.replace(tableRegex, (match, header, body) => {
      const headerCells = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
      const bodyRows = body.trim().split('\n').map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table class="md-table"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    });
  }

  /**
   * 合并列表项
   */
  function consolidateLists(html, type) {
    const tag = type === 'ul' ? 'ul' : 'ol';
    const regex = /<li>.+<\/li>/g;
    const matches = html.match(regex) || [];
    if (matches.length === 0) return html;

    let result = '';
    let inList = false;
    const lines = html.split('\n');

    for (const line of lines) {
      if (line.match(/^<li>/)) {
        if (!inList) {
          result += `<${tag}>`;
          inList = true;
        }
        result += line;
      } else {
        if (inList) {
          result += `</${tag}>`;
          inList = false;
        }
        result += line;
      }
    }

    if (inList) result += `</${tag}>`;
    return result;
  }

  /**
   * HTML 转 Markdown
   */
  function htmlToMarkdown(html) {
    if (!html) return '';

    let md = html;

    // 表格
    md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, content) => {
      const rows = content.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      return rows.map(row => {
        const cells = row.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi) || [];
        return '| ' + cells.map(c => c.replace(/<[^>]+>/g, '').trim()).join(' | ') + ' |';
      }).join('\n');
    });
    md = md.replace(/\|---/g, '|---');

    // 任务列表
    md = md.replace(/<div class="task-item"><input[^>]*>\s*([^<]+)<\/div>/gi, (match, text) => {
      const checked = match.includes('checked');
      return `- [${checked ? 'x' : ' '}] ${text.trim()}`;
    });

    // 代码块
    md = md.replace(/<pre class="code-block"><code>([\s\S]*?)<\/code><\/pre>/g, '```\n$1```');

    // 行内代码
    md = md.replace(/<code>([^<]+)<\/code>/g, '`$1`');

    // 标题
    md = md.replace(/<h1[^>]*>([^<]+)<\/h1>/gi, '# $1\n');
    md = md.replace(/<h2[^>]*>([^<]+)<\/h2>/gi, '## $1\n');
    md = md.replace(/<h3[^>]*>([^<]+)<\/h3>/gi, '### $1\n');
    md = md.replace(/<h4[^>]*>([^<]+)<\/h4>/gi, '#### $1\n');

    // 粗体
    md = md.replace(/<strong>([^<]+)<\/strong>/g, '**$1**');

    // 斜体
    md = md.replace(/<em>([^<]+)<\/em>/g, '*$1*');

    // 删除线
    md = md.replace(/<s>([^<]+)<\/s>/g, '~~$1~~');

    // 链接
    md = md.replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g, '[$2]($1)');

    // 图片
    md = md.replace(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g, '![$2]($1)');
    md = md.replace(/<img[^>]+alt="([^"]*)"[^>]*src="([^"]+)"[^>]*>/g, '![$1]($2)');
    md = md.replace(/<img[^>]+src="([^"]+)"[^>]*>/g, '![]($1)');

    // 水平线
    md = md.replace(/<hr\s*\/?>/gi, '---\n');

    // 引用
    md = md.replace(/<blockquote>([^<]+)<\/blockquote>/gi, '> $1\n');

    // 换行
    md = md.replace(/<br\s*\/?>/gi, '\n');

    // 段落
    md = md.replace(/<\/p><p>/gi, '\n\n');
    md = md.replace(/<p>([^<]*)<\/p>/gi, '$1\n\n');

    // 列表
    md = md.replace(/<\/?ul>|<\/?ol>/gi, '');
    md = md.replace(/<li>([^<]+)<\/li>/gi, '- $1\n');

    // 移除剩余标签
    md = md.replace(/<[^>]+>/g, '');

    // HTML 实体解码
    md = md.replace(/&amp;/g, '&')
           .replace(/&lt;/g, '<')
           .replace(/&gt;/g, '>');

    // 清理
    md = md.replace(/\n{3,}/g, '\n\n');
    md = md.trim();

    return md;
  }

  // ========================================
  // 启动应用
  // ========================================
  init();
})();