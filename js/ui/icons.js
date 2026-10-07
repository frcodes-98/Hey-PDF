(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.ui = DocForge.ui || {};

  var icons = {
    merge:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 4h5l5 5v11H8z"/><path d="M13 4v5h5"/><path d="M9 12h6M12 9v6"/></svg>',
    split:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h7v16H4zM13 4h7v7h-7zM13 13h7v7h-7z"/></svg>',
    organize:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h10"/><circle cx="18" cy="17" r="2"/></svg>',
    delete:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12"/></svg>',
    rotate:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12a8 8 0 1 0 3-6.3"/><path d="M4 4v5h5"/></svg>',
    edit:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M13.5 6.5l3 3"/></svg>',
    sign:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19h16"/><path d="M5 16c2-4 3.5-8 7-9 2 3 4 6 8 8"/></svg>',
    crop:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3v15h15"/><path d="M3 6h15v15"/></svg>',
    compress:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 4h8v4H8zM6 10h12v10H6zM9 14h6"/></svg>',
    'pdf-image':
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="5" width="10" height="14" rx="1"/><rect x="12" y="9" width="8" height="10" rx="1"/><circle cx="15.5" cy="12.5" r="1"/></svg>',
    'image-pdf':
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="8" height="8" rx="1"/><rect x="8" y="10" width="8" height="8" rx="1"/><path d="M18 7h3v13H8v-3"/></svg>',
    text:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 6h14M12 6v12M8 18h8"/></svg>',
    word:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8l2.2 8 1.8-5 1.8 5L16 8"/></svg>',
    excel:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h8M12 8v8"/></svg>'
  };

  DocForge.ui.icons = {
    get: function (name) {
      return icons[name] || icons.merge;
    },
    paint: function (root) {
      root = root || document;
      Array.prototype.forEach.call(root.querySelectorAll('[data-icon]'), function (node) {
        var name = node.getAttribute('data-icon');
        node.innerHTML = DocForge.ui.icons.get(name);
      });
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
