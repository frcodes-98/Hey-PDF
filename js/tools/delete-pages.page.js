(function (global) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    DocForge.tools.createToolPage({
      toolId: 'delete-pages',
      dropHint: 'Drop one PDF and select pages to delete',
      thumbMode: 'select',
      showFileList: false,
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
        var selected = ctx.thumbs ? ctx.thumbs.getSelected() : [];
        if (!selected.length) throw new Error('Select the pages you want to delete.');
        return DocForge.core.fileStore.readBytes(ctx.items[0].id).then(function (bytes) {
          ctx.progress.show('Removing pages…');
          return DocForge.pdf.deletePages(bytes, selected, function (ratio) {
            ctx.progress.set(ratio, 'Building PDF…');
          }).then(function (blob) {
            DocForge.core.download.saveBlob('pages-removed.pdf', blob);
            return {
              message: 'Removed ' + selected.length + ' page(s). Downloaded pages-removed.pdf.',
              toast: 'Pages deleted'
            };
          });
        });
      }
    });
  });
})(window);
