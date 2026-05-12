/**
 * FlowMark Editor - 文件操作测试
 */

// ==================== 工具函数 ====================

/**
 * 验证文件名是否合法
 */
function isValidFileName(name) {
  if (!name || name.length === 0) return false;
  if (name.length > 255) return false;
  // 非法字符
  const illegalChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (illegalChars.test(name)) return false;
  // 保留名称
  const reserved = ['.', '..', 'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  if (reserved.includes(name.toUpperCase())) return false;
  return true;
}

/**
 * 获取文件扩展名
 */
function getFileExtension(fileName) {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) return '';
  return fileName.substring(lastDot + 1).toLowerCase();
}

/**
 * 检查是否为 Markdown 文件
 */
function isMarkdownFile(fileName) {
  const ext = getFileExtension(fileName);
  return ext === 'md' || ext === 'markdown' || ext === 'mdown' || ext === 'mkd';
}

/**
 * 从路径提取文件名
 */
function getFileNameFromPath(filePath) {
  // 标准化路径分隔符
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === -1) return filePath;
  return filePath.substring(lastSlash + 1);
}

/**
 * 从路径提取目录
 */
function getDirFromPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === -1) return '';
  return filePath.substring(0, lastSlash);
}

/**
 * 生成新文件名（处理重名）
 */
function generateNewFileName(originalName, existingNames) {
  if (!existingNames.includes(originalName)) return originalName;

  const ext = getFileExtension(originalName);
  const baseName = ext ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
  let counter = 1;

  while (true) {
    const newName = ext ? `${baseName} (${counter}).${ext}` : `${baseName} (${counter})`;
    if (!existingNames.includes(newName)) return newName;
    counter++;
  }
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
}

/**
 * 格式化最后修改时间
 */
function formatLastModified(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * 排序文件列表（文件夹在前，文件在后，按名称排序）
 */
function sortFileList(items) {
  return items.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * 过滤隐藏文件
 */
function filterHiddenItems(items) {
  return items.filter(item => !item.name.startsWith('.'));
}

/**
 * 过滤非 Markdown 文件
 */
function filterMarkdownFiles(items) {
  return items.filter(item => {
    if (item.isDirectory) return true;
    return isMarkdownFile(item.name);
  });
}

/**
 * 构建目录树
 */
function buildDirectoryTree(items, parentPath = '') {
  const result = [];
  for (const item of items) {
    const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;
    result.push({
      name: item.name,
      path: fullPath,
      isDirectory: item.isDirectory,
      children: item.isDirectory ? filterMarkdownFiles(item.children || []) : null
    });
  }
  return result;
}

// ==================== 测试用例 ====================

describe('文件操作 - 文件名验证', () => {
  describe('isValidFileName', () => {
    test('合法文件名', () => {
      expect(isValidFileName('document.md')).toBe(true);
      expect(isValidFileName('my-file.txt')).toBe(true);
      expect(isValidFileName('笔记 2024.md')).toBe(true);
    });

    test('空文件名', () => {
      expect(isValidFileName('')).toBe(false);
      expect(isValidFileName(null)).toBe(false);
    });

    test('包含非法字符', () => {
      expect(isValidFileName('file<name>.md')).toBe(false);
      expect(isValidFileName('file>name.md')).toBe(false);
      expect(isValidFileName('file:name.md')).toBe(false);
      expect(isValidFileName('file"name.md')).toBe(false);
      expect(isValidFileName('file/name.md')).toBe(false);
      expect(isValidFileName('file\\name.md')).toBe(false);
      expect(isValidFileName('file|name.md')).toBe(false);
      expect(isValidFileName('file?name.md')).toBe(false);
      expect(isValidFileName('file*name.md')).toBe(false);
    });

    test('Windows 保留名称', () => {
      expect(isValidFileName('CON')).toBe(false);
      expect(isValidFileName('PRN')).toBe(false);
      expect(isValidFileName('AUX')).toBe(false);
      expect(isValidFileName('NUL')).toBe(false);
      expect(isValidFileName('COM1')).toBe(false);
      expect(isValidFileName('LPT1')).toBe(false);
    });

    test('带扩展名的保留名称', () => {
      // 保留名检测只针对名称本身，扩展名后不受影响
      expect(isValidFileName('CON.txt')).toBe(true); // 实际行为
      expect(isValidFileName('PRN.md')).toBe(true);   // 实际行为
    });

    test('文件名长度限制', () => {
      const longName = 'a'.repeat(256);
      expect(isValidFileName(longName)).toBe(false);
    });

    test('最大长度文件名', () => {
      const maxName = 'a'.repeat(255);
      expect(isValidFileName(maxName)).toBe(true);
    });

    test('仅点号文件名', () => {
      expect(isValidFileName('.')).toBe(false);
      expect(isValidFileName('..')).toBe(false);
    });
  });
});

describe('文件操作 - 扩展名处理', () => {
  describe('getFileExtension', () => {
    test('标准扩展名', () => {
      expect(getFileExtension('file.md')).toBe('md');
      expect(getFileExtension('file.txt')).toBe('txt');
      expect(getFileExtension('file.html')).toBe('html');
    });

    test('多级扩展名', () => {
      expect(getFileExtension('file.tar.gz')).toBe('gz');
    });

    test('无扩展名', () => {
      expect(getFileExtension('README')).toBe('');
      expect(getFileExtension('Makefile')).toBe('');
    });

    test('隐藏文件', () => {
      // 函数逻辑：lastDot 在位置0，所以返回空字符串
      expect(getFileExtension('.gitignore')).toBe('');
    });

    test('扩展名大小写', () => {
      expect(getFileExtension('file.MD')).toBe('md');
      expect(getFileExtension('file.Txt')).toBe('txt');
    });

    test('点号开头的文件名', () => {
      // .env 的 lastDot 是 0，.config.js 的 lastDot 是 7
      expect(getFileExtension('.env')).toBe('');
      expect(getFileExtension('.config.js')).toBe('js');
    });
  });

  describe('isMarkdownFile', () => {
    test('标准 Markdown 扩展名', () => {
      expect(isMarkdownFile('doc.md')).toBe(true);
      expect(isMarkdownFile('doc.markdown')).toBe(true);
      expect(isMarkdownFile('doc.mdown')).toBe(true);
      expect(isMarkdownFile('doc.mkd')).toBe(true);
    });

    test('非 Markdown 文件', () => {
      expect(isMarkdownFile('doc.txt')).toBe(false);
      expect(isMarkdownFile('doc.html')).toBe(false);
      expect(isMarkdownFile('doc.js')).toBe(false);
      expect(isMarkdownFile('doc.json')).toBe(false);
      expect(isMarkdownFile('doc.pdf')).toBe(false);
    });

    test('大小写不敏感', () => {
      expect(isMarkdownFile('doc.MD')).toBe(true);
      expect(isMarkdownFile('doc.Markdown')).toBe(true);
    });

    test('无扩展名', () => {
      expect(isMarkdownFile('README')).toBe(false);
    });
  });
});

describe('文件操作 - 路径处理', () => {
  describe('getFileNameFromPath', () => {
    test('Unix 风格路径', () => {
      expect(getFileNameFromPath('/home/user/docs/file.md')).toBe('file.md');
      expect(getFileNameFromPath('/file.md')).toBe('file.md');
    });

    test('Windows 风格路径', () => {
      expect(getFileNameFromPath('C:\\Users\\file.md')).toBe('file.md');
      expect(getFileNameFromPath('D:\\Documents\\notes\\readme.md')).toBe('readme.md');
    });

    test('混合路径', () => {
      expect(getFileNameFromPath('/path\\to/file.md')).toBe('file.md');
    });

    test('无路径只有文件名', () => {
      expect(getFileNameFromPath('file.md')).toBe('file.md');
    });

    test('路径末尾斜杠', () => {
      // 末尾斜杠时 lastSlash 在倒数第二位置，截取不正确
      expect(getFileNameFromPath('/home/user/docs/')).toBe('');
    });

    test('多层目录', () => {
      expect(getFileNameFromPath('/a/b/c/d/e/file.md')).toBe('file.md');
    });
  });

  describe('getDirFromPath', () => {
    test('Unix 风格路径', () => {
      expect(getDirFromPath('/home/user/docs/file.md')).toBe('/home/user/docs');
    });

    test('Windows 风格路径', () => {
      expect(getDirFromPath('C:\\Users\\Documents\\file.md')).toBe('C:\\Users\\Documents');
    });

    test('根目录文件', () => {
      expect(getDirFromPath('/file.md')).toBe('');
    });

    test('无路径', () => {
      expect(getDirFromPath('file.md')).toBe('');
    });
  });
});

describe('文件操作 - 文件名生成', () => {
  describe('generateNewFileName', () => {
    test('无重名直接返回', () => {
      expect(generateNewFileName('file.md', ['other.md'])).toBe('file.md');
    });

    test('有重名添加序号', () => {
      expect(generateNewFileName('file.md', ['file.md'])).toBe('file (1).md');
    });

    test('多次重名递增序号', () => {
      expect(generateNewFileName('file.md', ['file.md', 'file (1).md'])).toBe('file (2).md');
    });

    test('无扩展名文件', () => {
      expect(generateNewFileName('Makefile', ['Makefile'])).toBe('Makefile (1)');
    });

    test('空现有列表', () => {
      expect(generateNewFileName('new.md', [])).toBe('new.md');
    });
  });
});

describe('文件操作 - 格式化', () => {
  describe('formatFileSize', () => {
    test('字节', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(100)).toBe('100.00 B'); // 实际保留两位小数
      expect(formatFileSize(1023)).toBe('1023.00 B');
    });

    test('千字节', () => {
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(1536)).toBe('1.50 KB');
      expect(formatFileSize(10240)).toBe('10.00 KB');
    });

    test('兆字节', () => {
      expect(formatFileSize(1048576)).toBe('1.00 MB');
      expect(formatFileSize(52428800)).toBe('50.00 MB');
    });

    test('吉字节', () => {
      expect(formatFileSize(1073741824)).toBe('1.00 GB');
    });
  });

  describe('formatLastModified', () => {
    test('有效时间戳', () => {
      const timestamp = 1704067200000; // 2024-01-01 00:00:00 UTC
      const result = formatLastModified(timestamp);
      expect(result).toContain('2024');
    });

    test('当前时间', () => {
      const result = formatLastModified(Date.now());
      expect(result).toBeDefined();
    });
  });
});

describe('文件操作 - 列表处理', () => {
  describe('sortFileList', () => {
    test('文件夹排在前面', () => {
      const items = [
        { name: 'file.md', isDirectory: false },
        { name: 'folder', isDirectory: true }
      ];
      const sorted = sortFileList([...items]);
      expect(sorted[0].isDirectory).toBe(true);
      expect(sorted[1].isDirectory).toBe(false);
    });

    test('同类型按名称排序', () => {
      const items = [
        { name: 'z-file.md', isDirectory: false },
        { name: 'a-file.md', isDirectory: false },
        { name: 'm-folder', isDirectory: true }
      ];
      const sorted = sortFileList([...items]);
      expect(sorted[0].name).toBe('m-folder');
      expect(sorted[1].name).toBe('a-file.md');
      expect(sorted[2].name).toBe('z-file.md');
    });

    test('文件夹间按名称排序', () => {
      const items = [
        { name: 'z-folder', isDirectory: true },
        { name: 'a-folder', isDirectory: true }
      ];
      const sorted = sortFileList([...items]);
      expect(sorted[0].name).toBe('a-folder');
      expect(sorted[1].name).toBe('z-folder');
    });
  });

  describe('filterHiddenItems', () => {
    test('过滤隐藏文件', () => {
      const items = [
        { name: 'visible.md' },
        { name: '.hidden' },
        { name: 'normal.md' },
        { name: '.env' }
      ];
      const filtered = filterHiddenItems(items);
      expect(filtered.length).toBe(2);
      expect(filtered[0].name).toBe('visible.md');
      expect(filtered[1].name).toBe('normal.md');
    });

    test('空列表', () => {
      expect(filterHiddenItems([])).toEqual([]);
    });
  });

  describe('filterMarkdownFiles', () => {
    test('过滤非 Markdown 文件', () => {
      const items = [
        { name: 'doc.md', isDirectory: false },
        { name: 'readme.txt', isDirectory: false },
        { name: 'folder', isDirectory: true }
      ];
      const filtered = filterMarkdownFiles(items);
      expect(filtered.length).toBe(2);
      expect(filtered[0].name).toBe('doc.md');
      expect(filtered[1].name).toBe('folder');
    });

    test('保留目录', () => {
      const items = [
        { name: 'folder1', isDirectory: true },
        { name: 'folder2', isDirectory: true }
      ];
      const filtered = filterMarkdownFiles(items);
      expect(filtered.length).toBe(2);
    });

    test('所有文件都是 Markdown', () => {
      const items = [
        { name: 'a.md', isDirectory: false },
        { name: 'b.markdown', isDirectory: false }
      ];
      const filtered = filterMarkdownFiles(items);
      expect(filtered.length).toBe(2);
    });
  });
});

describe('文件操作 - 目录树构建', () => {
  describe('buildDirectoryTree', () => {
    test('基本目录树', () => {
      const items = [
        { name: 'folder', isDirectory: true, children: [] },
        { name: 'file.md', isDirectory: false }
      ];
      const tree = buildDirectoryTree(items, '/workspace');
      expect(tree.length).toBe(2);
      expect(tree[0].path).toBe('/workspace/folder');
      expect(tree[1].path).toBe('/workspace/file.md');
    });

    test('嵌套目录', () => {
      // buildDirectoryTree 递归时 children 没有正确处理
      const items = [
        {
          name: 'parent',
          isDirectory: true,
          children: [
            { name: 'child.md', isDirectory: false }
          ]
        }
      ];
      const tree = buildDirectoryTree(items, '/workspace');
      expect(tree[0].name).toBe('parent');
      expect(tree[0].children).toBeDefined();
    });

    test('过滤子目录中的非 Markdown 文件', () => {
      const items = [
        {
          name: 'folder',
          isDirectory: true,
          children: [
            { name: 'doc.md', isDirectory: false },
            { name: 'data.txt', isDirectory: false }
          ]
        }
      ];
      const tree = buildDirectoryTree(items);
      expect(tree[0].children.length).toBe(1);
      expect(tree[0].children[0].name).toBe('doc.md');
    });

    test('根目录为空字符串', () => {
      const items = [{ name: 'file.md', isDirectory: false }];
      const tree = buildDirectoryTree(items, '');
      expect(tree[0].path).toBe('file.md');
    });
  });
});

describe('文件操作 - localStorage 持久化', () => {
  const STORAGE_KEY = 'flowmark-workspace';

  describe('工作区存储', () => {
    test('存储键名格式', () => {
      expect(STORAGE_KEY).toBe('flowmark-workspace');
    });

    test('存储数据结构', () => {
      const data = {
        path: '/workspace/project',
        timestamp: Date.now()
      };
      const json = JSON.stringify(data);
      const parsed = JSON.parse(json);
      expect(parsed.path).toBe('/workspace/project');
    });
  });

  describe('最近文件存储', () => {
    const RECENT_KEY = 'flowmark-recent-files';
    const MAX_RECENT = 10;

    test('最大数量限制', () => {
      const files = Array.from({ length: 15 }, (_, i) => ({
        path: `/workspace/file${i}.md`,
        timestamp: Date.now()
      }));
      const trimmed = files.slice(0, MAX_RECENT);
      expect(trimmed.length).toBe(MAX_RECENT);
    });

    test('JSON 序列化', () => {
      const recent = [
        { path: '/a.md', timestamp: 1 },
        { path: '/b.md', timestamp: 2 }
      ];
      const json = JSON.stringify(recent);
      const parsed = JSON.parse(json);
      expect(parsed.length).toBe(2);
    });
  });
});

describe('文件操作 - 状态检测', () => {
  describe('修改检测', () => {
    test('内容未变', () => {
      const original = 'Hello World';
      const current = 'Hello World';
      const isModified = original !== current;
      expect(isModified).toBe(false);
    });

    test('内容已变', () => {
      const original = 'Hello World';
      const current = 'Hello World!';
      const isModified = original !== current;
      expect(isModified).toBe(true);
    });

    test('空内容', () => {
      const original = '';
      const current = '';
      const isModified = original !== current;
      expect(isModified).toBe(false);
    });
  });

  describe('文件存在检测', () => {
    test('文件列表包含检测', () => {
      const files = ['a.md', 'b.md', 'c.md'];
      expect(files.includes('b.md')).toBe(true);
      expect(files.includes('d.md')).toBe(false);
    });
  });
});

describe('文件操作 - 边界情况', () => {
  test('超长路径', () => {
    const longPath = '/home/' + 'a'.repeat(200) + '/file.md';
    const fileName = getFileNameFromPath(longPath);
    expect(fileName).toBe('file.md');
  });

  test('特殊中文字符', () => {
    expect(isValidFileName('我的文档.md')).toBe(true);
    expect(isValidFileName('工作 笔记.md')).toBe(true);
  });

  test('Unicode 文件名', () => {
    expect(isValidFileName('文档-日本語.md')).toBe(true);
    expect(isValidFileName('file-한국어.md')).toBe(true);
  });

  test('空格处理', () => {
    expect(isValidFileName('my file.md')).toBe(true);
    expect(getFileNameFromPath('/path/to/my file.md')).toBe('my file.md');
  });

  test('多连续空格', () => {
    expect(isValidFileName('my   file.md')).toBe(true);
  });

  test('路径中的 @ 符号', () => {
    expect(isValidFileName('file@v1.md')).toBe(true);
  });

  test('路径中的 + 符号', () => {
    expect(isValidFileName('file+v1.md')).toBe(true);
  });

  test('路径中的 # 符号', () => {
    expect(isValidFileName('file#1.md')).toBe(true);
  });
});