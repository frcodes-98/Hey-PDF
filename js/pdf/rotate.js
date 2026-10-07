(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.pdf = DocForge.pdf || {};

  DocForge.pdf.rotate = function (bytes, options, onProgress) {
    options = options || {};
    var degrees = options.degrees || 90;
    var pages = options.pages || null;
    var engine = DocForge.pdf.engine;
    var PDFLib = engine.getPdfLib();

    return engine.loadPdfLibDoc(bytes).then(function (doc) {
      var all = doc.getPages();
      all.forEach(function (page, index) {
        var pageNumber = index + 1;
        if (pages && pages.indexOf(pageNumber) === -1) return;
        var current = page.getRotation().angle || 0;
        page.setRotation(PDFLib.degrees((current + degrees) % 360));
        if (onProgress) onProgress((index + 1) / all.length);
      });
      return engine.savePdfLibDoc(doc);
    });
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
