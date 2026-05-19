// FlowMark - ui/sidebar
(function(App) {
  'use strict';

  function toggleSidebar() {
    App.dom.sidebar.classList.toggle('hidden');
    App.dom.sidebar.classList.add('animate');
  }

  function handleSidebarSearchInput(e) {
    const query = e.target.value.trim();
    App.dom.sidebarSearchClear.classList.toggle('visible', query.length > 0);

    if (query.length > 0) {
      searchFilesInTree(query);
    } else {
      clearSidebarSearch();
    }
  }

  function searchFilesInTree(query) {
    if (!App.state.currentWorkspace) return;

    // 隐藏原始文件列表，显示搜索结果区域
    App.dom.fileTree.innerHTML = '<div class="search-results-header">搜索结果</div><div class="search-results-list" id="search-results-list"></div>';
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

    searchRecursive(App.state.currentWorkspace).then((results) => {
      console.log('[searchFilesInTree] final results:', results);
      renderSidebarSearchResults(results, searchResultsList);
    });
  }

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
          <span class="tree-item-icon">${App.icons.file}</span>
          <span class="tree-item-name">${file.name}</span>
        </div>
      `;
      item.addEventListener('click', () => {
        App.file_file_operations.openFile(file.path);
        clearSidebarSearch();
      });
      container.appendChild(item);
    });
  }

  function clearSidebarSearch() {
    App.dom.sidebarSearchInput.value = '';
    App.dom.sidebarSearchClear.classList.remove('visible');
    if (App.state.currentWorkspace) {
      App.file_file_operations.refreshFileTree();
    }
  }

  function switchSidebarTab(tab) {
    App.dom.sidebarTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));

    if (tab === 'files') {
      App.dom.fileTree.style.display = 'block';
      App.dom.recentList.style.display = 'none';
    } else {
      App.dom.fileTree.style.display = 'none';
      App.dom.recentList.style.display = 'block';
      renderRecentFiles();
    }
  }

  function renderRecentFiles() {
    const recentFiles = getRecentFiles();
    App.dom.recentList.innerHTML = '';

    if (recentFiles.length === 0) {
      App.dom.recentList.innerHTML = '<div class="recent-empty"><p>暂无最近文件</p></div>';
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
      item.addEventListener('click', () => App.file_file_operations.openRecentFile(file.path));
      App.dom.recentList.appendChild(item);
    });
  }

  function getRecentFiles() {
    try {
      return JSON.parse(localStorage.getItem('flowmark-recent-files') || '[]');
    } catch {
      return [];
    }
  }

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

  App.sidebar = {
    toggleSidebar: toggleSidebar,
    handleSidebarSearchInput: handleSidebarSearchInput,
    searchFilesInTree: searchFilesInTree,
    renderSidebarSearchResults: renderSidebarSearchResults,
    clearSidebarSearch: clearSidebarSearch,
    switchSidebarTab: switchSidebarTab,
    renderRecentFiles: renderRecentFiles,
    getRecentFiles: getRecentFiles,
    addToRecentFiles: addToRecentFiles,
  };

})(window.__App);