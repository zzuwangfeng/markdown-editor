# 实时预览多余空行修复计划

## 问题分析

经过对完整代码流程的深入分析，实时预览中出现多余空行的问题来源于 **多个层次的叠加效应**：

### 数据流路径
```
文件读取 → markdownToHtml() → editor.innerHTML → renderPreview() → previewContent.innerHTML
```

### 根本原因分析

#### 原因 1：CSS 边距过于宽松（核心原因）
`.preview-content` 下的元素边距设置较大：
- `p`: `margin: 0 0 16px` → 每个段落底部 16px
- `h2`: `margin: 32px 0 18px` + `padding-bottom: 10px` + `border-bottom: 1px` → 累计约 61px
- `h1`: `margin: 0 0 24px` + `padding-bottom: 16px` + `border-bottom: 3px` → 累计约 43px
- `h3`: `margin: 24px 0 14px`
- `ul/ol`: `margin: 12px 0`
- `li`: `margin: 6px 0`
- `blockquote`: `margin: 20px 0` + `padding: 14px 20px`
- `pre/.code-block`: `margin: 20px 0` + `padding: 18px 20px`

这些边距在内容块之间累积，造成视觉上"内容之间有很多空行"。

#### 原因 2：HTML 清理不彻底
`markdownToHtml` 中的清理逻辑：
- `html.replace(/<p><\/p>/g, '')` — 只移除 `<p></p>`，**不移除** `<p><br></p>` 或 `<p> </p>`
- 浏览器的 contentEditable 引擎可能在渲染时插入额外的 `<br>` 标签

#### 原因 3：renderPreview 缺少 HTML 净化
`renderPreview()` 直接复制 `editor.innerHTML` 到 `previewContent.innerHTML`，没有对 HTML 进行任何清理。editor 中可能存在 contentEditable 引擎自动插入的空白元素（如空的 `<div>`、`<br>`、`&nbsp;` 等）。

#### 原因 4：markdownToHtml 段落处理中的边缘情况
预处理 `\n{4,}` → `\n\n\n` 保留最多 3 个空行，但在某些边缘情况下（如文件末尾有多余换行），split 结果中可能产生仅含 `<br>` 的 `<p>` 标签。

---

## 修复方案

### 步骤 1：优化 preview-content CSS 边距（文件：`src/renderer/styles/main.css`）

将 `.preview-content` 下各元素的 margin 收紧，使预览更紧凑：

| 元素 | 当前值 | 优化后 |
|------|--------|--------|
| `p` | `margin: 0 0 16px` | `margin: 0 0 10px` |
| `h1` | `margin: 0 0 24px` + `padding-bottom: 16px` | `margin: 0 0 16px` + `padding-bottom: 10px` |
| `h2` | `margin: 32px 0 18px` + `padding-bottom: 10px` | `margin: 20px 0 12px` + `padding-bottom: 8px` |
| `h3` | `margin: 24px 0 14px` | `margin: 16px 0 10px` |
| `h4` | `margin: 20px 0 10px` | `margin: 14px 0 8px` |
| `ul/ol` | `margin: 12px 0` | `margin: 8px 0` |
| `li` | `margin: 6px 0` | `margin: 3px 0` |
| `blockquote` | `margin: 20px 0` + `padding: 14px 20px` | `margin: 14px 0` + `padding: 10px 16px` |
| `pre/.code-block` | `margin: 20px 0` + `padding: 18px 20px` | `margin: 14px 0` + `padding: 14px 16px` |

### 步骤 2：加强 markdownToHtml 中的 HTML 清理（文件：`src/renderer/scripts/app.js`）

在 `markdownToHtml` 函数的清理部分，增加以下处理：

```javascript
// 移除空白段落（包含 <br> 的视为空白）
html = html.replace(/<p><br\s*\/?><\/p>/gi, '');
// 移除只包含空白字符的段落
html = html.replace(/<p>\s*<\/p>/gi, '');
// 合并连续的 <br> 标签
html = html.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');
```

### 步骤 3：在 renderPreview 中增加 HTML 净化（文件：`src/renderer/scripts/app.js`）

在 `renderPreview` 函数中，设置 `previewContent.innerHTML` 之前，对 content 进行净化处理：

```javascript
function cleanPreviewHTML(html) {
  // 移除空白段落
  html = html.replace(/<p><br\s*\/?><\/p>/gi, '');
  html = html.replace(/<p>\s*<\/p>/gi, '');
  // 移除只包含 &nbsp; 的段落
  html = html.replace(/<p>(&nbsp;|\s)*<\/p>/gi, '');
  // 移除空的 div
  html = html.replace(/<div><br\s*\/?><\/div>/gi, '');
  html = html.replace(/<div>\s*<\/div>/gi, '');
  // 合并多个连续 <br>
  html = html.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');
  // 移除开头和结尾的 <br>
  html = html.replace(/^(<br\s*\/?>\s*)+/i, '');
  html = html.replace(/(\s*<br\s*\/?>)+$/i, '');
  return html;
}
```

### 步骤 4：优化 markdownToHtml 预处理逻辑（文件：`src/renderer/scripts/app.js`）

将预处理改为更激进地压缩多余空行：

```javascript
// 修改前：
html = html.replace(/\n{4,}/g, '\n\n\n');

// 修改后：
html = html.replace(/\n{3,}/g, '\n\n');
```

### 步骤 5：重新构建并测试

执行 `npm run make` 打包，验证修复效果。

---

## 预期效果

- 预览中各内容块之间的间距更加紧凑自然
- 不会出现大段空白区域
- 段落之间约 10px 间距（约 0.6 行）
- 标题与正文之间约 16-20px 间距
- 列表项之间间距减半