// FlowMark - file/file-tree
(function(App) {
  'use strict';

  function renderFileTreeFromData(items) {
    App.dom.fileTree.innerHTML = '';

    if (!items || items.length === 0) {
      App.dom.fileTree.innerHTML = '<div class="empty-state"><p>工作区为空</p></div>';
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
      App.dom.fileTree.appendChild(el);
    });

    // 恢复展开状态
    App.state.expandedFolders.forEach(path => {
      restoreFolderExpansionFromCache(items, path, 0);
    });
  }

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

        // 如果这个文件夹也在App.state.expandedFolders中，递归展开
        if (App.state.expandedFolders.has(item.path)) {
          item.children.forEach(child => {
            if (child.isDirectory && App.state.expandedFolders.has(child.path)) {
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
      const el = createTreeItem(item);
      App.dom.fileTree.appendChild(el);
    });

    // 恢复展开状态 - 递归展开所有已展开的文件夹
    previousExpanded.forEach(path => {
      restoreFolderExpansion(items, path, 0);
    });

    // 保存工作区状态
    await App.file_file_operations.saveWorkspaceToStorage();
  }

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
        if (App.state.expandedFolders.has(item.path)) {
          item.children.forEach(child => {
            if (child.isDirectory && App.state.expandedFolders.has(child.path)) {
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
      content.innerHTML = `<span class="tree-item-expand" data-expanded="false">${App.icons.arrow}</span>${App.icons.folder}<span class="tree-item-name">${item.name}</span>`;
    } else {
      content.innerHTML = `${App.icons.file}<span class="tree-item-name">${item.name}</span>`;
    }

    content.addEventListener('click', function(e) {
      handleTreeItemClick(e, item, div);
    });
    content.addEventListener('contextmenu', e => App.context_menu.showContextMenu(e, item));

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
      App.state.expandedFolders.add(item.path);
    } else {
      // 折叠
      children.style.display = 'none';
      expandBtn.dataset.expanded = 'false';
      expandBtn.classList.remove('expanded');
      // 移除展开状态
      App.state.expandedFolders.delete(item.path);
    }

    // 保存展开状态
    localStorage.setItem('flowmark-expanded-folders', JSON.stringify([...App.state.expandedFolders]));
  }

  async function handleTreeItemClick(e, item, treeItem) {
    // 如果正在加载文件，返回
    if (App.state.isLoading) return;

    // 如果点击的是展开箭头区域，不处理文件打开
    if (e.target.closest('.tree-item-expand')) return;

    if (item.isDirectory) {
      toggleFolderExpand(treeItem, item);
      return;
    }

    // 如果点击的就是当前文件，不需要重新加载
    if (App.state.currentFilePath === item.path) {
      return;
    }

    // 保存当前文件
    if (App.state.currentFilePath && !App.state.isSaving) {
      await App.file_file_operations.saveCurrentFile();
    }

    // 更新选中状态
    const contentEl = treeItem.querySelector('.tree-item-content');
    document.querySelectorAll('.tree-item-content.selected').forEach(el => {
      el.classList.remove('selected');
    });
    if (contentEl) contentEl.classList.add('selected');

    // 显示编辑器区域
    App.dom.editorWelcome.classList.add('hidden');
    App.dom.editorWrapper.style.display = 'flex';

    // 使用 loadFile 加载文件
    await App.file_file_operations.loadFile(item.path, item.name);
  }

  App.file_file_tree = {
    renderFileTreeFromData: renderFileTreeFromData,
    restoreFolderExpansionFromCache: restoreFolderExpansionFromCache,
    refreshFileTree: refreshFileTree,
    restoreFolderExpansion: restoreFolderExpansion,
    findItemByPath: findItemByPath,
    createTreeItem: createTreeItem,
    toggleFolderExpand: toggleFolderExpand,
    handleTreeItemClick: handleTreeItemClick,
  };

})(window.__App);