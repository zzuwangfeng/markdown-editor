// FlowMark Editor - 入口文件
// 模块架构: state → converter → 各模块 → 本文件
(function() {
  'use strict';

  const App = window.__App;

  async function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', App.core_init.doInit);
    } else {
      App.core_init.doInit();
    }
  }

  init();

})();