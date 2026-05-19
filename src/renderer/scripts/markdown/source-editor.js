// FlowMark - markdown/source-editor
(function(App) {
  'use strict';

  function togglePreview() {
    App.state.isPreviewMode = !App.state.isPreviewMode;

    if (App.state.isPreviewMode) {
      App.dom.previewContent.classList.remove('hidden');
      renderPreview();
    } else {
      App.dom.previewContent.classList.add('hidden');
    }
    localStorage.setItem('flowmark-preview-enabled', App.state.isPreviewMode);
  }

  function renderPreview() {
    try {
      if (!App.dom.previewContent) {
        console.error('previewContent is null');
        return;
      }

      if (!App.dom.editor) {
        console.error('editor is null');
        return;
      }

      const editorContent = App.dom.editor.innerHTML;
      const placeholder = App.dom.editor.querySelector('.editor-placeholder');

      const hasRealContent = editorContent && editorContent.length > 0 &&
        (!placeholder || !editorContent.includes(placeholder.outerHTML.trim()));

      if (!hasRealContent) {
        App.dom.previewContent.innerHTML = '<div class="preview-empty">打开一个文件以预览内容</div>';
        return;
      }

      const clone = App.dom.editor.cloneNode(true);
      const clonePlaceholder = clone.querySelector('.editor-placeholder');
      if (clonePlaceholder) clonePlaceholder.remove();

      let content = clone.innerHTML;
      if (!content || !content.trim()) {
        App.dom.previewContent.innerHTML = '<div class="preview-empty">打开一个文件以预览内容</div>';
        return;
      }

      App.dom.previewContent.innerHTML = App.converter.cleanPreviewHTML(content);

      const previewCodes = App.dom.previewContent.querySelectorAll('.code-block code');
      for (var cj = 0; cj < previewCodes.length; cj++) {
        previewCodes[cj].removeAttribute('contenteditable');
      }
    } catch (e) {
      console.error('renderPreview error:', e);
      App.dom.previewContent.innerHTML = '<div class="preview-empty">预览渲染失败</div>';
    }
  }

  function updateOutline() {
    const headings = App.dom.editor.querySelectorAll('h1, h2, h3');
    App.dom.outlineList.innerHTML = '';

    if (headings.length === 0) {
      App.dom.outlineList.innerHTML = '<div class="outline-empty">暂无标题</div>';
      return;
    }

    headings.forEach((heading, index) => {
      if (!heading.id) {
        heading.id = `heading-${index}`;
      }

      const item = document.createElement('div');
      item.className = `outline-item ${heading.tagName.toLowerCase()}`;
      item.innerHTML = `<span class="outline-item-text">${heading.textContent}</span>`;
      item.addEventListener('click', () => {
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.querySelectorAll('.outline-item.active').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
      });
      App.dom.outlineList.appendChild(item);
    });
  }

  function updateStats() {
    const text = App.dom.editor.innerText || '';
    const chars = text.replace(/\s/g, '').length;
    App.dom.wordCount.textContent = `${chars} 字`;

    // 计算当前行号：获取光标位置
    let currentLine = 1;
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(App.dom.editor);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      const temp = document.createElement('div');
      temp.appendChild(preCaretRange.cloneContents());
      const divContent = temp.innerHTML;
      // 计算 <br> 和块级标签来估算行号
      const lineBreaks = (divContent.match(/<br\s*\/?>/gi) || []).length;
      const blockTags = (divContent.match(/<\/(p|h[1-6]|blockquote|li|div)>/gi) || []).length;
      currentLine = lineBreaks + blockTags + 1;
    }
    App.dom.lineInfo.textContent = `行 ${currentLine}`;
  }

  function switchMdView(view) {
    App.dom.currentMdView = view;

    // 更新按钮状态
    App.dom.mdViewBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    if (view === 'code') {
      // 切换到代码视图
      showMdSourceEditor();
    } else {
      // 切换到预览视图
      hideMdSourceEditor();
    }

    // 保存设置
    localStorage.setItem('flowmark-md-view', view);
  }

  function updateLineNumbers(markdown) {
    if (!App.dom.mdSourceLineNumbers) return;

    // 计算行数
    const lines = markdown.split('\n');
    let html = '';

    for (let i = 1; i <= lines.length; i++) {
      html += `<span class="md-source-line-number">${i}</span>`;
    }

    App.dom.mdSourceLineNumbers.innerHTML = html;
  }

  function showMdSourceEditor() {
    if (!App.state.currentFilePath || !App.dom.editor) return;

    // 同步内容到源码编辑器
    const markdown = App.converter.htmlToMarkdown(App.dom.editor.innerHTML);
    App.dom.mdSourceTextarea.value = markdown;

    // 更新行号
    updateLineNumbers(markdown);

    // 显示源码编辑器
    App.dom.mdSourceEditor.classList.remove('hidden');
    App.dom.editor.classList.add('hidden');

    // 聚焦到 textarea
    App.dom.mdSourceTextarea.focus();
  }

  function hideMdSourceEditor() {
    // 隐藏源码编辑器
    App.dom.mdSourceEditor.classList.add('hidden');
    App.dom.editor.classList.remove('hidden');
  }

  App.markdown_source_editor = {
    togglePreview: togglePreview,
    renderPreview: renderPreview,
    updateOutline: updateOutline,
    updateStats: updateStats,
    switchMdView: switchMdView,
    updateLineNumbers: updateLineNumbers,
    showMdSourceEditor: showMdSourceEditor,
    hideMdSourceEditor: hideMdSourceEditor,
  };

})(window.__App);