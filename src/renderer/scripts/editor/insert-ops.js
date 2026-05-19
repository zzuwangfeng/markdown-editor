// FlowMark - editor/insert-ops
(function(App) {
  'use strict';

  function insertHTMLAtCursor(html) {
    const selection = window.getSelection();

    // 如果没有选区或选区不在编辑器内，尝试使用保存的光标位置
    if (!selection.rangeCount || !App.dom.editor.contains(selection.anchorNode)) {
      if (App.state.savedCursorRange) {
        selection.removeAllRanges();
        selection.addRange(App.state.savedCursorRange);
      } else {
        App.dom.editor.focus();
        // 再次检查，如果还是没有有效选区，在末尾创建
        if (!selection.rangeCount) {
          const range = document.createRange();
          range.selectNodeContents(App.dom.editor);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }

    const range = selection.getRangeAt(0);
    range.collapse(true);

    const container = document.createElement('div');
    container.innerHTML = html;
    const fragment = document.createDocumentFragment();
    while (container.firstChild) {
      fragment.appendChild(container.firstChild);
    }

    range.insertNode(fragment);

    // 移动光标到插入内容之后（如果是列表类块元素，移到其第一个可编辑子元素内）
    const firstNode = fragment.firstChild;
    if (firstNode) {
      // 如果插入的是 ul/ol，将其第一个 li 的开头作为光标位置
      if (firstNode.tagName === 'UL' || firstNode.tagName === 'OL') {
        const firstLi = firstNode.querySelector('li');
        if (firstLi) {
          range.setStart(firstLi, 0);
          range.collapse(true);
        } else {
          range.setStartAfter(firstNode);
          range.collapse(true);
        }
      } else {
        range.setStartAfter(firstNode);
        range.collapse(true);
      }
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  function insertHeading(level) {
    const selection = window.getSelection();

    // 保存滚动百分比
    const scrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? App.dom.editor.scrollTop / scrollMax : 0;

    if (selection.rangeCount > 0 && App.dom.editor.contains(selection.anchorNode)) {
      App.state.savedCursorRange = selection.getRangeAt(0).cloneRange();
    }

    insertHTMLAtCursor(`<h${level}>标题</h${level}>`);

    // 延迟恢复滚动位置
    requestAnimationFrame(() => {
      const newScrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
      App.dom.editor.scrollTop = newScrollMax * scrollPercent;
    });
  }

  function insertPlainText() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    // 获取当前光标所在的位置
    const range = selection.getRangeAt(0);
    let node = range.startContainer;
    let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

    // 找到最近的块元素
    let blockElement = element?.closest('h1, h2, h3, h4, h5, h6, .code-block, blockquote, pre, ul, ol, table, p, div');

    // 创建一个干净的段落
    const p = document.createElement('p');
    p.innerHTML = '<br>';

    if (blockElement && App.dom.editor.contains(blockElement)) {
      // 在块元素后插入新段落
      blockElement.parentNode.insertBefore(p, blockElement.nextSibling);
    } else {
      // 在当前选区位置插入
      range.collapse(true);
      range.insertNode(p);
    }

    // 清除可能的内联格式：创建新选区到段落开头
    const newRange = document.createRange();
    // 选择整个段落内容，这样输入会替换掉并清除格式
    newRange.selectNodeContents(p);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }

  function wrapSelection(tag) {
    const selection = window.getSelection();

    // 保存滚动百分比
    const scrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? App.dom.editor.scrollTop / scrollMax : 0;

    if (!selection.rangeCount) {
      App.dom.editor.focus();
      // 等待 focus 后创建选区
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel.rangeCount) {
          const range = document.createRange();
          range.selectNodeContents(App.dom.editor);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }, 10);
      return;
    }

    const selectedText = selection.toString();

    if (selectedText) {
      // 有选区，直接包裹
      const range = selection.getRangeAt(0);
      const wrapper = document.createElement(tag);
      wrapper.textContent = selectedText;
      range.deleteContents();
      range.insertNode(wrapper);
      range.setStartAfter(wrapper);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // 无选区，插入空标签对并将光标放在标签内
      const wrapper = document.createElement(tag);
      wrapper.textContent = '​'; // 零宽空格，让光标可以进入空标签

      if (App.state.savedCursorRange) {
        // 使用保存的光标位置插入
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(App.state.savedCursorRange);
        const range = sel.getRangeAt(0);
        range.insertNode(wrapper);
      } else {
        App.dom.editor.appendChild(wrapper);
      }

      // 将光标放在零宽空格之后（即标签内）
      const range = document.createRange();
      range.selectNodeContents(wrapper);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    // 延迟恢复滚动位置
    requestAnimationFrame(() => {
      const newScrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
      App.dom.editor.scrollTop = newScrollMax * scrollPercent;
    });

    App.editor_content.handleEditorInput();
  }

  function insertLink() {
    const selection = window.getSelection();
    const selectedText = selection.toString() || '链接文本';

    // 保存滚动百分比
    const scrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? App.dom.editor.scrollTop / scrollMax : 0;

    if (selection.rangeCount > 0 && App.dom.editor.contains(selection.anchorNode)) {
      App.state.savedCursorRange = selection.getRangeAt(0).cloneRange();
    }

    const url = prompt('请输入链接地址：', 'https://');

    if (url) {
      if (App.state.savedCursorRange) {
        selection.removeAllRanges();
        selection.addRange(App.state.savedCursorRange);
      }
      const html = `<a href="${url}" target="_blank">${selectedText}</a>`;
      insertHTMLAtCursor(html);

      // 延迟恢复滚动位置
      requestAnimationFrame(() => {
        const newScrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
        App.dom.editor.scrollTop = newScrollMax * scrollPercent;
      });
    }
  }

  async function insertImage() {
    if (!App.state.currentWorkspace) {
      alert('请先打开工作区');
      return;
    }

    // 保存滚动百分比
    const scrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? App.dom.editor.scrollTop / scrollMax : 0;

    try {
      const result = await window.electronAPI.selectImage();
      if (result && result.filePath) {
        const relativePath = await saveImageToAssets(result.filePath);
        const html = `<img src="${relativePath}" alt="${result.fileName}" class="md-image">`;

        // 保存当前光标位置
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && App.dom.editor.contains(selection.anchorNode)) {
          App.state.savedCursorRange = selection.getRangeAt(0).cloneRange();
        }

        insertHTMLAtCursor(html);

        // 延迟恢复滚动位置
        requestAnimationFrame(() => {
          const newScrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
          App.dom.editor.scrollTop = newScrollMax * scrollPercent;
        });
      }
    } catch (e) {
      console.error('Insert image error:', e);
      alert('插入图片失败');
    }
  }

  async function saveImageToAssets(imagePath) {
    const fileName = generateImageFileName(imagePath);
    const destPath = App.state.assetsFolderPath + '/' + fileName;
    await window.electronAPI.copyFile(imagePath, destPath);
    // 返回 file:// 绝对路径，让 Electron 可以正确加载图片
    return 'file://' + App.state.assetsFolderPath + '/' + fileName;
  }

  function generateImageFileName(originalPath) {
    const ext = originalPath.split('.').pop() || 'png';
    const timestamp = Date.now();
    const hash = Math.random().toString(36).substring(2, 8);
    return `image-${timestamp}-${hash}.${ext}`;
  }

  App.editor_insert_ops = {
    insertHTMLAtCursor: insertHTMLAtCursor,
    insertHeading: insertHeading,
    insertPlainText: insertPlainText,
    wrapSelection: wrapSelection,
    insertLink: insertLink,
    insertImage: insertImage,
    saveImageToAssets: saveImageToAssets,
    generateImageFileName: generateImageFileName,
  };

})(window.__App);