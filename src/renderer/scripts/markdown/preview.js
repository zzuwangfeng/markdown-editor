// FlowMark - markdown/preview
(function(App) {
  'use strict';

  function convertImagePathsToAbsolute(content, workspace) {
    if (!workspace) return content;

    // 规范化路径：去除末尾斜杠
    const normalizedWorkspace = workspace.replace(/\/$/, '');

    // 匹配相对路径 .flowmark-assets/ 开头的图片，转换为绝对路径
    content = content.replace(/!\[([^\]]*)\]\(\.flowmark-assets\/([^)]+)\)/g,
      (match, alt, path) => {
        return `![${alt}](file://${normalizedWorkspace}/.flowmark-assets/${path})`;
      });

    return content;
  }

  App.markdown_preview = {
    convertImagePathsToAbsolute: convertImagePathsToAbsolute,
  };

})(window.__App);