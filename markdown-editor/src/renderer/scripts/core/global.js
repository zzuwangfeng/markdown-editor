// FlowMark - core/global
(function(App) {
  'use strict';

  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function executeMenuCommand(cmd) {
    const cmdMap = {
      'text': () => App.editor_insert_ops.insertPlainText(),
      'h1': () => App.editor_insert_ops.insertHeading(1),
      'h2': () => App.editor_insert_ops.insertHeading(2),
      'h3': () => App.editor_insert_ops.insertHeading(3),
      'bold': () => App.editor_insert_ops.wrapSelection('strong'),
      'italic': () => App.editor_insert_ops.wrapSelection('em'),
      'underline': () => App.editor_insert_ops.wrapSelection('u'),
      'strikethrough': () => App.editor_insert_ops.wrapSelection('s'),
      'code': () => App.editor_insert_ops.wrapSelection('code'),
      'codeblock': () => App.editor_code_block.insertCodeBlock(),
      'link': () => App.editor_insert_ops.insertLink(),
      'image': () => App.editor_insert_ops.insertImage(),
      'ul': () => App.editor_content.insertList('ul'),
      'ol': () => App.editor_content.insertList('ol'),
      'todo': () => App.editor_content.insertTodoList(),
      'blockquote': () => App.editor_content.insertBlockquote(),
      'hr': () => App.editor_content.insertHorizontalRule(),
      'table': () => App.editor_insert_special.showTableDialog(),
    };

    if (cmdMap[cmd]) {
      cmdMap[cmd]();
    }
  }

  function handleGlobalKeydown(e) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdKey = isMac ? e.metaKey : e.ctrlKey;

    if (cmdKey) {
      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault();
          if (App.state.currentFilePath) App.file_file_operations.saveCurrentFile();
          break;
        case 'b':
          if (document.activeElement === App.dom.editor) {
            e.preventDefault();
            App.editor_content.handleFormat('bold');
          }
          break;
        case 'i':
          if (document.activeElement === App.dom.editor) {
            e.preventDefault();
            App.editor_content.handleFormat('italic');
          }
          break;
        case 'u':
          if (document.activeElement === App.dom.editor) {
            e.preventDefault();
            App.editor_content.handleFormat('underline');
          }
          break;
        case 'k':
          if (document.activeElement === App.dom.editor) {
            e.preventDefault();
            App.editor_insert_ops.insertLink();
          }
          break;
        case 'p':
          e.preventDefault();
          App.markdown_source_editor.togglePreview();
          break;
        case 'o':
          e.preventDefault();
          App.file_file_operations.openWorkspace();
          break;
        case 'n':
          e.preventDefault();
          App.file_file_operations.createNewFile();
          break;
      }
    }

    // ESC 关闭命令面板
    if (e.key === 'Escape' && App.state.slashPanelVisible) {
      App.editor_slash_commands.hideSlashPanel();
    }
  }

  App.core_global = {
    debounce: debounce,
    executeMenuCommand: executeMenuCommand,
    handleGlobalKeydown: handleGlobalKeydown,
  };

})(window.__App);