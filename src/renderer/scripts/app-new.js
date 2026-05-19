// FlowMark Editor - 入口文件
// 模块化架构：state.js → 各模块 → 本文件
(function() {
  'use strict';

  const App = window.__App;
  const S = App.state;
  const D = App.dom;

  async function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', App.core_init.doInit);
    } else {
      App.core_init.doInit();
    }
  }

  init();

})();