# FlowMark Editor - 架构文档

## 产品定位

FlowMark Editor 是一款轻量级本地 Markdown 编辑器，专为 AI 辅助写作场景设计。

## 核心设计原则

### 1. 存储核心
- 完全纯本地离线运行，无云端服务器
- 无自动云同步、无用户数据上传
- 所有文档、图片、配置保存在用户本地文件夹

### 2. 同步方案
- 不内置云服务
- 原生支持用户自行通过以下方式实现手动同步：
  - iCloud
  - OneDrive
  - Git
  - NAS
  - 局域网共享文件夹

### 3. 工程架构
- 单工作区设计，同一时间仅挂载一个本地根文件夹
- 轻量化架构，低内存占用
- 启动速度快

### 4. 文件读写
- 原生本地文件 IO 操作，直接读写磁盘 .md 文件
- 不加密、不封装、不私有格式
- 文件完全透明可控

### 5. 系统适配
- 优先适配 macOS / Windows
- 使用 Electron 保证跨平台兼容性
- 保证文件读写权限、跨路径访问稳定性

### 6. 扩展性约束
- 无插件市场
- 无主题商店
- 无冗余附加功能
- 架构精简，长期稳定易维护

## 技术架构

### 主进程 (main.js)
- 窗口管理
- IPC 处理器（文件系统操作）
- 对话框管理
- 无云服务依赖

### 预加载脚本 (preload.js)
- 通过 contextBridge 安全暴露 API
- 仅暴露必要的文件系统操作接口

### 渲染进程 (renderer)
- ContentEditable WYSIWYG 编辑器
- Markdown 双向转换
- UI 组件管理

## 文件格式

- 纯标准 .md 格式，完全透明
- 图片存储在 `.flowmark-assets/` 隐藏文件夹
- 使用相对路径引用图片
- 无任何私有或加密格式

## 工作流程

1. 用户选择本地文件夹作为工作区
2. 工作区仅显示 .md 文件和包含 .md 文件的文件夹
3. 文件变更直接写入磁盘
4. 用户可通过任意云服务或同步工具同步工作区文件夹

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

