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
  let isLoading = false;            // 是否正在加载文件
  let contextMenuTarget = null;      // 右键菜单目标文件/文件夹
  let slashPanelVisible = false;     // 斜杠命令面板是否可见
  let slashSelectedIndex = 0;        // 斜杠命令面板选中索引
  let slashFilter = '';             // 斜杠命令面板过滤文本
  let lastModifiedTime = null;       // 文件最后修改时间（用于检测外部修改）
  let fileWatcherInterval = null;    // 文件监控定时器
  let assetsFolderPath = null;       // 图片资源文件夹路径
  let savedWorkspaceTree = null;     // 持久化的完整目录树
  let isPreviewMode = false;         // 是否启用实时预览
  let isOutlineEnabled = false;       // 是否启用目录大纲
  let isReadingMode = false;         // 是否启用阅读模式
  let currentZoom = 100;             // 当前缩放级别
  let currentFontSize = 16;          // 当前字体大小
  let currentView = 'edit';          // 当前视图模式：edit/preview/both
  let currentTheme = 'light';        // 当前主题：light/dark/sepia
  let expandedFolders = new Set();   // 记录已展开的文件夹路径
  let savedCursorRange = null;       // 保存光标位置（用于表格等插入操作）

  // ========================================
  // DOM 元素引用 - 在 init() 中初始化
  // ========================================
  let sidebar, fileTree, emptyState, workspaceName, recentList, recentEmpty;
  let btnAdd, dropdownMenu, editor, editorPlaceholder;
  let editorWrapper, editorWelcome;
  let currentFileNameEl, saveStatus, wordCount, lineInfo, fileHeaderHint, fileHeaderTitle;
  let outlineList, contextMenu, formatToolbar;
  let imageContextMenu, imageContextTarget;
  let tableContextMenu, tableContextTarget;
  let slashPanel, slashList;
  let conflictOverlay, conflictMessage;
  let tableDialogOverlay, imageProgress;
  let previewContent;
  let dialogOverlay, dialogTitle, dialogInput;
  let dialogCancel, dialogConfirm;
  let confirmOverlay, confirmTitle, confirmMessage;
  let confirmCancel, confirmOk;
  let aboutOverlay, aboutClose;
  // 新增工具栏相关元素
  let toolbar, zoomLevel, fontSizeDisplay, readingProgress;
  let btnZoomDecrease, btnZoomIncrease;
  let btnReadingMode, btnOutline, btnSearch, btnFullscreen, btnRefresh;
  let btnFontDecrease, btnFontIncrease;
  let btnTheme, themeDropdown;
  let btnToggleSidebar;
  let viewSwitch, searchPanel, searchInput, searchResults, searchClose, searchClear, searchInfo;
  let sidebarTabs;
  let sidebarSearch, sidebarSearchInput, sidebarSearchClear;
  // 项目搜索面板元素
  let searchPanelProject, searchInputProject, searchCloseProject, searchResultsProject, searchInfoProject, searchClearProject;

  // ========================================
  // 斜杠命令配置 - 输入 / 唤起命令面板
  // ========================================
  const slashCommands = [
    { id: 'text', title: '普通文本', description: '普通段落', icon: '¶', action: () => insertPlainText() },
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
    recentList = document.getElementById('recent-list');
    recentEmpty = document.getElementById('recent-empty');
    btnAdd = document.getElementById('btn-add');
    dropdownMenu = document.getElementById('dropdown-menu');
    editor = document.getElementById('editor');
    editorPlaceholder = document.getElementById('editor-placeholder');
    editorWrapper = document.getElementById('editor-wrapper');
    editorWelcome = document.getElementById('editor-welcome');
    currentFileNameEl = document.getElementById('current-file-name');
    saveStatus = document.getElementById('save-status');
    wordCount = document.getElementById('word-count');
    lineInfo = document.getElementById('line-info');
    fileHeaderHint = document.querySelector('.file-header-hint');
    fileHeaderTitle = document.getElementById('file-header-title');
    outlineList = document.getElementById('outline-list');
    contextMenu = document.getElementById('context-menu');
    imageContextMenu = document.getElementById('image-context-menu');
    tableContextMenu = document.getElementById('table-context-menu');
    formatToolbar = document.getElementById('format-toolbar');
    slashPanel = document.getElementById('slash-panel');
    slashList = document.getElementById('slash-list');
    conflictOverlay = document.getElementById('conflict-overlay');
    conflictMessage = document.getElementById('conflict-message');
    tableDialogOverlay = document.getElementById('table-dialog-overlay');
    imageProgress = document.getElementById('image-progress');
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
    aboutOverlay = document.getElementById('about-overlay');
    aboutClose = document.getElementById('about-close');
    // 工具栏元素
    toolbar = document.getElementById('toolbar');
    zoomLevel = document.getElementById('zoom-level');
    fontSizeDisplay = document.getElementById('font-size-display');
    readingProgress = document.getElementById('reading-progress');
    btnZoomDecrease = document.getElementById('btn-zoom-decrease');
    btnZoomIncrease = document.getElementById('btn-zoom-increase');
    btnReadingMode = document.getElementById('btn-reading-mode');
    btnOutline = document.getElementById('btn-outline');
    btnSearch = document.getElementById('btn-search');
    btnFullscreen = document.getElementById('btn-fullscreen');
    btnFontDecrease = document.getElementById('btn-font-decrease');
    btnFontIncrease = document.getElementById('btn-font-increase');
    btnTheme = document.getElementById('btn-theme');
    themeDropdown = document.getElementById('theme-dropdown');
    viewSwitch = document.getElementById('view-switch');
    btnRefresh = document.getElementById('btn-refresh');
    btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    // 文档搜索面板元素
    searchPanel = document.getElementById('search-panel');
    searchInput = document.getElementById('search-input');
    searchClose = document.getElementById('search-close');
    // 项目搜索面板元素
    searchPanelProject = document.getElementById('search-panel-project');
    searchInputProject = document.getElementById('search-input-project');
    searchCloseProject = document.getElementById('search-close-project');
    searchResultsProject = document.getElementById('search-results-project');
    searchInfoProject = document.getElementById('search-info-project');
    searchClearProject = document.getElementById('search-clear');
    sidebarTabs = document.querySelectorAll('.sidebar-tab');
    sidebarSearch = document.getElementById('sidebar-search');
    sidebarSearchInput = document.getElementById('sidebar-search-input');
    sidebarSearchClear = document.getElementById('sidebar-search-clear');

    // 绑定所有事件监听器
    bindEvents();

    // 从 localStorage 恢复用户设置
    restoreUserSettings();

    // 更新目录大纲
    updateOutline();

    // 初始化编辑器状态（未选中文件）
    updateEditorVisibility();
    disableEditor();

    // 渲染最近文件列表
    renderRecentFiles();
  }

  /**
   * 从 localStorage 恢复用户设置
   */
  function restoreUserSettings() {
    // 恢复预览模式设置
    const savedPreview = localStorage.getItem('flowmark-preview-enabled');
    if (savedPreview === 'true') {
      isPreviewMode = true;
      previewContent.classList.remove('hidden');
    }
    // HTML 默认 hidden，不需要再添加

    // 恢复目录大纲设置
    const savedOutline = localStorage.getItem('flowmark-outline-enabled');
    if (savedOutline === 'true') {
      isOutlineEnabled = true;
      document.getElementById('outline-panel').style.display = 'flex';
      btnOutline.classList.add('active');
    } else {
      isOutlineEnabled = false;
      document.getElementById('outline-panel').style.display = 'none';
    }

    // 恢复主题设置
    const savedTheme = localStorage.getItem('flowmark-theme') || 'light';
    setTheme(savedTheme);
    currentTheme = savedTheme;
    updateThemeUI();

    // 恢复字体大小
    const savedFontSize = localStorage.getItem('flowmark-font-size');
    if (savedFontSize) {
      currentFontSize = parseInt(savedFontSize);
      fontSizeDisplay.textContent = currentFontSize;
      editor.style.fontSize = currentFontSize + 'px';
    }

    // 恢复缩放级别
    const savedZoom = localStorage.getItem('flowmark-zoom');
    if (savedZoom) {
      currentZoom = parseInt(savedZoom);
      zoomLevel.textContent = currentZoom + '%';
    }

    // 恢复视图模式
    const savedView = localStorage.getItem('flowmark-view');
    if (savedView) {
      setViewMode(savedView);
    }

    // 恢复持久化的工作区
    restorePersistentWorkspace();
  }

  /**
   * 保存工作区到 localStorage
   */
  async function saveWorkspaceToStorage() {
    if (!currentWorkspace) return;

    try {
      // 只保存工作区路径和展开状态，不保存整个目录树
      localStorage.setItem('flowmark-workspace-path', currentWorkspace);

      // 保存展开状态
      localStorage.setItem('flowmark-expanded-folders', JSON.stringify([...expandedFolders]));

      // 移除目录树缓存，避免 localStorage 超出限制
      localStorage.removeItem('flowmark-workspace-tree');
      savedWorkspaceTree = null;
    } catch (e) {
      console.error('保存工作区失败:', e);
    }
  }

  /**
   * 从 localStorage 恢复工作区
   */
  async function restorePersistentWorkspace() {
    const savedPath = localStorage.getItem('flowmark-workspace-path');
    const savedExpanded = localStorage.getItem('flowmark-expanded-folders');

    if (!savedPath) {
      return;
    }

    // 验证路径是否存在（通过尝试读取目录）
    try {
      const items = await window.electronAPI.readDirectory(savedPath);
      if (items && items.length >= 0) {
        currentWorkspace = savedPath;
        savedWorkspaceTree = items;
        assetsFolderPath = savedPath + '/.flowmark-assets';

        // 恢复工作区名称
        workspaceName.textContent = savedPath.split(/[\\/]/).pop() || savedPath;
        workspaceName.title = savedPath; // 悬停显示完整路径
        emptyState.style.display = 'none';

        // 恢复展开状态
        if (savedExpanded) {
          try {
            expandedFolders = new Set(JSON.parse(savedExpanded));
          } catch (e) {
            expandedFolders = new Set();
          }
        }

        // 使用最新数据构建目录树
        renderFileTreeFromData(items);

        // 启动文件监控
        startFileWatcher();

        return;
      }
    } catch (e) {
      console.error('恢复工作区失败，清除缓存:', e);
    }

    // 如果恢复失败，清除缓存
    clearWorkspaceStorage();
  }

  /**
   * 清除工作区缓存
   */
  function clearWorkspaceStorage() {
    localStorage.removeItem('flowmark-workspace-path');
    localStorage.removeItem('flowmark-workspace-tree');
    localStorage.removeItem('flowmark-expanded-folders');
    savedWorkspaceTree = null;
    currentWorkspace = null;
  }

  /**
   * 从数据渲染文件树（用于恢复缓存的工作区）
   */
  function renderFileTreeFromData(items) {
    fileTree.innerHTML = '';

    if (!items || items.length === 0) {
      fileTree.innerHTML = '<div class="empty-state"><p>工作区为空</p></div>';
      return;
    }

    // 排序
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    items.forEach(item => {
      const el = createTreeItem(item);
      fileTree.appendChild(el);
    });

    // 恢复展开状态
    expandedFolders.forEach(path => {
      restoreFolderExpansionFromCache(items, path, 0);
    });
  }

  /**
   * 从缓存数据恢复文件夹展开状态
   */
  function restoreFolderExpansionFromCache(items, targetPath, level) {
    const item = findItemByPath(items, targetPath);
    if (!item) return;

    const treeItem = document.querySelector(`[data-path="${CSS.escape(targetPath)}"]`);
    if (!treeItem) return;

    const children = treeItem.querySelector('.tree-children');
    const expandBtn = treeItem.querySelector('.tree-item-expand');

    if (children && expandBtn && item.isDirectory) {
      // 排序子项
      if (item.children && item.children.length > 0) {
        item.children.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });

        children.innerHTML = '';
        item.children.forEach(child => {
          children.appendChild(createTreeItem(child, level + 1));
        });

        // 如果这个文件夹也在expandedFolders中，递归展开
        if (expandedFolders.has(item.path)) {
          item.children.forEach(child => {
            if (child.isDirectory && expandedFolders.has(child.path)) {
              restoreFolderExpansionFromCache(items, child.path, level + 1);
            }
          });
        }
      }

      children.style.display = 'block';
      expandBtn.dataset.expanded = 'true';
      expandBtn.classList.add('expanded');
    }
  }

  // ========================================
  // 事件绑定
  // ========================================
  function bindEvents() {
    // 检测平台并设置 body class
    const isMac = navigator.userAgent.includes('Mac');
    if (isMac) {
      document.body.classList.add('mac');
    } else {
      document.body.classList.add('win');
    }

    // 标题栏按钮
    const btnMinimize = document.getElementById('btn-minimize');
    const btnMaximize = document.getElementById('btn-maximize');
    const btnClose = document.getElementById('btn-close');

    if (btnMinimize) btnMinimize.addEventListener('click', () => window.electronAPI.windowMinimize());
    if (btnMaximize) btnMaximize.addEventListener('click', () => window.electronAPI.windowMaximize());
    if (btnClose) btnClose.addEventListener('click', () => window.electronAPI.windowClose());

    // 添加按钮（下拉菜单触发）
    btnAdd.addEventListener('click', handleAddClick);

    // 刷新按钮
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        const refreshIcon = btnRefresh.querySelector('.refresh-icon');
        if (refreshIcon) {
          refreshIcon.classList.add('spinning');
          setTimeout(() => refreshIcon.classList.remove('spinning'), 600);
        }
        if (currentWorkspace) {
          await refreshFileTree();
        }
      });
    }

    // 侧边栏切换按钮
    if (btnToggleSidebar) {
      btnToggleSidebar.addEventListener('click', toggleSidebar);
    }

    // 侧边栏文件搜索
    if (sidebarSearchInput) {
      sidebarSearchInput.addEventListener('input', handleSidebarSearchInput);
      sidebarSearchClear.addEventListener('click', clearSidebarSearch);
    }

    // 下拉菜单项目点击
    if (dropdownMenu) {
      dropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => handleDropdownAction(item.dataset.action));
      });
    }

    // 点击其他区域关闭下拉菜单
    document.addEventListener('click', hideDropdownMenu);

    // 编辑器输入事件
    if (editor) {
      editor.addEventListener('input', handleEditorInput);
      editor.addEventListener('keyup', (e) => {
        handleEditorKeyup(e);
        handleSelectionChange();
      });
      editor.addEventListener('mouseup', handleSelectionChange);
      editor.addEventListener('paste', handlePaste);
      editor.addEventListener('drop', handleDrop);
      editor.addEventListener('dragover', handleDragOver);
      editor.addEventListener('keydown', handleEditorKeydown);
      editor.addEventListener('input', handleEditorInputForSlash);
    }

    // 上下文菜单和斜杠面板
    document.addEventListener('click', hideContextMenu);
    document.addEventListener('click', hideSlashPanel);
    document.addEventListener('click', e => {
      // 文档搜索面板点击外部关闭
      if (searchPanel && searchPanel.classList.contains('visible') && !e.target.closest('.search-panel:not(.project-search)')) {
        hideSearchPanel();
      }
      // 项目搜索面板点击外部关闭
      if (searchPanelProject && searchPanelProject.classList.contains('visible') && !e.target.closest('.search-panel.project-search')) {
        hideProjectSearchPanel();
      }
      // 点击代码块外部时，将光标移出代码块（保持代码块不变）
      if (editor.contains(e.target) && !e.target.closest('.code-block')) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const startNode = range.startContainer;
          const startElement = startNode.nodeType === Node.TEXT_NODE ? startNode.parentElement : startNode;
          const codeBlock = startElement?.closest('.code-block');

          // 如果光标在代码块内，将光标移到代码块之后
          if (codeBlock && codeBlock.nextSibling) {
            const newRange = document.createRange();
            newRange.setStartAfter(codeBlock);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } else if (codeBlock && !codeBlock.nextSibling) {
            // 代码块是最后一个元素，在代码块后插入空段落并将光标移入
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            codeBlock.parentNode.appendChild(p);
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
      }
    });
    document.addEventListener('keydown', handleGlobalKeydown);

    // 插入菜单按钮
    document.querySelectorAll('.menu-btn').forEach(btn => {
      btn.addEventListener('click', () => executeMenuCommand(btn.dataset.cmd));
    });

    // 格式化工具栏按钮
    if (formatToolbar) {
      formatToolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.addEventListener('click', () => handleFormat(btn.dataset.format));
      });
    }

    // 上下文菜单项
    if (contextMenu) {
      contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', () => handleContextMenuAction(item.dataset.action));
      });
    }

    // 图片上下文菜单项
    if (imageContextMenu) {
      imageContextMenu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', () => handleImageContextAction(item.dataset.action));
      });
    }

    // 表格上下文菜单项
    if (tableContextMenu) {
      tableContextMenu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', () => handleTableContextAction(item.dataset.action));
      });
    }

    // 全局点击隐藏图片菜单
    document.addEventListener('click', e => {
      if (imageContextMenu && !imageContextMenu.contains(e.target)) {
        imageContextMenu.classList.remove('visible');
        imageContextTarget = null;
      }
      if (tableContextMenu && !tableContextMenu.contains(e.target)) {
        tableContextMenu.classList.remove('visible');
        tableContextTarget = null;
      }
    });

    // 编辑器内图片右键菜单
    if (editor) {
      editor.addEventListener('contextmenu', e => {
        const img = e.target.closest('img.md-image');
        if (img) {
          e.preventDefault();
          imageContextTarget = img;
          imageContextMenu.style.top = `${e.clientY}px`;
          imageContextMenu.style.left = `${e.clientX}px`;
          imageContextMenu.classList.add('visible');
        }

        const table = e.target.closest('table.md-table');
        if (table) {
          e.preventDefault();
          const cell = e.target.closest('td, th');
          // 检查当前单元格是否在表头行 (TH的父元素是TR，TR的父元素是THEAD)
          const row = cell.parentElement;
          const isInThead = row.parentElement.tagName === 'THEAD';
          tableContextTarget = { table, cell, isInThead };

          // 重置菜单项显示状态，然后根据条件隐藏
          tableContextMenu.querySelectorAll('.context-menu-item').forEach(item => {
            item.style.display = '';
          });

          // 选中表头时隐藏"在上方插入行"和"删除行"
          if (isInThead) {
            const insertRowAbove = tableContextMenu.querySelector('[data-action="insert-row-above"]');
            const deleteRow = tableContextMenu.querySelector('[data-action="delete-row"]');
            if (insertRowAbove) insertRowAbove.style.display = 'none';
            if (deleteRow) deleteRow.style.display = 'none';
          }

          tableContextMenu.style.top = `${e.clientY}px`;
          tableContextMenu.style.left = `${e.clientX}px`;
          tableContextMenu.classList.add('visible');
        }
      });
    }

    // 初始化表格调整大小功能
    initTableResize();

    // 对话框按钮
    if (dialogCancel) dialogCancel.addEventListener('click', hideDialog);
    if (dialogConfirm) dialogConfirm.addEventListener('click', confirmDialog);
    if (dialogInput) {
      dialogInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') confirmDialog();
        if (e.key === 'Escape') hideDialog();
      });
    }

    // 确认对话框
    if (confirmCancel) confirmCancel.addEventListener('click', hideConfirm);
    if (confirmOk) {
      confirmOk.addEventListener('click', async () => {
        if (confirmCallback) await confirmCallback();
        hideConfirm();
      });
    }

    // 冲突对话框按钮
    const conflictOverwrite = document.getElementById('conflict-overwrite');
    const conflictKeep = document.getElementById('conflict-keep');
    const conflictReload = document.getElementById('conflict-reload');
    if (conflictOverwrite) conflictOverwrite.addEventListener('click', () => handleConflict('overwrite'));
    if (conflictKeep) conflictKeep.addEventListener('click', () => handleConflict('keep'));
    if (conflictReload) conflictReload.addEventListener('click', () => handleConflict('reload'));

    // 表格对话框
    const tableCancel = document.getElementById('table-cancel');
    const tableInsert = document.getElementById('table-insert');
    if (tableCancel) tableCancel.addEventListener('click', hideTableDialog);
    if (tableInsert) tableInsert.addEventListener('click', insertTableFromDialog);

    // 监听菜单事件
    if (window.electronAPI && window.electronAPI.onMenuEvent) {
      window.electronAPI.onMenuEvent(handleMenuEvent);
    }

    // 关于对话框关闭
    if (aboutClose) aboutClose.addEventListener('click', hideAboutDialog);
    aboutOverlay.addEventListener('click', e => {
      if (e.target === aboutOverlay) hideAboutDialog();
    });

    // ===== 新增工具栏事件绑定 =====

    // 侧边栏标签页切换
    sidebarTabs.forEach(tab => {
      tab.addEventListener('click', () => switchSidebarTab(tab.dataset.tab));
    });

    // 缩放控制
    btnZoomDecrease.addEventListener('click', () => adjustZoom(-10));
    btnZoomIncrease.addEventListener('click', () => adjustZoom(10));

    // 阅读模式
    btnReadingMode.addEventListener('click', toggleReadingMode);

    // 大纲切换
    btnOutline.addEventListener('click', () => {
      toggleOutline();
      btnOutline.classList.toggle('active', isOutlineEnabled);
    });

    // 搜索
    btnSearch.addEventListener('click', toggleProjectSearchPanel);
    searchCloseProject.addEventListener('click', hideProjectSearchPanel);
    searchInputProject.addEventListener('input', debounce(handleProjectSearch, 300));
    searchClearProject.addEventListener('click', clearProjectSearch);

    // 全屏
    btnFullscreen.addEventListener('click', toggleFullscreen);

    // 字体大小
    btnFontDecrease.addEventListener('click', () => adjustFontSize(-1));
    btnFontIncrease.addEventListener('click', () => adjustFontSize(1));

    // 主题选择
    btnTheme.addEventListener('click', toggleThemeDropdown);
    themeDropdown.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', () => {
        setTheme(option.dataset.theme);
        themeDropdown.classList.remove('visible');
      });
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.theme-select')) {
        themeDropdown.classList.remove('visible');
      }
    });

    // 视图切换
    if (viewSwitch) {
      viewSwitch.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => setViewMode(btn.dataset.view));
      });
    }

    // 搜索面板事件 (文档内搜索)
    if (searchInput) searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    if (searchClear) searchClear.addEventListener('click', clearSearch);
    if (searchClose) searchClose.addEventListener('click', hideSearchPanel);
  }

  /**
   * 防抖函数
   */
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // 防抖版本的函数
  const debouncedRenderPreview = debounce(() => {
    if (isPreviewMode) renderPreview();
  }, 300);

  const debouncedUpdateOutline = debounce(() => {
    updateOutline();
  }, 300);

  /**
   * 处理项目搜索输入
   */
  async function handleProjectSearch() {
    const query = searchInputProject.value.trim();
    if (!query) {
      clearProjectSearch();
      return;
    }

    if (!currentWorkspace) {
      searchInfoProject.textContent = '请先打开工作区';
      return;
    }

    searchClearProject.style.display = 'flex';
    searchPanelProject.classList.add('visible');
    searchInfoProject.textContent = `正在搜索...`;
    searchResultsProject.innerHTML = '<div class="search-loading">搜索中...</div>';

    try {
      const result = await window.electronAPI.searchProject(currentWorkspace, query);

      if (!result.success) {
        searchInfoProject.textContent = '搜索失败';
        searchResultsProject.innerHTML = `<div class="search-empty">${result.error || '搜索出错'}</div>`;
        return;
      }

      const { results, totalMatches, totalFiles } = result;
      searchInfoProject.textContent = `${totalMatches} 个结果在 ${totalFiles} 个文件中`;

      if (results.length === 0) {
        searchResultsProject.innerHTML = '<div class="search-empty">未找到匹配结果</div>';
        return;
      }

      renderProjectSearchResults(results, query);
    } catch (e) {
      searchInfoProject.textContent = '搜索失败';
      searchResultsProject.innerHTML = '<div class="search-empty">搜索出错</div>';
    }
  }

  /**
   * 渲染项目搜索结果
   */
  function renderProjectSearchResults(results, query) {
    searchResultsProject.innerHTML = results.map(file => `
      <div class="search-file-group" data-path="${file.path}">
        <div class="search-file-header">
          <svg class="search-file-icon" viewBox="0 0 16 16" fill="none">
            <path d="M9 1.5H4.5A1.5 1.5 0 0 0 3 3v10a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5V6L9 1.5z" stroke="currentColor" stroke-width="1.1"/>
            <path d="M9 1.5v4.5h4.5" stroke="currentColor" stroke-width="1.1"/>
          </svg>
          <span class="search-file-name">${file.name}</span>
          <span class="search-file-count">${file.matches.length}</span>
        </div>
        <div class="search-file-matches">
          ${file.matches.slice(0, 10).map(match => `
            <div class="search-match-line" data-line="${match.lineNumber}" data-path="${file.path}">
              <span class="search-match-line-number">${match.lineNumber}</span>
              <span class="search-match-line-content">${highlightMatch(match.line.trim(), query)}</span>
            </div>
          `).join('')}
          ${file.matches.length > 10 ? `<div class="search-match-more">还有 ${file.matches.length - 10} 个匹配...</div>` : ''}
        </div>
      </div>
    `).join('');

    // 绑定展开/折叠事件
    searchResultsProject.querySelectorAll('.search-file-header').forEach(header => {
      header.addEventListener('click', () => {
        const matches = header.nextElementSibling;
        matches.classList.toggle('expanded');
      });
    });

    // 绑定跳转事件
    searchResultsProject.querySelectorAll('.search-match-line').forEach(line => {
      line.addEventListener('click', () => {
        const filePath = line.dataset.path;
        const lineNumber = parseInt(line.dataset.line);
        openFileAtLine(filePath, lineNumber);
        hideProjectSearchPanel();
      });
    });
  }

  /**
   * 高亮匹配文本
   */
  function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark>$1</mark>');
  }

  /**
   * HTML 转义
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 打开文件并跳转到指定行
   */
  async function openFileAtLine(filePath, lineNumber) {
    const fileName = filePath.split('/').pop();
    await loadFile(filePath, fileName);
    // TODO: 实现跳转到指定行
  }

  /**
   * 清除搜索
   */
  function clearProjectSearch() {
    searchInputProject.value = '';
    searchClearProject.style.display = 'none';
    searchInfoProject.textContent = '';
    searchResultsProject.innerHTML = '';
  }

  /**
   * 清除文档内搜索
   */
  function clearSearch() {
    if (searchInput) searchInput.value = '';
    if (searchResults) searchResults.innerHTML = '';
  }

  /**
   * 隐藏搜索面板
   */
  function hideSearchPanel() {
    searchPanel.classList.remove('visible');
    clearProjectSearch();
  }

  /**
   * 处理菜单事件
   */
  function handleMenuEvent(action) {
    switch (action) {
      case 'new-file':
        createNewFile();
        break;
      case 'open-workspace':
        openWorkspace();
        break;
      case 'save':
        if (currentFilePath) saveCurrentFile();
        break;
      case 'toggle-sidebar':
        toggleSidebar();
        break;
      case 'toggle-outline':
        toggleOutline();
        break;
      case 'theme-light':
        setTheme('light');
        break;
      case 'theme-dark':
        setTheme('dark');
        break;
      case 'settings':
        showSettingsDialog();
        break;
      case 'about':
        showAboutDialog();
        break;
    }
  }

  /**
   * 切换侧边栏显示
   */
  function toggleSidebar() {
    sidebar.classList.toggle('hidden');
    sidebar.classList.add('animate');
  }

  /**
   * 处理侧边栏搜索输入
   */
  function handleSidebarSearchInput(e) {
    const query = e.target.value.trim();
    sidebarSearchClear.classList.toggle('visible', query.length > 0);

    if (query.length > 0) {
      searchFilesInTree(query);
    } else {
      clearSidebarSearch();
    }
  }

  /**
   * 在目录树中搜索文件
   */
  function searchFilesInTree(query) {
    if (!currentWorkspace) return;

    // 隐藏原始文件列表，显示搜索结果区域
    fileTree.innerHTML = '<div class="search-results-header">搜索结果</div><div class="search-results-list" id="search-results-list"></div>';
    const searchResultsList = document.getElementById('search-results-list');

    // 递归搜索文件
    async function searchRecursive(dirPath) {
      const results = [];
      try {
        const items = await window.electronAPI.readDirectory(dirPath);
        console.log('[searchRecursive] dir:', dirPath, 'items:', items.length);
        for (const item of items) {
          if (item.isDirectory) {
            const subResults = await searchRecursive(item.path);
            results.push(...subResults);
          } else {
            if (item.name.toLowerCase().includes(query.toLowerCase())) {
              results.push(item);
            }
          }
        }
      } catch (e) {
        console.error('[searchRecursive] error:', e);
      }
      return results;
    }

    searchRecursive(currentWorkspace).then((results) => {
      console.log('[searchFilesInTree] final results:', results);
      renderSidebarSearchResults(results, searchResultsList);
    });
  }

  /**
   * 渲染搜索结果
   */
  function renderSidebarSearchResults(results, container) {
    if (results.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>未找到匹配文件</p></div>';
      return;
    }

    container.innerHTML = '';
    results.forEach(file => {
      const item = document.createElement('div');
      item.className = 'tree-item';
      item.dataset.path = file.path;
      item.innerHTML = `
        <div class="tree-item-content">
          <span class="tree-item-icon">${icons.file}</span>
          <span class="tree-item-name">${file.name}</span>
        </div>
      `;
      item.addEventListener('click', () => {
        openFile(file.path);
        clearSidebarSearch();
      });
      container.appendChild(item);
    });
  }

  /**
   * 清空侧边栏搜索
   */
  function clearSidebarSearch() {
    sidebarSearchInput.value = '';
    sidebarSearchClear.classList.remove('visible');
    if (currentWorkspace) {
      refreshFileTree();
    }
  }

  /**
   * 切换大纲显示
   */
  function toggleOutline() {
    isOutlineEnabled = !isOutlineEnabled;
    const outlinePanel = document.getElementById('outline-panel');
    if (isOutlineEnabled) {
      outlinePanel.style.display = 'flex';
    } else {
      outlinePanel.style.display = 'none';
    }
    localStorage.setItem('flowmark-outline-enabled', isOutlineEnabled);
  }

  /**
   * 显示设置对话框
   */
  function showSettingsDialog() {
    showDialog('主题设置', getCurrentTheme(), async theme => {
      if (theme) setTheme(theme.trim());
    });
  }

  /**
   * 显示关于对话框 - macOS 风格
   */
  function showAboutDialog() {
    aboutOverlay.classList.add('visible');
  }

  /**
   * 关闭关于对话框
   */
  function hideAboutDialog() {
    aboutOverlay.classList.remove('visible');
  }

  /**
   * 获取当前主题
   */
  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  /**
   * 设置主题
   */
  function setTheme(theme) {
    currentTheme = theme;
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('flowmark-theme', theme);
    updateThemeUI();
  }

  /**
   * 更新主题 UI 选中状态
   */
  function updateThemeUI() {
    themeDropdown.querySelectorAll('.theme-option').forEach(option => {
      option.classList.toggle('active', option.dataset.theme === currentTheme);
    });
  }

  /**
   * 切换主题下拉菜单
   */
  function toggleThemeDropdown(e) {
    e.stopPropagation();
    themeDropdown.classList.toggle('visible');
  }

  /**
   * 侧边栏标签页切换
   */
  function switchSidebarTab(tab) {
    sidebarTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));

    if (tab === 'files') {
      fileTree.style.display = 'block';
      recentList.style.display = 'none';
    } else {
      fileTree.style.display = 'none';
      recentList.style.display = 'block';
      renderRecentFiles();
    }
  }

  /**
   * 渲染最近文件列表
   */
  function renderRecentFiles() {
    const recentFiles = getRecentFiles();
    recentList.innerHTML = '';

    if (recentFiles.length === 0) {
      recentList.innerHTML = '<div class="recent-empty"><p>暂无最近文件</p></div>';
      return;
    }

    recentFiles.forEach(file => {
      const item = document.createElement('div');
      item.className = 'recent-item';
      item.innerHTML = `
        <svg class="recent-item-icon" viewBox="0 0 16 16" fill="none">
          <path d="M9 1.5H4.5A1.5 1.5 0 0 0 3 3v10a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5V6L9 1.5z" stroke="currentColor" stroke-width="1.1"/>
          <path d="M9 1.5v4.5h4.5" stroke="currentColor" stroke-width="1.1"/>
        </svg>
        <span class="recent-item-name">${file.name}</span>
      `;
      item.addEventListener('click', () => openRecentFile(file.path));
      recentList.appendChild(item);
    });
  }

  /**
   * 获取最近文件列表
   */
  function getRecentFiles() {
    try {
      return JSON.parse(localStorage.getItem('flowmark-recent-files') || '[]');
    } catch {
      return [];
    }
  }

  /**
   * 添加文件到最近列表
   */
  function addToRecentFiles(filePath, fileName) {
    let recentFiles = getRecentFiles();
    // 移除已存在的
    recentFiles = recentFiles.filter(f => f.path !== filePath);
    // 添加到开头
    recentFiles.unshift({ path: filePath, name: fileName, time: Date.now() });
    // 最多保存 20 个
    recentFiles = recentFiles.slice(0, 20);
    localStorage.setItem('flowmark-recent-files', JSON.stringify(recentFiles));
  }

  /**
   * 打开最近文件
   */
  async function openRecentFile(filePath) {
    try {
      await loadFile(filePath, filePath.split('/').pop());
    } catch (e) {
      // 文件可能已被删除
      let recentFiles = getRecentFiles().filter(f => f.path !== filePath);
      localStorage.setItem('flowmark-recent-files', JSON.stringify(recentFiles));
      renderRecentFiles();
    }
  }

  /**
   * 调整缩放级别
   */
  function adjustZoom(delta) {
    currentZoom = Math.max(50, Math.min(200, currentZoom + delta));
    zoomLevel.textContent = currentZoom + '%';
    editor.style.zoom = currentZoom / 100;
    localStorage.setItem('flowmark-zoom', currentZoom);
  }

  /**
   * 调整字体大小
   */
  function adjustFontSize(delta) {
    currentFontSize = Math.max(12, Math.min(24, currentFontSize + delta));
    fontSizeDisplay.textContent = currentFontSize;
    editor.style.fontSize = currentFontSize + 'px';
    localStorage.setItem('flowmark-font-size', currentFontSize);
  }

  /**
   * 切换阅读模式
   */
  function toggleReadingMode() {
    isReadingMode = !isReadingMode;
    btnReadingMode.classList.toggle('active', isReadingMode);
    document.querySelector('.editor-container').classList.toggle('reading-mode', isReadingMode);

    if (isReadingMode) {
      // 显示插入菜单工具栏
      document.getElementById('insert-menu').style.display = 'flex';
    } else {
      document.getElementById('insert-menu').style.display = 'none';
    }
  }

  /**
   * 切换搜索面板
   */
  function toggleSearchPanel() {
    searchPanel.classList.toggle('visible');
    if (searchPanel.classList.contains('visible')) {
      searchInput.focus();
    }
  }

  /**
   * 隐藏搜索面板
   */
  function hideSearchPanel() {
    searchPanel.classList.remove('visible');
    searchInput.value = '';
    searchResults.innerHTML = '';
  }

  /**
   * 切换项目搜索面板
   */
  function toggleProjectSearchPanel() {
    if (!searchPanelProject) return;
    searchPanelProject.classList.toggle('visible');
    if (searchPanelProject.classList.contains('visible') && searchInputProject) {
      searchInputProject.focus();
    }
  }

  /**
   * 隐藏项目搜索面板
   */
  function hideProjectSearchPanel() {
    if (!searchPanelProject) return;
    searchPanelProject.classList.remove('visible');
    if (searchInputProject) searchInputProject.value = '';
    if (searchResultsProject) searchResultsProject.innerHTML = '';
    if (searchInfoProject) searchInfoProject.textContent = '';
    if (searchClearProject) searchClearProject.style.display = 'none';
  }

  /**
   * 处理搜索输入
   */
  function handleSearchInput() {
    const query = searchInput.value.trim();
    if (!query) {
      searchResults.innerHTML = '';
      return;
    }

    const content = editor.innerText || '';
    const matches = searchContent(content, query);
    renderSearchResults(matches, query);
  }

  /**
   * 搜索内容
   */
  function searchContent(content, query) {
    const matches = [];
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
      const start = Math.max(0, match.index - 30);
      const end = Math.min(content.length, match.index + query.length + 30);
      let snippet = content.substring(start, end);
      if (start > 0) snippet = '...' + snippet;
      if (end < content.length) snippet = snippet + '...';
      matches.push({ snippet, index: match.index });
    }
    return matches.slice(0, 50);
  }

  /**
   * 渲染搜索结果
   */
  function renderSearchResults(matches, query) {
    if (matches.length === 0) {
      searchResults.innerHTML = '<div class="search-empty">未找到匹配内容</div>';
      return;
    }

    searchResults.innerHTML = matches.map((match, i) => {
      const highlighted = match.snippet.replace(
        new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        `<mark>$&</mark>`
      );
      return `<div class="search-result-item" data-index="${match.index}">
        <span class="search-result-text">${highlighted}</span>
      </div>`;
    }).join('');

    searchResults.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        scrollToSearchMatch(index, query.length);
        hideSearchPanel();
      });
    });
  }

  /**
   * 滚动到搜索匹配位置
   */
  function scrollToSearchMatch(index, length) {
    // 简化实现：滚动到顶部
    editor.scrollTop = 0;
  }

  /**
   * 切换全屏
   */
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      btnFullscreen.classList.add('active');
    } else {
      document.exitFullscreen();
      btnFullscreen.classList.remove('active');
    }
  }

  /**
   * 设置视图模式
   */
  function setViewMode(mode) {
    currentView = mode;
    viewSwitch.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === mode);
    });

    // editor 和 preview 是兄弟元素，都在 editorWrapper 内部
    const editorEl = editor;  // .editor-content
    const previewEl = previewContent;  // .preview-content

    switch (mode) {
      case 'edit':
        // 仅显示编辑器
        editorEl.style.display = '';
        editorEl.style.flex = '1';
        previewEl.classList.add('hidden');
        previewEl.style.display = 'none';
        break;
      case 'preview':
        // 仅显示预览
        editorEl.style.display = 'none';
        previewEl.classList.remove('hidden');
        previewEl.style.display = 'flex';
        previewEl.style.flex = '1';
        // 渲染预览内容
        if (currentFilePath) {
          renderPreview();
        }
        break;
      case 'both':
        // 同时显示编辑器和预览
        editorEl.style.display = '';
        editorEl.style.flex = '1';
        previewEl.classList.remove('hidden');
        previewEl.style.display = 'flex';
        previewEl.style.flex = '1';
        // 渲染预览内容
        if (currentFilePath) {
          renderPreview();
        }
        break;
    }

    localStorage.setItem('flowmark-view', mode);
  }

  /**
   * 计算阅读进度
   */
  function calculateReadingProgress() {
    if (!currentFilePath) {
      readingProgress.textContent = '';
      return;
    }

    const text = editor.innerText || '';
    const words = text.replace(/\s/g, '').length;
    const minutes = Math.ceil(words / 200); // 假设每分钟阅读200字
    readingProgress.textContent = minutes > 0 ? `${minutes} 分钟阅读` : '';
  }

  /**
   * 禁用编辑器（未选中文件时）
   */
  function disableEditor() {
    editor.contentEditable = 'false';
    editor.style.opacity = '0.5';
    editor.style.pointerEvents = 'none';
  }

  /**
   * 启用编辑器（选中文件后）
   */
  function enableEditor() {
    editor.contentEditable = 'true';
    editor.style.opacity = '1';
    editor.style.pointerEvents = 'auto';
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
      // 保存工作区到 localStorage
      await saveWorkspaceToStorage();
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
        // 自动打开新创建的文件，文件树保持可见
        await openFileInEditor(result.path);
      } else {
        showConfirm('错误', `创建文件失败：${result.error || '未知错误'}`, null);
      }
    });
  }

  /**
   * 在编辑器中打开文件（不改变文件树可见性）
   */
  async function openFileInEditor(filePath) {
    const fileName = filePath.split('/').pop();
    await loadFile(filePath, fileName);
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
   * 刷新文件树（保持展开状态）
   */
  async function refreshFileTree() {
    if (!currentWorkspace) return;

    // 保存当前展开状态
    const previousExpanded = new Set(expandedFolders);

    const items = await window.electronAPI.readDirectory(currentWorkspace);
    savedWorkspaceTree = items;
    fileTree.innerHTML = '';

    if (items.length === 0) {
      fileTree.innerHTML = '<div class="empty-state"><p>工作区为空</p></div>';
      return;
    }

    // 排序：文件夹在前，文件在后，按名字排序
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    items.forEach(item => {
      const el = createTreeItem(item);
      fileTree.appendChild(el);
    });

    // 恢复展开状态 - 递归展开所有已展开的文件夹
    previousExpanded.forEach(path => {
      restoreFolderExpansion(items, path, 0);
    });

    // 保存工作区状态
    await saveWorkspaceToStorage();
  }

  /**
   * 递归恢复文件夹展开状态
   */
  function restoreFolderExpansion(items, targetPath, level) {
    const item = findItemByPath(items, targetPath);
    if (!item) return;

    const treeItem = document.querySelector(`[data-path="${CSS.escape(targetPath)}"]`);
    if (!treeItem) return;

    const children = treeItem.querySelector('.tree-children');
    const expandBtn = treeItem.querySelector('.tree-item-expand');

    if (children && expandBtn && item.isDirectory) {
      // 排序子项
      if (item.children && item.children.length > 0) {
        item.children.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });

        children.innerHTML = '';
        item.children.forEach(child => {
          children.appendChild(createTreeItem(child, level + 1));
        });

        // 如果这个文件夹也在previousExpanded中，递归展开它的子文件夹
        if (expandedFolders.has(item.path)) {
          item.children.forEach(child => {
            if (child.isDirectory && expandedFolders.has(child.path)) {
              restoreFolderExpansion(items, child.path, level + 1);
            }
          });
        }
      }

      children.style.display = 'block';
      expandBtn.dataset.expanded = 'true';
      expandBtn.classList.add('expanded');
    }
  }

  /**
   * 根据路径查找文件树项
   */
  function findItemByPath(items, targetPath) {
    for (const item of items) {
      if (item.path === targetPath) return item;
      if (item.children) {
        const found = findItemByPath(item.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 创建文件树节点（可展开的目录结构）
   */
  function createTreeItem(item, level = 0) {
    const div = document.createElement('div');
    div.className = 'tree-item';
    div.dataset.path = item.path;
    div.dataset.isDirectory = item.isDirectory;
    div.style.paddingLeft = `${level * 16}px`;

    const content = document.createElement('div');
    content.className = 'tree-item-content';

    // 文件夹显示展开箭头，文件不显示
    if (item.isDirectory) {
      content.innerHTML = `<span class="tree-item-expand" data-expanded="false">${icons.arrow}</span>${icons.folder}<span class="tree-item-name">${item.name}</span>`;
    } else {
      content.innerHTML = `${icons.file}<span class="tree-item-name">${item.name}</span>`;
    }

    content.addEventListener('click', function(e) {
      handleTreeItemClick(e, item, div);
    });
    content.addEventListener('contextmenu', e => showContextMenu(e, item));

    // 文件夹展开/折叠箭头点击
    const expandBtn = content.querySelector('.tree-item-expand');
    if (expandBtn) {
      expandBtn.addEventListener('click', e => {
        e.stopPropagation();
        toggleFolderExpand(div, item);
      });
    }

    div.appendChild(content);

    // 如果是文件夹，预留子节点容器
    if (item.isDirectory) {
      const children = document.createElement('div');
      children.className = 'tree-children';
      children.style.display = 'none';
      div.appendChild(children);
    }

    return div;
  }

  /**
   * 切换文件夹展开/折叠状态
   */
  async function toggleFolderExpand(treeItem, item) {
    const children = treeItem.querySelector('.tree-children');
    const expandBtn = treeItem.querySelector('.tree-item-expand');
    const isExpanded = expandBtn.dataset.expanded === 'true';

    if (!isExpanded) {
      // 展开：加载子项目（如果尚未加载）
      if (children.children.length === 0 && item.children && item.children.length > 0) {
        item.children.forEach(child => {
          children.appendChild(createTreeItem(child, 1));
        });
      } else if (children.children.length === 0) {
        // 目录为空或尚未加载
        const empty = document.createElement('div');
        empty.className = 'tree-empty';
        empty.textContent = '空文件夹';
        empty.style.cssText = 'color: var(--text-placeholder); font-size: 12px; padding: 4px 8px 4px 24px;';
        children.appendChild(empty);
      }
      children.style.display = 'block';
      expandBtn.dataset.expanded = 'true';
      expandBtn.classList.add('expanded');
      // 记录展开状态
      expandedFolders.add(item.path);
    } else {
      // 折叠
      children.style.display = 'none';
      expandBtn.dataset.expanded = 'false';
      expandBtn.classList.remove('expanded');
      // 移除展开状态
      expandedFolders.delete(item.path);
    }

    // 保存展开状态
    localStorage.setItem('flowmark-expanded-folders', JSON.stringify([...expandedFolders]));
  }

  /**
   * 处理文件树项点击
   */
  async function handleTreeItemClick(e, item, treeItem) {
    // 如果正在加载文件，返回
    if (isLoading) return;

    // 如果点击的是展开箭头区域，不处理文件打开
    if (e.target.closest('.tree-item-expand')) return;

    if (item.isDirectory) {
      toggleFolderExpand(treeItem, item);
      return;
    }

    // 如果点击的就是当前文件，不需要重新加载
    if (currentFilePath === item.path) {
      return;
    }

    // 保存当前文件
    if (currentFilePath && !isSaving) {
      await saveCurrentFile();
    }

    // 更新选中状态
    const contentEl = treeItem.querySelector('.tree-item-content');
    document.querySelectorAll('.tree-item-content.selected').forEach(el => {
      el.classList.remove('selected');
    });
    if (contentEl) contentEl.classList.add('selected');

    // 显示编辑器区域
    editorWelcome.classList.add('hidden');
    editorWrapper.style.display = 'flex';

    // 使用 loadFile 加载文件
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
    // 如果正在加载文件，返回
    if (isLoading) return;

    isLoading = true;

    currentFilePath = filePath;
    currentFileName = fileName;
    currentFileNameEl.textContent = fileName;

    const content = await window.electronAPI.readFile(filePath);
    currentFileContent = content;

    // 转换图片路径为绝对路径
    const processedContent = convertImagePathsToAbsolute(content, currentWorkspace);

    // 更新文件头部标题：始终显示文件名（去除.md）
    if (fileHeaderTitle) {
      fileHeaderTitle.textContent = fileName.replace(/\.md$/, '');
    }

    const stat = await window.electronAPI.getFileStat(filePath);
    lastModifiedTime = stat ? stat.mtime : Date.now();

    // 显示编辑器区域，隐藏欢迎界面
    editorWelcome.classList.add('hidden');
    editorWrapper.style.display = 'flex';

    // 启用编辑器
    enableEditor();

    editor.innerHTML = markdownToHtml(processedContent);
    // 编辑区为空时显示 file-header-hint
    const hasContent = editor.innerHTML.trim().length > 0;
    editorPlaceholder.style.display = 'none'; // 始终隐藏 placeholder，用 file-header-hint 代替
    if (fileHeaderHint) {
      fileHeaderHint.style.display = hasContent ? 'none' : 'block';
    }

    // 同步侧边栏选中状态
    syncSidebarSelection(filePath);

    // 添加到最近文件
    addToRecentFiles(filePath, fileName);

    // 更新阅读进度
    calculateReadingProgress();

    updateOutline();
    updateStats();

    // 加载完成
    isLoading = false;
  }

  /**
   * 更新界面状态（欢迎页/编辑器）
   */
  function updateEditorVisibility() {
    if (currentFilePath) {
      editorWelcome.classList.add('hidden');
      editorWrapper.style.display = 'flex';
    } else {
      editorWelcome.classList.remove('hidden');
      editorWrapper.style.display = 'none';
    }
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
        // 展开父文件夹（不带动画）
        let parent = item.parentElement;
        while (parent && parent.classList.contains('tree-children')) {
          parent.classList.add('expanded', 'no-animate');
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
   * 将图片路径转换回相对路径（用于保存到 md 文件）
   * file:///workspace/.flowmark-assets/xxx.png -> .flowmark-assets/xxx.png
   */
  function convertImagePathsToRelative(content, workspace) {
    if (!workspace) return content;

    // 匹配任何 file:// 路径中包含 .flowmark-assets 的图片，转换为相对路径（不加换行符）
    content = content.replace(
      /!\[([^\]]*)\]\(file:\/\/[^)]*\.flowmark-assets\/([^)]+)\)/g,
      (match, alt, path) => {
        return `![${alt}](.flowmark-assets/${path})`;
      }
    );

    return content;
  }

  /**
   * 保存当前文件
   */
  async function saveCurrentFile() {
    if (!currentFilePath) return;

    isSaving = true;
    let content = htmlToMarkdown(editor.innerHTML);

    // 调试：记录保存的内容前200字符
    console.log('[saveCurrentFile] Markdown content (first 200):', content.substring(0, 200));

    // 将图片绝对路径转换回相对路径再保存
    if (currentWorkspace) {
      content = convertImagePathsToRelative(content, currentWorkspace);
    }

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
    try {
      editorPlaceholder.style.display = editor.innerHTML ? 'none' : 'block';
      if (fileHeaderHint) {
        fileHeaderHint.style.display = editor.innerHTML ? 'none' : 'block';
      }
      updateStats();
      debouncedUpdateOutline();
      calculateReadingProgress();

      debouncedRenderPreview();

      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        if (currentFilePath) {
          saveCurrentFile();
        }
      }, 1500);
    } catch (e) {
      console.error('Error in handleEditorInput:', e);
    }
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
    console.log('[showSlashPanel] called, slashPanel:', slashPanel);
    // 在编辑器中保存当前光标位置
    const selection = window.getSelection();
    console.log('[showSlashPanel] selection:', selection, 'rangeCount:', selection ? selection.rangeCount : 0);
    if (selection.rangeCount > 0) {
      savedCursorRange = selection.getRangeAt(0).cloneRange();
    } else {
      savedCursorRange = null;
    }

    slashPanelVisible = true;
    slashSelectedIndex = 0;
    slashFilter = '';
    renderSlashList();
    console.log('[showSlashPanel] adding visible class, panel:', slashPanel);
    slashPanel.classList.add('visible');
    console.log('[showSlashPanel] done, panel classes:', slashPanel.className);
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
    // 自动滚动选中项到可视区域
    const selectedItem = items[slashSelectedIndex];
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
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
      'text': () => insertPlainText(),
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
      console.log('[handleEditorKeydown] slash pressed, slashPanelVisible:', slashPanelVisible);
      e.preventDefault();
      showSlashPanel();
      return;
    }

    // ESC 关闭面板
    if (e.key === 'Escape' && slashPanelVisible) {
      hideSlashPanel();
    }

    // 按回车时，如果当前在特殊块元素（标题、代码块等）内，退出到普通段落
    if (e.key === 'Enter') {
      // 优先处理斜杠面板
      if (slashPanelVisible) {
        e.preventDefault();
        executeSlashCommand();
        return;
      }
      // 处理块元素内回车
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // 获取光标所在节点
        let node = range.startContainer;
        // 如果是文本节点，获取其父元素；否则直接用该元素
        let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

        // 检查是否在列表项内
        const listItem = element?.closest('li');
        if (listItem && editor.contains(listItem)) {
          e.preventDefault();
          const list = listItem.parentElement;
          // 检查当前列表项是否为空
          const itemContent = listItem.innerHTML.trim();
          const isEmptyItem = itemContent === '' || itemContent === '<br>';

          if (isEmptyItem) {
            // 空列表项：清除列表格式，转为普通段落
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            listItem.parentNode.replaceChild(p, listItem);
            // 移动光标到新段落
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } else {
            // 有内容的列表项：创建新的列表项
            const newLi = document.createElement('li');
            newLi.innerHTML = '<br>';
            // 计算新的序号值（当前列表项数 + 1）
            const itemCount = list.querySelectorAll('li').length;
            newLi.setAttribute('value', itemCount + 1);
            list.appendChild(newLi);
            // 移动光标到新列表项
            const newRange = document.createRange();
            newRange.setStart(newLi, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
          return;
        }

        // 检查是否在代码块内
        const codeBlock = element?.closest('.code-block');
        if (codeBlock && editor.contains(codeBlock)) {
          e.preventDefault();
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);

            // 检查代码块最后是否有 <br>（表示刚按过回车）
            const lastChild = codeBlock.lastChild;
            const endsWithBr = lastChild && lastChild.nodeName === 'BR';

            // 如果最后是 <br>（刚按过回车），则退出代码块；否则插入换行
            if (endsWithBr) {
              // 退出代码块，将光标移到代码块之后
              if (codeBlock.nextSibling) {
                const newRange = document.createRange();
                newRange.setStartAfter(codeBlock);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              } else {
                // 代码块是最后一个元素，创建新段落
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                codeBlock.parentNode.appendChild(p);
                const newRange = document.createRange();
                newRange.setStart(p, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
            } else {
              // 插入换行
              const br = document.createElement('br');
              range.insertNode(br);
              range.setStartAfter(br);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
          return;
        }

        // 检查其他块元素
        let blockElement = element?.closest('h1, h2, h3, h4, h5, h6, blockquote, pre, table');
        if (blockElement && editor.contains(blockElement)) {
          e.preventDefault();
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          blockElement.parentNode.insertBefore(p, blockElement.nextSibling);
          const newRange = document.createRange();
          newRange.setStart(p, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
          return;
        }
      }
    }

    // 斜杠面板导航
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
    }

    // 向下箭头：从代码块底部退出（当光标在代码块末尾时）
    if (e.key === 'ArrowDown') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        const codeBlock = element?.closest('.code-block');

        if (codeBlock && editor.contains(codeBlock)) {
          const codeText = codeBlock.textContent || '';
          if (codeText.length > 0) {
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(codeBlock);
            preCaretRange.setEnd(range.startContainer, range.startOffset);
            const textBeforeCursor = preCaretRange.toString();

            // 如果光标在代码块末尾（且最后一行是空的），退出到代码块之后
            const lastChild = codeBlock.lastChild;
            const endsWithBr = lastChild && lastChild.nodeName === 'BR';
            if (endsWithBr && textBeforeCursor.length >= codeText.length) {
              e.preventDefault();
              if (codeBlock.nextSibling) {
                const newRange = document.createRange();
                newRange.setStartAfter(codeBlock);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              } else {
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                codeBlock.parentNode.appendChild(p);
                const newRange = document.createRange();
                newRange.setStart(p, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
              return;
            }
          }
        }
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
   * 如果光标在代码块末尾且代码块不为空，退出代码块
   */
  function exitCodeBlockIfNeeded() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    let node = range.startContainer;
    let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    const codeBlock = element?.closest('.code-block');

    if (codeBlock && editor.contains(codeBlock)) {
      const codeText = codeBlock.textContent || '';
      // 如果代码块有内容且光标在末尾，退出代码块
      if (codeText.length > 0) {
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(codeBlock);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        const textBeforeCursor = preCaretRange.toString();

        if (textBeforeCursor.length >= codeText.length) {
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          codeBlock.parentNode.replaceChild(p, codeBlock);
          const newRange = document.createRange();
          newRange.setStart(p, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    }
  }

  /**
   * 在光标位置插入 HTML
   */
  function insertHTMLAtCursor(html) {
    const selection = window.getSelection();

    // 如果没有选区或选区不在编辑器内，尝试使用保存的光标位置
    if (!selection.rangeCount || !editor.contains(selection.anchorNode)) {
      if (savedCursorRange) {
        selection.removeAllRanges();
        selection.addRange(savedCursorRange);
      } else {
        editor.focus();
        // 再次检查，如果还是没有有效选区，在末尾创建
        if (!selection.rangeCount) {
          const range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
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

    // 移动光标到插入内容之后（如果是列表类块元素，移到其第一个可编辑子元素内）
    const firstNode = fragment.firstChild;
    if (firstNode) {
      // 如果插入的是 ul/ol，将其第一个 li 的开头作为光标位置
      if (firstNode.tagName === 'UL' || firstNode.tagName === 'OL') {
        const firstLi = firstNode.querySelector('li');
        if (firstLi) {
          range.setStart(firstLi, 0);
          range.collapse(true);
        } else {
          range.setStartAfter(firstNode);
          range.collapse(true);
        }
      } else {
        range.setStartAfter(firstNode);
        range.collapse(true);
      }
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  /**
   * 插入标题
   */
  function insertHeading(level) {
    const selection = window.getSelection();

    // 保存滚动百分比
    const scrollMax = editor.scrollHeight - editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? editor.scrollTop / scrollMax : 0;

    if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      savedCursorRange = selection.getRangeAt(0).cloneRange();
    }

    insertHTMLAtCursor(`<h${level}>标题</h${level}>`);

    // 延迟恢复滚动位置
    requestAnimationFrame(() => {
      const newScrollMax = editor.scrollHeight - editor.clientHeight;
      editor.scrollTop = newScrollMax * scrollPercent;
    });
  }

  /**
   * 插入普通文本
   */
  function insertPlainText() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    // 获取当前光标所在的位置
    const range = selection.getRangeAt(0);
    let node = range.startContainer;
    let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

    // 找到最近的块元素
    let blockElement = element?.closest('h1, h2, h3, h4, h5, h6, .code-block, blockquote, pre, ul, ol, table, p, div');

    // 创建一个干净的段落
    const p = document.createElement('p');
    p.innerHTML = '<br>';

    if (blockElement && editor.contains(blockElement)) {
      // 在块元素后插入新段落
      blockElement.parentNode.insertBefore(p, blockElement.nextSibling);
    } else {
      // 在当前选区位置插入
      range.collapse(true);
      range.insertNode(p);
    }

    // 清除可能的内联格式：创建新选区到段落开头
    const newRange = document.createRange();
    // 选择整个段落内容，这样输入会替换掉并清除格式
    newRange.selectNodeContents(p);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }

  /**
   * 包裹选中文本
   */
  function wrapSelection(tag) {
    const selection = window.getSelection();

    // 保存滚动百分比
    const scrollMax = editor.scrollHeight - editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? editor.scrollTop / scrollMax : 0;

    if (!selection.rangeCount) {
      editor.focus();
      // 等待 focus 后创建选区
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel.rangeCount) {
          const range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }, 10);
      return;
    }

    const selectedText = selection.toString();

    if (selectedText) {
      // 有选区，直接包裹
      const range = selection.getRangeAt(0);
      const wrapper = document.createElement(tag);
      wrapper.textContent = selectedText;
      range.deleteContents();
      range.insertNode(wrapper);
      range.setStartAfter(wrapper);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // 无选区，插入空标签对并将光标放在标签内
      const wrapper = document.createElement(tag);
      wrapper.textContent = '​'; // 零宽空格，让光标可以进入空标签

      if (savedCursorRange) {
        // 使用保存的光标位置插入
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedCursorRange);
        const range = sel.getRangeAt(0);
        range.insertNode(wrapper);
      } else {
        editor.appendChild(wrapper);
      }

      // 将光标放在零宽空格之后（即标签内）
      const range = document.createRange();
      range.selectNodeContents(wrapper);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    // 延迟恢复滚动位置
    requestAnimationFrame(() => {
      const newScrollMax = editor.scrollHeight - editor.clientHeight;
      editor.scrollTop = newScrollMax * scrollPercent;
    });

    handleEditorInput();
  }

  /**
   * 插入代码块（使用 div 替代 pre 以支持 ContentEditable）
   */
  function insertCodeBlock() {
    const selection = window.getSelection();

    // 检查是否在已有的代码块内
    let inCodeBlock = false;
    if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      const node = selection.anchorNode;
      if (node.parentElement && node.parentElement.classList.contains('code-block')) {
        inCodeBlock = true;
      }
    }

    // 保存滚动百分比
    const scrollMax = editor.scrollHeight - editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? editor.scrollTop / scrollMax : 0;

    if (inCodeBlock) {
      // 已经在代码块内，直接插入换行
      insertHTMLAtCursor('<br>');
      return;
    }

    // 保存当前光标位置
    if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      savedCursorRange = selection.getRangeAt(0).cloneRange();
    }

    // 不在代码块内，插入新的代码块
    // 使用 div.code-block 替代 pre.code-block，便于在 ContentEditable 中编辑
    const codeBlock = document.createElement('div');
    codeBlock.className = 'code-block';
    codeBlock.contentEditable = 'true';

    // 插入到当前光标位置
    if (savedCursorRange) {
      selection.removeAllRanges();
      selection.addRange(savedCursorRange);
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(codeBlock);

      // 将光标移到代码块内部（在开头位置）
      const newRange = document.createRange();
      newRange.setStart(codeBlock, 0);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else {
      editor.appendChild(codeBlock);
      const newRange = document.createRange();
      newRange.setStart(codeBlock, 0);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    // 延迟恢复滚动位置
    requestAnimationFrame(() => {
      const newScrollMax = editor.scrollHeight - editor.clientHeight;
      editor.scrollTop = newScrollMax * scrollPercent;
    });

    handleEditorInput();
  }

  /**
   * 插入链接
   */
  function insertLink() {
    const selection = window.getSelection();
    const selectedText = selection.toString() || '链接文本';

    // 保存滚动百分比
    const scrollMax = editor.scrollHeight - editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? editor.scrollTop / scrollMax : 0;

    if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      savedCursorRange = selection.getRangeAt(0).cloneRange();
    }

    const url = prompt('请输入链接地址：', 'https://');

    if (url) {
      if (savedCursorRange) {
        selection.removeAllRanges();
        selection.addRange(savedCursorRange);
      }
      const html = `<a href="${url}" target="_blank">${selectedText}</a>`;
      insertHTMLAtCursor(html);

      // 延迟恢复滚动位置
      requestAnimationFrame(() => {
        const newScrollMax = editor.scrollHeight - editor.clientHeight;
        editor.scrollTop = newScrollMax * scrollPercent;
      });
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

    // 保存滚动百分比
    const scrollMax = editor.scrollHeight - editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? editor.scrollTop / scrollMax : 0;

    try {
      const result = await window.electronAPI.selectImage();
      if (result && result.filePath) {
        const relativePath = await saveImageToAssets(result.filePath);
        const html = `<img src="${relativePath}" alt="${result.fileName}" class="md-image">`;

        // 保存当前光标位置
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
          savedCursorRange = selection.getRangeAt(0).cloneRange();
        }

        insertHTMLAtCursor(html);

        // 延迟恢复滚动位置
        requestAnimationFrame(() => {
          const newScrollMax = editor.scrollHeight - editor.clientHeight;
          editor.scrollTop = newScrollMax * scrollPercent;
        });
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
    // 返回 file:// 绝对路径，让 Electron 可以正确加载图片
    return 'file://' + assetsFolderPath + '/' + fileName;
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

    // 保存滚动百分比
    const scrollMax = editor.scrollHeight - editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? editor.scrollTop / scrollMax : 0;

    hideTableDialog();

    // 恢复光标位置
    if (savedCursorRange) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedCursorRange);
    }

    insertTable(rows, cols);

    // 延迟恢复滚动位置
    requestAnimationFrame(() => {
      const newScrollMax = editor.scrollHeight - editor.clientHeight;
      editor.scrollTop = newScrollMax * scrollPercent;
    });
  }

  /**
   * 插入表格 HTML
   */
  function insertTable(rows, cols) {
    let html = '<table class="md-table">';

    // 表头 - 每列都有 col-resize-handle，每行有 row-resize-handle
    html += '<thead><tr>';
    for (let i = 0; i < cols; i++) {
      html += `<th><span class="cell-content">列${i + 1}</span><span class="col-resize-handle"></span><span class="row-resize-handle"></span></th>`;
    }
    html += '</tr></thead>';

    // 表体 - 每列有 col-resize-handle，每行有 row-resize-handle
    html += '<tbody>';
    for (let i = 0; i < rows - 1; i++) {
      html += '<tr>';
      for (let j = 0; j < cols; j++) {
        html += `<td><span class="cell-content">行${i + 1}列${j + 1}</span><span class="col-resize-handle"></span><span class="row-resize-handle"></span></td>`;
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
    const selection = window.getSelection();
    const scrollMax = editor.scrollHeight - editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? editor.scrollTop / scrollMax : 0;

    if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      savedCursorRange = selection.getRangeAt(0).cloneRange();
    }

    const tag = type === 'ul' ? 'ul' : 'ol';
    const valueAttr = type === 'ol' ? ' value="1"' : '';
    const html = `<${tag}><li${valueAttr}></li></${tag}>`;
    insertHTMLAtCursor(html);

    requestAnimationFrame(() => {
      const newScrollMax = editor.scrollHeight - editor.clientHeight;
      editor.scrollTop = newScrollMax * scrollPercent;
    });
  }

  /**
   * 插入待办清单
   */
  function insertTodoList() {
    const selection = window.getSelection();
    const scrollMax = editor.scrollHeight - editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? editor.scrollTop / scrollMax : 0;

    if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      savedCursorRange = selection.getRangeAt(0).cloneRange();
    }

    const html = '<ul class="task-list"><li class="task-item"><input type="checkbox"> 待办事项</li></ul>';
    insertHTMLAtCursor(html);

    requestAnimationFrame(() => {
      const newScrollMax = editor.scrollHeight - editor.clientHeight;
      editor.scrollTop = newScrollMax * scrollPercent;
    });
  }

  /**
   * 插入引用块
   */
  function insertBlockquote() {
    const selection = window.getSelection();
    const scrollMax = editor.scrollHeight - editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? editor.scrollTop / scrollMax : 0;

    if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      savedCursorRange = selection.getRangeAt(0).cloneRange();
    }

    insertHTMLAtCursor('<blockquote></blockquote>');

    requestAnimationFrame(() => {
      const newScrollMax = editor.scrollHeight - editor.clientHeight;
      editor.scrollTop = newScrollMax * scrollPercent;
    });
  }

  /**
   * 插入水平分割线
   */
  function insertHorizontalRule() {
    const selection = window.getSelection();
    const scrollMax = editor.scrollHeight - editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? editor.scrollTop / scrollMax : 0;

    if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      savedCursorRange = selection.getRangeAt(0).cloneRange();
    }

    insertHTMLAtCursor('<hr>');

    requestAnimationFrame(() => {
      const newScrollMax = editor.scrollHeight - editor.clientHeight;
      editor.scrollTop = newScrollMax * scrollPercent;
    });
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
      // 返回 file:// 绝对路径
      const imagePath = 'file://' + assetsFolderPath + '/' + fileName;
      const html = `<img src="${imagePath}" alt="${fileName}" class="md-image">`;

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
      renderPreview();
    } else {
      previewContent.classList.add('hidden');
    }
    localStorage.setItem('flowmark-preview-enabled', isPreviewMode);
  }

  /**
   * 渲染预览
   */
  function renderPreview() {
    try {
      if (!previewContent) {
        console.error('previewContent is null');
        return;
      }

      if (!editor) {
        console.error('editor is null');
        return;
      }

      // 获取编辑器内容
      const editorContent = editor.innerHTML;
      const placeholder = editor.querySelector('.editor-placeholder');

      // 检查是否有实际内容（排除只有占位符的情况）
      const hasRealContent = editorContent && editorContent.length > 0 &&
        (!placeholder || !editorContent.includes(placeholder.outerHTML.trim()));

      if (!hasRealContent) {
        previewContent.innerHTML = '<div class="preview-empty">打开一个文件以预览内容</div>';
        return;
      }

      // 克隆编辑器内容并清理占位符
      const clone = editor.cloneNode(true);
      const clonePlaceholder = clone.querySelector('.editor-placeholder');
      if (clonePlaceholder) clonePlaceholder.remove();

      // 直接使用innerHTML
      let content = clone.innerHTML;
      if (!content || !content.trim()) {
        previewContent.innerHTML = '<div class="preview-empty">打开一个文件以预览内容</div>';
        return;
      }

      // 设置预览内容
      previewContent.innerHTML = content;

      // 调试日志
      console.log('Preview rendered, editor innerHTML length:', editor.innerHTML.length);
      console.log('Preview innerHTML:', previewContent.innerHTML.substring(0, 500));
    } catch (e) {
      console.error('renderPreview error:', e);
      previewContent.innerHTML = '<div class="preview-empty">预览渲染失败</div>';
    }
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

    // 计算当前行号：获取光标位置
    let currentLine = 1;
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editor);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      const temp = document.createElement('div');
      temp.appendChild(preCaretRange.cloneContents());
      const divContent = temp.innerHTML;
      // 计算 <br> 和块级标签来估算行号
      const lineBreaks = (divContent.match(/<br\s*\/?>/gi) || []).length;
      const blockTags = (divContent.match(/<\/(p|h[1-6]|blockquote|li|div)>/gi) || []).length;
      currentLine = lineBreaks + blockTags + 1;
    }
    lineInfo.textContent = `行 ${currentLine}`;
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
    // 获取父目录：如果是文件夹则直接在内部创建，否则取文件的父目录
    const parentPath = item.isDirectory ? item.path : item.path.substring(0, item.path.lastIndexOf('/'));

    hideContextMenu();

    switch (action) {
      case 'new-file':
        showDialog('新建文件', '', async name => {
          if (name) {
            const ext = name.endsWith('.md') ? '' : '.md';
            const result = await window.electronAPI.createItem(parentPath, name + ext, false);
            if (result.success) {
              await refreshFileTree();
              await openFileInEditor(result.path);
            }
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
        showConfirm('确认删除', `确定要将 "${item.name}" 移动到回收站吗？`, async () => {
          console.log('[handleContextAction] delete item.path:', item.path);
          const result = await window.electronAPI.deleteItem(item.path);
          console.log('[handleContextAction] delete result:', result);
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

  /**
   * 处理图片上下文菜单操作
   */
  function handleImageContextAction(action) {
    if (!imageContextTarget) return;

    const img = imageContextTarget;
    imageContextMenu.classList.remove('visible');

    const maxWidthMap = {
      'img-20': '20%',
      'img-50': '50%',
      'img-70': '70%',
      'img-100': '100%'
    };

    if (maxWidthMap[action] !== undefined) {
      img.style.maxWidth = maxWidthMap[action];
      img.style.width = maxWidthMap[action];
    }
  }

  /**
   * 处理表格上下文菜单操作
   */
  function handleTableContextAction(action) {
    if (!tableContextTarget || !tableContextTarget.cell) return;

    const { table, cell } = tableContextTarget;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    const row = cell.parentElement;
    const cellIndex = Array.from(row.children).indexOf(cell);
    const isInThead = row.parentElement.tagName === 'THEAD';
    const allRows = thead ? [thead.rows[0]] : [];
    if (tbody) {
      for (let i = 0; i < tbody.rows.length; i++) {
        allRows.push(tbody.rows[i]);
      }
    }

    switch (action) {
      case 'insert-row-above': {
        // 表头行不允许往上插入
        if (isInThead) return;
        const tbodyRows = tbody ? Array.from(tbody.rows) : [];
        const rowIdx = tbodyRows.indexOf(row);
        const newRow = tbody.insertRow(rowIdx);
        const totalCols = allRows[0].cells.length;
        const newRowIndex = rowIdx; // 新行在原位置
        for (let i = 0; i < totalCols; i++) {
          const td = document.createElement('td');
          td.innerHTML = `<span class="cell-content">行${newRowIndex + 1}列${i + 1}</span><span class="col-resize-handle"></span><span class="row-resize-handle"></span>`;
          newRow.appendChild(td);
        }
        break;
      }
      case 'insert-row-below': {
        const tbodyRows = tbody ? Array.from(tbody.rows) : [];
        if (isInThead) {
          // 表头行，在 tbody 第一行前插入
          if (tbody && tbody.rows.length > 0) {
            const newRow = tbody.insertRow(0);
            const totalCols = thead.rows[0].cells.length;
            for (let i = 0; i < totalCols; i++) {
              const td = document.createElement('td');
              td.innerHTML = `<span class="cell-content">行1列${i + 1}</span><span class="col-resize-handle"></span><span class="row-resize-handle"></span>`;
              newRow.appendChild(td);
            }
          } else if (tbody) {
            const newRow = tbody.insertRow();
            const totalCols = allRows[0].cells.length;
            for (let i = 0; i < totalCols; i++) {
              const td = document.createElement('td');
              td.innerHTML = `<span class="cell-content">行1列${i + 1}</span><span class="col-resize-handle"></span><span class="row-resize-handle"></span>`;
              newRow.appendChild(td);
            }
          }
        } else {
          const rowIdx = tbodyRows.indexOf(row);
          const newRow = tbody.insertRow(rowIdx + 1);
          const totalCols = allRows[0].cells.length;
          const newRowIndex = rowIdx + 2; // 新行在原行下方
          for (let i = 0; i < totalCols; i++) {
            const td = document.createElement('td');
            td.innerHTML = `<span class="cell-content">行${newRowIndex}列${i + 1}</span><span class="col-resize-handle"></span><span class="row-resize-handle"></span>`;
            newRow.appendChild(td);
          }
        }
        break;
      }
      case 'delete-row':
        if (isInThead) return; // 不允许删除表头行
        if (tbody && tbody.rows.length > 1) {
          const tbodyRows = Array.from(tbody.rows);
          const rowIdx = tbodyRows.indexOf(row);
          tbody.deleteRow(rowIdx);
        }
        break;
      case 'insert-col-left':
      case 'insert-col-right': {
        const isLeft = action === 'insert-col-left';
        const refIndex = isLeft ? cellIndex : cellIndex + 1;
        const totalCols = allRows[0].cells.length;
        const newColIndex = refIndex; // 新列的索引

        // 在表头插入
        if (thead && thead.rows[0]) {
          const th = document.createElement('th');
          th.innerHTML = `<span class="cell-content">列${newColIndex + 1}</span><span class="col-resize-handle"></span><span class="row-resize-handle"></span>`;
          // 复制相邻表头单元格的样式
          const refCell = thead.rows[0].cells[refIndex] || thead.rows[0].cells[refIndex - 1];
          if (refCell) {
            th.style.cssText = refCell.style.cssText;
          }
          thead.rows[0].insertBefore(th, thead.rows[0].cells[refIndex] || null);
        }

        // 在表体插入
        if (tbody) {
          for (let i = 0; i < tbody.rows.length; i++) {
            const td = document.createElement('td');
            td.innerHTML = `<span class="cell-content">行${i + 1}列${newColIndex + 1}</span><span class="col-resize-handle"></span><span class="row-resize-handle"></span>`;
            // 复制相邻单元格样式
            const refCell = tbody.rows[i].cells[refIndex] || tbody.rows[i].cells[refIndex - 1];
            if (refCell) {
              td.style.cssText = refCell.style.cssText;
            }
            tbody.rows[i].insertBefore(td, tbody.rows[i].cells[refIndex] || null);
          }
        }
        break;
      }
      case 'delete-col': {
        if (thead && thead.rows[0] && thead.rows[0].cells.length <= 1) return;
        if (tbody && tbody.rows[0] && tbody.rows[0].cells.length <= 1) return;

        // 删除表头列
        if (thead && thead.rows[0]) {
          thead.rows[0].deleteCell(cellIndex);
        }

        // 删除表体列
        if (tbody) {
          for (let i = 0; i < tbody.rows.length; i++) {
            tbody.rows[i].deleteCell(cellIndex);
          }
        }
        break;
      }
    }

    tableContextMenu.classList.remove('visible');
    tableContextTarget = null;
  }

  /**
   * 初始化表格调整大小功能
   */
  function initTableResize() {
    let isResizing = false;
    let resizeTarget = null;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    let isColResize = false;

    document.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('.col-resize-handle, .row-resize-handle');
      if (!handle) return;

      const cell = handle.closest('td, th');
      if (!cell) return;

      isResizing = true;
      resizeTarget = cell;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = cell.offsetWidth;
      startHeight = cell.offsetHeight;
      isColResize = handle.classList.contains('col-resize-handle');

      // 计算当前单元格所在的列索引和行索引
      const tr = cell.parentElement;
      const cellIndex = Array.from(tr.children).indexOf(cell);
      const table = tr.closest('table');

      // 获取所有行
      const allRows = table.querySelectorAll('tr');

      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing || !resizeTarget) return;

      const tr = resizeTarget.parentElement;
      const cellIndex = Array.from(tr.children).indexOf(resizeTarget);
      const table = tr.closest('table');
      const allRows = table.querySelectorAll('tr');

      if (isColResize) {
        const delta = e.clientX - startX;
        const newWidth = Math.max(40, startWidth + delta);
        // 手柄在单元格右侧，cellIndex 就是被拖动列的索引
        allRows.forEach(row => {
          if (cellIndex >= 0 && row.children[cellIndex]) {
            row.children[cellIndex].style.width = `${newWidth}px`;
          }
        });
      } else {
        // 行拖拽 - 改变当前行所有单元格的高度
        const delta = e.clientY - startY;
        const newHeight = Math.max(20, startHeight + delta);
        // 设置当前行所有单元格的高度
        Array.from(tr.children).forEach(td => {
          td.style.height = `${newHeight}px`;
        });
      }
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizeTarget = null;
      }
    });
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
   * 将 md 内容中的相对图片路径转换为绝对 file:// 路径
   */
  function convertImagePathsToAbsolute(content, workspace) {
    if (!workspace) return content;

    // 规范化路径：去除末尾斜杠
    const normalizedWorkspace = workspace.replace(/\/$/, '');

    // 匹配相对路径 .flowmark-assets/ 开头的图片，转换为绝对路径
    content = content.replace(/!\[([^\]]*)\]\(\.flowmark-assets\/([^)]+)\)/g,
      (match, alt, path) => {
        return `![${alt}](file://${normalizedWorkspace}/.flowmark-assets/${path})`;
      });

    return content;
  }

  /**
   * Markdown 转 HTML
   */
  function markdownToHtml(md) {
    if (!md) return '';

    let html = md;

    // 规范化换行符：统一使用 \n
    html = html.replace(/\r\n?/g, '\n');

    // 调试：记录原始内容前200字符
    console.log('[markdownToHtml] Original (first 200):', html.substring(0, 200));

    // 表格解析 - 必须在段落分割之前处理！
    html = parseMarkdownTable(html);

    // 保护现有 HTML 元素
    const placeholders = [];
    let idx = 0;

    // 保护表格（解析后的 HTML 表格）
    html = html.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (match) => {
      placeholders.push(match);
      return `__PH_${idx++}__`;
    });

    // 保护代码块（pre 和 div）
    html = html.replace(/<pre class="code-block">[\s\S]*?<\/pre>/gi, (match) => {
      placeholders.push(match);
      return `__PH_${idx++}__`;
    });
    html = html.replace(/<div class="code-block">[\s\S]*?<\/div>/gi, (match) => {
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

    // 代码块 - 处理动态数量反引号的代码块（内容中可能包含反引号）
    (function() {
      const lines = html.split('\n');
      const result = [];
      let inCodeBlock = false;
      let codeBlockQuotes = 0;
      let codeBlockContent = [];
      let codeBlockStartLine = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!inCodeBlock) {
          // Check if this line starts a code block (3+ backticks)
          const match = line.match(/^(`{3,})/);
          if (match) {
            inCodeBlock = true;
            codeBlockQuotes = match[1].length;
            codeBlockStartLine = result.length;
            codeBlockContent = [];
          } else {
            result.push(line);
          }
        } else {
          // Check if this line is ONLY backticks (with optional whitespace) - a valid closer
          const trimmed = line.trim();
          const isCloserOnly = /^`+$/.test(trimmed);

          // Only close if line is only backticks and has at least as many as opener
          if (isCloserOnly && trimmed.length >= codeBlockQuotes) {
            // End code block
            const content = codeBlockContent.join('\n');
            console.log('[markdownToHtml] code block content:', JSON.stringify(content));
            result.push('<pre class="code-block"><code>' + content + '</code></pre>');
            inCodeBlock = false;
            codeBlockQuotes = 0;
            codeBlockContent = [];
          } else {
            codeBlockContent.push(line);
          }
        }
      }

      // If still in code block at end, convert content to markdown code block format
      if (inCodeBlock) {
        const content = codeBlockContent.join('\n');
        const quotes = '`'.repeat(4);
        const codeMd = quotes + '\n' + content + '\n' + quotes;
        result.push(codeMd);
      }

      html = result.join('\n');
    })();

    // 任务列表
    html = html.replace(/^- \[ \] (.+)$/gm, '<div class="task-item"><input type="checkbox" disabled> $1</div>');
    html = html.replace(/^- \[x\] (.+)$/gm, '<div class="task-item"><input type="checkbox" checked disabled> $1</div>');

    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 标题 - 必须在列表之前处理！
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

    // 删除线 - 使用更宽松的匹配
    html = html.replace(/~~([^~]*)~~/g, '<s>$1</s>');

    // 图片 - 必须在链接之前处理！防止 ! 被误识别为普通文本
    // 支持 ![alt](src) |width:50% 格式
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)\s*\|width:(\d+%)/g, (match, alt, src, width) => {
      return `<img src="${src}" alt="${alt}" class="md-image" style="width:${width}">`;
    });
    // 普通图片（无宽度）
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-image">');

    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // 水平线
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^\*\*\*$/gm, '<hr>');
    html = html.replace(/^___$/gm, '<hr>');

    // 引用
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // 无序列表 - 必须在段落处理之前
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    // 包裹无序列表 <li> 在 <ul> 中
    html = html.replace(/(<li>[\s\S]*?<\/li>(\s*<li>[\s\S]*?<\/li>)*)/g, (match) => {
      return `<ul>${match}</ul>`;
    });

    // 有序列表 - 需要保持原始序号
    // 先替换每一行为 <li>，支持任意内容（包括嵌套标签）
    html = html.replace(/^(\d+)\. (.*)$/gm, (match, num, text) => {
      return `<li value="${num}">${text.trim()}</li>`;
    });
    // 收集连续的 <li value="..."> 并包裹在 <ol> 中
    html = html.replace(/(?:<li value="\d+">[\s\S]*?<\/li>\s*)+/g, (match) => {
      // 移除列表项之间的换行符，保留 li 标签内的结构
      const cleanMatch = match.replace(/\n\s*/g, '');
      return `<ol>${cleanMatch}</ol>`;
    });

    // 段落处理 - 先按双换行分割
    const paragraphs = html.split(/\n{2,}/);
    html = paragraphs.map(p => {
      p = p.trim();
      if (!p) return '';

      // 如果是纯块级标签（标签后无其他内容），不处理；否则包装成段落
      const blockTagMatch = p.match(/^<(h[1-6]|blockquote|pre|ul|ol|li|hr|div|table)[^>]*>/i);
      if (blockTagMatch) {
        const tagName = blockTagMatch[1].toLowerCase();
        const closingTag = '</' + tagName + '>';
        const hasClosingTag = p.includes(closingTag);
        // 如果段落以 ul/ol 开头但没有闭合标签（被 \n\n 分割），直接返回不处理
        if (!hasClosingTag && /^<(ul|ol)/i.test(p)) {
          return p;
        }
        // 如果有闭合标签，检查标签后面是否还有非空白内容（非块级标签内容）
        const afterClosing = hasClosingTag ? p.split(closingTag)[1] : p.slice(p.search(/\s|>|$/));
        // 检查 afterClosing 是否为空或只有空白/块级标签开头
        const isPureBlock = !afterClosing.trim() || /^[<\s]/.test(afterClosing.trim());
        // 只在块级元素为 li 时才处理列表合并（ul/ol 已包含 li，不再重复处理）
        if (hasClosingTag && isPureBlock && tagName === 'li') {
          // 无序列表：合并连续的 <li>...</li> 为 <ul>/<ol>
          p = p.replace(/(<li>(?:[^<]|<\/?[^>]+>)*?<\/li>)(\s*<li>(?:[^<]|<\/?[^>]+>)*?<\/li>)+/g, (match) => {
            return `<ul>${match}</ul>`;
          });
          // 无序列表：包裹单独的 <li> 在 <ul> 中
          p = p.replace(/(<li>(?:[^<]|<\/?[^>]+>)*?<\/li>)(?!\s*<li>)/g, (match) => {
            return `<ul>${match}</ul>`;
          });
          return p;
        }
        // 对于 ul/ol 容器，如果 isPureBlock 为 true，直接返回不处理
        if (hasClosingTag && isPureBlock && (tagName === 'ul' || tagName === 'ol')) {
          return p;
        }
      }

      // 否则包装成段落，单换行转<br>
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    // 清理
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<br><br>/g, '<br>');

    return html;
  }

  /**
   * 解析 Markdown 表格 - 按行解析，正确处理多个相邻表格
   */
  function parseMarkdownTable(html) {
    console.log('[DEBUG parseMarkdownTable] Input:\n' + html);
    const lines = html.split('\n');
    console.log('[DEBUG parseMarkdownTable] Total lines: ' + lines.length);
    const result = [];
    let i = 0;
    let pendingColWidths = null;
    let pendingRowHeights = null;

    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // 检查是否是维度注释
      if (trimmedLine.startsWith('<!--') && trimmedLine.includes('colwidths')) {
        const dimMatch = trimmedLine.match(/colwidths:([^|]+)/);
        const rowMatch = trimmedLine.match(/rowheights:([^|]+)/);
        pendingColWidths = dimMatch ? dimMatch[1].split(',').map(w => w ? parseInt(w) : null) : [];
        pendingRowHeights = rowMatch ? rowMatch[1].split(',').map(h => h ? parseInt(h) : null) : [];
        console.log('[DEBUG parseMarkdownTable] Found dims: colWidths=' + JSON.stringify(pendingColWidths) + ', rowHeights=' + JSON.stringify(pendingRowHeights));
        i++;
        continue;
      }

      const isTableRow = trimmedLine.startsWith('|') && trimmedLine.endsWith('|') && trimmedLine.length > 2;
      const isSeparator = /^\|[\|\-: \t]+\|$/.test(trimmedLine);

      if (isTableRow && !isSeparator) {
        // 可能开始一个表格
        const tableStartIdx = i;
        let tableEndIdx = i;
        let header = null;
        const body = [];
        let foundSeparator = false;

        // 使用待处理的维度注释
        const colWidths = pendingColWidths || [];
        const rowHeights = pendingRowHeights || [];

        while (tableEndIdx < lines.length) {
          const currentLine = lines[tableEndIdx].trim();

          if (tableEndIdx === tableStartIdx) {
            if (currentLine.startsWith('|') && currentLine.endsWith('|')) {
              header = currentLine;
            } else {
              break;
            }
          } else if (!foundSeparator) {
            if (/^\|[\|\-: \t]+\|$/.test(currentLine)) {
              foundSeparator = true;
            } else if (currentLine.startsWith('|') && currentLine.endsWith('|')) {
            } else {
              break;
            }
          } else {
            if (currentLine.startsWith('|') && currentLine.endsWith('|')) {
              body.push(currentLine);
            } else {
              break;
            }
          }
          tableEndIdx++;
        }

        if (header && foundSeparator && body.length > 0) {
          const headerColCount = header.split('|').filter(c => c.trim()).length;

          // 生成表头单元格，应用列宽和行高
          const headerHeight = rowHeights[0] ? rowHeights[0] : null;
          const headerCells = header.split('|').filter(c => c.trim()).map((c, idx) => {
            const widthStyle = colWidths[idx] ? `width:${colWidths[idx]}px` : '';
            const heightStyle = headerHeight ? `height:${headerHeight}px` : '';
            const styleParts = [widthStyle, heightStyle].filter(s => s).join(';');
            const style = styleParts ? ` style="${styleParts}"` : '';
            return `<th${style}><span class="cell-content">${c.trim()}</span><span class="col-resize-handle"></span><span class="row-resize-handle"></span></th>`;
          }).join('');

          // 生成表体行，应用行高
          const bodyRows = body.map((row, rowIdx) => {
            let cells = row.split('|').filter(c => c.trim());
            while (cells.length < headerColCount) cells.push('');
            if (cells.length > headerColCount) cells = cells.slice(0, headerColCount);
            return '<tr>' + cells.map((c, colIdx) => {
              // rowHeights[0] is header height, body rows start from rowHeights[1]
              const height = rowHeights[rowIdx + 1] ? rowHeights[rowIdx + 1] : null;
              const style = height ? ` style="height:${height}px"` : '';
              return `<td${style}><span class="cell-content">${c.trim()}</span><span class="col-resize-handle"></span><span class="row-resize-handle"></span></td>`;
            }).join('') + '</tr>';
          }).join('');

          const tableHtml = `<table class="md-table"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
          result.push(tableHtml);
          i = tableEndIdx;
          // 清空待处理的维度
          pendingColWidths = null;
          pendingRowHeights = null;
          continue;
        } else {
          result.push(line);
          i++;
        }
      } else {
        result.push(line);
        i++;
      }
    }

    return result.join('\n');
  }

  /**
   * 合并连续的无序列表项
   */
  function consolidateLists(html, type) {
    // 保持向后兼容
    return html;
  }

  /**
   * 合并连续的 <li> 标签为 <ul>/<ol>
   * 只处理连续的 <li>...</li><li>...</li> 模式
   */
  function consolidateListItems(html, type) {
    const tag = type === 'ul' ? 'ul' : 'ol';
    // 直接查找 <li>...</li> 序列并包裹
    // 使用 [^]*? 来匹配任意字符（包括换行）
    const regex = new RegExp(`(<li>[^]*?<\\/li>)((?:\\s*<li>[^]*?<\\/li>))+`, 'gi');

    return html.replace(regex, (match) => {
      // 提取所有 <li>...</li> 内容
      const liRegex = /<li>[^]*?<\/li>/gi;
      const items = match.match(liRegex) || [];

      if (items.length === 0) return match;
      if (items.length === 1) return `<${tag}>${items[0]}</${tag}>`;

      // 多个连续 <li> 合并成一个列表
      return `<${tag}>${items.join('')}</${tag}>`;
    });
  }

  /**
   * HTML 转 Markdown
   */
  function htmlToMarkdown(html) {
    if (!html) return '';

    let md = html;

    // 表格 - 使用 DOM 解析确保正确处理
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = md;

    const tables = tempDiv.querySelectorAll('table');
    const tableMds = [];

    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      if (rows.length === 0) {
        tableMds.push({ html: table.outerHTML, md: table.outerHTML });
        return;
      }

      // 保存列宽和行高
      const colWidths = [];
      const rowHeights = [];

      // 获取第一行每个单元格的宽度作为列宽
      if (rows[0]) {
        Array.from(rows[0].children).forEach((cell, idx) => {
          const w = cell.style.width;
          colWidths.push(w ? parseInt(w) : null);
        });
      }

      // 获取每行的第一个单元格的高度作为行高
      rows.forEach(row => {
        const firstCell = row.children[0];
        if (firstCell) {
          const h = firstCell.style.height;
          rowHeights.push(h ? parseInt(h) : null);
        }
      });

      // 生成维度注释
      const dimComment = '<!-- ' +
        (colWidths.some(w => w !== null) ? `colwidths:${colWidths.map(w => w || '').join(',')}` : '') +
        ' | ' +
        (rowHeights.some(h => h !== null) ? `rowheights:${rowHeights.map(h => h || '').join(',')}` : '') +
        ' -->';

      // 处理表头 - 获取真实的列数
      const headerCells = rows[0].querySelectorAll('th, td');
      const colCount = headerCells.length;
      // 只获取 .cell-content 内的文本，否则会包含 resize-handle 的文本
      const getCellText = (cell) => {
        const contentSpan = cell.querySelector('.cell-content');
        return contentSpan ? contentSpan.textContent.trim() : cell.textContent.trim();
      };
      const headerLine = '| ' + Array.from(headerCells).map(c => getCellText(c)).join(' | ') + ' |';

      // 生成分隔行
      const separatorLine = '| ' + Array(colCount).fill('---').join(' | ') + ' |';

      // 处理表体
      const bodyLines = [];
      for (let i = 1; i < rows.length; i++) {
        const cells = Array.from(rows[i].querySelectorAll('th, td'));
        // 补齐列数
        while (cells.length < colCount) {
          cells.push({ textContent: '' });
        }
        const rowText = '| ' + cells.slice(0, colCount).map(c => getCellText(c)).join(' | ') + ' |';
        bodyLines.push(rowText);
      }

      const tableMd = dimComment + '\n' + [headerLine, separatorLine, ...bodyLines].join('\n') + '\n\n';
      tableMds.push({ html: table.outerHTML, md: tableMd });
    });

    // 依次替换每个表格的 HTML
    tableMds.forEach(({ html, md: tableMd }) => {
      md = md.split(html).join(tableMd);
    });

    // 任务列表
    md = md.replace(/<div class="task-item"><input[^>]*>\s*([^<]+)<\/div>/gi, (match, text) => {
      const checked = match.includes('checked');
      return `- [${checked ? 'x' : ' '}] ${text.trim()}`;
    });

    // 代码块 - 使用 DOM 解析确保正确处理（避免正则匹配问题）
    const cbBlocks = tempDiv.querySelectorAll('.code-block');
    cbBlocks.forEach(cb => {
      // 先获取内部 HTML，将 <br> 替换为换行符，再去除剩余标签
      let innerHtml = cb.innerHTML;
      console.log('[htmlToMarkdown] code-block innerHTML:', JSON.stringify(innerHtml));
      innerHtml = innerHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
      console.log('[htmlToMarkdown] code-block content after replace:', JSON.stringify(innerHtml));
      const content = innerHtml;

      // 计算需要的反引号数量
      let quoteCount = 3;
      while (content.includes('`'.repeat(quoteCount)) && quoteCount < 10) {
        quoteCount++;
      }
      const quotes = '`'.repeat(quoteCount);
      const codeMd = quotes + '\n' + content + '\n' + quotes;

      // 替换原始 HTML 为 markdown
      md = md.split(cb.outerHTML).join(codeMd);
    });

    // 行内代码
    md = md.replace(/<code>([^<]+)<\/code>/g, '`$1`');

    // 标题 - 使用两个换行符确保标题之间有适当间距
    md = md.replace(/<h1[^>]*>([^<]+)<\/h1>/gi, '# $1\n\n');
    md = md.replace(/<h2[^>]*>([^<]+)<\/h2>/gi, '## $1\n\n');
    md = md.replace(/<h3[^>]*>([^<]+)<\/h3>/gi, '### $1\n\n');
    md = md.replace(/<h4[^>]*>([^<]+)<\/h4>/gi, '#### $1\n\n');

    // 粗体
    md = md.replace(/<strong>([^<]+)<\/strong>/g, '**$1**');

    // 斜体
    md = md.replace(/<em>([^<]+)<\/em>/g, '*$1*');

    // 删除线
    md = md.replace(/<s>([^<]+)<\/s>/g, '~~$1~~');

    // 链接
    md = md.replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g, '[$2]($1)');

    // 图片 - 保留 style 属性（用于缩放）
    md = md.replace(/<img([^>]+)>/g, (match, attrs) => {
      const srcMatch = attrs.match(/src="([^"]*)"/);
      const altMatch = attrs.match(/alt="([^"]*)"/);
      const styleMatch = attrs.match(/style="([^"]*)"/);
      if (!srcMatch) return match;
      const src = srcMatch[1];
      let alt = altMatch ? altMatch[1] : '';
      // 提取宽度百分比
      let widthPercent = '';
      if (styleMatch) {
        const widthMatch = styleMatch[1].match(/(?:max-?width|width)\s*:\s*([^;]+)/);
        if (widthMatch) {
          const width = widthMatch[1].trim();
          if (width.endsWith('%')) {
            widthPercent = width;
            // 从 alt 中移除已有的宽度标记
            alt = alt.replace(/\s*\|width:\d+%/g, '');
          }
        }
      }
      let result = `![${alt}](${src})`;
      if (widthPercent) {
        result += ` |width:${widthPercent}`;
      }
      return result;
    });

    // 段落处理 - 先将块级元素边界转换为特殊标记，避免被误处理
    // 当块级元素被错误包裹在 <p> 标签内时，需要先将它们提取出来
    md = md.replace(/<p>([\s\S]*?)<\/p>/gi, (match, content) => {
      // 检查内容是否包含块级元素
      if (/<(ul|ol|li|h[1-6]|blockquote|pre|hr|table)/i.test(content)) {
        // 将块级元素提取到段落外，确保正确转换
        return '<p>' + content.replace(/<(ul|ol|li)([^>]*)>[\s\S]*?<\/\1>/gi, '\n\n$&\n\n') + '</p>';
      }
      return match;
    });

    // 水平线
    md = md.replace(/<hr\s*\/?>/gi, '---\n');

    // 引用
    md = md.replace(/<blockquote>([^<]+)<\/blockquote>/gi, '> $1\n');

    // 列表 - 区分有序和无序列表 (必须在换行处理之前)
    // 先处理有序列表 (需要跟踪序号)
    const oliMatches = md.match(/<ol[^>]*>[\s\S]*?<\/ol>/gi);
    if (oliMatches) {
      oliMatches.forEach(olHtml => {
        const liMatches = olHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
        if (liMatches) {
          let mdItems = liMatches.map((li) => {
            const idxMatch = li.match(/value="(\d+)"/);
            const idx = idxMatch ? idxMatch[1] : '1';
            const text = li.replace(/<[^>]+>/g, '');
            return `${idx}. ${text}`;
          });
          const olMd = mdItems.join('\n');
          md = md.replace(olHtml, olMd);
        }
      });
    }
    // 处理无序列表 - 先移除 ul 标签
    md = md.replace(/<\/?ul>/gi, '');
    // 先移除 li 之间的换行，避免重复换行符
    md = md.replace(/<\/li>\s*\n\s*/gi, '</li>');
    md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (match, content) => {
      const text = content.replace(/<[^>]+>/g, '');
      return '- ' + text + '\n';
    });

    // 换行
    md = md.replace(/<br\s*\/?>/gi, '\n');

    // 段落处理 - 将 </p><p> 转换为双换行
    md = md.replace(/<\/p><p>/gi, '\n\n');
    md = md.replace(/<p>([^<]*)<\/p>/gi, '$1\n\n');

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