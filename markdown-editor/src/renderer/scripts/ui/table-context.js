// FlowMark - ui/table-context
(function(App) {
  'use strict';

  function handleTableContextAction(action) {
    if (!App.dom.tableContextTarget || !App.dom.tableContextTarget.cell) return;

    const { table, cell } = App.dom.tableContextTarget;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    const row = cell.parentElement;
    const cellIndex = Array.from(row.children).indexOf(cell);
    const isInThead = row.parentElement.tagName === 'THEAD';
    const allRows = thead ? [thead.rows[0]] : [];
    if (tbody) {
      for (let i = 0; i < tbody.rows.length; i++) {
        allRows.push(tbody.rows[i]);
      }
    }

    switch (action) {
      case 'insert-row-above': {
        // 表头行不允许往上插入
        if (isInThead) return;
        const tbodyRows = tbody ? Array.from(tbody.rows) : [];
        const rowIdx = tbodyRows.indexOf(row);
        const newRow = tbody.insertRow(rowIdx);
        const totalCols = allRows[0].cells.length;
        const newRowIndex = rowIdx; // 新行在原位置
        for (let i = 0; i < totalCols; i++) {
          const td = document.createElement('td');
          td.innerHTML = `<span class="cell-content">行${newRowIndex + 1}列${i + 1}</span><span class="col-resize-handle"></span><span class="row-resize-handle"></span>`;
          newRow.appendChild(td);
        }
        break;
      }
      case 'insert-row-below': {
        const tbodyRows = tbody ? Array.from(tbody.rows) : [];
        if (isInThead) {
          // 表头行，在 tbody 第一行前插入
          if (tbody && tbody.rows.length > 0) {
            const newRow = tbody.insertRow(0);
            const totalCols = thead.rows[0].cells.length;
            for (let i = 0; i < totalCols; i++) {
              const td = document.createElement('td');
              td.innerHTML = `<span class="cell-content">行1列${i + 1}</span><span class="col-resize-handle"></span><span class="row-resize-handle"></span>`;
              newRow.appendChild(td);
            }
          } else if (tbody) {
            const newRow = tbody.insertRow();
            const totalCols = allRows[0].cells.length;
            for (let i = 0; i < totalCols; i++) {
              const td = document.createElement('td');
              td.innerHTML = `<span class="cell-content">行1列${i + 1}</span><span class="col-resize-handle"></span><span class="row-resize-handle"></span>`;
              newRow.appendChild(td);
            }
          }
        } else {
          const rowIdx = tbodyRows.indexOf(row);
          const newRow = tbody.insertRow(rowIdx + 1);
          const totalCols = allRows[0].cells.length;
          const newRowIndex = rowIdx + 2; // 新行在原行下方
          for (let i = 0; i < totalCols; i++) {
            const td = document.createElement('td');
            td.innerHTML = `<span class="cell-content">行${newRowIndex}列${i + 1}</span><span class="col-resize-handle"></span><span class="row-resize-handle"></span>`;
            newRow.appendChild(td);
          }
        }
        break;
      }
      case 'delete-row':
        if (isInThead) return; // 不允许删除表头行
        if (tbody && tbody.rows.length > 1) {
          const tbodyRows = Array.from(tbody.rows);
          const rowIdx = tbodyRows.indexOf(row);
          tbody.deleteRow(rowIdx);
        }
        break;
      case 'insert-col-left':
      case 'insert-col-right': {
        const isLeft = action === 'insert-col-left';
        const refIndex = isLeft ? cellIndex : cellIndex + 1;
        const totalCols = allRows[0].cells.length;
        const newColIndex = refIndex; // 新列的索引

        // 在表头插入
        if (thead && thead.rows[0]) {
          const th = document.createElement('th');
          th.innerHTML = `<span class="cell-content">列${newColIndex + 1}</span><span class="col-resize-handle"></span><span class="row-resize-handle"></span>`;
          // 复制相邻表头单元格的样式
          const refCell = thead.rows[0].cells[refIndex] || thead.rows[0].cells[refIndex - 1];
          if (refCell) {
            th.style.cssText = refCell.style.cssText;
          }
          thead.rows[0].insertBefore(th, thead.rows[0].cells[refIndex] || null);
        }

        // 在表体插入
        if (tbody) {
          for (let i = 0; i < tbody.rows.length; i++) {
            const td = document.createElement('td');
            td.innerHTML = `<span class="cell-content">行${i + 1}列${newColIndex + 1}</span><span class="col-resize-handle"></span><span class="row-resize-handle"></span>`;
            // 复制相邻单元格样式
            const refCell = tbody.rows[i].cells[refIndex] || tbody.rows[i].cells[refIndex - 1];
            if (refCell) {
              td.style.cssText = refCell.style.cssText;
            }
            tbody.rows[i].insertBefore(td, tbody.rows[i].cells[refIndex] || null);
          }
        }
        break;
      }
      case 'delete-col': {
        if (thead && thead.rows[0] && thead.rows[0].cells.length <= 1) return;
        if (tbody && tbody.rows[0] && tbody.rows[0].cells.length <= 1) return;

        // 删除表头列
        if (thead && thead.rows[0]) {
          thead.rows[0].deleteCell(cellIndex);
        }

        // 删除表体列
        if (tbody) {
          for (let i = 0; i < tbody.rows.length; i++) {
            tbody.rows[i].deleteCell(cellIndex);
          }
        }
        break;
      }
    }

    App.dom.tableContextMenu.classList.remove('visible');
    App.dom.tableContextTarget = null;
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

  App.table_context = {
    handleTableContextAction: handleTableContextAction,
    initTableResize: initTableResize,
  };

})(window.__App);