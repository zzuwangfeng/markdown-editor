// FlowMark - editor/insert-special
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

  function insertTable(rows, cols) {
    let html = '<table class="md-table">';

    // 表头 - 每列都有 col-resize-handle，每行有 row-resize-handle
    html += '<thead><tr>';
    for (let i = 0; i < cols; i++) {
      html += `<th><span class="cell-content">列${i + 1}</span><span class="col-resize-handle"></span><span class="row-resize-handle"></span></th>`;
    }
    html += '</tr></thead>';

    // 表体 - 每列有 col-resize-handle，每行有 row-resize-handle
    html += '<tbody>';
    for (let i = 0; i < rows - 1; i++) {
      html += '<tr>';
      for (let j = 0; j < cols; j++) {
        html += `<td><span class="cell-content">行${i + 1}列${j + 1}</span><span class="col-resize-handle"></span><span class="row-resize-handle"></span></td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';

    App.editor_insert_ops.insertHTMLAtCursor(html);
  }

  App.editor_insert_special = {
    showTableDialog: showTableDialog,
    hideTableDialog: hideTableDialog,
    insertTableFromDialog: insertTableFromDialog,
    insertTable: insertTable,
  };

})(window.__App);