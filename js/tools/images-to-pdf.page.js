(function (global) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    DocForge.tools.createToolPage({
      toolId: 'images-to-pdf',
      dropHint: 'Drop JPG, PNG, or WebP images',
      process: function (ctx) {
        ctx.progress.show('Building PDF…');
        return DocForge.pdf.imagesToPdf(ctx.items, function (ratio) {
          ctx.progress.set(ratio, 'Adding images…');
        }).then(function (blob) {
          DocForge.core.download.saveBlob('images.pdf', blob);
          return {
            message: 'Created images.pdf from ' + ctx.items.length + ' image(s).',
            toast: 'PDF created'
          };
        });
      }
    });
  });
})(window);
