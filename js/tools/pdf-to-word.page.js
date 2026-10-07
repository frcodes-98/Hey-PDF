(function (global) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var preview = document.getElementById('opt-text');
    var modeSelect = document.getElementById('opt-ocr-mode');

    DocForge.tools.createToolPage({
      toolId: 'pdf-to-word',
      dropHint: 'Drop one PDF to convert to Word',
      process: function (ctx) {
        var mode = modeSelect ? modeSelect.value : 'auto';
        return DocForge.core.fileStore.readBytes(ctx.items[0].id).then(function (bytes) {
          ctx.progress.show(mode === 'text' ? 'Extracting text…' : 'Preparing conversion…');
          return DocForge.pdf
            .pdfToWord(bytes, { mode: mode }, function (ratio, label) {
              ctx.progress.set(ratio, label || 'Reading pages…');
            })
            .then(function (result) {
              if (preview) preview.value = result.text || '(No extractable text found)';
              ctx.progress.set(0.95, 'Saving Word file…');
              DocForge.core.download.saveBlob('converted.docx', result.blob);
              var extra =
                result.ocrPages > 0
                  ? ' Used OCR on ' + result.ocrPages + ' scanned page(s).'
                  : ' Layout and images are not preserved.';
              return {
                message: 'Downloaded converted.docx.' + extra,
                toast: 'Word file ready'
              };
            });
        });
      },
      onReset: function () {
        if (preview) preview.value = '';
      }
    });
  });
})(window);
