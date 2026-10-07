(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.pdf = DocForge.pdf || {};

  DocForge.pdf.organize = function (bytes, pageOrder, onProgress) {
    var engine = DocForge.pdf.engine;
    return engine.loadPdfLibDoc(bytes).then(function (src) {
      return engine.createPdfLibDoc().then(function (outDoc) {
        var zeroBased = pageOrder.map(function (n) {
          return n - 1;
        });
        return outDoc.copyPages(src, zeroBased).then(function (pages) {
          pages.forEach(function (p, i) {
            outDoc.addPage(p);
            if (onProgress) onProgress((i + 1) / pages.length);
          });
          return engine.savePdfLibDoc(outDoc);
        });
      });
    });
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
