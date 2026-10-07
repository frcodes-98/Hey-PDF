(function (global) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var modeSelect = document.getElementById('opt-mode');
    var rangesInput = document.getElementById('opt-ranges');

    DocForge.tools.createToolPage({
      toolId: 'split',
      dropHint: 'Drop one PDF to split',
      showFileList: true,
      process: function (ctx) {
        return DocForge.core.fileStore.readBytes(ctx.items[0].id).then(function (bytes) {
          var mode = modeSelect ? modeSelect.value : 'ranges';
          if (mode === 'every') {
            ctx.progress.show('Splitting every page…');
            return DocForge.pdf.split.everyPage(bytes, function (ratio) {
              ctx.progress.set(ratio, 'Creating page files…');
            }).then(function (outputs) {
              return DocForge.core.download.saveZip('split-pages.zip', outputs).then(function () {
                return {
                  message: 'Exported ' + outputs.length + ' PDF files as split-pages.zip.',
                  toast: 'Pages split'
                };
              });
            });
          }

          return DocForge.pdf.engine.loadPdfLibDoc(bytes).then(function (doc) {
            var count = doc.getPageCount();
            var pages = DocForge.pdf.split.parseRanges(rangesInput.value, count);
            if (!pages.length) {
              throw new Error('Enter page ranges like 1-3,5');
            }
            ctx.progress.show('Extracting pages…');
            return DocForge.pdf.split.extractPages(bytes, pages, function (ratio) {
              ctx.progress.set(ratio, 'Extracting…');
            }).then(function (blob) {
              DocForge.core.download.saveBlob('extracted-pages.pdf', blob);
              return {
                message: 'Extracted ' + pages.length + ' page(s) to extracted-pages.pdf.',
                toast: 'Pages extracted'
              };
            });
          });
        });
      }
    });
  });
})(window);
