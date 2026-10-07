(function (global) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var preview = document.getElementById('opt-text');
    var modeSelect = document.getElementById('opt-ocr-mode');
    var formatSelect = document.getElementById('opt-export-format');

    function downloadExtract(text) {
      var format = formatSelect ? formatSelect.value : 'docx';
      if (format === 'txt') {
        DocForge.core.download.saveText('extracted-text.txt', text || '');
        return Promise.resolve({
          message: 'Text extracted and downloaded as extracted-text.txt.',
          file: 'extracted-text.txt'
        });
      }
      if (format === 'both') {
        return DocForge.core.docx.fromText(text || '').then(function (docxBlob) {
          return DocForge.core.download.saveZip('extracted-text.zip', [
            { name: 'extracted-text.txt', data: text || '' },
            { name: 'extracted-text.docx', data: docxBlob }
          ]).then(function () {
            return {
              message: 'Text extracted and downloaded as extracted-text.zip (Word + plain text).',
              file: 'extracted-text.zip'
            };
          });
        });
      }
      return DocForge.core.download.saveDocx('extracted-text.docx', text || '').then(function () {
        return {
          message: 'Text extracted and downloaded as extracted-text.docx.',
          file: 'extracted-text.docx'
        };
      });
    }

    DocForge.tools.createToolPage({
      toolId: 'extract-text',
      dropHint: 'Drop one PDF to extract text',
      process: function (ctx) {
        var mode = modeSelect ? modeSelect.value : 'auto';
        return DocForge.core.fileStore.readBytes(ctx.items[0].id).then(function (bytes) {
          ctx.progress.show(mode === 'text' ? 'Extracting text…' : 'Preparing OCR…');
          return DocForge.pdf
            .extractText(bytes, { mode: mode }, function (ratio, label) {
              ctx.progress.set(ratio, label || 'Reading pages…');
            })
            .then(function (result) {
              var text = typeof result === 'string' ? result : result.text;
              var ocrPages = result && result.ocrPages ? result.ocrPages : 0;
              if (preview) preview.value = text || '(No extractable text found)';
              ctx.progress.set(0.92, 'Building download…');
              return downloadExtract(text || '').then(function (saved) {
                var extra =
                  ocrPages > 0
                    ? ' Used OCR on ' + ocrPages + ' scanned page(s).'
                    : mode === 'ocr'
                      ? ' OCR ran on every page.'
                      : ' Used the PDF text layer only.';
                return {
                  message: saved.message + extra,
                  toast: 'Text extracted'
                };
              });
            });
        });
      },
      onReset: function () {
        if (preview) preview.value = '';
      }
    });
  });
})(window);
