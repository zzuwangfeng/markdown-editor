// FlowMark - file/file-watcher
(function(App) {
  'use strict';

  function startFileWatcher() {
    if (App.state.fileWatcherInterval) clearInterval(App.state.fileWatcherInterval);
    App.state.fileWatcherInterval = setInterval(checkFileChanges, 2000);
  }

  async function checkFileChanges() {
    if (!App.state.currentFilePath || App.state.isSaving) return;

    try {
      const stat = await window.electronAPI.getFileStat(App.state.currentFilePath);
      if (stat && App.state.lastModifiedTime && stat.mtime > App.state.lastModifiedTime) {
        App.file_file_operations.showConflictDialog();
        clearInterval(App.state.fileWatcherInterval);
      }
    } catch (e) {
      // 忽略错误
    }
  }

  App.file_file_watcher = {
    startFileWatcher: startFileWatcher,
    checkFileChanges: checkFileChanges,
  };

})(window.__App);