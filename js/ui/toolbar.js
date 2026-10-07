(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.ui = DocForge.ui || {};

  DocForge.ui.toolbar = {
    bind: function (root, handlers) {
      if (!root) return;
      root.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-tool-action]');
        if (!btn || btn.disabled) return;
        var action = btn.getAttribute('data-tool-action');
        if (handlers && typeof handlers[action] === 'function') {
          handlers[action](btn);
        }
      });
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
