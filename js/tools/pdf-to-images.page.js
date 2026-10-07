(function (global) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var formatSelect = document.getElementById('opt-format');
    var scaleSelect = document.getElementById('opt-scale');

    DocForge.tools.createToolPage({
      toolId: 'pdf-to-images',
      dropHint: 'Drop one PDF to export as images',
      process: function (ctx) {
        return DocForge.core.fileStore.readBytes(ctx.items[0].id).then(function (bytes) {
          ctx.progress.show('Rendering pages…');
          return DocForge.pdf
            .pdfToImages(
              bytes,
              {
                format: formatSelect ? formatSelect.value : 'png',
                scale: scaleSelect ? Number(scaleSelect.value) : 2
              },
              function (ratio) {
                ctx.progress.set(ratio, 'Rendering pages…');
              }
            )
            .then(function (outputs) {
              return DocForge.core.download.saveZip('pdf-pages.zip', outputs).then(function () {
                return {
                  message: 'Exported ' + outputs.length + ' image(s) as pdf-pages.zip.',
                  toast: 'Images ready'
                };
              });
            });
        });
      }
    });
  });
})(window);
