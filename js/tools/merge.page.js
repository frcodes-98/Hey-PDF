(function (global) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    DocForge.tools.createToolPage({
      toolId: 'merge',
      dropHint: 'Drop 2 or more PDF files',
      process: function (ctx) {
        return DocForge.core.fileStore.readAllBytes().then(function (entries) {
          ctx.progress.show('Merging…');
          return DocForge.pdf.merge(entries, function (ratio) {
            ctx.progress.set(ratio, 'Merging PDFs…');
          }).then(function (blob) {
            DocForge.core.download.saveBlob('merged.pdf', blob);
            return {
              message: 'Merged ' + entries.length + ' files into merged.pdf (' + DocForge.core.validate.formatBytes(blob.size) + ').',
              toast: 'PDF merged'
            };
          });
        });
      }
    });
  });
})(window);
