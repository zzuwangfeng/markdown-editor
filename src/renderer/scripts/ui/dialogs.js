// FlowMark - ui/dialogs
(function(App) {
  'use strict';

  let dialogCallback = null;

  function showDialog(title, defaultValue, callback) {
    App.dom.dialogTitle.textContent = title;
    App.dom.dialogInput.value = defaultValue;
    dialogCallback = callback;
    App.dom.dialogOverlay.classList.add('visible');
    setTimeout(() => App.dom.dialogInput.focus(), 50);
  }

  function hideDialog() {
    App.dom.dialogOverlay.classList.remove('visible');
    dialogCallback = null;
  }

  function confirmDialog() {
    if (dialogCallback) {
      dialogCallback(App.dom.dialogInput.value);
    }
    hideDialog();
  }

  function showConfirm(title, message, callback) {
    App.dom.confirmTitle.textContent = title;
    App.dom.confirmMessage.textContent = message;
    App.dialogs.confirmCallback = callback;
    App.dom.confirmOverlay.classList.add('visible');
  }

  function hideConfirm() {
    App.dom.confirmOverlay.classList.remove('visible');
    App.dialogs.confirmCallback = null;
  }

  App.dialogs = {
    confirmCallback: null,
    showDialog: showDialog,
    hideDialog: hideDialog,
    confirmDialog: confirmDialog,
    showConfirm: showConfirm,
    hideConfirm: hideConfirm,
  };

})(window.__App);