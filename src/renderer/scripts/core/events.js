// FlowMark - core/events
(function(App) {
  'use strict';

  function bindEvents() {
    const isMac = navigator.userAgent.includes('Mac');
    if (isMac) {
      document.body.classList.add('mac');
    } else {
      document.body.classList.add('win');
    }

    const btnMinimize = document.getElementById('btn-minimize');
    const btnMaximize = document.getElementById('btn-maximize');
    const btnClose = document.getElementById('btn-close');

    if (btnMinimize) btnMinimize.addEventListener('click', () => window.electronAPI.windowMinimize());
    if (btnMaximize) btnMaximize.addEventListener('click', () => window.electronAPI.windowMaximize());
    if (btnClose) btnClose.addEventListener('click', () => window.electronAPI.windowClose());

    App.dom.btnAdd.addEventListener('click', App.file_file_operations.handleAddClick);

    if (App.dom.btnRefresh) {
      App.dom.btnRefresh.addEventListener('click', async () => {
        const refreshIcon = App.dom.btnRefresh.querySelector('.refresh-icon');
        if (refreshIcon) {
          refreshIcon.classList.add('spinning');
          setTimeout(() => refreshIcon.classList.remove('spinning'), 600);
        }
        if (App.state.currentWorkspace) {
          await App.file_file_operations.refreshFileTree();
        }
      });
    }

    if (App.dom.btnToggleSidebar) {
      App.dom.btnToggleSidebar.addEventListener('click', App.sidebar.toggleSidebar);
    }

    if (App.dom.sidebarSearchInput) {
      App.dom.sidebarSearchInput.addEventListener('input', App.sidebar.handleSidebarSearchInput);
      App.dom.sidebarSearchClear.addEventListener('click', App.sidebar.clearSidebarSearch);
    }

    if (App.dom.dropdownMenu) {
      App.dom.dropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => App.file_file_operations.handleDropdownAction(item.dataset.action));
      });
    }

    document.addEventListener('click', App.file_file_operations.hideDropdownMenu);

    if (App.dom.editor) {
      App.dom.editor.addEventListener('input', App.editor_content.handleEditorInput);
      App.dom.editor.addEventListener('keyup', (e) => {
        App.editor_content.handleEditorKeyup(e);
        App.editor_content.handleSelectionChange();
      });
      App.dom.editor.addEventListener('mouseup', App.editor_content.handleSelectionChange);
      App.dom.editor.addEventListener('paste', App.editor_content.handlePaste);
      App.dom.editor.addEventListener('drop', App.editor_content.handleDrop);
      App.dom.editor.addEventListener('dragover', App.editor_content.handleDragOver);
      App.dom.editor.addEventListener('keydown', App.editor_keyboard.handleEditorKeydown);
      App.dom.editor.addEventListener('input', App.editor_slash_commands.handleEditorInputForSlash);
    }

    document.addEventListener('click', App.context_menu.hideContextMenu);
    document.addEventListener('click', App.editor_slash_commands.hideSlashPanel);
    document.addEventListener('click', e => {
      if (App.dom.searchPanel && App.dom.searchPanel.classList.contains('visible') && !e.target.closest('.search-panel:not(.project-search)')) {
        App.search.hideSearchPanel();
      }
      if (App.dom.searchPanelProject && App.dom.searchPanelProject.classList.contains('visible') && !e.target.closest('.search-panel.project-search')) {
        App.search.hideProjectSearchPanel();
      }
      if (App.dom.editor.contains(e.target) && !e.target.closest('.code-block-wrapper')) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const startNode = range.startContainer;
          const startElement = startNode.nodeType === Node.TEXT_NODE ? startNode.parentElement : startNode;
          const codeBlock = startElement?.closest('.code-block');
          const wrapper = codeBlock?.closest('.code-block-wrapper');

          if (wrapper && wrapper.nextSibling) {
            const newRange = document.createRange();
            newRange.setStartAfter(wrapper);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } else if (wrapper && !wrapper.nextSibling) {
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            App.dom.editor.appendChild(p);
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
      }
    });
    document.addEventListener('keydown', App.core_global.handleGlobalKeydown);

    document.querySelectorAll('.menu-btn').forEach(btn => {
      btn.addEventListener('click', () => App.core_global.executeMenuCommand(btn.dataset.cmd));
    });

    if (App.dom.formatToolbar) {
      App.dom.formatToolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.addEventListener('click', () => App.editor_content.handleFormat(btn.dataset.format));
      });
    }

    if (App.dom.contextMenu) {
      App.dom.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', () => App.context_menu.handleContextMenuAction(item.dataset.action));
      });
    }

    if (App.dom.imageContextMenu) {
      App.dom.imageContextMenu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', () => App.context_menu.handleImageContextAction(item.dataset.action));
      });
    }

    if (App.dom.tableContextMenu) {
      App.dom.tableContextMenu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', () => App.table_context.handleTableContextAction(item.dataset.action));
      });
    }

    document.addEventListener('click', e => {
      if (App.dom.imageContextMenu && !App.dom.imageContextMenu.contains(e.target)) {
        App.dom.imageContextMenu.classList.remove('visible');
        App.dom.imageContextTarget = null;
      }
      if (App.dom.tableContextMenu && !App.dom.tableContextMenu.contains(e.target)) {
        App.dom.tableContextMenu.classList.remove('visible');
        App.dom.tableContextTarget = null;
      }
    });

    if (App.dom.editor) {
      App.dom.editor.addEventListener('contextmenu', e => {
        const img = e.target.closest('img.md-image');
        if (img) {
          e.preventDefault();
          App.dom.imageContextTarget = img;
          App.dom.imageContextMenu.style.top = `${e.clientY}px`;
          App.dom.imageContextMenu.style.left = `${e.clientX}px`;
          App.dom.imageContextMenu.classList.add('visible');
        }

        const table = e.target.closest('table.md-table');
        if (table) {
          e.preventDefault();
          const cell = e.target.closest('td, th');
          const row = cell.parentElement;
          const isInThead = row.parentElement.tagName === 'THEAD';
          App.dom.tableContextTarget = { table, cell, isInThead };

          App.dom.tableContextMenu.querySelectorAll('.context-menu-item').forEach(item => {
            item.style.display = '';
          });

          if (isInThead) {
            const insertRowAbove = App.dom.tableContextMenu.querySelector('[data-action="insert-row-above"]');
            const deleteRow = App.dom.tableContextMenu.querySelector('[data-action="delete-row"]');
            if (insertRowAbove) insertRowAbove.style.display = 'none';
            if (deleteRow) deleteRow.style.display = 'none';
          }

          App.dom.tableContextMenu.style.top = `${e.clientY}px`;
          App.dom.tableContextMenu.style.left = `${e.clientX}px`;
          App.dom.tableContextMenu.classList.add('visible');
        }
      });
    }

    App.table_context.initTableResize();

    if (App.dom.dialogCancel) App.dom.dialogCancel.addEventListener('click', App.dialogs.hideDialog);
    if (App.dom.dialogConfirm) App.dom.dialogConfirm.addEventListener('click', App.dialogs.confirmDialog);
    if (App.dom.dialogInput) {
      App.dom.dialogInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') App.dialogs.confirmDialog();
        if (e.key === 'Escape') App.dialogs.hideDialog();
      });
    }

    if (App.dom.confirmCancel) App.dom.confirmCancel.addEventListener('click', App.dialogs.hideConfirm);
    if (App.dom.confirmOk) {
      App.dom.confirmOk.addEventListener('click', async () => {
        if (App.dialogs.confirmCallback) await App.dialogs.confirmCallback();
        App.dialogs.hideConfirm();
      });
    }

    const conflictOverwrite = document.getElementById('conflict-overwrite');
    const conflictKeep = document.getElementById('conflict-keep');
    const conflictReload = document.getElementById('conflict-reload');
    if (conflictOverwrite) conflictOverwrite.addEventListener('click', () => App.file_file_operations.handleConflict('overwrite'));
    if (conflictKeep) conflictKeep.addEventListener('click', () => App.file_file_operations.handleConflict('keep'));
    if (conflictReload) conflictReload.addEventListener('click', () => App.file_file_operations.handleConflict('reload'));

    const tableCancel = document.getElementById('table-cancel');
    const tableInsert = document.getElementById('table-insert');
    if (tableCancel) tableCancel.addEventListener('click', App.editor_insert_special.hideTableDialog);
    if (tableInsert) tableInsert.addEventListener('click', App.editor_insert_special.insertTableFromDialog);

    if (window.electronAPI && window.electronAPI.onMenuEvent) {
      window.electronAPI.onMenuEvent(App.panels.handleMenuEvent);
    }

    if (App.dom.aboutClose) App.dom.aboutClose.addEventListener('click', App.panels.hideAboutDialog);
    App.dom.aboutOverlay.addEventListener('click', e => {
      if (e.target === App.dom.aboutOverlay) App.panels.hideAboutDialog();
    });

    App.dom.sidebarTabs.forEach(tab => {
      tab.addEventListener('click', () => App.sidebar.switchSidebarTab(tab.dataset.tab));
    });

    App.dom.btnZoomDecrease.addEventListener('click', () => App.theme.adjustZoom(-10));
    App.dom.btnZoomIncrease.addEventListener('click', () => App.theme.adjustZoom(10));

    App.dom.btnReadingMode.addEventListener('click', App.theme.toggleReadingMode);

    App.dom.btnOutline.addEventListener('click', () => {
      App.panels.toggleOutline();
      App.dom.btnOutline.classList.toggle('active', App.state.isOutlineEnabled);
    });

    App.dom.btnSearch.addEventListener('click', App.search.toggleProjectSearchPanel);
    App.dom.searchCloseProject.addEventListener('click', App.search.hideProjectSearchPanel);
    App.dom.searchInputProject.addEventListener('input', App.core_global.debounce(App.search.handleProjectSearch, 300));
    App.dom.searchClearProject.addEventListener('click', App.search.clearProjectSearch);

    App.dom.btnFullscreen.addEventListener('click', App.theme.toggleFullscreen);

    App.dom.btnFontDecrease.addEventListener('click', () => App.theme.adjustFontSize(-1));
    App.dom.btnFontIncrease.addEventListener('click', () => App.theme.adjustFontSize(1));

    App.dom.btnTheme.addEventListener('click', App.theme.toggleThemeDropdown);
    App.dom.themeDropdown.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', () => {
        App.theme.setTheme(option.dataset.theme);
        App.dom.themeDropdown.classList.remove('visible');
      });
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.theme-select')) {
        App.dom.themeDropdown.classList.remove('visible');
      }
    });

    if (App.dom.viewSwitch) {
      App.dom.viewSwitch.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => App.theme.setViewMode(btn.dataset.view));
      });
    }

    if (App.dom.searchInput) App.dom.searchInput.addEventListener('input', App.core_global.debounce(App.search.handleSearchInput, 300));
    if (App.dom.searchClear) App.dom.searchClear.addEventListener('click', App.search.clearSearch);
    if (App.dom.searchClose) App.dom.searchClose.addEventListener('click', App.search.hideSearchPanel);

    App.dom.mdViewBtns.forEach(btn => {
      btn.addEventListener('click', () => App.markdown_source_editor.switchMdView(btn.dataset.view));
    });

    App.dom.mdViewBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === App.dom.currentMdView);
    });
  }

  App.core_events = {
    bindEvents: bindEvents,
  };

})(window.__App);