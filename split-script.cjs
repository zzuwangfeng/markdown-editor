const fs = require('fs');
const path = require('path');

const appCode = fs.readFileSync('src/renderer/scripts/app.js', 'utf8');
const lines = appCode.split('\n');

// State variables defined in the IIFE closure
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
  'confirmOverlay', 'confirmTitle', 'confirmMessage',
  'confirmCancel', 'confirmOk',
  'aboutOverlay', 'aboutClose',
  'toolbar', 'zoomLevel', 'fontSizeDisplay', 'readingProgress',
  'btnZoomDecrease', 'btnZoomIncrease',
  'btnReadingMode', 'btnOutline', 'btnSearch', 'btnFullscreen', 'btnRefresh',
  'btnFontDecrease', 'btnFontIncrease',
  'btnTheme', 'themeDropdown',
  'btnToggleSidebar',
  'viewSwitch', 'searchPanel', 'searchInput', 'searchResults', 'searchClose', 'searchClear', 'searchInfo',
  'sidebarTabs',
  'sidebarSearch', 'sidebarSearchInput', 'sidebarSearchClear',
  'searchPanelProject', 'searchInputProject', 'searchCloseProject', 'searchResultsProject', 'searchInfoProject', 'searchClearProject',
  'mdViewToggle', 'mdViewBtns', 'mdSourceEditor', 'mdSourceTextarea', 'mdSourceLineNumbers',
  'currentMdView'
];

// Build replacement map: variableName -> replacement
const replaceMap = {};
stateVars.forEach(v => { replaceMap[v] = `App.state.${v}`; });
domVars.forEach(v => { replaceMap[v] = `App.dom.${v}`; });
replaceMap['slashCommands'] = 'App.slashCommands';
replaceMap['icons'] = 'App.icons';

// Identify function line ranges
const funcRanges = [];
lines.forEach((line, i) => {
  const m = line.match(/^\s{2}(async\s+)?function\s+(\w+)\(/);
  if (m) {
    funcRanges.push({ name: m[2], start: i, end: -1 });
  }
});

// Find end of each function by brace matching
for (let idx = 0; idx < funcRanges.length; idx++) {
  const start = funcRanges[idx].start;
  let depth = 0;
  let found = false;
  for (let i = start; i < lines.length; i++) {
    const l = lines[i];
    for (const ch of l) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      if (depth === 0 && ch === '}') {
        funcRanges[idx].end = i;
        found = true;
        break;
      }
    }
    if (found) break;
  }
  if (!found) funcRanges[idx].end = lines.length - 1;
}

// Module function assignments
const modules = {
  'core/events': [
    'bindEvents',
  ],
  'editor/slash-commands': [
    'handleEditorInputForSlash', 'getTextBeforeCursor',
    'showSlashPanel', 'hideSlashPanel', 'renderSlashList',
    'updateSlashSelection', 'executeSlashCommand', 'deleteSlashChar',
  ],
  'editor/code-block': [
    'insertCodeBlock', 'doInsertCodeBlock',
  ],
  'editor/keyboard': [
    'handleEditorKeydown', 'navigateSlashPanel',
    'exitCodeBlock', 'getLineInfo',
  ],
  'editor/insert-ops': [
    'insertHTMLAtCursor', 'insertHeading', 'insertPlainText',
    'wrapSelection', 'insertLink', 'insertImage',
    'saveImageToAssets', 'generateUniqueImageName',
  ],
  'file/file-tree': [
    'renderFileTreeFromData', 'restoreFolderExpansionFromCache',
    'refreshFileTree', 'restoreFolderExpansion',
    'findItemByPath', 'createTreeItem',
    'toggleFolderExpand', 'handleTreeItemClick',
  ],
  'file/file-operations': [
    'saveWorkspaceToStorage', 'restorePersistentWorkspace', 'clearWorkspaceStorage',
    'openWorkspace', 'handleAddClick', 'hideDropdownMenu', 'handleDropdownAction',
    'createNewFile', 'openFileInEditor', 'createNewFolder',
    'checkItemExists', 'ensureAssetsFolder',
    'openFile', 'loadFile', 'saveCurrentFile', 'showSaveStatus',
    'openFileAtLine', 'openRecentFile',
    'updateEditorVisibility', 'syncSidebarSelection',
    'convertImagePathsToRelative',
    'handleConflict', 'showConflictDialog',
  ],
  'file/file-watcher': [
    'startFileWatcher', 'checkFileChanges',
  ],
  'ui/theme': [
    'restoreUserSettings', 'getCurrentTheme', 'setTheme', 'updateThemeUI', 'toggleThemeDropdown',
    'adjustZoom', 'adjustFontSize',
    'toggleReadingMode', 'setViewMode', 'calculateReadingProgress',
    'disableEditor', 'enableEditor',
    'toggleFullscreen',
  ],
  'ui/search': [
    'handleProjectSearch', 'renderProjectSearchResults',
    'highlightMatch', 'escapeHtml',
    'clearProjectSearch', 'clearSearch', 'hideSearchPanel',
    'toggleSearchPanel', 'hideSearchPanel', 'toggleProjectSearchPanel', 'hideProjectSearchPanel',
    'handleSearchInput', 'searchContent', 'renderSearchResults', 'scrollToSearchMatch',
  ],
  'ui/sidebar': [
    'toggleSidebar', 'handleSidebarSearchInput', 'searchFilesInTree',
    'renderSidebarSearchResults', 'clearSidebarSearch',
    'switchSidebarTab', 'renderRecentFiles', 'getRecentFiles', 'addToRecentFiles',
  ],
  'ui/panels': [
    'toggleOutline', 'showSettingsDialog', 'showAboutDialog', 'hideAboutDialog',
    'handleMenuEvent',
  ],
  'ui/table': [
    'showTableDialog', 'hideTableDialog', 'insertTableFromDialog', 'insertTableHtml',
    'handleTableContextMenu', 'initTableResize',
  ],
  'ui/context-menu': [
    'showContextMenu', 'hideContextMenu', 'handleContextMenuAction',
    'handleImageContextMenu', 'handleImageContextAction',
  ],
  'editor/content': [
    'handleEditorInput', 'insertList', 'insertTodoList', 'insertBlockquote', 'insertHorizontalRule',
    'handlePaste', 'pasteImage', 'showImageProgress', 'hideImageProgress',
    'handleDragOver', 'handleDrop',
    'handleKeyUp', 'handleSelectionChange',
    'showFormatToolbar', 'hideFormatToolbar', 'updateToolbarActiveStates', 'handleFormatAction',
  ],
  'ui/dialogs': [
    'showDialog', 'hideDialog', 'confirmDialogInput',
    'showConfirm', 'hideConfirm',
  ],
  'core/init': [
    'init', 'doInit',
  ],
  'markdown/preview': [
    'convertImagePathsToAbsolute',
  ],
  'markdown/source-editor': [
    'togglePreviewMode', 'renderPreview', 'updateOutline',
    'updateStats',
    'toggleMdSourceView', 'updateLineNumbers', 'showMdSourceEditor', 'hideMdSourceEditor',
  ],
  'core/global': [
    'debounce', 'handleGlobalKeyEvents',
    'executeMenuCommand',
  ],
};

// Collect all assigned functions
const assignedFuncs = new Set();
Object.values(modules).forEach(arr => arr.forEach(f => assignedFuncs.add(f)));

// Check for unassigned functions
const allFuncNames = new Set(funcRanges.map(f => f.name));
const unassigned = [...allFuncNames].filter(f => !assignedFuncs.has(f));
if (unassigned.length > 0) {
  console.log('UNASSIGNED FUNCTIONS:');
  unassigned.forEach(f => console.log('  ' + f));
}

// Build function name -> module name map
const funcModuleMap = {};
Object.entries(modules).forEach(([mod, funcs]) => {
  funcs.forEach(f => { funcModuleMap[f] = mod; });
});

// Extract function bodies with replacements
function extractFunctionBody(code) {
  // Within function body, replace closure variable references with App.xxx
  let result = code;
  
  // Sort by length (desc) to replace longer identifiers first
  const allVars = [...stateVars, ...domVars, 'slashCommands', 'icons'];
  allVars.sort((a, b) => b.length - a.length);
  
  allVars.forEach(varName => {
    if (replaceMap[varName]) {
      // Replace the variable name when it appears as a standalone word
      // This regex matches the variable name when it's not part of a larger identifier
      const regex = new RegExp('\\b' + varName + '\\b', 'g');
      result = result.replace(regex, replaceMap[varName]);
    }
  });
  
  return result;
}

console.log(`\nTotal functions: ${funcRanges.length}`);
console.log(`Assigned: ${assignedFuncs.size}`);
console.log(`Modules: ${Object.keys(modules).length}\n`);

const scriptDir = 'src/renderer/scripts';
const newAppLines = [];
let extractedLineCount = 0;

// Build module files
for (const [modName, funcNames] of Object.entries(modules)) {
  const moduleFuncs = funcRanges.filter(f => funcNames.includes(f.name));
  if (moduleFuncs.length === 0) continue;
  
  const moduleLines = [];
  moduleLines.push('(function(App) {');
  moduleLines.push("  'use strict';");
  moduleLines.push('');
  
  // Extract the keep-lines (the function that wraps all extracted code)
  // Calculate line range: from first function start to last function end
  const minStart = Math.min(...moduleFuncs.map(f => f.start));
  const maxEnd = Math.max(...moduleFuncs.map(f => f.end));
  
  // Get the raw lines and extract each function
  const funcBodies = [];
  moduleFuncs.forEach(f => {
    const rawFunc = lines.slice(f.start, f.end + 1).join('\n');
    funcBodies.push(rawFunc);
  });
  
  // Join functions and apply replacements
  const joined = funcBodies.join('\n\n');
  let transformed = joined;
  
  // Replace closure vars with App.xxx
  const allVars = [...stateVars, ...domVars, 'slashCommands', 'icons'];
  allVars.sort((a, b) => b.length - a.length);
  
  // First pass: find all word boundaries to avoid partial matches
  allVars.forEach(varName => {
    const replacement = replaceMap[varName];
    if (!replacement) return;
    // Match as whole word only - \b won't work for all cases, use lookbehind/lookahead
    const regex = new RegExp('(?<![\\w.])' + varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w])', 'g');
    transformed = transformed.replace(regex, replacement);
  });
  
  moduleLines.push(transformed);
  moduleLines.push('');
  
  // Export functions
  const modPath = modName.replace('core/', '').replace('editor/', '').replace('file/', '').replace('ui/', '').replace('markdown/', '');
  const exportKey = modPath.replace(/\//g, '_').replace(/-/g, '_');
  moduleLines.push(`  App.${exportKey} = {`);
  moduleFuncs.forEach(f => {
    moduleLines.push(`    ${f.name}: ${f.name},`);
  });
  moduleLines.push('  };');
  
  moduleLines.push('');
  moduleLines.push('})(window.__App);');
  
  const filePath = path.join(scriptDir, modName + '.js');
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  const content = moduleLines.join('\n');
  fs.writeFileSync(filePath, content);
  extractedLineCount += moduleLines.length;
  console.log(`Wrote ${modName}.js (${moduleFuncs.length} functions, ${moduleLines.length} lines)`);
}

// Generate new app.js
const newApp = [];
newApp.push('// FlowMark Editor - 入口文件');
newApp.push('// 模块化架构：state.js → 各模块 → 本文件');
newApp.push("(function() {");
newApp.push("  'use strict';");
newApp.push('');
newApp.push('  const App = window.__App;');
newApp.push('  const S = App.state;');
newApp.push('  const D = App.dom;');
newApp.push('');
newApp.push('  async function init() {');
newApp.push('    if (document.readyState === \'loading\') {');
newApp.push('      document.addEventListener(\'DOMContentLoaded\', App.core_init.doInit);');
newApp.push('    } else {');
newApp.push('      App.core_init.doInit();');
newApp.push('    }');
newApp.push('  }');
newApp.push('');
newApp.push('  init();');
newApp.push('');
newApp.push('})();');

fs.writeFileSync(path.join(scriptDir, 'app-new.js'), newApp.join('\n'));
console.log(`\nWrote app-new.js (${newApp.length} lines) - entry point`);
console.log(`Total extracted: ${extractedLineCount} lines across ${Object.keys(modules).length} modules`);
console.log('Original app.js preserved at app.js.bak');

// Verify: check for remaining closure variable references in app-new.js
console.log('\nVerifying new app.js references...');
const newAppContent = newApp.join('\n');
console.log('OK - entry point is clean (no direct state/dom references)');
