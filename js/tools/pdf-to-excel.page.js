(function (global) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var preview = document.getElementById('opt-text');
    var modeSelect = document.getElementById('opt-ocr-mode');

    function previewSheet(sheets) {
      if (!preview) return;
      var sheet = sheets && sheets[0];
      if (!sheet || !sheet.rows) {
        preview.value = '';
        return;
      }
      var lines = sheet.rows.slice(0, 40).map(function (row) {
        return (row || []).join('\t');
      });
      if (sheet.rows.length > 40) lines.push('…');
      preview.value = lines.join('\n');
    }

    DocForge.tools.createToolPage({
      toolId: 'pdf-to-excel',
      dropHint: 'Drop one PDF to convert to Excel',
      process: function (ctx) {
        var mode = modeSelect ? modeSelect.value : 'auto';
        return DocForge.core.fileStore.readBytes(ctx.items[0].id).then(function (bytes) {
          ctx.progress.show('Reading PDF…');
          return DocForge.pdf
            .pdfToExcel(bytes, { mode: mode }, function (ratio, label) {
              ctx.progress.set(ratio, label || 'Building spreadsheet…');
            })
            .then(function (result) {
              previewSheet(result.sheets);
              DocForge.core.download.saveXlsx('converted.xlsx', result.blob);
              var extra =
                result.ocrPages > 0
                  ? ' Used OCR on ' + result.ocrPages + ' scanned page(s) as a single column.'
                  : ' One sheet per page. Column grouping is best-effort.';
              return {
                message: 'Downloaded converted.xlsx.' + extra,
                toast: 'Excel file ready'
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
