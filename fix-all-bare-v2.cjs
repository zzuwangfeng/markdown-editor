const fs = require('fs');
const glob = require('glob');

const allVars = {
  state: [
    "currentWorkspace","currentFilePath","currentFileName","currentFileContent",
    "saveTimeout","isSaving","isLoading","contextMenuTarget",
    "slashPanelVisible","slashSelectedIndex","slashFilter",
    "lastModifiedTime","fileWatcherInterval","assetsFolderPath",
    "savedWorkspaceTree","isPreviewMode","isOutlineEnabled","isReadingMode",
    "currentZoom","currentFontSize","currentView","currentTheme",
    "expandedFolders","savedCursorRange","isExitingCodeBlock"
  ],
  dom: [
    "currentMdView","imageContextTarget","tableContextTarget"
  ]
};

const skipFiles = ["**/app.js.bak", "**/app-new.js", "**/modules.js", "**/core/state.js", "**/core/init.js"];
const files = glob.sync("src/renderer/scripts/**/*.js", { ignore: skipFiles });

let allIssues = [];
let totalFixes = 0;

files.sort().forEach(file => {
  let content = fs.readFileSync(file, "utf8");
  let modified = false;

  // For each state variable
  for (const v of allVars.state) {
    const prefix = "App.state.";
    // Match bare v only when NOT preceded by App.state. or App.dom. or letter/dot
    // Use a simpler approach: split on known-good patterns and fix the rest
    const re = new RegExp("(?<![\\w.])(" + v + ")(?![\\w])", "g");
    
    let newContent = content.replace(re, (match, capture, offset) => {
      // Check context before the match
      const before = content.substring(Math.max(0, offset - 20), offset);
      const after = content.substring(offset + match.length, offset + match.length + 5);
      
      // Skip if preceded by App.state. or App.dom.
      if (/App\.(state|dom)\.$/.test(before)) return match;
      // Skip if followed by : (export block key or object key)
      if (/^\s*:/.test(after) && !/=\s*$/.test(before.trimEnd())) return match;
      // Skip function definition
      if (/function\s+$/.test(before.trimEnd())) return match;
      // Skip if in App.state = { or App.dom = { block
      if (/App\.(state|dom)\s*=\s*\{/.test(before)) return match;
      // Skip single-line comments
      if (before.includes("//")) return match;
      
      // This is a bare reference - fix it
      return prefix + match;
    });

    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }

  // For DOM variables
  for (const v of allVars.dom) {
    const prefix = "App.dom.";
    const re = new RegExp("(?<![\\w.])(" + v + ")(?![\\w])", "g");

    let newContent = content.replace(re, (match, capture, offset) => {
      const before = content.substring(Math.max(0, offset - 20), offset);
      const after = content.substring(offset + match.length, offset + match.length + 5);

      if (/App\.(state|dom)\.$/.test(before)) return match;
      if (/^\s*:/.test(after) && !/=\s*$/.test(before.trimEnd())) return match;
      if (/function\s+$/.test(before.trimEnd())) return match;
      if (/App\.(state|dom)\s*=\s*\{/.test(before)) return match;
      if (before.includes("//")) return match;

      return prefix + match;
    });

    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }

  // Undo any double prefix
  content = content.replace(/App\.state\.App\.state\./g, "App.state.");
  content = content.replace(/App\.dom\.App\.dom\./g, "App.dom.");
  content = content.replace(/App\.state\.App\.dom\./g, "App.dom.");
  content = content.replace(/App\.dom\.App\.state\./g, "App.state.");

  // Undo export block pollution: convert App.state.varname: App.state.varname back
  for (const v of allVars.state) {
    content = content.replace(
      new RegExp("App\\.state\\." + v + "\\s*:\\s*App\\.state\\." + v, "g"),
      v + ": " + v
    );
    content = content.replace(
      new RegExp("App\\.state\\." + v + "\\s*:\\s*" + v + "\\b", "g"),
      v + ": " + v
    );
  }
  for (const v of allVars.dom) {
    content = content.replace(
      new RegExp("App\\.dom\\." + v + "\\s*:\\s*App\\.dom\\." + v, "g"),
      v + ": " + v
    );
  }

  if (modified) {
    fs.writeFileSync(file, content, "utf8");
    console.log("Fixed: " + file);
    totalFixes++;
  }
});

console.log(`\nTotal files modified: ${totalFixes}`);