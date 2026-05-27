# FlowMark Editor

一款轻量级本地 Markdown 编辑器，专为 AI 辅助写作场景设计。

## 核心特性

### 本地优先
- 完全纯本地离线运行，无云端服务器
- 无自动云同步、无用户数据上传
- 所有文档、图片、配置保存在用户本地文件夹

### 文件透明
- 原生本地文件 IO 操作，直接读写磁盘 .md 文件
- 不加密、不封装、不私有格式
- 文件完全透明可控

### 同步方案
不内置云服务，支持用户自行通过以下方式同步：
- iCloud / OneDrive / Google Drive
- Git (GitHub, GitLab, Gitee)
- NAS / 局域网共享文件夹
- 任意文件同步工具

### 轻量化架构
- 单工作区设计，同一时间仅挂载一个本地根文件夹
- 低内存占用，启动速度快
- 无插件市场、无主题商店，架构精简

## 界面预览

- 三栏布局：文件树 / 编辑器 / 大纲
- 支持实时预览
- 支持斜杠命令快速插入格式

## 文件格式

- 纯标准 Markdown (.md) 格式
- 图片存储在 `.flowmark-assets/` 隐藏文件夹
- 使用相对路径引用图片

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run start:forge

# 构建
npm run make
```

## 技术栈

- Electron 31
- 原生文件系统 API
- ContentEditable WYSIWYG 编辑器

## 许可证

MIT
