// FlowMark - ui/context-menu
(function(App) {
  'use strict';

  function showContextMenu(e, item) {
    e.preventDefault();
    e.stopPropagation();

    App.state.contextMenuTarget = item;

    App.dom.contextMenu.style.top = `${e.clientY}px`;
    App.dom.contextMenu.style.left = `${e.clientX}px`;
    App.dom.contextMenu.classList.add('visible');
  }

  function hideContextMenu() {
    App.dom.contextMenu.classList.remove('visible');
    App.state.contextMenuTarget = null;
  }

  async function handleContextMenuAction(action) {
    if (!App.state.contextMenuTarget) return;

    const item = App.state.contextMenuTarget;
    // 获取父目录：如果是文件夹则直接在内部创建，否则取文件的父目录
    const parentPath = item.isDirectory ? item.path : item.path.substring(0, item.path.lastIndexOf('/'));

    hideContextMenu();

    switch (action) {
      case 'new-file':
        App.dialogs.showDialog('新建文件', '', async name => {
          if (name) {
            const ext = name.endsWith('.md') ? '' : '.md';
            const result = await window.electronAPI.createItem(parentPath, name + ext, false);
            if (result.success) {
              await App.file_file_operations.refreshFileTree();
              await App.file_file_operations.openFileInEditor(result.path);
            }
          }
        });
        break;

      case 'new-folder':
        App.dialogs.showDialog('新建文件夹', '', async name => {
          if (name) {
            await window.electronAPI.createItem(parentPath, name, true);
            await App.file_file_operations.refreshFileTree();
          }
        });
        break;

      case 'show-in-folder':
        window.electronAPI.showItemInFolder(item.path);
        break;

      case 'rename':
        App.dialogs.showDialog('重命名', item.name, async newName => {
          if (newName && newName !== item.name) {
            const dir = item.path.substring(0, item.path.lastIndexOf('/'));
            if (!item.isDirectory && !newName.endsWith('.md')) {
              await window.electronAPI.renameItem(item.path, newName + '.md');
            } else {
              await window.electronAPI.renameItem(item.path, newName);
            }
            await App.file_file_operations.refreshFileTree();
          }
        });
        break;

      case 'delete':
        App.dialogs.showConfirm('确认删除', `确定要将 "${item.name}" 移动到回收站吗？`, async () => {
          const result = await window.electronAPI.deleteItem(item.path);
          if (App.state.currentFilePath === item.path) {
            App.state.currentFilePath = null;
            App.state.currentFileName = null;
            App.dom.editor.innerHTML = '';
            App.dom.currentFileNameEl.textContent = '未打开文件';
          }
          await App.file_file_operations.refreshFileTree();
        });
        break;
    }
  }

  function handleImageContextAction(action) {
    if (!App.dom.imageContextTarget) return;

    const img = App.dom.imageContextTarget;
    App.dom.imageContextMenu.classList.remove('visible');

    const maxWidthMap = {
      'img-20': '20%',
      'img-50': '50%',
      'img-70': '70%',
      'img-100': '100%'
    };

    if (maxWidthMap[action] !== undefined) {
      img.style.maxWidth = maxWidthMap[action];
      img.style.width = maxWidthMap[action];
    }
  }

  App.context_menu = {
    showContextMenu: showContextMenu,
    hideContextMenu: hideContextMenu,
    handleContextMenuAction: handleContextMenuAction,
    handleImageContextAction: handleImageContextAction,
  };

})(window.__App);