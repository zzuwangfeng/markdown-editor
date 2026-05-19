(function(App) {
  'use strict';

  function showTableDialog() {
    document.getElementById('table-rows').value = 3;
    document.getElementById('table-cols').value = 3;
    App.dom.tableDialogOverlay.classList.add('visible');
  }

  function hideTableDialog() {
    App.dom.tableDialogOverlay.classList.remove('visible');
  }

  function insertTableFromDialog() {
    const rows = parseInt(document.getElementById('table-rows').value) || 3;
    const cols = parseInt(document.getElementById('table-cols').value) || 3;

    // 保存滚动百分比
    const scrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
    const scrollPercent = scrollMax > 0 ? App.dom.editor.scrollTop / scrollMax : 0;

    hideTableDialog();

    // 恢复光标位置
    if (App.state.savedCursorRange) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(App.state.savedCursorRange);
    }

    insertTable(rows, cols);

    // 延迟恢复滚动位置
    requestAnimationFrame(() => {
      const newScrollMax = App.dom.editor.scrollHeight - App.dom.editor.clientHeight;
      App.dom.editor.scrollTop = newScrollMax * scrollPercent;
    });
  }

  function initTableResize() {
    let isResizing = false;
    let resizeTarget = null;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    let isColResize = false;

    document.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('.col-resize-handle, .row-resize-handle');
      if (!handle) return;

      const cell = handle.closest('td, th');
      if (!cell) return;

      isResizing = true;
      resizeTarget = cell;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = cell.offsetWidth;
      startHeight = cell.offsetHeight;
      isColResize = handle.classList.contains('col-resize-handle');

      // 计算当前单元格所在的列索引和行索引
      const tr = cell.parentElement;
      const cellIndex = Array.from(tr.children).indexOf(cell);
      const table = tr.closest('table');

      // 获取所有行
      const allRows = table.querySelectorAll('tr');

      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing || !resizeTarget) return;

      const tr = resizeTarget.parentElement;
      const cellIndex = Array.from(tr.children).indexOf(resizeTarget);
      const table = tr.closest('table');
      const allRows = table.querySelectorAll('tr');

      if (isColResize) {
        const delta = e.clientX - startX;
        const newWidth = Math.max(40, startWidth + delta);
        // 手柄在单元格右侧，cellIndex 就是被拖动列的索引
        allRows.forEach(row => {
          if (cellIndex >= 0 && row.children[cellIndex]) {
            row.children[cellIndex].style.width = `${newWidth}px`;
          }
        });
      } else {
        // 行拖拽 - 改变当前行所有单元格的高度
        const delta = e.clientY - startY;
        const newHeight = Math.max(20, startHeight + delta);
        // 设置当前行所有单元格的高度
        Array.from(tr.children).forEach(td => {
          td.style.height = `${newHeight}px`;
        });
      }
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizeTarget = null;
      }
    });
  }

  App.table = {
    showTableDialog: showTableDialog,
    hideTableDialog: hideTableDialog,
    insertTableFromDialog: insertTableFromDialog,
    initTableResize: initTableResize,
  };

})(window.__App);