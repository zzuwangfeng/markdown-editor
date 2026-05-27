const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  const resourcesPath = path.join(
    context.appOutDir,
    'FlowMark Editor.app',
    'Contents',
    'Frameworks',
    'Electron Framework.framework',
    'Resources'
  );

  if (!fs.existsSync(resourcesPath)) return;

  const keep = new Set(['en.lproj', 'zh_CN.lproj']);
  const entries = fs.readdirSync(resourcesPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.endsWith('.lproj') && !keep.has(entry.name)) {
      fs.rmSync(path.join(resourcesPath, entry.name), { recursive: true, force: true });
    }
  }
};