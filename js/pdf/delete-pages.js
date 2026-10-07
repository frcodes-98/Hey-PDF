(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.pdf = DocForge.pdf || {};

  DocForge.pdf.deletePages = function (bytes, pagesToDelete, onProgress) {
    var remove = {};
    (pagesToDelete || []).forEach(function (n) {
      remove[n] = true;
    });
    var engine = DocForge.pdf.engine;
    return engine.loadPdfLibDoc(bytes).then(function (src) {
      var keep = src.getPageIndices().filter(function (index) {
        return !remove[index + 1];
      });
      if (!keep.length) {
        return Promise.reject(new Error('You must keep at least one page.'));
      }
      return engine.createPdfLibDoc().then(function (outDoc) {
        return outDoc.copyPages(src, keep).then(function (pages) {
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
