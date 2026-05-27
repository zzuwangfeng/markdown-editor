(function() {
  'use strict';

  var App = window.App;

  var FILE_ICON_SVG = '<svg class="tree-item-icon" viewBox="0 0 18 18" fill="none">' +
    '<path d="M10 1.5H5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5V6L10 1.5z" stroke="currentColor" stroke-width="1.3"/>' +
    '<path d="M10 1.5v4.5h4.5" stroke="currentColor" stroke-width="1.3"/>' +
    '</svg>';

  // ========================================
  // Theme functions
  // ========================================

  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function setTheme(theme) {
    App.state.currentTheme = theme;
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('flowmark-theme', theme);
    updateThemeUI();
  }

  function updateThemeUI() {
    App.dom.themeDropdown.querySelectorAll('.theme-option').forEach(function(option) {
      option.classList.toggle('active', option.dataset.theme === App.state.currentTheme);
    });
  }

  function toggleThemeDropdown(e) {
    e.stopPropagation();
    App.dom.themeDropdown.classList.toggle('visible');
  }

  // ========================================
  // Search functions
  // ========================================

  function toggleSearchPanel() {
    App.dom.searchPanel.classList.toggle('visible');
    if (App.dom.searchPanel.classList.contains('visible')) {
      App.dom.searchInput.focus();
    }
  }

  function hideSearchPanel() {
    App.dom.searchPanel.classList.remove('visible');
    App.dom.searchInput.value = '';
    App.dom.searchResults.innerHTML = '';
  }

  function toggleProjectSearchPanel() {
    if (!App.dom.searchPanelProject) return;
    App.dom.searchPanelProject.classList.toggle('visible');
    if (App.dom.searchPanelProject.classList.contains('visible') && App.dom.searchInputProject) {
      App.dom.searchInputProject.focus();
    }
  }

  function hideProjectSearchPanel() {
    if (!App.dom.searchPanelProject) return;
    App.dom.searchPanelProject.classList.remove('visible');
    if (App.dom.searchInputProject) App.dom.searchInputProject.value = '';
    if (App.dom.searchResultsProject) App.dom.searchResultsProject.innerHTML = '';
    if (App.dom.searchInfoProject) App.dom.searchInfoProject.textContent = '';
    if (App.dom.searchClearProject) App.dom.searchClearProject.style.display = 'none';
  }

  function handleSearchInput() {
    var query = App.dom.searchInput.value.trim();
    if (!query) {
      App.dom.searchResults.innerHTML = '';
      return;
    }

    var content = App.dom.editor.innerText || '';
    var matches = searchContent(content, query);
    renderSearchResults(matches, query);
  }

  function searchContent(content, query) {
    var matches = [];
    var regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    var match;
    while ((match = regex.exec(content)) !== null) {
      var start = Math.max(0, match.index - 30);
      var end = Math.min(content.length, match.index + query.length + 30);
      var snippet = content.substring(start, end);
      if (start > 0) snippet = '...' + snippet;
      if (end < content.length) snippet = snippet + '...';
      matches.push({ snippet: snippet, index: match.index });
    }
    return matches.slice(0, 50);
  }

  function renderSearchResults(matches, query) {
    if (matches.length === 0) {
      App.dom.searchResults.innerHTML = '<div class="search-empty">未找到匹配内容</div>';
      return;
    }

    App.dom.searchResults.innerHTML = matches.map(function(match, i) {
      var highlighted = match.snippet.replace(
        new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        '<mark>$&</mark>'
      );
      return '<div class="search-result-item" data-index="' + match.index + '">' +
        '<span class="search-result-text">' + highlighted + '</span>' +
        '</div>';
    }).join('');

    App.dom.searchResults.querySelectorAll('.search-result-item').forEach(function(item) {
      item.addEventListener('click', function() {
        var index = parseInt(item.dataset.index);
        scrollToSearchMatch(index, query.length);
        hideSearchPanel();
      });
    });
  }

  function scrollToSearchMatch(index, length) {
    App.dom.editor.scrollTop = 0;
  }

  // ========================================
  // Dialog functions
  // ========================================

  function showSettingsDialog() {
    App.showDialog('主题设置', getCurrentTheme(), function(theme) {
      if (theme) setTheme(theme.trim());
    });
  }

  function showAboutDialog() {
    App.dom.aboutOverlay.classList.add('visible');
  }

  function hideAboutDialog() {
    App.dom.aboutOverlay.classList.remove('visible');
  }

  // ========================================
  // Zoom / font functions
  // ========================================

  function adjustZoom(delta) {
    App.state.currentZoom = Math.max(50, Math.min(200, App.state.currentZoom + delta));
    App.dom.zoomLevel.textContent = App.state.currentZoom + '%';
    App.dom.editor.style.zoom = App.state.currentZoom / 100;
    localStorage.setItem('flowmark-zoom', App.state.currentZoom);
  }

  function adjustFontSize(delta) {
    App.state.currentFontSize = Math.max(12, Math.min(24, App.state.currentFontSize + delta));
    App.dom.fontSizeDisplay.textContent = App.state.currentFontSize;
    App.dom.editor.style.fontSize = App.state.currentFontSize + 'px';
    localStorage.setItem('flowmark-font-size', App.state.currentFontSize);
  }

  // ========================================
  // Fullscreen function
  // ========================================

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      App.dom.btnFullscreen.classList.add('active');
    } else {
      document.exitFullscreen();
      App.dom.btnFullscreen.classList.remove('active');
    }
  }

  // ========================================
  // View mode function
  // ========================================

  function setViewMode(mode) {
    App.state.currentView = mode;
    App.dom.viewSwitch.querySelectorAll('.view-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.view === mode);
    });

    var editorEl = App.dom.editor;
    var previewEl = App.dom.previewContent;

    switch (mode) {
      case 'edit':
        editorEl.style.display = '';
        editorEl.style.flex = '1';
        previewEl.classList.add('hidden');
        previewEl.style.display = 'none';
        break;
      case 'preview':
        editorEl.style.display = 'none';
        previewEl.classList.remove('hidden');
        previewEl.style.display = 'flex';
        previewEl.style.flex = '1';
        if (App.state.currentFilePath) {
          App.renderPreview();
        }
        break;
      case 'both':
        editorEl.style.display = '';
        editorEl.style.flex = '1';
        previewEl.classList.remove('hidden');
        previewEl.style.display = 'flex';
        previewEl.style.flex = '1';
        if (App.state.currentFilePath) {
          App.renderPreview();
        }
        break;
    }

    localStorage.setItem('flowmark-view', mode);
  }

  // ========================================
  // Sidebar functions
  // ========================================

  function toggleSidebar() {
    App.dom.sidebar.classList.toggle('hidden');
    App.dom.sidebar.classList.add('animate');
  }

  function handleSidebarSearchInput(e) {
    var query = e.target.value.trim();
    App.dom.sidebarSearchClear.classList.toggle('visible', query.length > 0);

    if (query.length > 0) {
      searchFilesInTree(query);
    } else {
      clearSidebarSearch();
    }
  }

  function searchFilesInTree(query) {
    if (!App.state.currentWorkspace) return;

    App.dom.fileTree.innerHTML = '<div class="search-results-header">搜索结果</div><div class="search-results-list" id="search-results-list"></div>';
    var searchResultsList = document.getElementById('search-results-list');

    function searchRecursive(dirPath) {
      var results = [];
      try {
        return window.electronAPI.readDirectory(dirPath).then(function(items) {
          console.log('[searchRecursive] dir:', dirPath, 'items:', items.length);
          var subPromises = [];
          for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.isDirectory) {
              subPromises.push(searchRecursive(item.path).then(function(subResults) {
                results.push.apply(results, subResults);
              }));
            } else {
              if (item.name.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                results.push(item);
              }
            }
          }
          return Promise.all(subPromises).then(function() {
            return results;
          });
        });
      } catch (e) {
        console.error('[searchRecursive] error:', e);
        return Promise.resolve([]);
      }
    }

    searchRecursive(App.state.currentWorkspace).then(function(results) {
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
    results.forEach(function(file) {
      var item = document.createElement('div');
      item.className = 'tree-item';
      item.dataset.path = file.path;
      item.innerHTML =
        '<div class="tree-item-content">' +
          '<span class="tree-item-icon">' + FILE_ICON_SVG + '</span>' +
          '<span class="tree-item-name">' + file.name + '</span>' +
        '</div>';
      item.addEventListener('click', function() {
        App.openFile(file.path);
        clearSidebarSearch();
      });
      container.appendChild(item);
    });
  }

  function clearSidebarSearch() {
    App.dom.sidebarSearchInput.value = '';
    App.dom.sidebarSearchClear.classList.remove('visible');
    if (App.state.currentWorkspace) {
      App.refreshFileTree();
    }
  }

  function toggleOutline() {
    App.state.isOutlineEnabled = !App.state.isOutlineEnabled;
    var outlinePanel = document.getElementById('outline-panel');
    if (App.state.isOutlineEnabled) {
      outlinePanel.style.display = 'flex';
    } else {
      outlinePanel.style.display = 'none';
    }
    localStorage.setItem('flowmark-outline-enabled', App.state.isOutlineEnabled);
  }

  function switchSidebarTab(tab) {
    App.dom.sidebarTabs.forEach(function(t) {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

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
    var recentFiles = getRecentFiles();
    App.dom.recentList.innerHTML = '';

    if (recentFiles.length === 0) {
      App.dom.recentList.innerHTML = '<div class="recent-empty"><p>暂无最近文件</p></div>';
      return;
    }

    recentFiles.forEach(function(file) {
      var item = document.createElement('div');
      item.className = 'recent-item';
      item.innerHTML =
        '<svg class="recent-item-icon" viewBox="0 0 16 16" fill="none">' +
          '<path d="M9 1.5H4.5A1.5 1.5 0 0 0 3 3v10a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5V6L9 1.5z" stroke="currentColor" stroke-width="1.1"/>' +
          '<path d="M9 1.5v4.5h4.5" stroke="currentColor" stroke-width="1.1"/>' +
        '</svg>' +
        '<span class="recent-item-name">' + file.name + '</span>';
      item.addEventListener('click', function() {
        openRecentFile(file.path);
      });
      App.dom.recentList.appendChild(item);
    });
  }

  function getRecentFiles() {
    try {
      return JSON.parse(localStorage.getItem('flowmark-recent-files') || '[]');
    } catch (e) {
      return [];
    }
  }

  function addToRecentFiles(filePath, fileName) {
    var recentFiles = getRecentFiles();
    recentFiles = recentFiles.filter(function(f) { return f.path !== filePath; });
    recentFiles.unshift({ path: filePath, name: fileName, time: Date.now() });
    recentFiles = recentFiles.slice(0, 20);
    localStorage.setItem('flowmark-recent-files', JSON.stringify(recentFiles));
  }

  function openRecentFile(filePath) {
    try {
      return App.loadFile(filePath, filePath.split('/').pop());
    } catch (e) {
      var recentFiles = getRecentFiles().filter(function(f) { return f.path !== filePath; });
      localStorage.setItem('flowmark-recent-files', JSON.stringify(recentFiles));
      renderRecentFiles();
    }
  }

  // ========================================
  // Exports
  // ========================================

  App.modules = {
    getCurrentTheme: getCurrentTheme,
    setTheme: setTheme,
    updateThemeUI: updateThemeUI,
    toggleThemeDropdown: toggleThemeDropdown,
    toggleSearchPanel: toggleSearchPanel,
    hideSearchPanel: hideSearchPanel,
    toggleProjectSearchPanel: toggleProjectSearchPanel,
    hideProjectSearchPanel: hideProjectSearchPanel,
    handleSearchInput: handleSearchInput,
    searchContent: searchContent,
    renderSearchResults: renderSearchResults,
    scrollToSearchMatch: scrollToSearchMatch,
    showSettingsDialog: showSettingsDialog,
    showAboutDialog: showAboutDialog,
    hideAboutDialog: hideAboutDialog,
    adjustZoom: adjustZoom,
    adjustFontSize: adjustFontSize,
    toggleFullscreen: toggleFullscreen,
    setViewMode: setViewMode,
    toggleSidebar: toggleSidebar,
    handleSidebarSearchInput: handleSidebarSearchInput,
    searchFilesInTree: searchFilesInTree,
    renderSidebarSearchResults: renderSidebarSearchResults,
    clearSidebarSearch: clearSidebarSearch,
    toggleOutline: toggleOutline,
    switchSidebarTab: switchSidebarTab,
    renderRecentFiles: renderRecentFiles,
    getRecentFiles: getRecentFiles,
    addToRecentFiles: addToRecentFiles,
    openRecentFile: openRecentFile
  };

})();