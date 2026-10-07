(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.ui = DocForge.ui || {};

  DocForge.ui.fileList = {
    mount: function (el, options) {
      options = options || {};
      el.classList.add('file-list');

      function render(items) {
        if (!items.length) {
          el.innerHTML = '<div class="empty-state">No files yet. Add files to get started.</div>';
          return;
        }
        el.innerHTML = items
          .map(function (item, index) {
            return (
              '<div class="file-row" data-id="' +
              item.id +
              '">' +
              '<div class="file-row__index">' +
              (index + 1) +
              '</div>' +
              '<div>' +
              '<div class="file-row__name"></div>' +
              '<div class="file-row__meta"></div>' +
              '</div>' +
              '<div class="file-row__actions">' +
              '<button type="button" class="icon-btn" data-action="up" title="Move up" aria-label="Move up">↑</button>' +
              '<button type="button" class="icon-btn" data-action="down" title="Move down" aria-label="Move down">↓</button>' +
              '<button type="button" class="icon-btn icon-btn--danger" data-action="remove" title="Remove" aria-label="Remove">✕</button>' +
              '</div>' +
              '</div>'
            );
          })
          .join('');

        Array.prototype.forEach.call(el.querySelectorAll('.file-row'), function (row, index) {
          var item = items[index];
          row.querySelector('.file-row__name').textContent = item.name;
          row.querySelector('.file-row__meta').textContent = DocForge.core.validate.formatBytes(
            item.size
          );
        });
      }

      el.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var row = btn.closest('.file-row');
        if (!row) return;
        var id = row.getAttribute('data-id');
        var action = btn.getAttribute('data-action');
        if (action === 'up') DocForge.core.fileStore.move(id, -1);
        if (action === 'down') DocForge.core.fileStore.move(id, 1);
        if (action === 'remove') DocForge.core.fileStore.remove(id);
        if (typeof options.onChange === 'function') options.onChange();
      });

      var unsub = DocForge.core.fileStore.subscribe(render);

      return {
        destroy: function () {
          unsub();
        }
      };
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
