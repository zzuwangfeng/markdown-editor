const fs = require('fs');
const path = require('path');

// Read from backup to avoid self-corruption
const appCode = fs.readFileSync('src/renderer/scripts/app.js.bak', 'utf8');
const lines = appCode.split('\n');

// State variables
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

const replaceMap = {};
stateVars.forEach(v => { replaceMap[v] = `App.state.${v}`; });
domVars.forEach(v => { replaceMap[v] = `App.dom.${v}`; });
replaceMap['slashCommands'] = 'App.slashCommands';
replaceMap['icons'] = 'App.icons';

// Identify functions
const funcRanges = [];
lines.forEach((line, i) => {
  const m = line.match(/^\s{2}(async\s+)?function\s+(\w+)\(/);
  if (m) funcRanges.push({ name: m[2], start: i, end: -1 });
});

// Brace matching for function boundaries
for (let idx = 0; idx < funcRanges.length; idx++) {
  const start = funcRanges[idx].start;
  let depth = 0, found = false;
  for (let i = start; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      if (depth === 0 && ch === '}') { funcRanges[idx].end = i; found = true; break; }
    }
    if (found) break;
  }
  if (!found) funcRanges[idx].end = lines.length - 1;
}

// Module assignments (with corrected names)
const modules = {
  'core/events': ['bindEvents'],
  'core/init': ['init', 'doInit'],
  'core/global': ['debounce', 'handleGlobalKeydown', 'executeMenuCommand'],
  'editor/slash-commands': [
    'handleEditorInputForSlash', 'getTextBeforeCursor', 'showSlashPanel', 'hideSlashPanel',
    'renderSlashList', 'updateSlashSelection', 'executeSlashCommand', 'deleteSlashChar',
  ],
  'editor/code-block': ['insertCodeBlock', 'doInsertCodeBlock', 'exitCodeBlock', 'getLineInfo'],
  'editor/keyboard': ['handleEditorKeydown', 'navigateSlashPanel'],
  'editor/content': [
    'handleEditorInput', 'insertList', 'insertTodoList', 'insertBlockquote', 'insertHorizontalRule',
    'handlePaste', 'pasteImage', 'showImageProgress', 'hideImageProgress',
    'handleDragOver', 'handleDrop', 'handleEditorKeyup', 'handleKeyUp',
    'handleSelectionChange', 'showFormatToolbar', 'hideFormatToolbar',
    'updateToolbarActiveStates', 'handleFormatAction', 'handleFormat',
  ],
  'editor/insert-ops': [
    'insertHTMLAtCursor', 'insertHeading', 'insertPlainText', 'wrapSelection',
    'insertLink', 'insertImage', 'saveImageToAssets', 'generateUniqueImageName', 'generateImageFileName',
  ],
  'editor/insert-special': [
    'insertTable', 'showTableDialog', 'hideTableDialog', 'insertTableFromDialog', 'insertTableHtml',
  ],
  'file/file-tree': [
    'renderFileTreeFromData', 'restoreFolderExpansionFromCache',
    'refreshFileTree', 'restoreFolderExpansion', 'findItemByPath', 'createTreeItem',
    'toggleFolderExpand', 'handleTreeItemClick',
  ],
  'file/file-operations': [
    'saveWorkspaceToStorage', 'restorePersistentWorkspace', 'clearWorkspaceStorage',
    'openWorkspace', 'handleAddClick', 'hideDropdownMenu', 'handleDropdownAction',
    'createNewFile', 'openFileInEditor', 'createNewFolder',
    'checkItemExists', 'ensureAssetsFolder',
    'openFile', 'loadFile', 'saveCurrentFile', 'showSaveStatus',
    'openFileAtLine', 'openRecentFile',
    'updateEditorVisibility', 'syncSidebarSelection', 'convertImagePathsToRelative',
    'handleConflict', 'showConflictDialog', 'refreshFileTree',
  ],
  'file/file-watcher': ['startFileWatcher', 'checkFileChanges'],
  'ui/theme': [
    'restoreUserSettings', 'getCurrentTheme', 'setTheme', 'updateThemeUI', 'toggleThemeDropdown',
    'adjustZoom', 'adjustFontSize', 'toggleReadingMode', 'setViewMode',
    'calculateReadingProgress', 'disableEditor', 'enableEditor', 'toggleFullscreen',
  ],
  'ui/search': [
    'handleProjectSearch', 'renderProjectSearchResults', 'highlightMatch', 'escapeHtml',
    'clearProjectSearch', 'clearSearch', 'hideSearchPanel',
    'toggleSearchPanel', 'toggleProjectSearchPanel', 'hideProjectSearchPanel',
    'handleSearchInput', 'searchContent', 'renderSearchResults', 'scrollToSearchMatch',
  ],
  'ui/sidebar': [
    'toggleSidebar', 'handleSidebarSearchInput', 'searchFilesInTree',
    'renderSidebarSearchResults', 'clearSidebarSearch', 'switchSidebarTab',
    'renderRecentFiles', 'getRecentFiles', 'addToRecentFiles',
  ],
  'ui/panels': ['toggleOutline', 'showSettingsDialog', 'showAboutDialog', 'hideAboutDialog', 'handleMenuEvent'],
  'ui/table-context': ['handleTableContextMenu', 'handleTableContextAction', 'initTableResize'],
  'ui/context-menu': [
    'showContextMenu', 'hideContextMenu', 'handleContextMenuAction',
    'handleImageContextMenu', 'handleImageContextAction',
  ],
  'ui/dialogs': ['showDialog', 'hideDialog', 'confirmDialogInput', 'confirmDialog', 'showConfirm', 'hideConfirm'],
  'markdown/preview': ['convertImagePathsToAbsolute'],
  'markdown/source-editor': [
    'togglePreviewMode', 'togglePreview', 'renderPreview', 'updateOutline', 'updateStats',
    'toggleMdSourceView', 'switchMdView', 'updateLineNumbers', 'showMdSourceEditor', 'hideMdSourceEditor',
  ],
};

// Collect all assigned
const assignedFuncs = new Set();
Object.values(modules).forEach(arr => arr.forEach(f => assignedFuncs.add(f)));

// Check unassigned
const allFuncNames = new Set(funcRanges.map(f => f.name));
const unassigned = [...allFuncNames].filter(f => !assignedFuncs.has(f));
if (unassigned.length) console.log('WARNING - Unassigned: ' + unassigned.join(', '));

// Build function name -> module mapping
const funcModuleMap = {};
Object.entries(modules).forEach(([mod, funcs]) => {
  funcs.forEach(f => { funcModuleMap[f] = mod; });
});

// Helper: get module key (how functions are exported on App)
function getModuleKey(modName) {
  if (!modName || typeof modName !== 'string') return 'unknown';
  return modName.replace(/^core\//, 'core_')
    .replace(/^editor\//, 'editor_')
    .replace(/^file\//, 'file_')
    .replace(/^ui\//, '')
    .replace(/^markdown\//, 'markdown_')
    .replace(/\//g, '_').replace(/-/g, '_');
}

// Build cross-module call map
// For each function call within a module, check if it's a function in another module
function findCalledFunctions(funcBody) {
  const called = new Set();
  const regex = /\b([a-zA-Z_]\w*)\s*\(/g;
  let match;
  while ((match = regex.exec(funcBody)) !== null) {
    called.add(match[1]);
  }
  return called;
}

// Generate module files
const scriptDir = 'src/renderer/scripts';
let totalLines = 0;

for (const [modName, funcNames] of Object.entries(modules)) {
  const moduleFuncs = funcRanges.filter(f => funcNames.includes(f.name));
  if (moduleFuncs.length === 0) continue;

  // Get all function bodies
  const funcBodies = [];
  const funcLocalSet = new Set(funcNames);

  moduleFuncs.forEach(f => {
    const rawFunc = lines.slice(f.start, f.end + 1).join('\n');
    funcBodies.push(rawFunc);
  });

  const joined = funcBodies.join('\n\n');

  // Apply variable replacements
  let transformed = joined;
  const allVars = [...stateVars, ...domVars, 'slashCommands', 'icons'];
  allVars.sort((a, b) => b.length - a.length);

  allVars.forEach(varName => {
    const replacement = replaceMap[varName];
    if (!replacement) return;
    const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match variable as whole word, but NOT when it's being assigned to (LHS)
    // Skip: var xxx =, let xxx =, const xxx =, xxx =, xxx;
    const regex = new RegExp(
      '(?<![\\w.])' + escaped + '(?![\\w])(?!\\s*=\\s*[^=])',
      'g'
    );
    transformed = transformed.replace(regex, replacement);
  });

  // Now handle cross-module function calls
  // Functions in this module that call functions defined in OTHER modules
  const calledFuncs = findCalledFunctions(transformed);
  const externalCalls = [...calledFuncs].filter(f => {
    return funcModuleMap[f] && funcModuleMap[f] !== modName && !funcLocalSet.has(f);
  });

  if (externalCalls.length > 0) {
    externalCalls.forEach(fn => {
      try {
        const targetMod = funcModuleMap[fn];
        if (!targetMod || typeof targetMod !== 'string') return;
        const targetKey = getModuleKey(targetMod);
        const replacement = `App.${targetKey}.${fn}`;
        const fnEscaped = fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp('(?<!App\\.\\w*\\.)' + fnEscaped + '\\s*\\(', 'g');
        transformed = transformed.replace(regex, replacement + '(');
      } catch(e) {
        // skip cross-module calls that can't be resolved
      }
    });
  }

  // Build module file
  const key = getModuleKey(modName);
  const moduleLines = [];
  moduleLines.push(`// FlowMark - ${modName}`);
  moduleLines.push(`(function(App) {`);
  moduleLines.push(`  'use strict';`);
  moduleLines.push(``);
  moduleLines.push(transformed);
  moduleLines.push(``);
  moduleLines.push(`  App.${key} = {`);
  moduleFuncs.forEach(f => {
    moduleLines.push(`    ${f.name}: ${f.name},`);
  });
  moduleLines.push(`  };`);
  moduleLines.push(``);
  moduleLines.push(`})(window.__App);`);

  const filePath = path.join(scriptDir, modName + '.js');
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(filePath, moduleLines.join('\n'));
  totalLines += moduleLines.length;
  console.log(`  ${modName}.js (${moduleFuncs.length}f, ${moduleLines.length}L)`);
  if (externalCalls.length) console.log(`    ↳ cross-module: ${externalCalls.join(', ')}`);
}

// Generate app.js entry
const modKeys = Object.keys(modules).map(m => getModuleKey(m));
const appLines = [];
appLines.push('// FlowMark Editor - 入口文件');
appLines.push('// 模块架构: state → converter → 各模块 → 本文件');
appLines.push("(function() {");
appLines.push("  'use strict';");
appLines.push('');
appLines.push('  const App = window.__App;');
appLines.push('');
appLines.push('  async function init() {');
appLines.push("    if (document.readyState === 'loading') {");
appLines.push("      document.addEventListener('DOMContentLoaded', App.core_init.doInit);");
appLines.push('    } else {');
appLines.push('      App.core_init.doInit();');
appLines.push('    }');
appLines.push('  }');
appLines.push('');
appLines.push('  init();');
appLines.push('');
appLines.push('})();');

fs.writeFileSync(path.join(scriptDir, 'app.js'), appLines.join('\n'));
console.log(`\n  app.js (${appLines.length}L) - entry point`);
console.log(`\nTotal: ${totalLines}L across ${Object.keys(modules).length} modules`);
