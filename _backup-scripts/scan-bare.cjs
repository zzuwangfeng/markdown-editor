const fs = require('fs');
const glob = require('glob');

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

files.sort().forEach(file => {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, idx) => {
    const lineno = idx + 1;
    stateVars.forEach(v => {
      if (!line.includes(v)) return;
      if (line.includes("App.state." + v) || line.includes("App.dom." + v)) return;
      // Skip export block lines like "varname: varname"
      if (new RegExp("\\b" + v + "\\s*:").test(line)) return;
      // Skip lines that define the function with same name
      if (new RegExp("function\\s+" + v + "\\b").test(line)) return;
      // Skip state/dom definition blocks
      if (line.includes("App.state = {") || line.includes("App.dom = {")) return;
      if (/^\s*\/\//.test(line)) return;

      const trimmed = line.trim();
      if (trimmed.length === 0) return;

      console.log(file + ":" + lineno + ": " + trimmed.substring(0, 120));
    });
  });
});