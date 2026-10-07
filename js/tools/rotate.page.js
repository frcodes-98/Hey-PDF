(function (global) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var degreesSelect = document.getElementById('opt-degrees');
    var scopeSelect = document.getElementById('opt-scope');

    DocForge.tools.createToolPage({
      toolId: 'rotate',
      dropHint: 'Drop one PDF to rotate',
      showFileList: false,
      thumbMode: 'select',
      onFilesAdded: function (items, thumbs) {
        if (!thumbs || !items.length) return;
        DocForge.core.fileStore.readBytes(items[0].id).then(function (bytes) {
          return DocForge.pdf.engine.renderAllThumbnails(bytes);
        }).then(function (pages) {
          thumbs.setPages(pages);
        }).catch(function (err) {
          DocForge.ui.toast.error(DocForge.core.errors.toUserMessage(err));
        });
      },
      process: function (ctx) {
        return DocForge.core.fileStore.readBytes(ctx.items[0].id).then(function (bytes) {
          var degrees = Number(degreesSelect.value || 90);
          var scope = scopeSelect ? scopeSelect.value : 'all';
          var pages = null;
          if (scope === 'selected') {
            pages = ctx.thumbs ? ctx.thumbs.getSelected() : [];
            if (!pages.length) throw new Error('Select at least one page, or choose All pages.');
          }
          ctx.progress.show('Rotating…');
          return DocForge.pdf.rotate(bytes, { degrees: degrees, pages: pages }, function (ratio) {
            ctx.progress.set(ratio, 'Rotating pages…');
          }).then(function (blob) {
            DocForge.core.download.saveBlob('rotated.pdf', blob);
            return { message: 'Downloaded rotated.pdf.', toast: 'Pages rotated' };
          });
        });
      }
    });
  });
})(window);
