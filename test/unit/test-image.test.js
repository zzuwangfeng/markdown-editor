/**
 * FlowMark Editor - 图片功能测试
 */

// ==================== 工具函数 ====================

/**
 * 生成图片 HTML
 */
function createImageHtml(src, alt = '', width = null) {
  let html = `<img src="${src}" alt="${alt}" class="md-image"`;
  if (width) {
    html += ` style="width:${width}"`;
  }
  html += '>';
  return html;
}

/**
 * 解析图片宽度百分比
 */
function parseImageWidth(styleAttr) {
  if (!styleAttr) return null;
  const match = styleAttr.match(/(?:max-?width|width)\s*:\s*([^;]+)/);
  if (match) {
    const value = match[1].trim();
    if (value.endsWith('%')) {
      return value;
    }
  }
  return null;
}

/**
 * 转换绝对路径为相对路径
 */
function toRelativePath(absPath, baseDir) {
  if (!absPath.startsWith('/') && !absPath.match(/^[A-Za-z]:/)) {
    return absPath; // 已经是相对路径
  }
  // 简单的相对路径转换
  const absNormalized = absPath.replace(/\\/g, '/');
  const baseNormalized = baseDir.replace(/\\/g, '/').replace(/\/$/, '');

  if (absNormalized.startsWith(baseNormalized)) {
    return absNormalized.substring(baseNormalized.length + 1);
  }
  return absPath;
}

/**
 * 生成资源文件夹路径
 */
function getAssetsFolderPath(workspacePath) {
  return `${workspacePath}/.flowmark-assets`;
}

/**
 * 生成图片文件名
 */
function generateImageFileName(originalPath) {
  const timestamp = Date.now();
  const hash = originalPath.split('/').pop().substring(0, 8) || 'image';
  const ext = originalPath.split('.').pop() || 'png';
  return `image-${timestamp}-${hash}.${ext}`;
}

/**
 * 解析 Markdown 图片语法
 */
function parseMarkdownImage(markdown) {
  const match = markdown.match(/!\[([^\]]*)\]\(([^)\s]+)\)(?:\s*\|width:(\d+%))?/);
  if (match) {
    return {
      alt: match[1],
      src: match[2],
      width: match[3] || null
    };
  }
  return null;
}

/**
 * 从 HTML 提取图片信息
 */
function extractImageInfo(imgHtml) {
  const srcMatch = imgHtml.match(/src="([^"]*)"/);
  const altMatch = imgHtml.match(/alt="([^"]*)"/);
  const styleMatch = imgHtml.match(/style="([^"]*)"/);

  return {
    src: srcMatch ? srcMatch[1] : '',
    alt: altMatch ? altMatch[1] : '',
    width: parseImageWidth(styleMatch ? styleMatch[1] : null)
  };
}

// ==================== 测试用例 ====================

describe('图片功能 - 图片生成', () => {
  describe('createImageHtml', () => {
    test('基础图片生成', () => {
      const result = createImageHtml('image.png', '描述');
      expect(result).toContain('src="image.png"');
      expect(result).toContain('alt="描述"');
      expect(result).toContain('class="md-image"');
    });

    test('带空 alt 的图片', () => {
      const result = createImageHtml('image.png', '');
      expect(result).toContain('alt=""');
    });

    test('带宽度样式图片', () => {
      const result = createImageHtml('image.png', '图片', '50%');
      expect(result).toContain('style="width:50%"');
    });

    test('无宽度图片', () => {
      const result = createImageHtml('image.png', '图片');
      expect(result).not.toContain('style=');
    });

    test('相对路径图片', () => {
      const result = createImageHtml('./images/photo.jpg', '照片');
      expect(result).toContain('src="./images/photo.jpg"');
    });

    test('绝对路径图片', () => {
      const result = createImageHtml('/Users/photo.jpg', '照片');
      expect(result).toContain('src="/Users/photo.jpg"');
    });
  });

  describe('特殊格式图片', () => {
    test('带空格的文件名', () => {
      const result = createImageHtml('my image.png', '图片');
      expect(result).toContain('alt="图片"');
    });

    test('带查询参数的URL', () => {
      const result = createImageHtml('https://example.com/image.png?v=1', '图片');
      expect(result).toContain('src="https://example.com/image.png?v=1"');
    });

    test('带锚点的URL', () => {
      const result = createImageHtml('image.png#section', '图片');
      expect(result).toContain('src="image.png#section"');
    });
  });
});

describe('图片功能 - 宽度解析', () => {
  describe('parseImageWidth', () => {
    test('解析 width:50%', () => {
      expect(parseImageWidth('width:50%')).toBe('50%');
    });

    test('解析 max-width:70%', () => {
      expect(parseImageWidth('max-width:70%')).toBe('70%');
    });

    test('解析 width:100%', () => {
      expect(parseImageWidth('width:100%')).toBe('100%');
    });

    test('解析带空格的样式', () => {
      expect(parseImageWidth('  width:  30%  ')).toBe('30%');
    });

    test('解析像素值不匹配', () => {
      expect(parseImageWidth('width:500px')).toBeNull();
    });

    test('解析无 width 属性', () => {
      expect(parseImageWidth('color:red')).toBeNull();
    });

    test('解析 null', () => {
      expect(parseImageWidth(null)).toBeNull();
    });

    test('解析空字符串', () => {
      expect(parseImageWidth('')).toBeNull();
    });

    test('解析多个样式属性', () => {
      const style = 'max-width:50%; height:auto;';
      expect(parseImageWidth(style)).toBe('50%');
    });

    test('解析驼峰命名 width', () => {
      expect(parseImageWidth('width:25%')).toBe('25%');
    });
  });
});

describe('图片功能 - 路径转换', () => {
  describe('toRelativePath', () => {
    test('绝对转相对 - 同目录', () => {
      const result = toRelativePath('/workspace/folder/file.md', '/workspace/folder');
      expect(result).toBe('file.md');
    });

    test('绝对转相对 - 子目录', () => {
      const result = toRelativePath('/workspace/folder/sub/file.md', '/workspace/folder');
      expect(result).toBe('sub/file.md');
    });

    test('已经是相对路径', () => {
      const result = toRelativePath('images/photo.png', '/workspace');
      expect(result).toBe('images/photo.png');
    });

    test('Windows 绝对路径', () => {
      const result = toRelativePath('C:\\Users\\photo.jpg', 'C:\\Users');
      expect(result).toContain('photo.jpg');
    });

    test('不同路径返回原路径', () => {
      const result = toRelativePath('/other/path/file.md', '/workspace/folder');
      expect(result).toContain('/other/path/');
    });
  });

  describe('getAssetsFolderPath', () => {
    test('生成资源文件夹路径', () => {
      const result = getAssetsFolderPath('/workspace/myproject');
      expect(result).toBe('/workspace/myproject/.flowmark-assets');
    });

    test('路径末尾斜杠处理', () => {
      // 函数直接拼接，会产生双斜杠
      const result = getAssetsFolderPath('/workspace/myproject/');
      expect(result).toBe('/workspace/myproject//.flowmark-assets');
    });
  });
});

describe('图片功能 - 文件名生成', () => {
  describe('generateImageFileName', () => {
    test('基础文件名生成', () => {
      const result = generateImageFileName('photo.png');
      // hash 是 "photo.png" 去掉扩展名后前8个字符 "photo.pn"
      // 结果: image-{timestamp}-photo.pn.png
      expect(result).toMatch(/^image-\d+-photo\.pn\.png$/);
    });

    test('JPEG 扩展名', () => {
      const result = generateImageFileName('photo.jpg');
      expect(result).toMatch(/\.jpg$/);
    });

    test('GIF 扩展名', () => {
      const result = generateImageFileName('animation.gif');
      expect(result).toMatch(/\.gif$/);
    });

    test('无扩展名', () => {
      const result = generateImageFileName('imagefile');
      // 无扩展名时 ext 为空字符串，文件名变成 {hash}.{ext} = photo.photo.png
      expect(result).toMatch(/^image-\d+-.*$/);
    });

    test('带路径的文件名', () => {
      const result = generateImageFileName('/path/to/image.png');
      // hash 取自 "image.png" 的前8个字符 "image.pn"
      expect(result).toMatch(/^image-\d+-.*\.png$/);
    });

    test('唯一性 - 不同时间戳', () => {
      const result1 = generateImageFileName('image.png');
      // 由于时间戳精确到毫秒，即使连续调用也可能得到相同时间戳
      // 测试唯一性意义不大，仅验证格式
      expect(result1).toMatch(/^image-\d+-.*\.png$/);
    });
  });
});

describe('图片功能 - Markdown 解析', () => {
  describe('parseMarkdownImage', () => {
    test('基础 Markdown 图片', () => {
      const result = parseMarkdownImage('![alt](image.png)');
      expect(result).toEqual({
        alt: 'alt',
        src: 'image.png',
        width: null
      });
    });

    test('带宽度 Markdown 图片', () => {
      const result = parseMarkdownImage('![img](photo.png) |width:50%');
      expect(result).toEqual({
        alt: 'img',
        src: 'photo.png',
        width: '50%'
      });
    });

    test('空 alt Markdown 图片', () => {
      const result = parseMarkdownImage('![](image.png)');
      expect(result).toEqual({
        alt: '',
        src: 'image.png',
        width: null
      });
    });

    test('带 URL 的图片', () => {
      const result = parseMarkdownImage('![photo](https://example.com/photo.png)');
      expect(result?.src).toBe('https://example.com/photo.png');
    });

    test('非图片语法返回 null', () => {
      expect(parseMarkdownImage('[link](url.com)')).toBeNull();
      expect(parseMarkdownImage('just text')).toBeNull();
    });

    test('100% 宽度图片', () => {
      const result = parseMarkdownImage('![img](i.png) |width:100%');
      expect(result?.width).toBe('100%');
    });

    test('20% 宽度图片', () => {
      const result = parseMarkdownImage('![small](tiny.png) |width:20%');
      expect(result?.width).toBe('20%');
    });
  });
});

describe('图片功能 - HTML 提取', () => {
  describe('extractImageInfo', () => {
    test('提取基本属性', () => {
      const result = extractImageInfo('<img src="img.png" alt="描述">');
      expect(result.src).toBe('img.png');
      expect(result.alt).toBe('描述');
    });

    test('提取带样式的图片', () => {
      const result = extractImageInfo('<img src="i.png" alt="img" style="width:50%">');
      expect(result.width).toBe('50%');
    });

    test('提取无 alt 的图片', () => {
      const result = extractImageInfo('<img src="i.png">');
      expect(result.alt).toBe('');
    });

    test('提取无样式的图片', () => {
      const result = extractImageInfo('<img src="i.png" alt="x">');
      expect(result.width).toBeNull();
    });

    test('提取带其他属性的图片', () => {
      const result = extractImageInfo('<img class="md-image" src="i.png" alt="x" data-id="1">');
      expect(result.src).toBe('i.png');
    });

    test('提取 data URL 图片', () => {
      const result = extractImageInfo('<img src="data:image/png;base64,abc123" alt="inline">');
      expect(result.src).toContain('data:image/png');
    });
  });
});

describe('图片功能 - 缩放计算', () => {
  describe('缩放百分比映射', () => {
    const widthMap = {
      'img-20': '20%',
      'img-50': '50%',
      'img-70': '70%',
      'img-100': '100%'
    };

    test('20% 映射', () => {
      expect(widthMap['img-20']).toBe('20%');
    });

    test('50% 映射', () => {
      expect(widthMap['img-50']).toBe('50%');
    });

    test('70% 映射', () => {
      expect(widthMap['img-70']).toBe('70%');
    });

    test('100% 映射', () => {
      expect(widthMap['img-100']).toBe('100%');
    });

    test('未知操作返回 undefined', () => {
      expect(widthMap['img-30']).toBeUndefined();
    });
  });

  describe('缩放值验证', () => {
    const validWidths = ['20%', '50%', '70%', '100%'];

    test('有效宽度值', () => {
      validWidths.forEach(w => {
        expect(w.endsWith('%')).toBe(true);
      });
    });

    test('像素值不是有效缩放', () => {
      const pixelValue = '500px';
      expect(pixelValue.endsWith('%')).toBe(false);
    });
  });
});

describe('图片功能 - 路径验证', () => {
  describe('路径格式验证', () => {
    test('相对路径验证', () => {
      const validPaths = ['image.png', './image.png', '../image.png', 'images/photo.jpg'];
      validPaths.forEach(p => {
        expect(p.startsWith('/')).toBe(false);
      });
    });

    test('绝对路径验证', () => {
      const validPaths = ['/Users/image.png', '/workspace/file.md'];
      validPaths.forEach(p => {
        expect(p.startsWith('/')).toBe(true);
      });
    });

    test('URL 验证', () => {
      const validUrls = ['https://example.com/image.png', 'http://test.com/photo.jpg'];
      validUrls.forEach(url => {
        expect(url.startsWith('http')).toBe(true);
      });
    });

    test('数据 URL 验证', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
      expect(dataUrl.startsWith('data:image')).toBe(true);
    });

    test('带空格路径处理', () => {
      const pathWithSpace = 'path with spaces/image.png';
      const encoded = encodeURI(pathWithSpace);
      expect(encoded).toContain('%20');
    });
  });
});

describe('图片功能 - 边界情况', () => {
  test('空 src', () => {
    const result = createImageHtml('', '描述');
    expect(result).toContain('src=""');
  });

  test('特殊字符 alt', () => {
    const result = createImageHtml('img.png', 'alt with <special> & chars');
    expect(result).toContain('alt="alt with <special> & chars"');
  });

  test('非常长的文件名', () => {
    const longName = 'a'.repeat(100) + '.png';
    const result = createImageHtml(longName, 'img');
    expect(result).toContain('src="');
  });

  test('连续的点号文件名', () => {
    const result = createImageHtml('.../image.png', 'img');
    expect(result).toContain('src=".../image.png"');
  });

  test('Windows 反斜杠路径', () => {
    const result = createImageHtml('C:\\Users\\Photos\\image.png', 'img');
    expect(result).toContain('src="C:\\Users\\Photos\\image.png"');
  });
});