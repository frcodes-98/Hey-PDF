(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.ui = DocForge.ui || {};

  function ensureRoot() {
    var root = document.getElementById('toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'toast-root';
      root.className = 'toast-root';
      document.body.appendChild(root);
    }
    return root;
  }

  DocForge.ui.toast = {
    show: function (message, type, timeout) {
      var root = ensureRoot();
      var el = document.createElement('div');
      el.className = 'toast' + (type ? ' toast--' + type : '');
      el.setAttribute('role', 'status');
      el.textContent = message;
      root.appendChild(el);
      setTimeout(function () {
        el.remove();
      }, timeout || 4200);
    },
    success: function (message) {
      DocForge.ui.toast.show(message, 'success');
    },
    error: function (message) {
      DocForge.ui.toast.show(message, 'error', 5600);
    },
    warning: function (message) {
      DocForge.ui.toast.show(message, 'warning');
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
