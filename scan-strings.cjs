const fs = require("fs");
const glob = require("glob");

const files = glob.sync("src/renderer/scripts/**/*.js", {
  ignore: ["**/app.js.bak", "**/app-new.js", "**/modules.js"]
});

let found = 0;
files.forEach(f => {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.includes("console.")) return;

    // Match string literals containing App.state or App.dom
    const m = trimmed.match(/['"`][^'"`]*App\.(state|dom)\.\w+[^'"`]*['"`]/g);
    if (m) {
      console.log(f + ":" + (i + 1) + ": " + trimmed.substring(0, 120));
      found++;
    }
  });
});
console.log(`\nFound ${found} suspicious string lines`);