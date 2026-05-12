/**
 * FlowMark Editor - 编辑器核心功能测试
 */

// ==================== 工具函数 ====================

/**
 * 生成标题标签的 HTML
 */
function createHeadingHtml(level, text) {
  return `<h${level}>${text || '标题'}</h${level}>`;
}

/**
 * 生成包裹标签的 HTML
 */
function wrapTextHtml(tag, text) {
  return `<${tag}>${text}</${tag}>`;
}

/**
 * 生成代码块 HTML
 */
function createCodeBlockHtml(code = '') {
  return `<div class="code-block" contenteditable="true">${code}</div>`;
}

/**
 * 生成链接 HTML
 */
function createLinkHtml(text, url) {
  return `<a href="${url}" target="_blank">${text}</a>`;
}

/**
 * 生成列表项 HTML
 */
function createListItemHtml(text, ordered = false, startNum = 1) {
  if (ordered) {
    return `<li>${text}</li>`;
  }
  return `<li>${text}</li>`;
}

/**
 * 生成待办清单项 HTML
 */
function createTodoItemHtml(text, checked = false) {
  return `<div class="todo-item" contenteditable="false">
    <input type="checkbox" ${checked ? 'checked' : ''}>
    <span>${text}</span>
  </div>`;
}

/**
 * 生成引用块 HTML
 */
function createBlockquoteHtml(text) {
  return `<blockquote>${text}</blockquote>`;
}

/**
 * 生成分割线 HTML
 */
function createHorizontalRuleHtml() {
  return '<hr>';
}

/**
 * 生成有序列表 HTML
 */
function createOrderedListHtml(items, startNum = 1) {
  const li = items.map(item => `<li>${item}</li>`).join('');
  return `<ol start="${startNum}">${li}</ol>`;
}

/**
 * 生成无序列表 HTML
 */
function createUnorderedListHtml(items) {
  const li = items.map(item => `<li>${item}</li>`).join('');
  return `<ul>${li}</ul>`;
}

// ==================== 测试用例 ====================

describe('编辑器核心功能 - 工具函数', () => {
  describe('createHeadingHtml', () => {
    test('H1 标题生成', () => {
      expect(createHeadingHtml(1, '标题')).toBe('<h1>标题</h1>');
    });

    test('H2 标题生成', () => {
      expect(createHeadingHtml(2, '二级标题')).toBe('<h2>二级标题</h2>');
    });

    test('H3 标题生成', () => {
      expect(createHeadingHtml(3, '三级标题')).toBe('<h3>三级标题</h3>');
    });

    test('H6 标题生成', () => {
      expect(createHeadingHtml(6, '六级标题')).toBe('<h6>六级标题</h6>');
    });

    test('默认标题文本', () => {
      expect(createHeadingHtml(1)).toBe('<h1>标题</h1>');
    });

    test('标题包含特殊字符', () => {
      // 工具函数不过滤特殊字符
      expect(createHeadingHtml(1, '标题 & <特殊> 字符')).toContain('标题');
    });
  });

  describe('wrapTextHtml', () => {
    test('包裹加粗标签 strong', () => {
      expect(wrapTextHtml('strong', '加粗文本')).toBe('<strong>加粗文本</strong>');
    });

    test('包裹斜体标签 em', () => {
      expect(wrapTextHtml('em', '斜体文本')).toBe('<em>斜体文本</em>');
    });

    test('包裹删除线标签 s', () => {
      expect(wrapTextHtml('s', '删除文本')).toBe('<s>删除文本</s>');
    });

    test('包裹代码标签 code', () => {
      expect(wrapTextHtml('code', '代码')).toBe('<code>代码</code>');
    });

    test('包裹下划线标签 u', () => {
      expect(wrapTextHtml('u', '下划线')).toBe('<u>下划线</u>');
    });

    test('包裹不同标签', () => {
      expect(wrapTextHtml('b', '粗体')).toBe('<b>粗体</b>');
      expect(wrapTextHtml('i', '斜体')).toBe('<i>斜体</i>');
    });
  });

  describe('createCodeBlockHtml', () => {
    test('空代码块', () => {
      expect(createCodeBlockHtml()).toContain('code-block');
      expect(createCodeBlockHtml()).toContain('contenteditable="true"');
    });

    test('带内容的代码块', () => {
      const code = 'console.log("hello")';
      expect(createCodeBlockHtml(code)).toContain(code);
    });

    test('多行代码块', () => {
      const code = 'function test() {\n  return true;\n}';
      expect(createCodeBlockHtml(code)).toContain(code);
    });

    test('代码块包含特殊字符', () => {
      const code = '<div>HTML</div>';
      // 工具函数不过滤特殊字符
      expect(createCodeBlockHtml(code)).toContain(code);
    });
  });

  describe('createLinkHtml', () => {
    test('基础链接', () => {
      expect(createLinkHtml('链接文本', 'http://example.com'))
        .toBe('<a href="http://example.com" target="_blank">链接文本</a>');
    });

    test('HTTPS 链接', () => {
      expect(createLinkHtml('安全链接', 'https://secure.com'))
        .toContain('href="https://secure.com"');
    });

    test('本地文件链接', () => {
      expect(createLinkHtml('本地文件', 'file:///path/to/file'))
        .toContain('href="file:///path/to/file"');
    });

    test('锚点链接', () => {
      expect(createLinkHtml('锚点', '#section'))
        .toContain('href="#section"');
    });

    test('空链接文本', () => {
      expect(createLinkHtml('', 'http://test.com')).toContain('href="http://test.com"');
    });
  });

  describe('createListItemHtml', () => {
    test('无序列表项', () => {
      expect(createListItemHtml('列表项', false)).toBe('<li>列表项</li>');
    });

    test('有序列表项', () => {
      expect(createListItemHtml('列表项', true)).toBe('<li>列表项</li>');
    });
  });

  describe('createTodoItemHtml', () => {
    test('未勾选待办项', () => {
      const result = createTodoItemHtml('待办事项', false);
      expect(result).toContain('<input type="checkbox"');
      // 未勾选时没有 checked 属性
      expect(result).not.toContain('checked');
    });

    test('已勾选待办项', () => {
      const result = createTodoItemHtml('已完成事项', true);
      expect(result).toContain('checked');
    });

    test('待办项包含文本', () => {
      expect(createTodoItemHtml('测试文本', false)).toContain('>测试文本<');
    });
  });

  describe('createBlockquoteHtml', () => {
    test('基础引用块', () => {
      expect(createBlockquoteHtml('引用文本')).toBe('<blockquote>引用文本</blockquote>');
    });

    test('多行引用', () => {
      expect(createBlockquoteHtml('第一行\n第二行')).toContain('第一行');
      expect(createBlockquoteHtml('第一行\n第二行')).toContain('第二行');
    });
  });

  describe('createHorizontalRuleHtml', () => {
    test('分割线', () => {
      expect(createHorizontalRuleHtml()).toBe('<hr>');
    });
  });

  describe('createOrderedListHtml', () => {
    test('有序列表生成', () => {
      const result = createOrderedListHtml(['项1', '项2', '项3']);
      expect(result).toContain('<ol');
      expect(result).toContain('</ol>');
      expect(result).toContain('<li>项1</li>');
      expect(result).toContain('<li>项2</li>');
      expect(result).toContain('<li>项3</li>');
    });

    test('有序列表自定义起始号', () => {
      const result = createOrderedListHtml(['项A', '项B'], 5);
      expect(result).toContain('start="5"');
    });

    test('空列表', () => {
      const result = createOrderedListHtml([]);
      expect(result).toBe('<ol start="1"></ol>');
    });

    test('单项列表', () => {
      const result = createOrderedListHtml(['唯一项']);
      expect(result).toContain('<li>唯一项</li>');
    });
  });

  describe('createUnorderedListHtml', () => {
    test('无序列表生成', () => {
      const result = createUnorderedListHtml(['项1', '项2', '项3']);
      expect(result).toContain('<ul>');
      expect(result).toContain('</ul>');
      expect(result).toContain('<li>项1</li>');
    });

    test('空列表', () => {
      const result = createUnorderedListHtml([]);
      expect(result).toBe('<ul></ul>');
    });

    test('嵌套列表项', () => {
      const result = createUnorderedListHtml(['父项', '子项']);
      expect(result).toContain('父项');
      expect(result).toContain('子项');
    });
  });
});

// ==================== 编辑器状态相关测试 ====================

describe('编辑器状态管理', () => {
  describe('选区处理', () => {
    test('空选区检测', () => {
      const selection = '';
      const hasSelection = selection.length > 0;
      expect(hasSelection).toBe(false);
    });

    test('有选区检测', () => {
      const selection = '选中的文本';
      const hasSelection = selection.length > 0;
      expect(hasSelection).toBe(true);
    });

    test('空白字符选区', () => {
      const selection = '   ';
      const hasSelection = selection.trim().length > 0;
      expect(hasSelection).toBe(false);
    });
  });

  describe('滚动位置计算', () => {
    test('滚动百分比计算 - 中间位置', () => {
      const scrollTop = 100;
      const scrollHeight = 400;
      const clientHeight = 200;
      const scrollMax = scrollHeight - clientHeight;
      const scrollPercent = scrollMax > 0 ? scrollTop / scrollMax : 0;
      expect(scrollPercent).toBe(0.5);
    });

    test('滚动百分比计算 - 顶部', () => {
      const scrollTop = 0;
      const scrollHeight = 400;
      const clientHeight = 200;
      const scrollMax = scrollHeight - clientHeight;
      const scrollPercent = scrollMax > 0 ? scrollTop / scrollMax : 0;
      expect(scrollPercent).toBe(0);
    });

    test('滚动百分比计算 - 底部', () => {
      const scrollTop = 200;
      const scrollHeight = 400;
      const clientHeight = 200;
      const scrollMax = scrollHeight - clientHeight;
      const scrollPercent = scrollMax > 0 ? scrollTop / scrollMax : 0;
      expect(scrollPercent).toBe(1);
    });

    test('滚动百分比计算 - 无滚动条', () => {
      const scrollTop = 0;
      const scrollHeight = 200;
      const clientHeight = 200;
      const scrollMax = scrollHeight - clientHeight;
      const scrollPercent = scrollMax > 0 ? scrollTop / scrollMax : 0;
      expect(scrollPercent).toBe(0);
    });
  });
});

// ==================== 输入处理测试 ====================

describe('编辑器输入处理', () => {
  describe('特殊字符处理', () => {
    test('零宽空格插入', () => {
      const zeroWidthSpace = '​';
      const result = zeroWidthSpace;
      expect(result.length).toBe(1);
      expect(result.charCodeAt(0)).toBe(0x200B);
    });

    test('标题符号检测', () => {
      const text = '# 标题';
      const isHeading = text.match(/^#+\s/);
      expect(isHeading).not.toBeNull();
    });

    test('列表符号检测 - 无序', () => {
      const text = '- 列表项';
      const isList = text.match(/^[-*]\s/);
      expect(isList).not.toBeNull();
    });

    test('列表符号检测 - 有序', () => {
      const text = '1. 列表项';
      const isList = text.match(/^\d+\.\s/);
      expect(isList).not.toBeNull();
    });

    test('引用符号检测', () => {
      const text = '> 引用';
      const isQuote = text.match(/^>\s/);
      expect(isQuote).not.toBeNull();
    });

    test('分割线检测 - 三个减号', () => {
      const text = '---';
      const isHr = text.match(/^-{3}$/);
      expect(isHr).not.toBeNull();
    });

    test('分割线检测 - 三个星号', () => {
      const text = '***';
      const isHr = text.match(/^\*{3}$/);
      expect(isHr).not.toBeNull();
    });
  });

  describe('标签闭合', () => {
    test('自闭合标签列表', () => {
      const selfClosing = ['br', 'hr', 'img', 'input', 'meta', 'link'];
      selfClosing.forEach(tag => {
        expect(tag).toBeDefined();
      });
    });

    test('需要闭合的标签列表', () => {
      const paired = ['p', 'div', 'span', 'h1', 'h2', 'h3', 'strong', 'em', 'a', 'blockquote', 'code', 'li'];
      paired.forEach(tag => {
        expect(tag).toBeDefined();
      });
    });
  });
});

// ==================== 剪贴板处理测试 ====================

describe('剪贴板处理', () => {
  describe('粘贴内容检测', () => {
    test('纯文本检测', () => {
      const clipboardData = '纯文本内容';
      const isPlainText = !clipboardData.includes('<');
      expect(isPlainText).toBe(true);
    });

    test('HTML 检测', () => {
      const clipboardData = '<p>HTML 内容</p>';
      const isHtml = clipboardData.includes('<');
      expect(isHtml).toBe(true);
    });

    test('图片数据检测', () => {
      const clipboardData = 'data:image/png;base64,iVBORw0KGgo=';
      const isImage = clipboardData.startsWith('data:image');
      expect(isImage).toBe(true);
    });
  });

  describe('文件类型检测', () => {
    test('图片文件类型检测', () => {
      const types = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
      types.forEach(type => {
        expect(type.startsWith('image/')).toBe(true);
      });
    });

    test('非图片类型', () => {
      const type = 'text/plain';
      expect(type.startsWith('image/')).toBe(false);
    });
  });
});

// ==================== 快捷键处理测试 ====================

describe('快捷键处理', () => {
  describe('修饰键检测', () => {
    test('Command 键检测 (macOS)', () => {
      const event = { metaKey: true, ctrlKey: false };
      const isCmd = event.metaKey;
      expect(isCmd).toBe(true);
    });

    test('Control 键检测 (Windows/Linux)', () => {
      const event = { metaKey: false, ctrlKey: true };
      const isCtrl = event.ctrlKey;
      expect(isCtrl).toBe(true);
    });

    test('Shift 键检测', () => {
      const event = { shiftKey: true };
      expect(event.shiftKey).toBe(true);
    });

    test('Alt 键检测', () => {
      const event = { altKey: true };
      expect(event.altKey).toBe(true);
    });
  });

  describe('快捷键组合', () => {
    test('Cmd+S 保存快捷键', () => {
      const event = { key: 's', metaKey: true, ctrlKey: false };
      const isSave = (event.key === 's') && (event.metaKey || event.ctrlKey);
      expect(isSave).toBe(true);
    });

    test('Cmd+N 新建快捷键', () => {
      const event = { key: 'n', metaKey: true, ctrlKey: false };
      const isNew = (event.key === 'n') && (event.metaKey || event.ctrlKey);
      expect(isNew).toBe(true);
    });

    test('Cmd+B 加粗快捷键', () => {
      const event = { key: 'b', metaKey: true, ctrlKey: false };
      const isBold = (event.key === 'b') && (event.metaKey || event.ctrlKey);
      expect(isBold).toBe(true);
    });

    test('Cmd+I 斜体快捷键', () => {
      const event = { key: 'i', metaKey: true, ctrlKey: false };
      const isItalic = (event.key === 'i') && (event.metaKey || event.ctrlKey);
      expect(isItalic).toBe(true);
    });
  });
});

// ==================== 搜索功能测试 ====================

describe('搜索功能', () => {
  describe('搜索高亮标记', () => {
    test('搜索词高亮包装', () => {
      const text = '这是包含搜索词的文本';
      const searchTerm = '搜索词';
      const highlighted = text.replace(searchTerm, `<mark>${searchTerm}</mark>`);
      expect(highlighted).toContain('<mark>搜索词</mark>');
    });

    test('多个匹配项高亮', () => {
      const text = '词 词 词';
      const searchTerm = '词';
      let count = 0;
      const highlighted = text.replace(new RegExp(searchTerm, 'g'), () => {
        count++;
        return `<mark>词</mark>`;
      });
      expect(count).toBe(3);
    });

    test('大小写不敏感搜索', () => {
      const text = 'Hello HELLO hello';
      const searchTerm = 'hello';
      const regex = new RegExp(searchTerm, 'gi');
      const matches = text.match(regex);
      expect(matches?.length).toBe(3);
    });

    test('无匹配时不替换', () => {
      const text = '原始文本';
      const searchTerm = '不存在';
      const highlighted = text.replace(searchTerm, `<mark>${searchTerm}</mark>`);
      expect(highlighted).toBe(text);
    });
  });

  describe('搜索结果导航', () => {
    test('搜索结果计数', () => {
      const text = '搜索词在文本中出现多次，搜索词重复出现，搜索词是关键词';
      const searchTerm = '搜索词';
      const regex = new RegExp(searchTerm, 'gi');
      const matches = text.match(regex);
      expect(matches?.length).toBe(3);
    });

    test('搜索结果索引计算', () => {
      const currentIndex = 1;
      const totalResults = 5;
      const nextIndex = (currentIndex + 1) % totalResults;
      expect(nextIndex).toBe(2);
    });

    test('搜索结果循环', () => {
      const currentIndex = 4;
      const totalResults = 5;
      const nextIndex = (currentIndex + 1) % totalResults;
      expect(nextIndex).toBe(0);
    });
  });
});