(function (global) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var levelSelect = document.getElementById('opt-level');

    DocForge.tools.createToolPage({
      toolId: 'compress',
      dropHint: 'Drop one PDF to compress',
      process: function (ctx) {
        var original = ctx.items[0].size;
        return DocForge.core.fileStore.readBytes(ctx.items[0].id).then(function (bytes) {
          ctx.progress.show('Compressing…');
          return DocForge.pdf
            .compress(bytes, { level: levelSelect ? levelSelect.value : 'medium' }, function (ratio) {
              ctx.progress.set(ratio, 'Re-encoding pages…');
            })
            .then(function (blob) {
              DocForge.core.download.saveBlob('compressed.pdf', blob);
              var saved = original - blob.size;
              var note =
                saved > 0
                  ? 'Reduced by ' + DocForge.core.validate.formatBytes(saved) + '.'
                  : 'Output is ' + DocForge.core.validate.formatBytes(blob.size) + ' (may be larger for text-heavy PDFs).';
              return {
                message: 'Downloaded compressed.pdf. ' + note,
                toast: 'Compression finished'
              };
            });
        });
      }
    });
  });
})(window);
