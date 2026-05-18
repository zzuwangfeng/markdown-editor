# 代码块功能问题分析与优化计划

## 问题分析

经过全面审查，代码块功能存在以下 **8 个问题**：

---

### 问题 1：插入位置固定为编辑器末尾
`doInsertCodeBlock()` (line 2987-3029) 使用 `editor.appendChild(wrapper)`，**始终把代码块追加到编辑器末尾**，完全忽略用户光标位置。

### 问题 2：无语言选择
插入代码块时没有任何语言选择流程。`showDialog` 存在但从未用于代码块。用户无法指定 Python/JavaScript 等语法高亮语言。

### 问题 3：HTML 结构双重标准（核心问题）
存在两套完全不同的 HTML 结构：

| 来源 | HTML 结构 |
|------|-----------|
| `doInsertCodeBlock()` (编辑器) | `<div class="code-block-wrapper"><div class="code-block" contenteditable><div class="code-content">...` |
| `markdownToHtml()` (文件加载) | `<div class="code-block-wrapper"><pre class="code-block"><code>...` |

这导致 CSS 选择器失效、事件处理逻辑分裂、`htmlToMarkdown` 需要同时处理两种格式。

### 问题 4：嵌套 contentEditable
`doInsertCodeBlock` 在 contentEditable 的编辑器内部又创建了 `contentEditable="true"` 的 div，嵌套 contentEditable 在 Chromium 中行为诡异。

### 问题 5：CSS 缺失
`.code-block-wrapper` 和 `.code-content` 完全没有 CSS 定义。编辑器代码块使用浅色背景（`var(--bg-secondary)`），而预览代码块使用深色（`#1e1e1e`），风格不统一。

### 问题 6：退出代码块后创建空 `<p><br></p>`
`exitCodeBlock()` 和 Backspace 删除空代码块时，都创建 `<p><br></p>` 作为替代元素。这些空段落会累积并造成多余间距。

### 问题 7：死代码
- `exitCodeBlockIfNeeded()` (line 2738): 定义了但**从未被调用**
- `lastEnterInEmptyCodeLine` (line 33): 只赋值 `false`，从未读取判断

### 问题 8：编辑器代码块不支持语法高亮
编辑器内的代码块只是纯文本，没有语法高亮。预览中的代码块也没有高亮。

---

## 修复方案

### 步骤 1：统一 HTML 结构
**标准结构**（编辑器插入和 markdown 解析统一）：
```html
<div class="code-block-wrapper">
  <pre class="code-block"><code contenteditable="true">代码内容</code></pre>
</div>
```

修改 `doInsertCodeBlock()` 输出、`markdownToHtml()` 输出、`htmlToMarkdown()` 解析，全部统一。

### 步骤 2：添加语言选择对话框 + 语言标识行
调用 `showDialog('插入代码块', '', callback)` 获取语言名称。在代码块上方添加语言标识行显示语言名称。

```html
<div class="code-block-wrapper">
  <div class="code-lang-line">python</div>
  <pre class="code-block"><code contenteditable="true">代码内容</code></pre>
</div>
```

### 步骤 3：修复插入位置
`doInsertCodeBlock` 改为在光标位置插入，使用 `insertHTMLAtCursor` 或 `range.insertNode`。

### 步骤 4：补充 CSS
为 `.code-block-wrapper`、`.code-content`、`.code-lang-line` 添加样式。统一编辑器和预览代码块使用深色 VS Code 风格。

### 步骤 5：清理死代码
删除 `exitCodeBlockIfNeeded()`、`lastEnterInEmptyCodeLine` 变量。优化 `exitCodeBlock()` 不再创建 `<p><br></p>`。

### 步骤 6：markdownToHtml/hhtmlToMarkdown 适配
更新代码块的 markdown ↔ HTML 转换逻辑，使用统一结构。

### 步骤 7：构建测试
`npm run make` 打包验证。

---

## 优化后预期效果
- 光标位置插入代码块，不再固定末尾
- 支持语言选择（python / javascript / go / ...）
- 代码块显示语言标识行
- 编辑器和预览代码块风格统一（深色主题）
- 保存/加载代码块格式正确，不会丢失
- 退出代码块不再遗留空 `<p>` 标签