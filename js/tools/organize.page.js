(function (global) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    DocForge.tools.createToolPage({
      toolId: 'organize',
      dropHint: 'Drop one PDF to reorder pages',
      thumbMode: 'reorder',
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
        var order = ctx.thumbs ? ctx.thumbs.getOrder() : [];
        if (!order.length) throw new Error('Load a PDF first.');
        return DocForge.core.fileStore.readBytes(ctx.items[0].id).then(function (bytes) {
          ctx.progress.show('Reordering…');
          return DocForge.pdf.organize(bytes, order, function (ratio) {
            ctx.progress.set(ratio, 'Building PDF…');
          }).then(function (blob) {
            DocForge.core.download.saveBlob('organized.pdf', blob);
            return { message: 'Downloaded organized.pdf with your new page order.', toast: 'Pages organized' };
          });
        });
      }
    });
  });
})(window);
