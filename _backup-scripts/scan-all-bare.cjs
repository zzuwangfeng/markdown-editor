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

const files = glob.sync("src/renderer/scripts/**/*.js", {
  ignore: ["**/app.js.bak", "**/app-new.js", "**/modules.js", "**/core/state.js", "**/core/init.js"]
});

// For each file, find all lines with bare references
let allIssues = [];

files.sort().forEach(file => {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, idx) => {
    const lineno = idx + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) return;

    // Check state vars
    for (const v of allVars.state) {
      if (!line.includes(v)) continue;
      // Already has prefix
      if (line.includes("App.state." + v)) continue;
      // Export block entries
      if (new RegExp("\\b" + v + "\\s*:").test(line) && !new RegExp("\\b" + v + "\\s*=").test(line)) continue;
      // Function definition
      if (new RegExp("function\\s+" + v + "\\b").test(line)) continue;
      // App.state = { definitions
      if (/App\.(state|dom)\s*=\s*\{/.test(line)) continue;

      allIssues.push({ file, lineno, var: v, ns: "state", line: trimmed.substring(0, 100) });
    }

    // Check dom vars
    for (const v of allVars.dom) {
      if (!line.includes(v)) continue;
      if (line.includes("App.dom." + v)) continue;
      if (line.includes("App.state." + v)) continue;
      if (new RegExp("\\b" + v + "\\s*:").test(line) && !new RegExp("\\b" + v + "\\s*=").test(line)) continue;
      if (new RegExp("function\\s+" + v + "\\b").test(line)) continue;
      if (/App\.(state|dom)\s*=\s*\{/.test(line)) continue;

      allIssues.push({ file, lineno, var: v, ns: "dom", line: trimmed.substring(0, 100) });
    }
  });
});

// Group by file
const byFile = {};
allIssues.forEach(i => {
  if (!byFile[i.file]) byFile[i.file] = [];
  byFile[i.file].push(i);
});

// Print results
for (const [file, issues] of Object.entries(byFile)) {
  console.log(`\n=== ${file} ===`);
  issues.forEach(i => {
    console.log(`  L${i.lineno}: ${i.ns}.${i.var}  |  ${i.line}`);
  });
}

console.log(`\nTotal: ${allIssues.length} issues in ${Object.keys(byFile).length} files`);

// Write the fix data for batch processing
fs.writeFileSync("fix-data.json", JSON.stringify(allIssues, null, 2));
console.log("Fix data written to fix-data.json");