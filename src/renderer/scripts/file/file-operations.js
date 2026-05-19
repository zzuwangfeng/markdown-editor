// FlowMark - file/file-operations
(function(App) {
  'use strict';

  async function saveWorkspaceToStorage() {
    if (!App.state.currentWorkspace) return;

    try {
      // 只保存工作区路径和展开状态，不保存整个目录树
      localStorage.setItem('flowmark-workspace-path', App.state.currentWorkspace);

      // 保存展开状态
      localStorage.setItem('flowmark-expanded-folders', JSON.stringify([...App.state.expandedFolders]));

      // 移除目录树缓存，避免 localStorage 超出限制
      localStorage.removeItem('flowmark-workspace-tree');
      App.state.savedWorkspaceTree = null;
    } catch (e) {
      console.error('保存工作区失败:', e);
    }
  }

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
        App.state.currentWorkspace = savedPath;
        App.state.savedWorkspaceTree = items;
        App.state.assetsFolderPath = savedPath + '/.flowmark-assets';

        // 恢复工作区名称
        App.dom.workspaceName.textContent = savedPath.split(/[\\/]/).pop() || savedPath;
        App.dom.workspaceName.title = savedPath; // 悬停显示完整路径
        App.dom.emptyState.style.display = 'none';

        // 恢复展开状态
        if (savedExpanded) {
          try {
            App.state.expandedFolders = new Set(JSON.parse(savedExpanded));
          } catch (e) {
            App.state.expandedFolders = new Set();
          }
        }

        // 使用最新数据构建目录树
        App.file_file_tree.renderFileTreeFromData(items);

        // 启动文件监控
        App.file_file_watcher.startFileWatcher();

        return;
      }
    } catch (e) {
      console.error('恢复工作区失败，清除缓存:', e);
    }

    // 如果恢复失败，清除缓存
    clearWorkspaceStorage();
  }

  function clearWorkspaceStorage() {
    localStorage.removeItem('flowmark-workspace-path');
    localStorage.removeItem('flowmark-workspace-tree');
    localStorage.removeItem('flowmark-expanded-folders');
    App.state.savedWorkspaceTree = null;
    App.state.currentWorkspace = null;
  }

  async function openFileAtLine(filePath, lineNumber) {
    const fileName = filePath.split('/').pop();
    await loadFile(filePath, fileName);
    // TODO: 实现跳转到指定行
  }

  async function openRecentFile(filePath) {
    try {
      await loadFile(filePath, filePath.split('/').pop());
    } catch (e) {
      // 文件可能已被删除
      let recentFiles = App.sidebar.getRecentFiles().filter(f => f.path !== filePath);
      localStorage.setItem('flowmark-recent-files', JSON.stringify(recentFiles));
      App.sidebar.renderRecentFiles();
    }
  }

  async function openWorkspace() {
    const path = await window.electronAPI.selectWorkspace();
    if (path) {
      App.state.currentWorkspace = path;
      App.state.assetsFolderPath = path + '/.flowmark-assets';
      App.dom.workspaceName.textContent = path.split(/[\\/]/).pop() || path;
      App.dom.emptyState.style.display = 'none';
      await ensureAssetsFolder();
      await refreshFileTree();
      App.file_file_watcher.startFileWatcher();
      // 保存工作区到 localStorage
      await saveWorkspaceToStorage();
    }
  }

  function handleAddClick(e) {
    e.stopPropagation();

    if (!App.state.currentWorkspace) {
      openWorkspace();
      return;
    }

    App.dom.dropdownMenu.classList.toggle('visible');
  }

  function hideDropdownMenu(e) {
    if (!e.target.closest('.add-dropdown')) {
      App.dom.dropdownMenu.classList.remove('visible');
    }
  }

  async function handleDropdownAction(action) {
    App.dom.dropdownMenu.classList.remove('visible');

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

  async function createNewFile() {
    App.dialogs.showDialog('新建文件', '', async name => {
      // 去除首尾空格
      const trimmedName = name ? name.trim() : '';

      // 验证：名字不能为空
      if (!trimmedName) {
        App.dialogs.showConfirm('错误', '文件名不能为空', null);
        return;
      }

      // 验证：不能包含非法字符
      const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
      if (invalidChars.test(trimmedName)) {
        App.dialogs.showConfirm('错误', '文件名不能包含特殊字符', null);
        return;
      }

      // 验证：名字长度限制（100字符）
      if (trimmedName.length > 100) {
        App.dialogs.showConfirm('错误', '文件名不能超过100个字符', null);
        return;
      }

      const fileName = trimmedName.endsWith('.md') ? trimmedName : trimmedName + '.md';

      // 检查是否已存在（简单检查文件名部分）
      const exists = await checkItemExists(App.state.currentWorkspace, fileName);
      if (exists) {
        App.dialogs.showConfirm('错误', `"${fileName}" 已存在`, null);
        return;
      }

      const result = await window.electronAPI.createItem(App.state.currentWorkspace, fileName, false);
      if (result.success) {
        await refreshFileTree();
        // 自动打开新创建的文件，文件树保持可见
        await openFileInEditor(result.path);
      } else {
        App.dialogs.showConfirm('错误', `创建文件失败：${result.error || '未知错误'}`, null);
      }
    });
  }

  async function openFileInEditor(filePath) {
    const fileName = filePath.split('/').pop();
    await loadFile(filePath, fileName);
  }

  async function createNewFolder() {
    App.dialogs.showDialog('新建文件夹', '', async name => {
      // 去除首尾空格
      const trimmedName = name ? name.trim() : '';

      // 验证：名字不能为空
      if (!trimmedName) {
        App.dialogs.showConfirm('错误', '文件夹名不能为空', null);
        return;
      }

      // 验证：不能包含非法字符
      const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
      if (invalidChars.test(trimmedName)) {
        App.dialogs.showConfirm('错误', '文件夹名不能包含特殊字符', null);
        return;
      }

      // 验证：名字长度限制（100字符）
      if (trimmedName.length > 100) {
        App.dialogs.showConfirm('错误', '文件夹名不能超过100个字符', null);
        return;
      }

      // 检查是否已存在
      const exists = await checkItemExists(App.state.currentWorkspace, trimmedName);
      if (exists) {
        App.dialogs.showConfirm('错误', `"${trimmedName}" 已存在`, null);
        return;
      }

      const result = await window.electronAPI.createItem(App.state.currentWorkspace, trimmedName, true);
      if (result.success) {
        await refreshFileTree();
      } else {
        App.dialogs.showConfirm('错误', `创建文件夹失败：${result.error || '未知错误'}`, null);
      }
    });
  }

  async function checkItemExists(parentPath, name) {
    try {
      const items = await window.electronAPI.readDirectory(parentPath);
      return items.some(item => item.name === name);
    } catch (e) {
      return false;
    }
  }

  async function ensureAssetsFolder() {
    if (App.state.currentWorkspace) {
      try {
        await window.electronAPI.createDirectory(App.state.assetsFolderPath);
      } catch (e) {
        // 文件夹可能已存在
      }
    }
  }

  function showConflictDialog() {
    App.dom.conflictMessage.textContent = `"${App.state.currentFileName}" 已被外部软件修改。请选择如何处理：`;
    App.dom.conflictOverlay.classList.add('visible');
  }

  async function handleConflict(action) {
    App.dom.conflictOverlay.classList.remove('visible');

    switch (action) {
      case 'overwrite':
        await saveCurrentFile();
        break;
      case 'keep':
        App.state.lastModifiedTime = Date.now();
        break;
      case 'reload':
        await loadFile(App.state.currentFilePath, App.state.currentFileName);
        break;
    }

    App.file_file_watcher.startFileWatcher();
  }

  async function refreshFileTree() {
    if (!App.state.currentWorkspace) return;

    // 保存当前展开状态
    const previousExpanded = new Set(App.state.expandedFolders);

    const items = await window.electronAPI.readDirectory(App.state.currentWorkspace);
    App.state.savedWorkspaceTree = items;
    App.dom.fileTree.innerHTML = '';

    if (items.length === 0) {
      App.dom.fileTree.innerHTML = '<div class="empty-state"><p>工作区为空</p></div>';
      return;
    }

    // 排序：文件夹在前，文件在后，按名字排序
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    items.forEach(item => {
      const el = App.file_file_tree.createTreeItem(item);
      App.dom.fileTree.appendChild(el);
    });

    // 恢复展开状态 - 递归展开所有已展开的文件夹
    previousExpanded.forEach(path => {
      App.file_file_tree.restoreFolderExpansion(items, path, 0);
    });

    // 保存工作区状态
    await saveWorkspaceToStorage();
  }

  async function openFile(filePath) {
    const fileName = filePath.split('/').pop();
    await loadFile(filePath, fileName);
  }

  async function loadFile(filePath, fileName) {
    // 如果正在加载文件，返回
    if (App.state.isLoading) return;

    App.state.isLoading = true;

    // 每次打开新文件默认显示预览模式
    if (App.dom.currentMdView !== 'preview') {
      App.markdown_source_editor.switchMdView('preview');
    }

    App.state.currentFilePath = filePath;
    App.state.currentFileName = fileName;
    App.dom.currentFileNameEl.textContent = fileName;

    const content = await window.electronAPI.readFile(filePath);
    App.state.currentFileContent = content;

    // 转换图片路径为绝对路径
    const processedContent = App.markdown_preview.convertImagePathsToAbsolute(content, App.state.currentWorkspace);

    // 更新文件头部标题：始终显示文件名（去除.md）
    if (App.dom.fileHeaderTitle) {
      App.dom.fileHeaderTitle.textContent = fileName.replace(/\.md$/, '');
    }

    const stat = await window.electronAPI.getFileStat(filePath);
    App.state.lastModifiedTime = stat ? stat.mtime : Date.now();

    // 显示编辑器区域，隐藏欢迎界面
    App.dom.editorWelcome.classList.add('hidden');
    App.dom.editorWrapper.style.display = 'flex';

    // 启用编辑器
    App.theme.enableEditor();

    App.dom.editor.innerHTML = App.converter.markdownToHtml(processedContent);
    // 编辑区为空时显示 file-header-hint
    const hasContent = App.dom.editor.innerHTML.trim().length > 0;
    App.dom.editorPlaceholder.style.display = 'none'; // 始终隐藏 placeholder，用 file-header-hint 代替
    if (App.dom.fileHeaderHint) {
      App.dom.fileHeaderHint.style.display = hasContent ? 'none' : 'block';
    }

    // 同步侧边栏选中状态
    syncSidebarSelection(filePath);

    // 添加到最近文件
    App.sidebar.addToRecentFiles(filePath, fileName);

    // 更新阅读进度
    App.theme.calculateReadingProgress();

    App.markdown_source_editor.updateOutline();
    App.markdown_source_editor.updateStats();

    // 如果源码编辑器显示，同步更新源码和行号
    if (App.dom.mdSourceEditor && App.dom.mdSourceTextarea && App.dom.currentMdView === 'code') {
      App.dom.mdSourceTextarea.value = processedContent;
      App.markdown_source_editor.updateLineNumbers(processedContent);
    }

    // 加载完成
    App.state.isLoading = false;
  }

  function updateEditorVisibility() {
    if (App.state.currentFilePath) {
      App.dom.editorWelcome.classList.add('hidden');
      App.dom.editorWrapper.style.display = 'flex';
    } else {
      App.dom.editorWelcome.classList.remove('hidden');
      App.dom.editorWrapper.style.display = 'none';
    }
  }

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

  async function saveCurrentFile() {
    if (!App.state.currentFilePath) return;

    App.state.isSaving = true;
    let content = App.converter.htmlToMarkdown(App.dom.editor.innerHTML);

    // 调试：记录保存的内容前200字符
    console.log('[saveCurrentFile] Markdown content (first 200):', content.substring(0, 200));
    console.log('[saveCurrentFile] App.dom.editor.innerHTML snippet:', App.dom.editor.innerHTML.substring(0, 500));
    console.log('[saveCurrentFile] Has .code-block-wrapper:', App.dom.editor.innerHTML.includes('code-block-wrapper'));
    console.log('[saveCurrentFile] Has .code-block:', App.dom.editor.innerHTML.includes('code-block'));

    // 将图片绝对路径转换回相对路径再保存
    if (App.state.currentWorkspace) {
      content = convertImagePathsToRelative(content, App.state.currentWorkspace);
    }

    const success = await window.electronAPI.writeFile(App.state.currentFilePath, content);

    if (success) {
      App.state.currentFileContent = content;
      const stat = await window.electronAPI.getFileStat(App.state.currentFilePath);
      App.state.lastModifiedTime = stat ? stat.mtime : Date.now();
      showSaveStatus();
    }
    App.state.isSaving = false;
  }

  function showSaveStatus() {
    App.dom.saveStatus.textContent = '已保存';
    App.dom.saveStatus.classList.add('visible');
    setTimeout(() => {
      App.dom.saveStatus.classList.remove('visible');
    }, 2000);
  }

  App.file_file_operations = {
    saveWorkspaceToStorage: saveWorkspaceToStorage,
    restorePersistentWorkspace: restorePersistentWorkspace,
    clearWorkspaceStorage: clearWorkspaceStorage,
    openFileAtLine: openFileAtLine,
    openRecentFile: openRecentFile,
    openWorkspace: openWorkspace,
    handleAddClick: handleAddClick,
    hideDropdownMenu: hideDropdownMenu,
    handleDropdownAction: handleDropdownAction,
    createNewFile: createNewFile,
    openFileInEditor: openFileInEditor,
    createNewFolder: createNewFolder,
    checkItemExists: checkItemExists,
    ensureAssetsFolder: ensureAssetsFolder,
    showConflictDialog: showConflictDialog,
    handleConflict: handleConflict,
    refreshFileTree: refreshFileTree,
    openFile: openFile,
    loadFile: loadFile,
    updateEditorVisibility: updateEditorVisibility,
    syncSidebarSelection: syncSidebarSelection,
    convertImagePathsToRelative: convertImagePathsToRelative,
    saveCurrentFile: saveCurrentFile,
    showSaveStatus: showSaveStatus,
  };

})(window.__App);