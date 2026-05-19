const fs = require('fs');
const glob = require('glob');

const domVars = [
  "currentMdView"
];

const stateVars = [
  "currentWorkspace","currentFilePath","currentFileName","currentFileContent",
  "saveTimeout","isSaving","isLoading","contextMenuTarget",
  "slashPanelVisible","slashSelectedIndex","slashFilter",
  "lastModifiedTime","fileWatcherInterval","assetsFolderPath",
  "savedWorkspaceTree","isPreviewMode","isOutlineEnabled","isReadingMode",
  "currentZoom","currentFontSize","currentView","currentTheme",
  "expandedFolders","savedCursorRange","isExitingCodeBlock"
];

const files = glob.sync("src/renderer/scripts/**/*.js", {
  ignore: ["**/app.js.bak", "**/app-new.js", "**/modules.js"]
});

let totalFixes = 0;

files.sort().forEach(file => {
  // Skip state.js itself - it defines the values
  if (file.includes("/core/state.js")) return;
  // Skip init.js - it was hand-written and correct
  if (file.includes("/core/init.js")) return;

  let content = fs.readFileSync(file, "utf8");
  let original = content;
  let lines = content.split("\n");
  let fixedLines = [];

  lines.forEach(line => {
    let newLine = line;

    // Fix state variable bare references
    stateVars.forEach(v => {
      // Replace bare assignments: varName = ... (not preceded by App.state.)
      // Match pattern: varName followed by =
      const assignPattern = new RegExp("(?<![\\w.])" + v + "\\s*=(?!=)", "g");
      newLine = newLine.replace(assignPattern, "App.state." + v + " =");

      // Replace bare reads that aren't assignments and aren't already prefixed
      // This is tricky - we need to replace reads like if(varname), varname.forEach, etc
      // But NOT lines like "App.state.varname" which are already correct
      // Strategy: replace ALL occurrences of the bare name, then fix double-prefixes
    });

    // Handle tricky cases: replace bare read/reference when NOT preceded by App.state. or App.dom.
    stateVars.forEach(v => {
      // First mark already-correct references
      newLine = newLine.replace(new RegExp("App\\.state\\." + v, "g"), "@@PROTECTED@@" + v);
      newLine = newLine.replace(new RegExp("App\\.dom\\." + v, "g"), "@@PROTECTED_DOM@@" + v);

      // Now replace remaining bare references
      const bareRe = new RegExp("\\b" + v + "\\b", "g");
      newLine = newLine.replace(bareRe, "App.state." + v);

      // Restore protected
      newLine = newLine.replace(new RegExp("@@PROTECTED@@App\\.state\\." + v, "g"), "App.state." + v);
      newLine = newLine.replace(new RegExp("@@PROTECTED@@" + v, "g"), "App.state." + v);
      newLine = newLine.replace(new RegExp("@@PROTECTED_DOM@@" + v, "g"), "App.dom." + v);

      // Fix export blocks: App.state.varname: App.state.varname → varname: varname
      newLine = newLine.replace(
        new RegExp("App\\.state\\." + v + "\\s*:\\s*App\\.state\\." + v),
        v + ": " + v
      );
    });

    // Fix DOM variable bare references
    domVars.forEach(v => {
      newLine = newLine.replace(new Reg("@@PROTECTED@" + v, "g"), "@@PROTECTED_SAFE@@" + v);
      newLine = newLine.replace(new RegExp("App\\.state\\." + v, "g"), "@@PROTECTED_DOM@@" + v);
      newLine = newLine.replace(new RegExp("App\\.dom\\." + v, "g"), "@@PROTECTED_DOM_SAFE@@" + v);

      const bareRe = new RegExp("\\b" + v + "\\b", "g");
      newLine = newLine.replace(bareRe, "App.dom." + v);

      newLine = newLine.replace(new RegExp("@@PROTECTED_SAFE@@" + v, "g"), v);
      newLine = newLine.replace(new RegExp("@@PROTECTED_DOM@@" + v, "g"), "App.dom." + v);
      newLine = newLine.replace(new RegExp("@@PROTECTED_DOM_SAFE@@" + v, "g"), "App.dom." + v);
    });

    fixedLines.push(newLine);
  });

  content = fixedLines.join("\n");

  // Undo any double/triple prefix issues
  content = content.replace(/App\.state\.App\.state\./g, "App.state.");
  content = content.replace(/App\.dom\.App\.dom\./g, "App.dom.");
  content = content.replace(/App\.state\.App\.dom\./g, "App.dom.");
  content = content.replace(/App\.dom\.App\.state\./g, "App.state.");

  // Undo export block pollution: App.state.varname: App.state.varname → varname: varname
  stateVars.forEach(v => {
    content = content.replace(
      new RegExp("App\\.state\\." + v + "\\s*:\\s*App\\.state\\." + v, "g"),
      v + ": " + v
    );
    content = content.replace(
      new RegExp("App\\.state\\." + v + "\\s*:\\s*" + v + "\\b", "g"),
      v + ": " + v
    );
  });

  // Clean up any leftover @@PROTECTED markers
  content = content.replace(/@@PROTECTED@@/g, "");
  content = content.replace(/@@PROTECTED_DOM@@/g, "");
  content = content.replace(/@@PROTECTED_DOM_SAFE@@/g, "");
  content = content.replace(/@@PROTECTED_SAFE@@/g, "");

  if (content !== original) {
    fs.writeFileSync(file, content, "utf8");
    const diffLines = content.split("\n").filter((l, i) => l !== original.split("\n")[i]).length;
    totalFixes++;
    console.log(`Fixed ${file} (~${diffLines} changed lines)`);
  }
});

console.log(`\nTotal: ${totalFixes} files modified`);