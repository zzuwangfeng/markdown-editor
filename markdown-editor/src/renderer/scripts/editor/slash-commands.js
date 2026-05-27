// FlowMark - editor/slash-commands
(function(App) {
  'use strict';

  function handleEditorInputForSlash() {
    if (!App.state.slashPanelVisible) return;

    const text = getTextBeforeCursor();
    const slashIndex = text.lastIndexOf('/');
    if (slashIndex !== -1) {
      App.state.slashFilter = text.substring(slashIndex + 1);
    } else {
      App.state.slashFilter = '';
    }

    const filtered = App.slashCommands.filter(cmd =>
      cmd.title.includes(App.state.slashFilter) || cmd.description.includes(App.state.slashFilter)
    );

    if (filtered.length === 0) {
      hideSlashPanel();
      return;
    }

    App.state.slashSelectedIndex = 0;
    renderSlashList();
  }

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

  function showSlashPanel() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      App.state.savedCursorRange = selection.getRangeAt(0).cloneRange();
    } else {
      App.state.savedCursorRange = null;
    }

    App.state.slashPanelVisible = true;
    App.state.slashSelectedIndex = 0;
    App.state.slashFilter = '';
    renderSlashList();
    App.dom.slashPanel.classList.add('visible');
  }

  function hideSlashPanel() {
    App.state.slashPanelVisible = false;
    App.dom.slashPanel.classList.remove('visible');
  }

  function renderSlashList() {
    const filtered = App.slashCommands.filter(cmd =>
      cmd.title.includes(App.state.slashFilter) || cmd.description.includes(App.state.slashFilter)
    );

    App.dom.slashList.innerHTML = '';

    filtered.forEach((cmd, index) => {
      const item = document.createElement('div');
      item.className = 'slash-item' + (index === App.state.slashSelectedIndex ? ' selected' : '');
      item.innerHTML = `
        <span class="slash-icon">${cmd.icon}</span>
        <div class="slash-text">
          <span class="slash-title">${cmd.title}</span>
          <span class="slash-desc">${cmd.description}</span>
        </div>
      `;
      item.addEventListener('click', () => {
        App.state.slashSelectedIndex = index;
        executeSlashCommand();
      });
      item.addEventListener('mouseenter', () => {
        App.state.slashSelectedIndex = index;
        updateSlashSelection();
      });
      App.dom.slashList.appendChild(item);
    });
  }

  function updateSlashSelection() {
    const items = App.dom.slashList.querySelectorAll('.slash-item');
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === App.state.slashSelectedIndex);
    });
    const selectedItem = items[App.state.slashSelectedIndex];
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function executeSlashCommand() {
    const filtered = App.slashCommands.filter(cmd =>
      cmd.title.includes(App.state.slashFilter) || cmd.description.includes(App.state.slashFilter)
    );

    if (filtered[App.state.slashSelectedIndex]) {
      deleteSlashChar();
      hideSlashPanel();
      filtered[App.state.slashSelectedIndex].action();
    }
  }

  function deleteSlashChar() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;

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

  App.editor_slash_commands = {
    handleEditorInputForSlash: handleEditorInputForSlash,
    getTextBeforeCursor: getTextBeforeCursor,
    showSlashPanel: showSlashPanel,
    hideSlashPanel: hideSlashPanel,
    renderSlashList: renderSlashList,
    updateSlashSelection: updateSlashSelection,
    executeSlashCommand: executeSlashCommand,
    deleteSlashChar: deleteSlashChar,
  };

})(window.__App);