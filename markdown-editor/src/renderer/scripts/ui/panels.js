// FlowMark - ui/panels
(function(App) {
  'use strict';

  function handleMenuEvent(action) {
    switch (action) {
      case 'new-file':
        App.file_file_operations.createNewFile();
        break;
      case 'open-workspace':
        App.file_file_operations.openWorkspace();
        break;
      case 'save':
        if (App.state.currentFilePath) App.file_file_operations.saveCurrentFile();
        break;
      case 'toggle-sidebar':
        App.sidebar.toggleSidebar();
        break;
      case 'toggle-outline':
        toggleOutline();
        break;
      case 'theme-light':
        App.theme.setTheme('light');
        break;
      case 'theme-dark':
        App.theme.setTheme('dark');
        break;
      case 'settings':
        showSettingsDialog();
        break;
      case 'about':
        showAboutDialog();
        break;
    }
  }

  function toggleOutline() {
    App.state.isOutlineEnabled = !App.state.isOutlineEnabled;
    const outlinePanel = document.getElementById('outline-panel');
    if (App.state.isOutlineEnabled) {
      outlinePanel.style.display = 'flex';
    } else {
      outlinePanel.style.display = 'none';
    }
    localStorage.setItem('flowmark-outline-enabled', App.state.isOutlineEnabled);
  }

  function showSettingsDialog() {
    App.dialogs.showDialog('主题设置', App.theme.getCurrentTheme(), async theme => {
      if (theme) App.theme.setTheme(theme.trim());
    });
  }

  function showAboutDialog() {
    App.dom.aboutOverlay.classList.add('visible');
  }

  function hideAboutDialog() {
    App.dom.aboutOverlay.classList.remove('visible');
  }

  App.panels = {
    handleMenuEvent: handleMenuEvent,
    toggleOutline: toggleOutline,
    showSettingsDialog: showSettingsDialog,
    showAboutDialog: showAboutDialog,
    hideAboutDialog: hideAboutDialog,
  };

})(window.__App);