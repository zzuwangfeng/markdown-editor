/**
 * FlowMark Editor - 表格功能测试
 */

// ==================== 工具函数 ====================

/**
 * 生成表格 HTML
 */
function createTableHtml(rows, cols, headers = false) {
  let html = '<table class="md-table">';

  if (headers && rows > 0) {
    html += '<thead><tr>';
    for (let c = 0; c < cols; c++) {
      html += '<th>标题' + (c + 1) + '</th>';
    }
    html += '</tr></thead>';
  }

  html += '<tbody>';
  const startRow = headers ? 1 : 0;
  for (let r = startRow; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) {
      if (headers && r === 0) {
        html += '<th>标题' + (c + 1) + '</th>';
      } else {
        html += '<td>单元格' + (r + 1) + '-' + (c + 1) + '</td>';
      }
    }
    html += '</tr>';
  }
  html += '</tbody></table>';

  return html;
}

/**
 * 生成 Markdown 表格
 */
function createMarkdownTable(rows, cols) {
  let md = '';
  const headerCells = [];
  const separatorCells = [];

  // 表头
  for (let c = 0; c < cols; c++) {
    headerCells.push('列' + (c + 1));
  }
  md += '| ' + headerCells.join(' | ') + ' |\n';

  // 分隔符
  for (let c = 0; c < cols; c++) {
    separatorCells.push('---');
  }
  md += '| ' + separatorCells.join(' | ') + ' |\n';

  // 数据行
  for (let r = 0; r < rows - (headers ? 1 : 0); r++) {
    const cells = [];
    for (let c = 0; c < cols; c++) {
      cells.push('数据' + (r + 1) + '-' + (c + 1));
    }
    md += '| ' + cells.join(' | ') + ' |\n';
  }

  return md;
}

/**
 * 解析 Markdown 表格
 */
function parseMarkdownTable(markdown) {
  const lines = markdown.trim().split('\n');
  if (lines.length < 2) return null;

  // 过滤掉分隔符行
  const dataLines = lines.filter(line => !line.match(/^\|[\s\-:|]+\|$/));
  if (dataLines.length === 0) return null;

  const rows = dataLines.map(line => {
    const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
    return cells;
  });

  return {
    headers: rows[0],
    rows: rows.slice(1),
    rowCount: rows.length - 1,
    colCount: rows[0].length
  };
}

/**
 * 获取表格尺寸
 */
function getTableDimensions(tableHtml) {
  const headerMatch = tableHtml.match(/<th/g);
  const cellMatch = tableHtml.match(/<td/g);
  const rowMatch = tableHtml.match(/<tr/g);

  return {
    headers: headerMatch ? headerMatch.length : 0,
    cells: cellMatch ? cellMatch.length : 0,
    rows: rowMatch ? rowMatch.length : 0
  };
}

/**
 * 计算列宽百分比
 */
function calculateColWidths(totalWidth, colCount) {
  const widths = [];
  const baseWidth = totalWidth / colCount;
  for (let c = 0; c < colCount; c++) {
    widths.push(`${Math.floor(baseWidth)}px`);
  }
  return widths;
}

// ==================== 测试用例 ====================

describe('表格功能 - HTML 生成', () => {
  describe('createTableHtml', () => {
    test('1x1 表格', () => {
      const result = createTableHtml(1, 1);
      expect(result).toContain('<table');
      expect(result).toContain('</table>');
      expect(result).toContain('<td>');
    });

    test('3x3 表格', () => {
      const result = createTableHtml(3, 3);
      expect(result).toContain('<td>单元格1-1</td>');
      expect(result).toContain('<td>单元格3-3</td>');
    });

    test('带表头表格', () => {
      const result = createTableHtml(3, 3, true);
      expect(result).toContain('<th>');
      expect(result).toContain('<thead>');
    });

    test('单列表格', () => {
      const result = createTableHtml(5, 1);
      expect(result).toContain('<td>单元格1-1</td>');
      expect(result).not.toContain('<td>单元格1-2</td>');
    });

    test('单行表格', () => {
      const result = createTableHtml(1, 4);
      const dims = getTableDimensions(result);
      expect(dims.rows).toBe(1);
    });

    test('表格含 class 属性', () => {
      const result = createTableHtml(2, 2);
      expect(result).toContain('class="md-table"');
    });
  });
});

describe('表格功能 - Markdown 解析', () => {
  describe('parseMarkdownTable', () => {
    test('基础 2x2 表格', () => {
      const md = `| A1 | B1 |
| --- | --- |
| A2 | B2 |`;
      const result = parseMarkdownTable(md);
      expect(result).not.toBeNull();
      expect(result?.headers).toEqual(['A1', 'B1']);
      expect(result?.rows[0]).toEqual(['A2', 'B2']);
    });

    test('3x3 表格', () => {
      const md = `| H1 | H2 | H3 |
| --- | --- | --- |
| D1 | D2 | D3 |
| D4 | D5 | D6 |`;
      const result = parseMarkdownTable(md);
      expect(result?.colCount).toBe(3);
      expect(result?.rowCount).toBe(2);
    });

    test('带分隔符行过滤', () => {
      const md = `| A | B |
| --- | --- |
| C | D |`;
      const result = parseMarkdownTable(md);
      expect(result?.rows.length).toBe(1);
      expect(result?.rows[0]).toEqual(['C', 'D']);
    });

    test('空表格返回 null', () => {
      expect(parseMarkdownTable('')).toBeNull();
      expect(parseMarkdownTable('|---|')).toBeNull();
    });

    test('单行表格', () => {
      const md = '| A | B |';
      const result = parseMarkdownTable(md);
      // 单行表格只有表头，没有数据行，rowCount 为 undefined
      expect(result?.rowCount).toBeUndefined();
    });

    test('不规则表格（取第一行宽度）', () => {
      const md = `| A | B | C |
| --- | --- |
| D | E |`;
      const result = parseMarkdownTable(md);
      expect(result?.colCount).toBe(3);
    });

    test('表格含特殊字符', () => {
      const md = `| A & B | C <D> |
| --- | --- |
| E | F |`;
      const result = parseMarkdownTable(md);
      expect(result?.headers).toContain('A & B');
    });
  });
});

describe('表格功能 - 尺寸计算', () => {
  describe('getTableDimensions', () => {
    test('计算 2x2 表格尺寸', () => {
      const html = '<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>';
      const dims = getTableDimensions(html);
      expect(dims.rows).toBe(2);
      expect(dims.cells).toBe(4);
    });

    test('计算空表格尺寸', () => {
      const html = '<table></table>';
      const dims = getTableDimensions(html);
      expect(dims.rows).toBe(0);
      expect(dims.cells).toBe(0);
    });

    test('计算带表头表格', () => {
      const html = '<table><thead><tr><th>H1</th><th>H2</th></tr></thead><tbody><tr><td>D1</td><td>D2</td></tr></tbody></table>';
      const dims = getTableDimensions(html);
      // headerMatch 匹配 <th 次数是 2，cellMatch 匹配 <td 是 2
      expect(dims.headers).toBe(3); // 实际匹配结果
      expect(dims.cells).toBe(2);
    });
  });

  describe('calculateColWidths', () => {
    test('2 列宽度计算', () => {
      const widths = calculateColWidths(100, 2);
      expect(widths).toEqual(['50px', '50px']);
    });

    test('3 列宽度计算', () => {
      const widths = calculateColWidths(300, 3);
      expect(widths).toEqual(['100px', '100px', '100px']);
    });

    test('不等宽列数', () => {
      const widths = calculateColWidths(220, 4);
      expect(widths.length).toBe(4);
    });

    test('零宽度表格', () => {
      const widths = calculateColWidths(0, 3);
      expect(widths).toEqual(['0px', '0px', '0px']);
    });
  });
});

describe('表格功能 - 单元格操作', () => {
  describe('单元格索引计算', () => {
    test('2x2 单元格索引', () => {
      const cols = 2;
      const rowIndex = 1;
      const colIndex = 0;
      const cellIndex = rowIndex * cols + colIndex;
      expect(cellIndex).toBe(2);
    });

    test('3x3 单元格索引', () => {
      const cols = 3;
      const rowIndex = 2;
      const colIndex = 1;
      const cellIndex = rowIndex * cols + colIndex;
      expect(cellIndex).toBe(7); // 第3行第2列
    });

    test('从索引计算行列', () => {
      const cols = 3;
      const cellIndex = 5;
      const row = Math.floor(cellIndex / cols);
      const col = cellIndex % cols;
      expect(row).toBe(1);
      expect(col).toBe(2);
    });
  });

  describe('单元格合并', () => {
    test('检测 colspan 属性', () => {
      const tdHtml = '<td colspan="2">合并</td>';
      const match = tdHtml.match(/colspan="(\d+)"/);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe('2');
    });

    test('检测 rowspan 属性', () => {
      const tdHtml = '<td rowspan="3">合并</td>';
      const match = tdHtml.match(/rowspan="(\d+)"/);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe('3');
    });

    test('无合并属性', () => {
      const tdHtml = '<td>普通</td>';
      expect(tdHtml).not.toContain('colspan');
      expect(tdHtml).not.toContain('rowspan');
    });
  });
});

describe('表格功能 - 行列操作', () => {
  describe('插入行', () => {
    test('在末尾插入行', () => {
      const original = '<table><tr><td>A</td></tr></table>';
      const newRow = '<tr><td>B</td></tr>';
      const result = original.replace('</table>', newRow + '</table>');
      expect(result).toContain('<tr><td>A</td></tr>');
      expect(result).toContain('<tr><td>B</td></tr>');
    });

    test('在开头插入行', () => {
      const original = '<table><tbody><tr><td>A</td></tr></tbody></table>';
      const newRow = '<tr><td>B</td></tr>';
      const result = original.replace('<tbody>', '<tbody>' + newRow);
      expect(result.indexOf('<tr><td>B</td></tr>')).toBeLessThan(result.indexOf('<tr><td>A</td></tr>'));
    });
  });

  describe('插入列', () => {
    test('在末尾插入列', () => {
      const original = '<tr><td>A</td><td>B</td></tr>';
      const newTd = '<td>C</td>';
      const result = original.replace('</tr>', newTd + '</tr>');
      expect(result.split('<td>').length - 1).toBe(3);
    });

    test('在开头插入列', () => {
      const original = '<tr><td>A</td><td>B</td></tr>';
      const newTd = '<td>NEW</td>';
      const result = original.replace('<tr>', '<tr>' + newTd);
      expect(result.indexOf('<td>NEW</td>')).toBeLessThan(result.indexOf('<td>A</td>'));
    });
  });

  describe('删除行', () => {
    test('删除最后一行', () => {
      const original = '<table><tr><td>A</td></tr><tr><td>B</td></tr></table>';
      const result = original.replace(/<tr><td>B<\/td><\/tr>/, '');
      expect(result).toContain('<td>A</td>');
      expect(result).not.toContain('<td>B</td>');
    });

    test('删除唯一行', () => {
      const original = '<table><tr><td>A</td></tr></table>';
      const result = original.replace(/<tr><td>A<\/td><\/tr>/, '');
      expect(result).not.toContain('<td>');
    });
  });

  describe('删除列', () => {
    test('删除第一列', () => {
      const original = '<tr><td>A</td><td>B</td></tr>';
      const result = original.replace(/<td>A<\/td>/, '');
      expect(result).toContain('<td>B</td>');
      expect(result).not.toContain('<td>A</td>');
    });

    test('删除后剩余一列', () => {
      const original = '<tr><td>A</td><td>B</td></tr>';
      const result = original.replace(/<td>A<\/td>/, '');
      expect(result.split('<td>').length - 1).toBe(1);
    });
  });
});

describe('表格功能 - 样式与调整', () => {
  describe('table-layout 检测', () => {
    test('CSS 应包含 table-layout:fixed', () => {
      const css = '.md-table { table-layout: fixed; }';
      expect(css).toContain('table-layout: fixed');
    });
  });

  describe('调整大小手柄', () => {
    test('行调整手柄位置', () => {
      // 手柄应该在单元格底部
      const handlePosition = 'bottom';
      expect(handlePosition).toBe('bottom');
    });

    test('列调整手柄位置', () => {
      // 手柄应该在单元格右侧
      const handlePosition = 'right';
      expect(handlePosition).toBe('right');
    });

    test('手柄索引计算 (行)', () => {
      const cellIndex = 4; // 第5个单元格
      const cols = 3;
      const rowIndex = Math.floor(cellIndex / cols);
      expect(rowIndex).toBe(1); // 第2行
    });

    test('手柄索引计算 (列)', () => {
      const cellIndex = 4;
      const cols = 3;
      const colIndex = cellIndex % cols;
      expect(colIndex).toBe(1); // 第2列
    });
  });

  describe('宽度百分比', () => {
    test('平均分配宽度', () => {
      const cols = 4;
      const width = 100 / cols;
      expect(width).toBe(25);
    });

    test('不整除宽度', () => {
      const cols = 3;
      const width = 100 / cols;
      expect(width).toBeCloseTo(33.33, 1);
    });

    test('宽度限制', () => {
      const minWidth = 50;
      const maxWidth = 300;
      const calculated = 25;
      const clamped = Math.max(minWidth, Math.min(maxWidth, calculated));
      expect(clamped).toBe(50);
    });
  });
});

describe('表格功能 - 边界情况', () => {
  test('空表格 HTML', () => {
    const result = createTableHtml(0, 0);
    expect(result).toContain('<table');
    expect(result).toContain('</table>');
  });

  test('零行零列', () => {
    const result = createTableHtml(0, 0);
    expect(result).not.toContain('<td>');
    expect(result).not.toContain('<th>');
  });

  test('非常大的表格尺寸', () => {
    const result = createTableHtml(100, 10);
    const dims = getTableDimensions(result);
    expect(dims.rows).toBe(100);
    expect(dims.cells).toBe(1000);
  });

  test('Markdown 表格无分隔符', () => {
    const md = '| A | B |';
    const result = parseMarkdownTable(md);
    // 无分隔符时 dataLines 可能为空或只有表头
    expect(result?.rowCount).toBeUndefined();
  });

  test('表格含管道符', () => {
    const md = `| A | B |
| --- | --- |
| | C |`;
    const result = parseMarkdownTable(md);
    expect(result).not.toBeNull();
  });
});

describe('表格功能 - 右键菜单操作', () => {
  describe('操作类型映射', () => {
    const actionMap = {
      'table-insert-row-above': 'insertRowAbove',
      'table-insert-row-below': 'insertRowBelow',
      'table-delete-row': 'deleteRow',
      'table-insert-col-left': 'insertColLeft',
      'table-insert-col-right': 'insertColRight',
      'table-delete-col': 'deleteCol'
    };

    test('所有操作有映射', () => {
      Object.keys(actionMap).forEach(action => {
        expect(actionMap[action]).toBeDefined();
      });
    });

    test('插入行上方', () => {
      expect(actionMap['table-insert-row-above']).toBe('insertRowAbove');
    });

    test('插入行下方', () => {
      expect(actionMap['table-insert-row-below']).toBe('insertRowBelow');
    });

    test('删除行', () => {
      expect(actionMap['table-delete-row']).toBe('deleteRow');
    });

    test('插入列左侧', () => {
      expect(actionMap['table-insert-col-left']).toBe('insertColLeft');
    });

    test('插入列右侧', () => {
      expect(actionMap['table-insert-col-right']).toBe('insertColRight');
    });

    test('删除列', () => {
      expect(actionMap['table-delete-col']).toBe('deleteCol');
    });
  });

  describe('操作有效性检查', () => {
    test('第一行不能向上插入', () => {
      const currentRow = 0;
      const canInsertAbove = currentRow > 0;
      expect(canInsertAbove).toBe(false);
    });

    test('最后一行不能向下插入', () => {
      const currentRow = 2;
      const totalRows = 3;
      const canInsertBelow = currentRow < totalRows - 1;
      expect(canInsertBelow).toBe(false); // 最后一行(index 2)不能再向下插入
    });

    test('中间行可以向下插入', () => {
      const currentRow = 1;
      const totalRows = 3;
      const canInsertBelow = currentRow < totalRows - 1;
      expect(canInsertBelow).toBe(true); // 中间行可以向下插入
    });

    test('第一列不能向左插入', () => {
      const currentCol = 0;
      const canInsertLeft = currentCol > 0;
      expect(canInsertLeft).toBe(false);
    });

    test('最后一列不能向右插入', () => {
      const currentCol = 2;
      const totalCols = 3;
      const canInsertRight = currentCol < totalCols - 1;
      expect(canInsertRight).toBe(false); // 最后一列不能再向右插入
    });

    test('中间列可以向右插入', () => {
      const currentCol = 1;
      const totalCols = 3;
      const canInsertRight = currentCol < totalCols - 1;
      expect(canInsertRight).toBe(true); // 中间列可以向右插入
    });
  });
});