// FlowMark - markdown/converter
(function(App) {
  'use strict';

  /**
   * 清理预览 HTML，移除空白元素
   */
  function cleanPreviewHTML(html) {
    var codeBlocks = [];
    html = html.replace(/<pre class="code-block"><code[^>]*>[\s\S]*?<\/code><\/pre>/gi, function(match) {
      codeBlocks.push(match);
      return '\x00CB' + (codeBlocks.length - 1) + '\x00';
    });

    var inlineCodes = [];
    html = html.replace(/<code[^>]*>[\s\S]*?<\/code>/gi, function(match) {
      inlineCodes.push(match);
      return '\x00IC' + (inlineCodes.length - 1) + '\x00';
    });

    var blockTags = 'h[1-6]|p|ul|ol|blockquote|pre|div|table|hr|li';
    html = html.replace(/<p><br\s*\/?><\/p>/gi, '');
    html = html.replace(/<p><\/p>/gi, '');
    html = html.replace(/<p>(&nbsp;|\s)+<\/p>/gi, '');
    html = html.replace(/<div><br\s*\/?><\/div>/gi, '');
    html = html.replace(/<div>\s*<\/div>/gi, '');
    html = html.replace(new RegExp('<\\/(' + blockTags + ')>(\\s*<br\\s*\\/?>)+(\\s*)<(' + blockTags + ')', 'gi'), '</$1>$3<$4');
    html = html.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');
    html = html.replace(/^(<br\s*\/?>\s*)+/i, '');
    html = html.replace(/(\s*<br\s*\/?>)+$/i, '');

    for (var i = 0; i < inlineCodes.length; i++) {
      html = html.replace('\x00IC' + i + '\x00', inlineCodes[i]);
    }
    for (var j = 0; j < codeBlocks.length; j++) {
      html = html.replace('\x00CB' + j + '\x00', codeBlocks[j]);
    }
    return html;
  }

  /**
   * 解析 Markdown 表格 - 按行解析，正确处理多个相邻表格
   */
  function parseMarkdownTable(content) {
    var result = '';
    var lines = content.split('\n');
    var inTable = false;
    var tableLines = [];
    var tableHeader = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      line = line.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
      var trimmed = line.trim();

      // 检查是否是表格分隔行
      var isHeaderSeparator = /^\s*\|?(\s*:?[-=]+:?\s*\|)+\s*:?[-=]+:?\s*\|?\s*$/.test(trimmed);
      var isTableLine = /^\s*\|/.test(trimmed) || (trimmed.includes('|') && !trimmed.startsWith('#'));

      if (isHeaderSeparator && !inTable) {
        continue;
      }

      if (isTableLine || isHeaderSeparator) {
        inTable = true;
        if (isHeaderSeparator) {
          tableHeader = true;
        }
        tableLines.push(line);
      } else {
        if (inTable) {
          result += convertTableToHTML(tableLines, tableHeader) + '\n';
          tableLines = [];
          tableHeader = false;
          inTable = false;
        }
        result += line + '\n';
      }
    }

    if (inTable) {
      result += convertTableToHTML(tableLines, tableHeader);
    }

    return result;
  }

  function convertTableToHTML(lines, hasHeader) {
    var html = '<table class="md-table">';
    var inHeader = hasHeader;

    lines.forEach((line, index) => {
      // 处理表格分隔行（-----）
      if (/^\s*\|?(\s*:?[-=]+:?\s*\|)+\s*:?[-=]+:?\s*\|?\s*$/.test(line.trim())) {
        return;
      }

      var cells = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
      if (cells.length > 0) {
        html += '<tr>';
        cells.forEach((cell, cellIndex) => {
          var tag = inHeader ? 'th' : 'td';
          html += '<' + tag + '><div class="cell-content">' + processTableCellContent(cell) + '</div>';
          if (cellIndex < cells.length - 1) {
            html += '<div class="col-resize-handle"></div>';
          }
          html += '</' + tag + '>';
        });
        html += '</tr>';
        inHeader = false;
      }
    });

    html += '</table>';
    return html;
  }

  /**
   * Markdown → HTML 转换
   */
  function markdownToHtml(markdown) {
    if (!markdown) return '';

    // 先处理表格
    var html = parseMarkdownTable(markdown);
    var lines = html.split('\n');
    var result = [];
    var inCodeBlock = false;
    var codeBlockLang = '';
    var codeBlockContent = [];
    var inListType = null;
    var listItemsBuffer = [];

    function flushList() {
      if (!inListType || listItemsBuffer.length === 0) return;
      var listHtml = '<' + inListType + '>';
      for (var k = 0; k < listItemsBuffer.length; k++) {
        listHtml += '<li>' + listItemsBuffer[k] + '</li>';
      }
      listHtml += '</' + inListType + '>';
      result.push(listHtml);
      inListType = null;
      listItemsBuffer = [];
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      line = line.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
      if (/^<table/.test(line.trim())) {
        result.push(line);
        continue;
      }

      // 代码块检测
      var codeBlockMatch = line.match(/^\s*```(\w*)\s*$/);
      if (codeBlockMatch) {
        if (inCodeBlock) {
          var codeLines = codeBlockContent.length > 0 ? codeBlockContent.join('\n') : '';
          var escapedLines = escapeHTML(codeLines);
          var hasContent = escapedLines.length > 0;
          result.push(
            '<div class="code-block-wrapper">' +
            (codeBlockLang ? '<div class="code-lang-line">' + codeBlockLang + '</div>' : '') +
            '<pre class="code-block"><code contenteditable="true">' + (hasContent ? escapedLines.replace(/\n/g, '<br>') : '<br>') + '</code></pre>' +
            '</div>'
          );
          inCodeBlock = false;
          codeBlockLang = '';
          codeBlockContent = [];
        } else {
          inCodeBlock = true;
          codeBlockLang = codeBlockMatch[1] || '';
          codeBlockContent = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // 处理其他 Markdown 语法
      // 链接 [text](url)
      line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
      // 粗体 **text**
      line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // 斜体 *text*
      line = line.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      // 行内代码 `code`
      line = line.replace(/`([^`]+)`/g, '<code>$1</code>');
      // 水平线 ---
      if (/^\s*[-*_]{3,}\s*$/.test(line)) {
        line = '<hr>';
      }
      // 标题 # h1, ## h2
      line = line.replace(/^#{6}\s+(.+)$/, '<h6>$1</h6>');
      line = line.replace(/^#{5}\s+(.+)$/, '<h5>$1</h5>');
      line = line.replace(/^#{4}\s+(.+)$/, '<h4>$1</h4>');
      line = line.replace(/^#{3}\s+(.+)$/, '<h3>$1</h3>');
      line = line.replace(/^#{2}\s+(.+)$/, '<h2>$1</h2>');
      line = line.replace(/^#\s+(.+)$/, '<h1>$1</h1>');
      // 引用 >
      if (/^\s*>/.test(line)) {
        line = line.replace(/^\s*>\s*/, '');
        line = '<blockquote>' + line + '</blockquote>';
      }
      var isUnordered = /^\s*[-*]\s+/.test(line);
      var isOrdered = /^\s*\d+\.\s+/.test(line);

      if (isUnordered || isOrdered) {
        var listType = isUnordered ? 'ul' : 'ol';
        if (isUnordered) {
          line = line.replace(/^\s*[-*]\s+/, '');
        } else {
          line = line.replace(/^\s*\d+\.\s+/, '');
        }

        if (inListType !== listType) {
          flushList();
        }
        inListType = listType;
        listItemsBuffer.push(line);
      } else {
        flushList();
        if (line.trim() === '') {
        } else if (/^<(h[1-6]|hr|blockquote)[\s>]/.test(line)) {
          result.push(line);
        } else {
          result.push('<p>' + line + '</p>');
        }
      }
    }

    flushList();

    return result.join('\n');
  }

  /**
   * HTML → Markdown 转换
   */
  function htmlToMarkdown(html) {
    var md = '';
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    var children = Array.from(tempDiv.childNodes);
    for (var j = 0; j < children.length; j++) {
      var node = children[j];
      if (node.nodeType === Node.TEXT_NODE) {
        md += node.textContent;
        continue;
      }
      if (node.tagName) {
        switch (node.tagName.toLowerCase()) {
          case 'h1':
            md += '# ' + node.textContent + '\n\n';
            break;
          case 'h2':
            md += '## ' + node.textContent + '\n\n';
            break;
          case 'h3':
            md += '### ' + node.textContent + '\n\n';
            break;
          case 'h4':
            md += '#### ' + node.textContent + '\n\n';
            break;
          case 'h5':
            md += '##### ' + node.textContent + '\n\n';
            break;
          case 'h6':
            md += '###### ' + node.textContent + '\n\n';
            break;
          case 'p':
            md += processInlineElements(node) + '\n\n';
            break;
          case 'blockquote':
            md += '> ' + processInlineElements(node) + '\n\n';
            break;
          case 'ul':
            Array.from(node.children).forEach(li => {
              md += '- ' + processInlineElements(li) + '\n';
            });
            md += '\n';
            break;
          case 'ol':
            Array.from(node.children).forEach((li, idx) => {
              md += (idx + 1) + '. ' + processInlineElements(li) + '\n';
            });
            md += '\n';
            break;
          case 'hr':
            md += '---\n\n';
            break;
          case 'div':
            if (node.classList.contains('code-block-wrapper')) {
              var pre = node.querySelector('pre');
              var code = pre ? getCodeBlockText(pre) : '';
              code = code.replace(/\n+$/, '');
              var langLine = node.querySelector('.code-lang-line');
              var lang = langLine ? langLine.textContent : '';
              md += '```' + lang + '\n' + code + '\n```\n\n';
            } else if (node.classList.contains('table-container')) {
              var table = node.querySelector('table');
              if (table) md += convertHTMLTableToMarkdown(table);
            } else {
              md += htmlToMarkdown(node.innerHTML);
            }
            break;
          case 'table':
            md += convertHTMLTableToMarkdown(node);
            break;
        }
      }
    }

    // 清理
    md = md.replace(/\n{3,}/g, '\n\n');
    md = md.trim();

    return md;
  }

  function escapeHTML(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function processTableCellContent(cell) {
    var escaped = escapeHTML(cell);
    escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
    return escaped;
  }

  function getCodeBlockText(pre) {
    var code = pre.querySelector('code') || pre;
    var text = '';
    for (var i = 0; i < code.childNodes.length; i++) {
      var child = code.childNodes[i];
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent;
      } else if (child.nodeName === 'BR') {
        text += '\n';
      }
    }
    return text;
  }

  function processInlineElements(node) {
    var html = '';
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        html += child.textContent;
      } else if (child.tagName) {
        switch (child.tagName.toLowerCase()) {
          case 'strong':
          case 'b':
            html += '**' + processInlineElements(child) + '**';
            break;
          case 'em':
          case 'i':
            html += '*' + processInlineElements(child) + '*';
            break;
          case 'code':
            html += '`' + child.textContent + '`';
            break;
          case 'a':
            html += '[' + processInlineElements(child) + '](' + child.href + ')';
            break;
          case 'img':
            html += '![' + (child.alt || '') + '](' + child.src + ')';
            break;
          default:
            html += processInlineElements(child);
        }
      }
    });
    return html;
  }

  function convertHTMLTableToMarkdown(table) {
    var md = '';
    var rows = Array.from(table.rows);
    var maxWidths = [];
    var cellContents = [];

    // 先获取所有单元格内容和最大宽度
    rows.forEach((row, rowIndex) => {
      var cells = Array.from(row.cells);
      cellContents[rowIndex] = [];
      cells.forEach((cell, colIndex) => {
        var text = cell.textContent.trim();
        cellContents[rowIndex][colIndex] = text;
        if (!maxWidths[colIndex]) maxWidths[colIndex] = 0;
        maxWidths[colIndex] = Math.max(maxWidths[colIndex], text.length);
      });
    });

    // 生成 Markdown
    rows.forEach((row, rowIndex) => {
      var cells = Array.from(row.cells);
      var line = '|';
      cells.forEach((cell, colIndex) => {
        var text = cellContents[rowIndex][colIndex];
        var padding = ' '.repeat(Math.max(0, maxWidths[colIndex] - text.length));
        line += ' ' + text + padding + ' |';
      });
      md += line + '\n';

      // 生成表头分隔线
      if (rowIndex === 0) {
        var separator = '|';
        cells.forEach((_, colIndex) => {
          separator += ' ' + '-'.repeat(maxWidths[colIndex]) + ' |';
        });
        md += separator + '\n';
      }
    });

    return md + '\n';
  }

  App.converter = {
    cleanPreviewHTML: cleanPreviewHTML,
    markdownToHtml: markdownToHtml,
    htmlToMarkdown: htmlToMarkdown,
    parseMarkdownTable: parseMarkdownTable
  };

})(window.__App);
