// FlowMark Editor - Main Application
(function() {
  'use strict';

  // State
  let currentWorkspace = null;
  let currentFilePath = null;
  let currentFileName = null;
  let currentFileContent = null;
  let saveTimeout = null;
  let isSaving = false;
  let contextMenuTarget = null;
  let slashPanelVisible = false;
  let slashSelectedIndex = 0;
  let slashFilter = '';
  let lastModifiedTime = null;
  let fileWatcherInterval = null;
  let assetsFolderPath = null;
  let isPreviewMode = false;

  // DOM Elements
  const sidebar = document.getElementById('sidebar');
  const fileTree = document.getElementById('file-tree');
  const emptyState = document.getElementById('empty-state');
  const workspaceName = document.getElementById('workspace-name');
  const btnOpenWorkspace = document.getElementById('btn-open-workspace');
  const btnNewFile = document.getElementById('btn-new-file');
  const btnNewFolder = document.getElementById('btn-new-folder');
  const editor = document.getElementById('editor');
  const editorPlaceholder = document.getElementById('editor-placeholder');
  const currentFileNameEl = document.getElementById('current-file-name');
  const saveStatus = document.getElementById('save-status');
  const wordCount = document.getElementById('word-count');
  const lineInfo = document.getElementById('line-info');
  const outlineList = document.getElementById('outline-list');
  const contextMenu = document.getElementById('context-menu');
  const formatToolbar = document.getElementById('format-toolbar');
  const slashPanel = document.getElementById('slash-panel');
  const slashList = document.getElementById('slash-list');
  const conflictOverlay = document.getElementById('conflict-overlay');
  const conflictMessage = document.getElementById('conflict-message');
  const tableDialogOverlay = document.getElementById('table-dialog-overlay');
  const imageProgress = document.getElementById('image-progress');
  const btnPreview = document.getElementById('btn-preview');
  const previewContent = document.getElementById('preview-content');

  // Dialog elements
  const dialogOverlay = document.getElementById('dialog-overlay');
  const dialogTitle = document.getElementById('dialog-title');
  const dialogInput = document.getElementById('dialog-input');
  const dialogCancel = document.getElementById('dialog-cancel');
  const dialogConfirm = document.getElementById('dialog-confirm');
  const confirmOverlay = document.getElementById('confirm-overlay');
  const confirmTitle = document.getElementById('confirm-title');
  const confirmMessage = document.getElementById('confirm-message');
  const confirmCancel = document.getElementById('confirm-cancel');
  const confirmOk = document.getElementById('confirm-ok');

  // Slash Commands
  const slashCommands = [
    { id: 'h1', title: '一级标题', description: '大标题', icon: 'H1', action: () => insertHeading(1) },
    { id: 'h2', title: '二级标题', description: '中标题', icon: 'H2', action: () => insertHeading(2) },
    { id: 'h3', title: '三级标题', description: '小标题', icon: 'H3', action: () => insertHeading(3) },
    { id: 'bold', title: '加粗', description: '文字加粗', icon: 'B', action: () => wrapSelection('strong') },
    { id: 'italic', title: '斜体', description: '文字斜体', icon: 'I', action: () => wrapSelection('em') },
    { id: 'strikethrough', title: '删除线', description: '文字删除线', icon: 'S', action: () => wrapSelection('s') },
    { id: 'code', title: '行内代码', description: '行内代码片段', icon: '</>', action: () => wrapSelection('code') },
    { id: 'codeblock', title: '代码块', description: '多行代码', icon: '{ }', action: () => insertCodeBlock() },
    { id: 'link', title: '链接', description: '超链接', icon: '🔗', action: () => insertLink() },
    { id: 'image', title: '图片', description: '插入本地图片', icon: '🖼', action: () => insertImage() },
    { id: 'table', title: '表格', description: '插入表格', icon: '⊞', action: () => showTableDialog() },
    { id: 'ul', title: '无序列表', description: '项目符号列表', icon: '•', action: () => insertList('ul') },
    { id: 'ol', title: '有序列表', description: '数字编号列表', icon: '1.', action: () => insertList('ol') },
    { id: 'todo', title: '待办清单', description: '可勾选的任务列表', icon: '☐', action: () => insertTodoList() },
    { id: 'blockquote', title: '引用', description: '引用块', icon: '"', action: () => insertBlockquote() },
    { id: 'hr', title: '分割线', description: '水平分隔线', icon: '—', action: () => insertHorizontalRule() },
  ];

  // Icons
  const icons = {
    folder: `<svg class="tree-item-icon" viewBox="0 0 18 18" fill="none">
      <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3.172a1.5 1.5 0 0 1 1.06.44l.658.658H14.5A1.5 1.5 0 0 1 16 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 2 12.5v-8z" stroke="currentColor" stroke-width="1.3"/>
    </svg>`,
    file: `<svg class="tree-item-icon" viewBox="0 0 18 18" fill="none">
      <path d="M10 1.5H5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5V6L10 1.5z" stroke="currentColor" stroke-width="1.3"/>
      <path d="M10 1.5v4.5h4.5" stroke="currentColor" stroke-width="1.3"/>
    </svg>`,
    arrow: `<svg class="tree-item-expand" viewBox="0 0 18 18" fill="none">
      <path d="M7 4l4 5-4 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  };

  // Initialize
  async function init() {
    bindEvents();
    updateOutline();
    // Preview is on by default, ensure preview button is active
    btnPreview.classList.add('active');
    isPreviewMode = true;
  }

  // Event Bindings
  function bindEvents() {
    btnOpenWorkspace.addEventListener('click', openWorkspace);
    btnNewFile.addEventListener('click', createNewFile);
    btnNewFolder.addEventListener('click', createNewFolder);
    btnPreview.addEventListener('click', togglePreview);
    editor.addEventListener('input', handleEditorInput);
    editor.addEventListener('keyup', handleEditorKeyup);
    editor.addEventListener('mouseup', handleSelectionChange);
    editor.addEventListener('keyup', handleSelectionChange);
    editor.addEventListener('paste', handlePaste);
    editor.addEventListener('drop', handleDrop);
    editor.addEventListener('dragover', handleDragOver);
    editor.addEventListener('keydown', handleEditorKeydown);
    editor.addEventListener('input', handleEditorInputForSlash);
    document.addEventListener('click', hideContextMenu);
    document.addEventListener('click', hideSlashPanel);
    document.addEventListener('keydown', handleGlobalKeydown);

    // Insert menu buttons
    document.querySelectorAll('.menu-btn').forEach(btn => {
      btn.addEventListener('click', () => executeMenuCommand(btn.dataset.cmd));
    });

    // Format toolbar buttons
    formatToolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
      btn.addEventListener('click', () => handleFormat(btn.dataset.format));
    });

    // Context menu items
    contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => handleContextMenuAction(item.dataset.action));
    });

    // Dialog
    dialogCancel.addEventListener('click', hideDialog);
    dialogConfirm.addEventListener('click', confirmDialog);
    dialogInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') confirmDialog();
      if (e.key === 'Escape') hideDialog();
    });

    // Confirm dialog
    confirmCancel.addEventListener('click', hideConfirm);
    confirmOk.addEventListener('click', async () => {
      if (confirmCallback) await confirmCallback();
      hideConfirm();
    });

    // Conflict dialog
    document.getElementById('conflict-overwrite').addEventListener('click', () => handleConflict('overwrite'));
    document.getElementById('conflict-keep').addEventListener('click', () => handleConflict('keep'));
    document.getElementById('conflict-reload').addEventListener('click', () => handleConflict('reload'));

    // Table dialog
    document.getElementById('table-cancel').addEventListener('click', hideTableDialog);
    document.getElementById('table-insert').addEventListener('click', insertTableFromDialog);
  }

  // Open Workspace
  async function openWorkspace() {
    const path = await window.electronAPI.selectWorkspace();
    if (path) {
      currentWorkspace = path;
      assetsFolderPath = path + '/.flowmark-assets';
      workspaceName.textContent = path.split(/[\\/]/).pop() || path;
      emptyState.style.display = 'none';
      await ensureAssetsFolder();
      await refreshFileTree();
      startFileWatcher();
    }
  }

  // Create new file
  async function createNewFile() {
    if (!currentWorkspace) {
      alert('请先选择工作区');
      return;
    }

    showDialog('新建文件', '', async name => {
      if (name) {
        const fileName = name.endsWith('.md') ? name : name + '.md';
        const result = await window.electronAPI.createItem(currentWorkspace, fileName, false);
        if (result.success) {
          await refreshFileTree();
          await openFile(result.path);
        }
      }
    });
  }

  // Create new folder
  async function createNewFolder() {
    if (!currentWorkspace) {
      alert('请先选择工作区');
      return;
    }

    showDialog('新建文件夹', '', async name => {
      if (name) {
        const result = await window.electronAPI.createItem(currentWorkspace, name, true);
        if (result.success) {
          await refreshFileTree();
        }
      }
    });
  }

  // Ensure assets folder exists
  async function ensureAssetsFolder() {
    if (currentWorkspace) {
      try {
        await window.electronAPI.createDirectory(assetsFolderPath);
      } catch (e) {
        // Folder might already exist
      }
    }
  }

  // Start file watcher
  function startFileWatcher() {
    if (fileWatcherInterval) clearInterval(fileWatcherInterval);
    fileWatcherInterval = setInterval(checkFileChanges, 2000);
  }

  // Check for external file changes
  async function checkFileChanges() {
    if (!currentFilePath || isSaving) return;

    try {
      const stat = await window.electronAPI.getFileStat(currentFilePath);
      if (stat && lastModifiedTime && stat.mtime > lastModifiedTime) {
        showConflictDialog();
        clearInterval(fileWatcherInterval);
      }
    } catch (e) {
      // Ignore errors
    }
  }

  // Show conflict dialog
  function showConflictDialog() {
    conflictMessage.textContent = `"${currentFileName}" 已被外部软件修改。请选择如何处理：`;
    conflictOverlay.classList.add('visible');
  }

  // Handle conflict resolution
  async function handleConflict(action) {
    conflictOverlay.classList.remove('visible');

    switch (action) {
      case 'overwrite':
        await saveCurrentFile();
        break;
      case 'keep':
        // Keep local version, update modified time
        lastModifiedTime = Date.now();
        break;
      case 'reload':
        await loadFile(currentFilePath, currentFileName);
        break;
    }

    startFileWatcher();
  }

  // Refresh File Tree
  async function refreshFileTree() {
    if (!currentWorkspace) return;

    const items = await window.electronAPI.readDirectory(currentWorkspace);
    fileTree.innerHTML = '';

    if (items.length === 0) {
      fileTree.innerHTML = '<div class="empty-state"><p>工作区为空</p></div>';
      return;
    }

    items.forEach(item => {
      const el = createTreeItem(item);
      fileTree.appendChild(el);
    });
  }

  // Create Tree Item
  function createTreeItem(item) {
    const div = document.createElement('div');
    div.className = 'tree-item';
    div.dataset.path = item.path;
    div.dataset.isDirectory = item.isDirectory;

    const content = document.createElement('div');
    content.className = 'tree-item-content';

    if (item.isDirectory) {
      content.innerHTML = `${icons.arrow}<span class="tree-item-name">${item.name}</span>`;
    } else {
      content.innerHTML = `${icons.file}<span class="tree-item-name">${item.name}</span>`;
    }

    content.addEventListener('click', e => handleTreeItemClick(e, item));
    content.addEventListener('contextmenu', e => showContextMenu(e, item));

    div.appendChild(content);

    if (item.isDirectory && item.children && item.children.length > 0) {
      const children = document.createElement('div');
      children.className = 'tree-children';
      item.children.forEach(child => {
        children.appendChild(createTreeItem(child));
      });
      div.appendChild(children);

      content.querySelector('.tree-item-expand')?.addEventListener('click', e => {
        e.stopPropagation();
        const arrow = content.querySelector('.tree-item-expand');
        arrow.classList.toggle('expanded');
        children.classList.toggle('expanded');
      });
    }

    return div;
  }

  // Handle Tree Item Click
  async function handleTreeItemClick(e, item) {
    if (item.isDirectory) return;

    // Save current file first
    if (currentFilePath && !isSaving) {
      await saveCurrentFile();
    }

    // Update selection
    document.querySelectorAll('.tree-item-content.selected').forEach(el => {
      el.classList.remove('selected');
    });
    e.currentTarget.classList.add('selected');

    // Load file
    await loadFile(item.path, item.name);
  }

  // Load File
  async function loadFile(filePath, fileName) {
    currentFilePath = filePath;
    currentFileName = fileName;
    currentFileNameEl.textContent = fileName;

    const content = await window.electronAPI.readFile(filePath);
    currentFileContent = content;

    const stat = await window.electronAPI.getFileStat(filePath);
    lastModifiedTime = stat ? stat.mtime : Date.now();

    editor.innerHTML = markdownToHtml(content);
    editorPlaceholder.style.display = content ? 'none' : 'block';

    updateOutline();
    updateStats();
  }

  // Save Current File
  async function saveCurrentFile() {
    if (!currentFilePath) return;

    isSaving = true;
    const content = htmlToMarkdown(editor.innerHTML);
    const success = await window.electronAPI.writeFile(currentFilePath, content);

    if (success) {
      currentFileContent = content;
      const stat = await window.electronAPI.getFileStat(currentFilePath);
      lastModifiedTime = stat ? stat.mtime : Date.now();
      showSaveStatus();
    }
    isSaving = false;
  }

  // Show Save Status
  function showSaveStatus() {
    saveStatus.textContent = '已保存';
    saveStatus.classList.add('visible');
    setTimeout(() => {
      saveStatus.classList.remove('visible');
    }, 2000);
  }

  // Handle Editor Input
  function handleEditorInput() {
    editorPlaceholder.style.display = editor.innerHTML ? 'none' : 'block';
    updateStats();
    updateOutline();

    // Real-time preview
    if (isPreviewMode) {
      renderPreview();
    }

    // Auto-save with debounce
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (currentFilePath) {
        saveCurrentFile();
      }
    }, 1500);
  }

  // Handle Editor Input (for slash command filtering)
  function handleEditorInputForSlash() {
    if (!slashPanelVisible) return;

    const text = getTextBeforeCursor();
    // Extract filter text after the last /
    const slashIndex = text.lastIndexOf('/');
    if (slashIndex !== -1) {
      slashFilter = text.substring(slashIndex + 1);
    } else {
      slashFilter = '';
    }

    // If filter is empty or no match, reset selection
    const filtered = slashCommands.filter(cmd =>
      cmd.title.includes(slashFilter) || cmd.description.includes(slashFilter)
    );

    if (filtered.length === 0) {
      hideSlashPanel();
      return;
    }

    slashSelectedIndex = 0;
    renderSlashList();
  }

  // Execute menu command
  function executeMenuCommand(cmd) {
    const cmdMap = {
      'h1': () => insertHeading(1),
      'h2': () => insertHeading(2),
      'h3': () => insertHeading(3),
      'bold': () => wrapSelection('strong'),
      'italic': () => wrapSelection('em'),
      'underline': () => wrapSelection('u'),
      'strikethrough': () => wrapSelection('s'),
      'code': () => wrapSelection('code'),
      'codeblock': () => insertCodeBlock(),
      'link': () => insertLink(),
      'image': () => insertImage(),
      'ul': () => insertList('ul'),
      'ol': () => insertList('ol'),
      'todo': () => insertTodoList(),
      'blockquote': () => insertBlockquote(),
      'hr': () => insertHorizontalRule(),
      'table': () => showTableDialog(),
    };

    if (cmdMap[cmd]) {
      cmdMap[cmd]();
    }
  }

  // Handle Editor Keydown
  function handleEditorKeydown(e) {
    // Handle slash command - show panel when / is pressed anywhere
    if (e.key === '/' && !slashPanelVisible) {
      e.preventDefault();
      showSlashPanel();
      return;
    }

    // Handle escape to hide slash panel
    if (e.key === 'Escape' && slashPanelVisible) {
      hideSlashPanel();
    }

    // Navigate slash panel
    if (slashPanelVisible) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateSlashPanel(1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateSlashPanel(-1);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        executeSlashCommand();
        return;
      }
    }
  }

  // Get text before cursor
  function getTextBeforeCursor() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return '';
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent.substring(0, range.startOffset);
    }
    return '';
  }

  // Show Slash Panel
  function showSlashPanel() {
    slashPanelVisible = true;
    slashSelectedIndex = 0;
    slashFilter = '';
    renderSlashList();
    positionSlashPanel();
    slashPanel.classList.add('visible');
  }

  // Hide Slash Panel
  function hideSlashPanel() {
    slashPanelVisible = false;
    slashPanel.classList.remove('visible');
  }

  // Position Slash Panel (centered on screen)
  function positionSlashPanel() {
    // Panel is centered via CSS, no need to position via JS
  }

  // Render Slash List
  function renderSlashList() {
    const filtered = slashCommands.filter(cmd =>
      cmd.title.includes(slashFilter) || cmd.description.includes(slashFilter)
    );

    slashList.innerHTML = '';

    filtered.forEach((cmd, index) => {
      const item = document.createElement('div');
      item.className = 'slash-item' + (index === slashSelectedIndex ? ' selected' : '');
      item.innerHTML = `
        <span class="slash-icon">${cmd.icon}</span>
        <div class="slash-text">
          <span class="slash-title">${cmd.title}</span>
          <span class="slash-desc">${cmd.description}</span>
        </div>
      `;
      item.addEventListener('click', () => {
        slashSelectedIndex = index;
        executeSlashCommand();
      });
      item.addEventListener('mouseenter', () => {
        slashSelectedIndex = index;
        updateSlashSelection();
      });
      slashList.appendChild(item);
    });
  }

  // Navigate Slash Panel
  function navigateSlashPanel(direction) {
    const items = slashList.querySelectorAll('.slash-item');
    if (items.length === 0) return;

    slashSelectedIndex = Math.max(0, Math.min(items.length - 1, slashSelectedIndex + direction));
    updateSlashSelection();
  }

  // Update Slash Selection
  function updateSlashSelection() {
    const items = slashList.querySelectorAll('.slash-item');
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === slashSelectedIndex);
    });
  }

  // Execute Slash Command
  function executeSlashCommand() {
    const filtered = slashCommands.filter(cmd =>
      cmd.title.includes(slashFilter) || cmd.description.includes(slashFilter)
    );

    if (filtered[slashSelectedIndex]) {
      // Remove the slash character
      deleteSlashChar();

      hideSlashPanel();
      filtered[slashSelectedIndex].action();
    }
  }

  // Delete slash character
  function deleteSlashChar() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    // Find and remove the slash character before cursor
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const offset = range.startOffset;
      const beforeSlash = text.lastIndexOf('/', offset - 1);
      if (beforeSlash !== -1) {
        node.textContent = text.substring(0, beforeSlash) + text.substring(offset);
        range.setStart(node, beforeSlash);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }

  // Insert Heading
  function insertHeading(level) {
    insertHTMLAtCursor(`<h${level}>标题</h${level}>`);
  }

  // Wrap Selection
  function wrapSelection(tag) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();

    if (selectedText) {
      const wrapper = document.createElement(tag);
      wrapper.textContent = selectedText;
      range.deleteContents();
      range.insertNode(wrapper);
      range.selectNodeContents(wrapper);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  // Insert Code Block
  function insertCodeBlock() {
    insertHTMLAtCursor('<pre class="code-block"><code></code></pre>');
  }

  // Insert Link
  function insertLink() {
    const selection = window.getSelection();
    const selectedText = selection.toString() || '链接文本';
    const html = `<a href="#" target="_blank">${selectedText}</a>`;
    insertHTMLAtCursor(html);
  }

  // Insert Image
  async function insertImage() {
    if (!currentWorkspace) {
      alert('请先打开工作区');
      return;
    }

    try {
      const result = await window.electronAPI.selectImage();
      if (result && result.filePath) {
        const relativePath = await saveImageToAssets(result.filePath);
        const imageMd = `![${result.fileName}](${relativePath})`;
        insertAtCursor(imageMd);
      }
    } catch (e) {
      console.error('Insert image error:', e);
    }
  }

  // Save image to assets folder
  async function saveImageToAssets(imagePath) {
    const fileName = generateImageFileName(imagePath);
    const destPath = assetsFolderPath + '/' + fileName;
    await window.electronAPI.copyFile(imagePath, destPath);
    return '.flowmark-assets/' + fileName;
  }

  // Generate unique image filename
  function generateImageFileName(originalPath) {
    const ext = originalPath.split('.').pop() || 'png';
    const timestamp = Date.now();
    const hash = Math.random().toString(36).substring(2, 8);
    return `image-${timestamp}-${hash}.${ext}`;
  }

  // Show Table Dialog
  function showTableDialog() {
    document.getElementById('table-rows').value = 3;
    document.getElementById('table-cols').value = 3;
    tableDialogOverlay.classList.add('visible');
  }

  // Hide Table Dialog
  function hideTableDialog() {
    tableDialogOverlay.classList.remove('visible');
  }

  // Insert Table from Dialog
  function insertTableFromDialog() {
    const rows = parseInt(document.getElementById('table-rows').value) || 3;
    const cols = parseInt(document.getElementById('table-cols').value) || 3;
    hideTableDialog();

    // Ensure editor is focused before inserting
    editor.focus();

    // Check if there's a valid selection, if not place cursor at end
    const selection = window.getSelection();
    if (!selection.rangeCount) {
      // Place cursor at end of editor
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    insertTable(rows, cols);
  }

  // Insert Table
  function insertTable(rows, cols) {
    let html = '<table class="md-table">';

    // Header row with column numbers
    html += '<thead><tr>';
    for (let i = 0; i < cols; i++) {
      const label = '列' + (i + 1);
      const attrs = ' data-label="' + label + '"';
      html += '<th' + attrs + '>' + label + '</th>';
    }
    html += '</tr></thead>';

    // Body rows with row numbers in first column
    html += '<tbody>';
    for (let i = 0; i < rows - 1; i++) {
      html += '<tr>';
      for (let j = 0; j < cols; j++) {
        const label = j === 0 ? '行' + (i + 1) : '';
        const attrs = label ? ' data-label="' + label + '"' : '';
        html += '<td' + attrs + '>' + label + '</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>';

    insertHTMLAtCursor(html);
  }

  // Insert HTML at cursor
  function insertHTMLAtCursor(html) {
    editor.focus();
    const selection = window.getSelection();
    if (!selection.rangeCount) {
      // Place cursor at end if no selection
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const range = selection.getRangeAt(0);
    range.collapse(true);

    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = html;
    const fragment = document.createDocumentFragment();

    while (container.firstChild) {
      fragment.appendChild(container.firstChild);
    }

    range.insertNode(fragment);

    // Move cursor after the inserted content
    const lastNode = fragment.lastChild;
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    handleEditorInput();
  }

  // Insert List
  function insertList(type) {
    const tag = type === 'ul' ? 'ul' : 'ol';
    const html = `<${tag}><li></li></${tag}>`;
    insertHTMLAtCursor(html);
  }

  // Insert Todo List
  function insertTodoList() {
    const html = '<ul class="task-list"><li class="task-item"><input type="checkbox"> 待办事项</li></ul>';
    insertHTMLAtCursor(html);
  }

  // Insert Blockquote
  function insertBlockquote() {
    insertHTMLAtCursor('<blockquote></blockquote>');
  }

  // Insert Horizontal Rule
  function insertHorizontalRule() {
    insertHTMLAtCursor('<hr>');
  }

  // Insert at Cursor
  function insertAtCursor(text) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const node = document.createTextNode(text);
    range.insertNode(node);

    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editor.focus();
    handleEditorInput();
  }

  // Handle Paste
  async function handlePaste(e) {
    // Check for image in clipboard
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await pasteImage(file);
        }
        return;
      }
    }
  }

  // Paste Image
  async function pasteImage(file) {
    if (!currentWorkspace) {
      alert('请先打开工作区');
      return;
    }

    showImageProgress();

    try {
      const timestamp = Date.now();
      const hash = Math.random().toString(36).substring(2, 8);
      const ext = file.name?.split('.').pop() || 'png';
      const fileName = `paste-${timestamp}-${hash}.${ext}`;

      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Use the correct API signature: (dir, name, base64Data)
      await window.electronAPI.writeImageFile(assetsFolderPath, fileName, base64);
      const relativePath = '.flowmark-assets/' + fileName;
      const imageMd = `![](${relativePath})`;

      insertAtCursor(imageMd);
    } catch (e) {
      console.error('Paste image error:', e);
    }

    hideImageProgress();
  }

  // Show/Hide Image Progress
  function showImageProgress() {
    imageProgress.classList.add('visible');
  }

  function hideImageProgress() {
    imageProgress.classList.remove('visible');
  }

  // Handle Drag Over
  function handleDragOver(e) {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  // Handle Drop
  async function handleDrop(e) {
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        await pasteImage(file);
        return;
      }
    }
  }

  // Handle Editor Keyup
  function handleEditorKeyup(e) {
    // Handle markdown shortcuts
    const text = getTextBeforeCursor();
    if (!text) return;

    const lines = text.split('\n');
    const currentLine = lines[lines.length - 1];

    // Check for heading shortcuts
    if (currentLine === '#' && !e.shiftKey) {
      // Will be handled by slash command if user continues
    }
  }

  // Handle Selection Change (Show Toolbar)
  function handleSelectionChange() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && document.activeElement === editor) {
      showFormatToolbar();
    } else {
      hideFormatToolbar();
    }
  }

  // Show Format Toolbar
  function showFormatToolbar() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    formatToolbar.style.top = `${rect.top - 44}px`;
    formatToolbar.style.left = `${rect.left + rect.width / 2 - formatToolbar.offsetWidth / 2}px`;
    formatToolbar.classList.add('visible');

    updateToolbarActiveStates();
  }

  // Hide Format Toolbar
  function hideFormatToolbar() {
    formatToolbar.classList.remove('visible');
  }

  // Update Toolbar Active States
  function updateToolbarActiveStates() {
    const btn = (format) => formatToolbar.querySelector(`[data-format="${format}"]`);

    btn('bold')?.classList.toggle('active', document.queryCommandState('bold'));
    btn('italic')?.classList.toggle('active', document.queryCommandState('italic'));
    btn('underline')?.classList.toggle('active', document.queryCommandState('underline'));
  }

  // Handle Format
  function handleFormat(format) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    switch (format) {
      case 'bold':
        document.execCommand('bold', false, null);
        break;
      case 'italic':
        document.execCommand('italic', false, null);
        break;
      case 'underline':
        document.execCommand('underline', false, null);
        break;
      case 'strikethrough':
        document.execCommand('strikeThrough', false, null);
        break;
      case 'link':
        insertLink();
        break;
      case 'code':
        wrapSelection('`', '`');
        break;
    }

    editor.focus();
    handleEditorInput();
    updateToolbarActiveStates();
  }

  // Global Keyboard Shortcuts
  function handleGlobalKeydown(e) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdKey = isMac ? e.metaKey : e.ctrlKey;

    if (cmdKey) {
      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault();
          if (currentFilePath) saveCurrentFile();
          break;
        case 'b':
          if (document.activeElement === editor) {
            e.preventDefault();
            handleFormat('bold');
          }
          break;
        case 'i':
          if (document.activeElement === editor) {
            e.preventDefault();
            handleFormat('italic');
          }
          break;
        case 'u':
          if (document.activeElement === editor) {
            e.preventDefault();
            handleFormat('underline');
          }
          break;
        case 'k':
          if (document.activeElement === editor) {
            e.preventDefault();
            insertLink();
          }
          break;
        case 'p':
          e.preventDefault();
          togglePreview();
          break;
      }
    }
  }

  // Toggle Preview Mode
  function togglePreview() {
    isPreviewMode = !isPreviewMode;

    if (isPreviewMode) {
      previewContent.classList.remove('hidden');
      btnPreview.classList.add('active');
      renderPreview();
    } else {
      previewContent.classList.add('hidden');
      btnPreview.classList.remove('active');
    }
  }

  // Render Preview
  function renderPreview() {
    // Simply copy editor content to preview (already in HTML format)
    // Clone the editor content to avoid moving elements
    const clone = editor.cloneNode(true);
    // Remove placeholder from clone
    const placeholder = clone.querySelector('.editor-placeholder');
    if (placeholder) placeholder.remove();
    previewContent.innerHTML = clone.innerHTML;
  }

  // Update Outline
  function updateOutline() {
    const headings = editor.querySelectorAll('h1, h2, h3');
    outlineList.innerHTML = '';

    if (headings.length === 0) {
      outlineList.innerHTML = '<div class="outline-empty">暂无标题</div>';
      return;
    }

    headings.forEach((heading, index) => {
      if (!heading.id) {
        heading.id = `heading-${index}`;
      }

      const item = document.createElement('div');
      item.className = `outline-item ${heading.tagName.toLowerCase()}`;
      item.innerHTML = `<span class="outline-item-text">${heading.textContent}</span>`;
      item.addEventListener('click', () => {
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.querySelectorAll('.outline-item.active').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
      });
      outlineList.appendChild(item);
    });
  }

  // Update Stats
  function updateStats() {
    const text = editor.innerText || '';
    const chars = text.replace(/\s/g, '').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    wordCount.textContent = `${chars} 字`;

    // Calculate line number
    const content = editor.innerHTML;
    const lineBreaks = (content.match(/<br\s*\/?>/gi) || []).length;
    const paragraphs = (content.match(/<\/(p|h\d|blockquote|li|div)>/gi) || []).length;
    const currentLine = Math.min(paragraphs + lineBreaks + 1, 1);
    lineInfo.textContent = `行 ${currentLine || 1}`;
  }

  // Context Menu
  function showContextMenu(e, item) {
    e.preventDefault();
    e.stopPropagation();

    contextMenuTarget = item;

    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.classList.add('visible');
  }

  function hideContextMenu() {
    contextMenu.classList.remove('visible');
    contextMenuTarget = null;
  }

  // Handle Context Menu Action
  function handleContextMenuAction(action) {
    if (!contextMenuTarget) return;

    const item = contextMenuTarget;
    const parentPath = currentWorkspace;

    hideContextMenu();

    switch (action) {
      case 'new-file':
        showDialog('新建文件', '', async name => {
          if (name) {
            const ext = name.endsWith('.md') ? '' : '.md';
            await window.electronAPI.createItem(parentPath, name + ext, false);
            await refreshFileTree();
          }
        });
        break;

      case 'new-folder':
        showDialog('新建文件夹', '', async name => {
          if (name) {
            await window.electronAPI.createItem(parentPath, name, true);
            await refreshFileTree();
          }
        });
        break;

      case 'show-in-folder':
        window.electronAPI.showItemInFolder(item.path);
        break;

      case 'rename':
        showDialog('重命名', item.name, async newName => {
          if (newName && newName !== item.name) {
            const dir = item.path.substring(0, item.path.lastIndexOf('/'));
            const newPath = dir + '/' + newName;
            if (!item.isDirectory && !newName.endsWith('.md')) {
              await window.electronAPI.renameItem(item.path, newName + '.md');
            } else {
              await window.electronAPI.renameItem(item.path, newName);
            }
            await refreshFileTree();
          }
        });
        break;

      case 'delete':
        showConfirm('确认删除', `确定要删除 "${item.name}" 吗？此操作不可撤销。`, async () => {
          await window.electronAPI.deleteItem(item.path);
          if (currentFilePath === item.path) {
            currentFilePath = null;
            currentFileName = null;
            editor.innerHTML = '';
            currentFileNameEl.textContent = '未打开文件';
          }
          await refreshFileTree();
        });
        break;
    }
  }

  // Dialog
  let dialogCallback = null;

  function showDialog(title, defaultValue, callback) {
    dialogTitle.textContent = title;
    dialogInput.value = defaultValue;
    dialogCallback = callback;
    dialogOverlay.classList.add('visible');
    setTimeout(() => dialogInput.focus(), 50);
  }

  function hideDialog() {
    dialogOverlay.classList.remove('visible');
    dialogCallback = null;
  }

  function confirmDialog() {
    if (dialogCallback) {
      dialogCallback(dialogInput.value);
    }
    hideDialog();
  }

  // Confirm Dialog
  let confirmCallback = null;

  function showConfirm(title, message, callback) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmCallback = callback;
    confirmOverlay.classList.add('visible');
  }

  function hideConfirm() {
    confirmOverlay.classList.remove('visible');
    confirmCallback = null;
  }

  // Markdown to HTML conversion
  function markdownToHtml(md) {
    if (!md) return '';

    let html = md;

    // Preserve existing HTML elements before escaping
    const placeholders = [];
    let idx = 0;

    // Protect tables
    html = html.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (match) => {
      placeholders.push(match);
      return `__PH_${idx++}__`;
    });

    // Protect code blocks
    html = html.replace(/<pre class="code-block">[\s\S]*?<\/pre>/gi, (match) => {
      placeholders.push(match);
      return `__PH_${idx++}__`;
    });

    // Protect task lists
    html = html.replace(/<ul class="task-list">[\s\S]*?<\/ul>/gi, (match) => {
      placeholders.push(match);
      return `__PH_${idx++}__`;
    });

    // Escape HTML
    html = html.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');

    // Restore placeholders and unescape
    placeholders.forEach((content, i) => {
      const unescaped = content.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      html = html.replace(`__PH_${i}__`, unescaped);
    });

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>');

    // Tables
    html = parseMarkdownTable(html);

    // Task lists
    html = html.replace(/^- \[ \] (.+)$/gm, '<div class="task-item"><input type="checkbox" disabled> $1</div>');
    html = html.replace(/^- \[x\] (.+)$/gm, '<div class="task-item"><input type="checkbox" checked disabled> $1</div>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~([^~]+)~~/g, '<s>$1</s>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Images with relative paths
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-image">');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^\*\*\*$/gm, '<hr>');
    html = html.replace(/^___$/gm, '<hr>');

    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // Unordered lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = consolidateLists(html, 'ul');

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = consolidateLists(html, 'ol');

    // Paragraphs
    html = html.split('\n\n').map(p => {
      if (p.match(/^<(h[1-6]|blockquote|pre|ul|ol|li|hr|div)/i)) return p;
      if (p.trim()) return `<p>${p.replace(/\n/g, '<br>')}</p>`;
      return '';
    }).join('');

    // Clean up
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<br><br>/g, '<br>');

    return html;
  }

  // Parse markdown table to HTML
  function parseMarkdownTable(html) {
    const tableRegex = /\|(.+)\|\n\|[:\- ]+\|\n((?:\|.+\|\n?)+)/g;
    return html.replace(tableRegex, (match, header, body) => {
      const headerCells = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
      const bodyRows = body.trim().split('\n').map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table class="md-table"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    });
  }

  // Consolidate list items into ul/ol
  function consolidateLists(html, type) {
    const tag = type === 'ul' ? 'ul' : 'ol';
    const regex = type === 'ul' ? /<li>.+<\/li>/g : /<li>.+<\/li>/g;
    const matches = html.match(regex) || [];
    if (matches.length === 0) return html;

    let result = '';
    let inList = false;
    const lines = html.split('\n');

    for (const line of lines) {
      if (line.match(/^<li>/)) {
        if (!inList) {
          result += `<${tag}>`;
          inList = true;
        }
        result += line;
      } else {
        if (inList) {
          result += `</${tag}>`;
          inList = false;
        }
        result += line;
      }
    }

    if (inList) result += `</${tag}>`;
    return result;
  }

  // HTML to Markdown conversion
  function htmlToMarkdown(html) {
    if (!html) return '';

    let md = html;

    // Tables
    md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, content) => {
      const rows = content.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      return rows.map(row => {
        const cells = row.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi) || [];
        return '| ' + cells.map(c => c.replace(/<[^>]+>/g, '').trim()).join(' | ') + ' |';
      }).join('\n');
    });
    md = md.replace(/\|---/g, '|---');

    // Task lists
    md = md.replace(/<div class="task-item"><input[^>]*>\s*([^<]+)<\/div>/gi, (match, text) => {
      const checked = match.includes('checked');
      return `- [${checked ? 'x' : ' '}] ${text.trim()}`;
    });

    // Code blocks
    md = md.replace(/<pre class="code-block"><code>([\s\S]*?)<\/code><\/pre>/g, '```\n$1```');

    // Inline code
    md = md.replace(/<code>([^<]+)<\/code>/g, '`$1`');

    // Headers
    md = md.replace(/<h1[^>]*>([^<]+)<\/h1>/gi, '# $1\n');
    md = md.replace(/<h2[^>]*>([^<]+)<\/h2>/gi, '## $1\n');
    md = md.replace(/<h3[^>]*>([^<]+)<\/h3>/gi, '### $1\n');
    md = md.replace(/<h4[^>]*>([^<]+)<\/h4>/gi, '#### $1\n');

    // Bold
    md = md.replace(/<strong>([^<]+)<\/strong>/g, '**$1**');

    // Italic
    md = md.replace(/<em>([^<]+)<\/em>/g, '*$1*');

    // Strikethrough
    md = md.replace(/<s>([^<]+)<\/s>/g, '~~$1~~');

    // Links
    md = md.replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g, '[$2]($1)');

    // Images
    md = md.replace(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g, '![$2]($1)');
    md = md.replace(/<img[^>]+alt="([^"]*)"[^>]*src="([^"]+)"[^>]*>/g, '![$1]($2)');
    md = md.replace(/<img[^>]+src="([^"]+)"[^>]*>/g, '![]($1)');

    // Horizontal rules
    md = md.replace(/<hr\s*\/?>/gi, '---\n');

    // Blockquotes
    md = md.replace(/<blockquote>([^<]+)<\/blockquote>/gi, '> $1\n');

    // Line breaks
    md = md.replace(/<br\s*\/?>/gi, '\n');

    // Paragraphs
    md = md.replace(/<\/p><p>/gi, '\n\n');
    md = md.replace(/<p>([^<]*)<\/p>/gi, '$1\n\n');

    // Lists
    md = md.replace(/<\/?ul>|<\/?ol>/gi, '');
    md = md.replace(/<li>([^<]+)<\/li>/gi, '- $1\n');

    // Remove remaining tags
    md = md.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    md = md.replace(/&amp;/g, '&')
           .replace(/&lt;/g, '<')
           .replace(/&gt;/g, '>');

    // Clean up
    md = md.replace(/\n{3,}/g, '\n\n');
    md = md.trim();

    return md;
  }

  // Start the app
  init();
})();