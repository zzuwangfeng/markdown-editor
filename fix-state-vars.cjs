const fs = require('fs');
const glob = require('glob');

// Map of state variable → safe replacement rules per file
// Format: { filePattern: [{ from: regex, to: string }] }

const replacements = {
  // Theme state variables in theme.js
  "src/renderer/scripts/ui/theme.js": [
    { regex: /\bisPreviewMode\s*=\s*true\b/, to: "App.state.isPreviewMode = true" },
    { regex: /\bisOutlineEnabled\s*=\s*true\b/, to: "App.state.isOutlineEnabled = true" },
    { regex: /\bisOutlineEnabled\s*=\s*false\b/, to: "App.state.isOutlineEnabled = false" },
    { regex: /\bcurrentTheme\s*=\s*savedTheme\b/, to: "App.state.currentTheme = savedTheme" },
    { regex: /\bcurrentFontSize\s*=\s*parseInt\(savedFontSize\)/, to: "App.state.currentFontSize = parseInt(savedFontSize)" },
    { regex: /\bcurrentZoom\s*=\s*parseInt\(savedZoom\)/, to: "App.state.currentZoom = parseInt(savedZoom)" },
    { regex: /\bcurrentTheme\s*=\s*theme;/, to: "App.state.currentTheme = theme;" },
    { regex: /\bcurrentView\s*=\s*mode\b/, to: "App.state.currentView = mode" },
  ],
  // File operations
  "src/renderer/scripts/file/file-operations.js": [
    { regex: /\bexpandedFolders\b/g, to: "App.state.expandedFolders" },
    { regex: /\bsavedWorkspaceTree\b/g, to: "App.state.savedWorkspaceTree" },
    { regex: /\blastModifiedTime\b/g, to: "App.state.lastModifiedTime" },
    { regex: /\bcurrentFileContent\b/g, to: "App.state.currentFileContent" },
  ],
  "src/renderer/scripts/file/file-tree.js": [
    { regex: /\bsavedWorkspaceTree\b/g, to: "App.state.savedWorkspaceTree" },
    { regex: /\bexpandedFolders\b/g, to: "App.state.expandedFolders" },
  ],
  "src/renderer/scripts/file/file-watcher.js": [
    { regex: /\bfileWatcherInterval\b/g, to: "App.state.fileWatcherInterval" },
  ],
  "src/renderer/scripts/ui/context-menu.js": [
    { regex: /\bcontextMenuTarget\b/g, to: "App.state.contextMenuTarget" },
    { regex: /\bcurrentFileName\s*=\s*null\b/, to: "App.state.currentFileName = null" },
  ],
  "src/renderer/scripts/editor/code-block.js": [
    { regex: /\bisExitingCodeBlock\b/g, to: "App.state.isExitingCodeBlock" },
  ],
  "src/renderer/scripts/editor/content.js": [
    { regex: /\bsaveTimeout\b/g, to: "App.state.saveTimeout" },
  ],
};

let totalChanges = 0;

for (const [file, rules] of Object.entries(replacements)) {
  let content = fs.readFileSync(file, 'utf8');
  let fileChanges = 0;

  for (const rule of rules) {
    const before = content;
    content = content.replace(rule.regex, rule.to);
    if (content !== before) fileChanges++;
  }

  if (fileChanges > 0) {
    // Undo any double-prefix: App.state.App.state.xxx
    content = content.replace(/App\.state\.App\.state\./g, 'App.state.');
    // Undo export block pollution
    content = content.replace(/App\.state\.(\w+):\s*App\.state\.\1/g, 'App.state.$1: $1');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed ${file} (${fileChanges} changes)`);
    totalChanges += fileChanges;
  }
}

console.log(`\nTotal: ${totalChanges} replacements across ${Object.keys(replacements).length} files`);