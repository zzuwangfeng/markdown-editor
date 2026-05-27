// FlowMark - ui/theme
(function(App) {
  'use strict';

  function restoreUserSettings() {
    // 恢复预览模式设置
    const savedPreview = localStorage.getItem('flowmark-preview-enabled');
    if (savedPreview === 'true') {
      App.state.isPreviewMode = true;
      App.dom.previewContent.classList.remove('hidden');
    }
    // HTML 默认 hidden，不需要再添加

    // 恢复目录大纲设置
    const savedOutline = localStorage.getItem('flowmark-outline-enabled');
    if (savedOutline === 'true') {
      App.state.isOutlineEnabled = true;
      document.getElementById('outline-panel').style.display = 'flex';
      App.dom.btnOutline.classList.add('active');
    } else {
      App.state.isOutlineEnabled = false;
      document.getElementById('outline-panel').style.display = 'none';
    }

    // 恢复主题设置
    const savedTheme = localStorage.getItem('flowmark-theme') || 'light';
    setTheme(savedTheme);
    App.state.currentTheme = savedTheme;
    updateThemeUI();

    // 恢复字体大小
    const savedFontSize = localStorage.getItem('flowmark-font-size');
    if (savedFontSize) {
      App.state.currentFontSize = parseInt(savedFontSize);
      App.dom.fontSizeDisplay.textContent = App.state.currentFontSize;
      App.dom.editor.style.fontSize = App.state.currentFontSize + 'px';
    }

    // 恢复缩放级别
    const savedZoom = localStorage.getItem('flowmark-zoom');
    if (savedZoom) {
      App.state.currentZoom = parseInt(savedZoom);
      App.dom.zoomLevel.textContent = App.state.currentZoom + '%';
    }

    // 恢复视图模式
    const savedView = localStorage.getItem('flowmark-view');
    if (savedView) {
      setViewMode(savedView);
    }

    // 恢复 Markdown 视图设置
    const savedMdView = localStorage.getItem('flowmark-md-view');
    if (savedMdView === 'code') {
      App.markdown_source_editor.switchMdView('code');
    }

    // 恢复持久化的工作区
    App.file_file_operations.restorePersistentWorkspace();
  }

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
    App.dom.themeDropdown.querySelectorAll('.theme-option').forEach(option => {
      option.classList.toggle('active', option.dataset.theme === App.state.currentTheme);
    });
  }

  function toggleThemeDropdown(e) {
    e.stopPropagation();
    App.dom.themeDropdown.classList.toggle('visible');
  }

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

  function toggleReadingMode() {
    App.state.isReadingMode = !App.state.isReadingMode;
    App.dom.btnReadingMode.classList.toggle('active', App.state.isReadingMode);
    document.querySelector('.editor-container').classList.toggle('reading-mode', App.state.isReadingMode);

    if (App.state.isReadingMode) {
      // 显示插入菜单工具栏
      document.getElementById('insert-menu').style.display = 'flex';
    } else {
      document.getElementById('insert-menu').style.display = 'none';
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      App.dom.btnFullscreen.classList.add('active');
    } else {
      document.exitFullscreen();
      App.dom.btnFullscreen.classList.remove('active');
    }
  }

  function setViewMode(mode) {
    App.state.currentView = mode;
    App.dom.viewSwitch.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === mode);
    });

    // App.dom.editor 和 preview 是兄弟元素，都在 App.dom.editorWrapper 内部
    const editorEl = App.dom.editor;  // .editor-content
    const previewEl = App.dom.previewContent;  // .preview-content

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
        if (App.state.currentFilePath) {
          App.markdown_source_editor.renderPreview();
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
        if (App.state.currentFilePath) {
          App.markdown_source_editor.renderPreview();
        }
        break;
    }

    localStorage.setItem('flowmark-view', mode);
  }

  function calculateReadingProgress() {
    if (!App.state.currentFilePath) {
      App.dom.readingProgress.textContent = '';
      return;
    }

    const text = App.dom.editor.innerText || '';
    const words = text.replace(/\s/g, '').length;
    const minutes = Math.ceil(words / 200); // 假设每分钟阅读200字
    App.dom.readingProgress.textContent = minutes > 0 ? `${minutes} 分钟阅读` : '';
  }

  function disableEditor() {
    App.dom.editor.contentEditable = 'false';
    App.dom.editor.style.opacity = '0.5';
    App.dom.editor.style.pointerEvents = 'none';
  }

  function enableEditor() {
    App.dom.editor.contentEditable = 'true';
    App.dom.editor.style.opacity = '1';
    App.dom.editor.style.pointerEvents = 'auto';
  }

  App.theme = {
    restoreUserSettings: restoreUserSettings,
    getCurrentTheme: getCurrentTheme,
    setTheme: setTheme,
    updateThemeUI: updateThemeUI,
    toggleThemeDropdown: toggleThemeDropdown,
    adjustZoom: adjustZoom,
    adjustFontSize: adjustFontSize,
    toggleReadingMode: toggleReadingMode,
    toggleFullscreen: toggleFullscreen,
    setViewMode: setViewMode,
    calculateReadingProgress: calculateReadingProgress,
    disableEditor: disableEditor,
    enableEditor: enableEditor,
  };

})(window.__App);