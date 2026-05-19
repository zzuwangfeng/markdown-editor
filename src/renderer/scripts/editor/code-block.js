// FlowMark - editor/code-block
(function(App) {
  'use strict';

  function exitCodeBlock(codeBlock, direction = 'after') {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    if (App.state.isExitingCodeBlock) return;
    App.state.isExitingCodeBlock = true;

    try {
      const wrapper = codeBlock.closest('.code-block-wrapper') || codeBlock;

      const codeEl = wrapper.querySelector('code');
      if (codeEl) {
        while (codeEl.lastChild && codeEl.lastChild.nodeName === 'BR') {
          codeEl.removeChild(codeEl.lastChild);
        }
      }

      const newRange = document.createRange();

      if (direction === 'after') {
        var next = wrapper.nextSibling;
        if (next) {
          if (next.nodeType === Node.ELEMENT_NODE && next.childNodes.length > 0) {
            newRange.setStart(next, 0);
          } else {
            newRange.setStartAfter(wrapper);
          }
          newRange.collapse(true);
        } else {
          var p = document.createElement('p');
          p.innerHTML = '<br>';
          wrapper.parentNode.appendChild(p);
          newRange.setStart(p, 0);
          newRange.collapse(true);
        }
      } else {
        var prev = wrapper.previousSibling;
        if (prev) {
          if (prev.nodeType === Node.ELEMENT_NODE && prev.childNodes.length > 0) {
            newRange.selectNodeContents(prev);
            newRange.collapse(false);
          } else {
            newRange.setStartAfter(prev);
            newRange.collapse(true);
          }
        } else {
          var p = document.createElement('p');
          p.innerHTML = '<br>';
          wrapper.parentNode.insertBefore(p, wrapper);
          newRange.setStart(p, 0);
          newRange.collapse(true);
        }
      }
      selection.removeAllRanges();
      selection.addRange(newRange);
      App.dom.editor.focus();
    } finally {
      App.state.isExitingCodeBlock = false;
    }
  }

  function getLineInfo(cb, cursorNode, cursorOffset) {
    let lineNumber = 0;
    let isFirstLine = true;
    let isLastLine = true;
    let isAtLineStart = false;
    let isAtLineEnd = false;

    let foundCursor = false;
    let passedCursor = false;
    let charCountInCurrentLine = 0;
    let totalTextLen = 0;
    let hasBr = false;

    const codeEl = cb.querySelector('code') || cb;

    if (cursorNode.nodeType === Node.ELEMENT_NODE && codeEl.contains(cursorNode)) {
      if (cursorOffset === 0) {
        for (let child = codeEl.firstChild; child; child = child.nextSibling) {
          if (child.nodeType === Node.TEXT_NODE) {
            cursorNode = child;
            cursorOffset = 0;
            break;
          }
          if (child.nodeName === 'BR') {
            return { lineNumber: 0, isFirstLine: true, isLastLine: false, isAtLineStart: true, isAtLineEnd: false };
          }
        }
        if (cursorNode.nodeType === Node.ELEMENT_NODE) {
          return { lineNumber: 0, isFirstLine: true, isLastLine: false, isAtLineStart: true, isAtLineEnd: false };
        }
      } else if (cursorOffset >= codeEl.childNodes.length) {
        for (let child = codeEl.lastChild; child; child = child.previousSibling) {
          if (child.nodeType === Node.TEXT_NODE) {
            cursorNode = child;
            cursorOffset = child.textContent.length;
            break;
          }
          if (child.nodeName === 'BR') {
            for (let c = codeEl.firstChild; c; c = c.nextSibling) {
              if (c.nodeName === 'BR') hasBr = true;
            }
            return { lineNumber: hasBr ? 1 : 0, isFirstLine: !hasBr, isLastLine: true, isAtLineStart: false, isAtLineEnd: true };
          }
        }
        if (cursorNode.nodeType === Node.ELEMENT_NODE) {
          for (let c = codeEl.firstChild; c; c = c.nextSibling) {
            if (c.nodeName === 'BR') hasBr = true;
          }
          return { lineNumber: hasBr ? 1 : 0, isFirstLine: !hasBr, isLastLine: true, isAtLineStart: false, isAtLineEnd: true };
        }
      }
    }

    for (let child = codeEl.firstChild; child; child = child.nextSibling) {
      if (child.nodeName === 'BR') {
        hasBr = true;
      } else if (child.nodeType === Node.TEXT_NODE) {
        totalTextLen += child.textContent.length;
      }
    }

    for (let child = codeEl.firstChild; child; child = child.nextSibling) {
      if (!foundCursor && (child === cursorNode || (child.nodeType === Node.ELEMENT_NODE && child.contains(cursorNode)))) {
        foundCursor = true;
      }

      if (child.nodeName === 'BR') {
        if (foundCursor) {
          passedCursor = true;
        }
        lineNumber++;
        charCountInCurrentLine = 0;
        isFirstLine = false;
      } else if (child.nodeType === Node.TEXT_NODE) {
        const textLen = child.textContent.length;
        charCountInCurrentLine += textLen;

        if (foundCursor && !isAtLineEnd && !passedCursor) {
          if (cursorNode === child) {
            isAtLineEnd = (cursorOffset >= textLen);
            isAtLineStart = (cursorOffset === 0);
          }
        }
      }

      if (child.nextSibling === null) {
        isLastLine = !passedCursor || child === cursorNode;
      }
    }

    if (!hasBr) {
      isFirstLine = true;
      isLastLine = true;
      if (foundCursor) {
        const preCaretRange = document.createRange();
        preCaretRange.selectNodeContents(codeEl);
        preCaretRange.setEnd(cursorNode, cursorOffset);
        const textBeforeCursor = preCaretRange.toString();
        isAtLineStart = (textBeforeCursor.length === 0);
        isAtLineEnd = (textBeforeCursor.length >= totalTextLen);
      }
    } else if (!foundCursor) {
      isAtLineEnd = true;
    }

    return { lineNumber, isFirstLine, isLastLine, isAtLineStart, isAtLineEnd };
  }

  function insertBRInCodeBlock() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const br = document.createElement('br');
    range.insertNode(br);
    range.setStartAfter(br);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function insertCodeBlock() {
    const selection = window.getSelection();

    let inCodeBlock = false;
    if (selection.rangeCount > 0 && selection.anchorNode && App.dom.editor.contains(selection.anchorNode)) {
      const node = selection.anchorNode;
      if (node.parentElement && node.parentElement.closest('.code-block')) {
        inCodeBlock = true;
      }
    }

    if (inCodeBlock) {
      insertBRInCodeBlock();
      return;
    }

    let savedRange = null;
    if (selection.rangeCount > 0 && App.dom.editor.contains(selection.anchorNode)) {
      savedRange = selection.getRangeAt(0).cloneRange();
    }

    App.dialogs.showDialog('代码块语言', '输入语言名称（如 python、javascript，留空则无）', (lang) => {
      doInsertCodeBlock(lang.trim(), savedRange);
    });
  }

  function doInsertCodeBlock(language, savedRange) {
    language = language || '';
    const selection = window.getSelection();

    const scrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? App.dom.editor.scrollTop / scrollMax : 0;

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';

    if (language) {
      const langLine = document.createElement('div');
      langLine.className = 'code-lang-line';
      langLine.textContent = language;
      wrapper.appendChild(langLine);
    }

    const pre = document.createElement('pre');
    pre.className = 'code-block';

    const code = document.createElement('code');
    code.contentEditable = 'true';
    code.innerHTML = '<br>';
    pre.appendChild(code);

    wrapper.appendChild(pre);

    let inserted = false;
    let targetRange = savedRange;
    if (!targetRange && selection.rangeCount > 0 && App.dom.editor.contains(selection.anchorNode)) {
      targetRange = selection.getRangeAt(0);
    }
    if (targetRange && App.dom.editor.contains(targetRange.commonAncestorContainer)) {
      var container = targetRange.commonAncestorContainer;
      if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;
      var wrappingP = container && container.closest ? container.closest('p') : null;
      targetRange.deleteContents();
      if (wrappingP && wrappingP.parentNode === App.dom.editor) {
        targetRange.setStartAfter(wrappingP);
        targetRange.collapse(true);
      }
      targetRange.insertNode(wrapper);
      inserted = true;
    }

    if (!inserted) {
      App.dom.editor.appendChild(wrapper);
    }

    const newRange = document.createRange();
    newRange.setStart(code, 0);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    App.dom.editor.focus();

    requestAnimationFrame(() => {
      const newScrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
      App.dom.editor.scrollTop = newScrollMax * scrollPercent;
    });

    App.editor_content.handleEditorInput();
  }

  App.editor_code_block = {
    exitCodeBlock: exitCodeBlock,
    getLineInfo: getLineInfo,
    insertCodeBlock: insertCodeBlock,
    doInsertCodeBlock: doInsertCodeBlock,
  };

})(window.__App);