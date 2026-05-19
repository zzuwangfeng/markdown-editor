// FlowMark - editor/content
(function(App) {
  'use strict';

  const debouncedRenderPreview = App.core_global.debounce(() => {
    if (App.state.isPreviewMode) App.markdown_source_editor.renderPreview();
  }, 300);

  const debouncedUpdateOutline = App.core_global.debounce(() => {
    App.markdown_source_editor.updateOutline();
  }, 300);

  function handleEditorInput() {
    try {
      App.dom.editorPlaceholder.style.display = App.dom.editor.innerHTML ? 'none' : 'block';
      if (App.dom.fileHeaderHint) {
        App.dom.fileHeaderHint.style.display = App.dom.editor.innerHTML ? 'none' : 'block';
      }
      App.markdown_source_editor.updateStats();
      debouncedUpdateOutline();
      App.theme.calculateReadingProgress();

      debouncedRenderPreview();

      // 如果源码编辑器显示，同步更新源码和行号
      if (App.dom.mdSourceEditor && App.dom.mdSourceTextarea && App.dom.currentMdView === 'code') {
        const markdown = App.converter.htmlToMarkdown(App.dom.editor.innerHTML);
        App.dom.mdSourceTextarea.value = markdown;
        App.markdown_source_editor.updateLineNumbers(markdown);
      }

      if (App.state.saveTimeout) clearTimeout(App.state.saveTimeout);
      App.state.saveTimeout = setTimeout(() => {
        if (App.state.currentFilePath) {
          App.file_file_operations.saveCurrentFile();
        }
      }, 1500);
    } catch (e) {
      console.error('Error in handleEditorInput:', e);
    }
  }

  function insertList(type) {
    const selection = window.getSelection();
    const scrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? App.dom.editor.scrollTop / scrollMax : 0;

    if (selection.rangeCount > 0 && App.dom.editor.contains(selection.anchorNode)) {
      App.state.savedCursorRange = selection.getRangeAt(0).cloneRange();
    }

    const tag = type === 'ul' ? 'ul' : 'ol';
    const valueAttr = type === 'ol' ? ' value="1"' : '';
    const html = `<${tag}><li${valueAttr}></li></${tag}>`;
    App.editor_insert_ops.insertHTMLAtCursor(html);

    requestAnimationFrame(() => {
      const newScrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
      App.dom.editor.scrollTop = newScrollMax * scrollPercent;
    });
  }

  function insertTodoList() {
    const selection = window.getSelection();
    const scrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? App.dom.editor.scrollTop / scrollMax : 0;

    if (selection.rangeCount > 0 && App.dom.editor.contains(selection.anchorNode)) {
      App.state.savedCursorRange = selection.getRangeAt(0).cloneRange();
    }

    const html = '<ul class="task-list"><li class="task-item"><input type="checkbox"> 待办事项</li></ul>';
    App.editor_insert_ops.insertHTMLAtCursor(html);

    requestAnimationFrame(() => {
      const newScrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
      App.dom.editor.scrollTop = newScrollMax * scrollPercent;
    });
  }

  function insertBlockquote() {
    const selection = window.getSelection();
    const scrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? App.dom.editor.scrollTop / scrollMax : 0;

    if (selection.rangeCount > 0 && App.dom.editor.contains(selection.anchorNode)) {
      App.state.savedCursorRange = selection.getRangeAt(0).cloneRange();
    }

    App.editor_insert_ops.insertHTMLAtCursor('<blockquote></blockquote>');

    requestAnimationFrame(() => {
      const newScrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
      App.dom.editor.scrollTop = newScrollMax * scrollPercent;
    });
  }

  function insertHorizontalRule() {
    const selection = window.getSelection();
    const scrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? App.dom.editor.scrollTop / scrollMax : 0;

    if (selection.rangeCount > 0 && App.dom.editor.contains(selection.anchorNode)) {
      App.state.savedCursorRange = selection.getRangeAt(0).cloneRange();
    }

    App.editor_insert_ops.insertHTMLAtCursor('<hr>');

    requestAnimationFrame(() => {
      const newScrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
      App.dom.editor.scrollTop = newScrollMax * scrollPercent;
    });
  }

  async function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await pasteImage(file);
        }
        return;
      }
    }
  }

  async function pasteImage(file) {
    if (!App.state.currentWorkspace) {
      alert('请先打开工作区');
      return;
    }

    showImageProgress();

    try {
      const timestamp = Date.now();
      const hash = Math.random().toString(36).substring(2, 8);
      const ext = file.name?.split('.').pop() || 'png';
      const fileName = `paste-${timestamp}-${hash}.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      await window.electronAPI.writeImageFile(App.state.assetsFolderPath, fileName, base64);
      // 返回 file:// 绝对路径
      const imagePath = 'file://' + App.state.assetsFolderPath + '/' + fileName;
      const html = `<img src="${imagePath}" alt="${fileName}" class="md-image">`;

      App.editor_insert_ops.insertHTMLAtCursor(html);
    } catch (e) {
      console.error('Paste image error:', e);
    }

    hideImageProgress();
  }

  function showImageProgress() {
    App.dom.imageProgress.classList.add('visible');
  }

  function hideImageProgress() {
    App.dom.imageProgress.classList.remove('visible');
  }

  function handleDragOver(e) {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  async function handleDrop(e) {
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        await pasteImage(file);
        return;
      }
    }
  }

  function handleEditorKeyup(e) {
    const text = App.editor_slash_commands.getTextBeforeCursor();
    if (!text) return;

    const lines = text.split('\n');
    const currentLine = lines[lines.length - 1];
    // 检查标题快捷方式
    if (currentLine === '#' && !e.shiftKey) {
      // 等待更多输入
    }
  }

  function handleSelectionChange() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && document.activeElement === App.dom.editor) {
      showFormatToolbar();
    } else {
      hideFormatToolbar();
    }
  }

  function showFormatToolbar() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    App.dom.formatToolbar.style.top = `${rect.top - 44}px`;
    App.dom.formatToolbar.style.left = `${rect.left + rect.width / 2 - App.dom.formatToolbar.offsetWidth / 2}px`;
    App.dom.formatToolbar.classList.add('visible');

    updateToolbarActiveStates();
  }

  function hideFormatToolbar() {
    App.dom.formatToolbar.classList.remove('visible');
  }

  function updateToolbarActiveStates() {
    const btn = (format) => App.dom.formatToolbar.querySelector(`[data-format="${format}"]`);

    btn('bold')?.classList.toggle('active', document.queryCommandState('bold'));
    btn('italic')?.classList.toggle('active', document.queryCommandState('italic'));
    btn('underline')?.classList.toggle('active', document.queryCommandState('underline'));
  }

  function handleFormat(format) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    switch (format) {
      case 'bold':
        document.execCommand('bold', false, null);
        break;
      case 'italic':
        document.execCommand('italic', false, null);
        break;
      case 'underline':
        document.execCommand('underline', false, null);
        break;
      case 'strikethrough':
        document.execCommand('strikeThrough', false, null);
        break;
      case 'link':
        App.editor_insert_ops.insertLink();
        break;
      case 'code':
        App.editor_insert_ops.wrapSelection('code');
        break;
    }

    App.dom.editor.focus();
    handleEditorInput();
    updateToolbarActiveStates();
  }

  App.editor_content = {
    handleEditorInput: handleEditorInput,
    insertList: insertList,
    insertTodoList: insertTodoList,
    insertBlockquote: insertBlockquote,
    insertHorizontalRule: insertHorizontalRule,
    handlePaste: handlePaste,
    pasteImage: pasteImage,
    showImageProgress: showImageProgress,
    hideImageProgress: hideImageProgress,
    handleDragOver: handleDragOver,
    handleDrop: handleDrop,
    handleEditorKeyup: handleEditorKeyup,
    handleSelectionChange: handleSelectionChange,
    showFormatToolbar: showFormatToolbar,
    hideFormatToolbar: hideFormatToolbar,
    updateToolbarActiveStates: updateToolbarActiveStates,
    handleFormat: handleFormat,
  };

})(window.__App);