// FlowMark - editor/keyboard
(function(App) {
  'use strict';

  function handleEditorKeydown(e) {
    // 显示斜杠命令面板（代码块内不触发）
    if (e.key === '/' && !App.state.slashPanelVisible) {
      const slashSel = window.getSelection();
      let inCodeBlock = false;
      if (slashSel.rangeCount > 0 && slashSel.anchorNode) {
        const slashNode = slashSel.anchorNode;
        const slashEl = slashNode.nodeType === Node.TEXT_NODE ? slashNode.parentElement : slashNode;
        if (slashEl?.closest('.code-block') && App.dom.editor.contains(slashEl.closest('.code-block'))) {
          inCodeBlock = true;
        }
      }
      if (!inCodeBlock) {
        e.preventDefault();
        App.editor_slash_commands.showSlashPanel();
        return;
      }
    }

    // ESC 关闭面板
    if (e.key === 'Escape' && App.state.slashPanelVisible) {
      App.editor_slash_commands.hideSlashPanel();
    }

    // 退格键：空代码块内删除整个代码块
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        const codeBlock = element?.closest('.code-block');

        if (codeBlock && App.dom.editor.contains(codeBlock)) {
          const codeText = codeBlock.textContent?.trim() || '';
          // 只有空代码块才处理删除
          if (codeText === '') {
            e.preventDefault();
            const wrapper = codeBlock.closest('.code-block-wrapper') || codeBlock;
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            wrapper.parentNode.replaceChild(p, wrapper);
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            App.dom.editor.focus();
            return;
          }
        }
      }
    }

    // 按回车时，如果当前在特殊块元素（标题、代码块等）内，退出到普通段落
    if (e.key === 'Enter') {
      // 优先处理斜杠面板
      if (App.state.slashPanelVisible) {
        e.preventDefault();
        App.editor_slash_commands.executeSlashCommand();
        return;
      }
      // 处理块元素内回车
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // 获取光标所在节点
        let node = range.startContainer;
        // 如果是文本节点，获取其父元素；否则直接用该元素
        let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

        // 检查是否在列表项内
        const listItem = element?.closest('li');
        if (listItem && App.dom.editor.contains(listItem)) {
          e.preventDefault();
          const list = listItem.parentElement;
          // 检查当前列表项是否为空
          const itemContent = listItem.innerHTML.trim();
          const isEmptyItem = itemContent === '' || itemContent === '<br>';

          if (isEmptyItem) {
            // 空列表项：清除列表格式，转为普通段落
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            listItem.parentNode.replaceChild(p, listItem);
            // 移动光标到新段落
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } else {
            // 有内容的列表项：创建新的列表项
            const newLi = document.createElement('li');
            newLi.innerHTML = '<br>';
            // 计算新的序号值（当前列表项数 + 1）
            const itemCount = list.querySelectorAll('li').length;
            newLi.setAttribute('value', itemCount + 1);
            list.appendChild(newLi);
            // 移动光标到新列表项
            const newRange = document.createRange();
            newRange.setStart(newLi, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
          return;
        }

        // 检查是否在代码块内
        const codeBlock = element?.closest('.code-block');
        if (codeBlock && App.dom.editor.contains(codeBlock)) {
          e.preventDefault();
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const codeContent = codeBlock.querySelector('code') || codeBlock;
            const info = App.editor_code_block.getLineInfo(codeContent, range.startContainer, range.startOffset);

            if (info.isLastLine && info.isAtLineStart && info.isAtLineEnd) {
              App.editor_code_block.exitCodeBlock(codeBlock, 'after');
            } else {
              const br = document.createElement('br');
              range.insertNode(br);
              range.setStartAfter(br);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
          return;
        }

        // 检查其他块元素
        let blockElement = element?.closest('h1, h2, h3, h4, h5, h6, blockquote, pre, table');
        if (blockElement && App.dom.editor.contains(blockElement)) {
          e.preventDefault();
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          blockElement.parentNode.insertBefore(p, blockElement.nextSibling);
          const newRange = document.createRange();
          newRange.setStart(p, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
          return;
        }
      }
    }

    // 斜杠面板导航
    if (App.state.slashPanelVisible) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateSlashPanel(1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateSlashPanel(-1);
        return;
      }
    }

    // 方向键：从代码块退出
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        const codeBlock = element?.closest('.code-block');

        if (codeBlock && App.dom.editor.contains(codeBlock)) {
          const codeContent = codeBlock.querySelector('code') || codeBlock;
          const lineInfo = App.editor_code_block.getLineInfo(codeContent, range.startContainer, range.startOffset);

          // 向上箭头：代码块第一行行首时退出
          if (e.key === 'ArrowUp') {
            if (lineInfo.isFirstLine && lineInfo.isAtLineStart) {
              e.preventDefault();
              App.editor_code_block.exitCodeBlock(codeBlock, 'before');
              return;
            }
          }

          // 向下箭头：代码块末尾时退出
          if (e.key === 'ArrowDown') {
            if (lineInfo.isLastLine && lineInfo.isAtLineEnd) {
              e.preventDefault();
              App.editor_code_block.exitCodeBlock(codeBlock, 'after');
              return;
            }
            if ((lineInfo.isLastLine && !lineInfo.isAtLineEnd) ||
                (range.startContainer.nodeType !== Node.TEXT_NODE && lineInfo.isFirstLine && lineInfo.isAtLineStart)) {
              e.preventDefault();
              const codeEl = codeBlock.querySelector('code') || codeBlock;
              const nr = document.createRange();
              const lc = codeEl.lastChild;
              if (lc && lc.nodeType === Node.TEXT_NODE) {
                nr.setStart(lc, lc.textContent.length);
              } else {
                nr.setStart(codeEl, codeEl.childNodes.length);
              }
              nr.collapse(true);
              selection.removeAllRanges();
              selection.addRange(nr);
              return;
            }
          }

          // 向左箭头：代码块第一行行首时退出
          if (e.key === 'ArrowLeft') {
            if (lineInfo.isAtLineStart && lineInfo.isFirstLine) {
              e.preventDefault();
              App.editor_code_block.exitCodeBlock(codeBlock, 'before');
              return;
            }
          }

          // 向右箭头：代码块最后一行行尾时退出
          if (e.key === 'ArrowRight') {
            if (lineInfo.isAtLineEnd && lineInfo.isLastLine) {
              e.preventDefault();
              App.editor_code_block.exitCodeBlock(codeBlock, 'after');
              return;
            }
          }
        }
      }
    }
  }

  function navigateSlashPanel(direction) {
    const items = App.dom.slashList.querySelectorAll('.slash-item');
    if (items.length === 0) return;

    App.state.slashSelectedIndex = Math.max(0, Math.min(items.length - 1, App.state.slashSelectedIndex + direction));
    App.editor_slash_commands.updateSlashSelection();
  }

  App.editor_keyboard = {
    handleEditorKeydown: handleEditorKeydown,
    navigateSlashPanel: navigateSlashPanel,
  };

})(window.__App);