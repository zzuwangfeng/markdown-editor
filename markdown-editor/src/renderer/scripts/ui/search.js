// FlowMark - ui/search
(function(App) {
  'use strict';

  async function handleProjectSearch() {
    const query = App.dom.searchInputProject.value.trim();
    if (!query) {
      clearProjectSearch();
      return;
    }

    if (!App.state.currentWorkspace) {
      App.dom.searchInfoProject.textContent = '请先打开工作区';
      return;
    }

    App.dom.searchClearProject.style.display = 'flex';
    App.dom.searchPanelProject.classList.add('visible');
    App.dom.searchInfoProject.textContent = `正在搜索...`;
    App.dom.searchResultsProject.innerHTML = '<div class="search-loading">搜索中...</div>';

    try {
      const result = await window.electronAPI.searchProject(App.state.currentWorkspace, query);

      if (!result.success) {
        App.dom.searchInfoProject.textContent = '搜索失败';
        App.dom.searchResultsProject.innerHTML = `<div class="search-empty">${result.error || '搜索出错'}</div>`;
        return;
      }

      const { results, totalMatches, totalFiles } = result;
      App.dom.searchInfoProject.textContent = `${totalMatches} 个结果在 ${totalFiles} 个文件中`;

      if (results.length === 0) {
        App.dom.searchResultsProject.innerHTML = '<div class="search-empty">未找到匹配结果</div>';
        return;
      }

      renderProjectSearchResults(results, query);
    } catch (e) {
      App.dom.searchInfoProject.textContent = '搜索失败';
      App.dom.searchResultsProject.innerHTML = '<div class="search-empty">搜索出错</div>';
    }
  }

  function renderProjectSearchResults(results, query) {
    App.dom.searchResultsProject.innerHTML = results.map(file => `
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
    App.dom.searchResultsProject.querySelectorAll('.search-file-header').forEach(header => {
      header.addEventListener('click', () => {
        const matches = header.nextElementSibling;
        matches.classList.toggle('expanded');
      });
    });

    // 绑定跳转事件
    App.dom.searchResultsProject.querySelectorAll('.search-match-line').forEach(line => {
      line.addEventListener('click', () => {
        const filePath = line.dataset.path;
        const lineNumber = parseInt(line.dataset.line);
        App.file_file_operations.openFileAtLine(filePath, lineNumber);
        hideProjectSearchPanel();
      });
    });
  }

  function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark>$1</mark>');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function clearProjectSearch() {
    App.dom.searchInputProject.value = '';
    App.dom.searchClearProject.style.display = 'none';
    App.dom.searchInfoProject.textContent = '';
    App.dom.searchResultsProject.innerHTML = '';
  }

  function clearSearch() {
    if (App.dom.searchInput) App.dom.searchInput.value = '';
    if (App.dom.searchResults) App.dom.searchResults.innerHTML = '';
  }

  function hideSearchPanel() {
    App.dom.searchPanel.classList.remove('visible');
    if (App.dom.searchInput) App.dom.searchInput.value = '';
    if (App.dom.searchResults) App.dom.searchResults.innerHTML = '';
  }

  function toggleSearchPanel() {
    App.dom.searchPanel.classList.toggle('visible');
    if (App.dom.searchPanel.classList.contains('visible')) {
      App.dom.searchInput.focus();
    }
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
    const query = App.dom.searchInput.value.trim();
    if (!query) {
      App.dom.searchResults.innerHTML = '';
      return;
    }

    const content = App.dom.editor.innerText || '';
    const matches = searchContent(content, query);
    renderSearchResults(matches, query);
  }

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

  function renderSearchResults(matches, query) {
    if (matches.length === 0) {
      App.dom.searchResults.innerHTML = '<div class="search-empty">未找到匹配内容</div>';
      return;
    }

    App.dom.searchResults.innerHTML = matches.map((match, i) => {
      const highlighted = match.snippet.replace(
        new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        `<mark>$&</mark>`
      );
      return `<div class="search-result-item" data-index="${match.index}">
        <span class="search-result-text">${highlighted}</span>
      </div>`;
    }).join('');

    App.dom.searchResults.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        scrollToSearchMatch(index, query.length);
        hideSearchPanel();
      });
    });
  }

  function scrollToSearchMatch(index, length) {
    // 简化实现：滚动到顶部
    App.dom.editor.scrollTop = 0;
  }

  App.search = {
    handleProjectSearch: handleProjectSearch,
    renderProjectSearchResults: renderProjectSearchResults,
    highlightMatch: highlightMatch,
    escapeHtml: escapeHtml,
    clearProjectSearch: clearProjectSearch,
    clearSearch: clearSearch,
    hideSearchPanel: hideSearchPanel,
    toggleSearchPanel: toggleSearchPanel,
    toggleProjectSearchPanel: toggleProjectSearchPanel,
    hideProjectSearchPanel: hideProjectSearchPanel,
    handleSearchInput: handleSearchInput,
    searchContent: searchContent,
    renderSearchResults: renderSearchResults,
    scrollToSearchMatch: scrollToSearchMatch,
  };

})(window.__App);