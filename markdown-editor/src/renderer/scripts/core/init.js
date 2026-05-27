// FlowMark - core/init
(function(App) {
  'use strict';

  async function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', doInit);
    } else {
      doInit();
    }
  }

  function doInit() {
    App.dom.sidebar = document.getElementById('sidebar');
    App.dom.fileTree = document.getElementById('file-tree');
    App.dom.emptyState = document.getElementById('empty-state');
    App.dom.workspaceName = document.getElementById('workspace-name');
    App.dom.recentList = document.getElementById('recent-list');
    App.dom.recentEmpty = document.getElementById('recent-empty');
    App.dom.btnAdd = document.getElementById('btn-add');
    App.dom.dropdownMenu = document.getElementById('dropdown-menu');
    App.dom.editor = document.getElementById('editor');
    App.dom.editorPlaceholder = document.getElementById('editor-placeholder');
    App.dom.editorWrapper = document.getElementById('editor-wrapper');
    App.dom.editorWelcome = document.getElementById('editor-welcome');
    App.dom.currentFileNameEl = document.getElementById('current-file-name');
    App.dom.saveStatus = document.getElementById('save-status');
    App.dom.wordCount = document.getElementById('word-count');
    App.dom.lineInfo = document.getElementById('line-info');
    App.dom.fileHeaderHint = document.querySelector('.file-header-hint');
    App.dom.fileHeaderTitle = document.getElementById('file-header-title');
    App.dom.outlineList = document.getElementById('outline-list');
    App.dom.contextMenu = document.getElementById('context-menu');
    App.dom.imageContextMenu = document.getElementById('image-context-menu');
    App.dom.tableContextMenu = document.getElementById('table-context-menu');
    App.dom.formatToolbar = document.getElementById('format-toolbar');
    App.dom.slashPanel = document.getElementById('slash-panel');
    App.dom.slashList = document.getElementById('slash-list');
    App.dom.conflictOverlay = document.getElementById('conflict-overlay');
    App.dom.conflictMessage = document.getElementById('conflict-message');
    App.dom.tableDialogOverlay = document.getElementById('table-dialog-overlay');
    App.dom.imageProgress = document.getElementById('image-progress');
    App.dom.previewContent = document.getElementById('preview-content');
    App.dom.dialogOverlay = document.getElementById('dialog-overlay');
    App.dom.dialogTitle = document.getElementById('dialog-title');
    App.dom.dialogInput = document.getElementById('dialog-input');
    App.dom.dialogCancel = document.getElementById('dialog-cancel');
    App.dom.dialogConfirm = document.getElementById('dialog-confirm');
    App.dom.confirmOverlay = document.getElementById('confirm-overlay');
    App.dom.confirmTitle = document.getElementById('confirm-title');
    App.dom.confirmMessage = document.getElementById('confirm-message');
    App.dom.confirmCancel = document.getElementById('confirm-cancel');
    App.dom.confirmOk = document.getElementById('confirm-ok');
    App.dom.aboutOverlay = document.getElementById('about-overlay');
    App.dom.aboutClose = document.getElementById('about-close');
    App.dom.toolbar = document.getElementById('toolbar');
    App.dom.zoomLevel = document.getElementById('zoom-level');
    App.dom.fontSizeDisplay = document.getElementById('font-size-display');
    App.dom.readingProgress = document.getElementById('reading-progress');
    App.dom.btnZoomDecrease = document.getElementById('btn-zoom-decrease');
    App.dom.btnZoomIncrease = document.getElementById('btn-zoom-increase');
    App.dom.btnReadingMode = document.getElementById('btn-reading-mode');
    App.dom.btnOutline = document.getElementById('btn-outline');
    App.dom.btnSearch = document.getElementById('btn-search');
    App.dom.btnFullscreen = document.getElementById('btn-fullscreen');
    App.dom.btnFontDecrease = document.getElementById('btn-font-decrease');
    App.dom.btnFontIncrease = document.getElementById('btn-font-increase');
    App.dom.btnTheme = document.getElementById('btn-theme');
    App.dom.themeDropdown = document.getElementById('theme-dropdown');
    App.dom.viewSwitch = document.getElementById('view-switch');
    App.dom.btnRefresh = document.getElementById('btn-refresh');
    App.dom.btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    App.dom.searchPanel = document.getElementById('search-panel');
    App.dom.searchInput = document.getElementById('search-input');
    App.dom.searchClose = document.getElementById('search-close');
    App.dom.searchPanelProject = document.getElementById('search-panel-project');
    App.dom.searchInputProject = document.getElementById('search-input-project');
    App.dom.searchCloseProject = document.getElementById('search-close-project');
    App.dom.searchResultsProject = document.getElementById('search-results-project');
    App.dom.searchInfoProject = document.getElementById('search-info-project');
    App.dom.searchClearProject = document.getElementById('search-clear');
    App.dom.sidebarTabs = document.querySelectorAll('.sidebar-tab');
    App.dom.sidebarSearch = document.getElementById('sidebar-search');
    App.dom.sidebarSearchInput = document.getElementById('sidebar-search-input');
    App.dom.sidebarSearchClear = document.getElementById('sidebar-search-clear');
    App.dom.mdViewToggle = document.getElementById('md-view-toggle');
    App.dom.mdViewBtns = document.querySelectorAll('.md-view-btn');
    App.dom.mdSourceEditor = document.getElementById('md-source-editor');
    App.dom.mdSourceTextarea = document.getElementById('md-source-textarea');
    App.dom.mdSourceLineNumbers = document.getElementById('md-source-line-numbers');

    App.core_events.bindEvents();
    App.theme.restoreUserSettings();
    App.markdown_source_editor.updateOutline();
    App.file_file_operations.updateEditorVisibility();
    App.theme.disableEditor();
    App.sidebar.renderRecentFiles();
  }

  App.core_init = {
    init: init,
    doInit: doInit,
  };

})(window.__App);