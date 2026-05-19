const fs = require('fs');

const stateVars = [
  'currentWorkspace', 'currentFilePath', 'currentFileName', 'currentFileContent',
  'saveTimeout', 'isSaving', 'isLoading', 'contextMenuTarget',
  'slashPanelVisible', 'slashSelectedIndex', 'slashFilter',
  'lastModifiedTime', 'fileWatcherInterval', 'assetsFolderPath',
  'savedWorkspaceTree', 'isPreviewMode', 'isOutlineEnabled', 'isReadingMode',
  'currentZoom', 'currentFontSize', 'currentView', 'currentTheme',
  'expandedFolders', 'savedCursorRange', 'isExitingCodeBlock'
];

const domVars = [
  'sidebar', 'fileTree', 'emptyState', 'workspaceName', 'recentList', 'recentEmpty',
  'btnAdd', 'dropdownMenu', 'editor', 'editorPlaceholder',
  'editorWrapper', 'editorWelcome',
  'currentFileNameEl', 'saveStatus', 'wordCount', 'lineInfo', 'fileHeaderHint', 'fileHeaderTitle',
  'outlineList', 'contextMenu', 'formatToolbar',
  'imageContextMenu', 'imageContextTarget',
  'tableContextMenu', 'tableContextTarget',
  'slashPanel', 'slashList',
  'conflictOverlay', 'conflictMessage',
  'tableDialogOverlay', 'imageProgress',
  'previewContent',
  'dialogOverlay', 'dialogTitle', 'dialogInput',
  'dialogCancel', 'dialogConfirm',
  'confirmOverlay', 'confirmTitle', 'confirmMessage', 'confirmCancel', 'confirmOk',
  'aboutOverlay', 'aboutClose',
  'toolbar', 'zoomLevel', 'fontSizeDisplay', 'readingProgress',
  'btnZoomDecrease', 'btnZoomIncrease',
  'btnReadingMode', 'btnOutline', 'btnSearch', 'btnFullscreen', 'btnRefresh',
  'btnFontDecrease', 'btnFontIncrease',
  'btnTheme', 'themeDropdown', 'btnToggleSidebar',
  'viewSwitch', 'searchPanel', 'searchInput', 'searchResults', 'searchClose', 'searchClear', 'searchInfo',
  'sidebarTabs',
  'sidebarSearch', 'sidebarSearchInput', 'sidebarSearchClear',
  'searchPanelProject', 'searchInputProject', 'searchCloseProject', 'searchResultsProject', 'searchInfoProject', 'searchClearProject',
  'mdViewToggle', 'mdViewBtns', 'mdSourceEditor', 'mdSourceTextarea', 'mdSourceLineNumbers',
  'currentMdView'
];

// Build category map: varName -> 'state' or 'dom'
const categoryMap = {};
stateVars.forEach(v => { categoryMap[v] = 'state'; });
domVars.forEach(v => { categoryMap[v] = 'dom'; });
const allVars = [...stateVars, ...domVars];
allVars.sort((a, b) => b.length - a.length);

const dirs = ['core', 'editor', 'file', 'ui', 'markdown'];

dirs.forEach(dir => {
  const dpath = 'src/renderer/scripts/' + dir;
  if (!fs.existsSync(dpath)) return;
  fs.readdirSync(dpath).forEach(file => {
    if (!file.endsWith('.js') || file === 'app.js.bak' || file === 'modules.js') return;
    const filePath = dpath + '/' + file;
    let code = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Fix: replace bare assignments like "varName = value" but NOT "const/let/var varName ="
    allVars.forEach(varName => {
      const cat = categoryMap[varName];
      const prefix = cat === 'state' ? 'App.state.' : 'App.dom.';
      const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Match "varName =" or "varName=" that is NOT preceded by const/let/var
      const regex = new RegExp(
        '(?<!(const|let|var|\.)\\s)' + escaped + '\\s*=(?!=)',
        'g'
      );
      const newCode = code.replace(regex, prefix + varName + ' =');
      if (newCode !== code) {
        code = newCode;
        changed = true;
      }
    });

    if (changed) {
      fs.writeFileSync(filePath, code);
      console.log('FIXED: ' + filePath.replace('src/renderer/scripts/', ''));
    }
  });
});

console.log('\nDone!');
