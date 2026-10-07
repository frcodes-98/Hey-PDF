(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.pdf = DocForge.pdf || {};

  DocForge.pdf.merge = function (fileEntries, onProgress) {
    var engine = DocForge.pdf.engine;
    return engine.createPdfLibDoc().then(function (outDoc) {
      var chain = Promise.resolve();
      fileEntries.forEach(function (entry, index) {
        chain = chain.then(function () {
          return engine.loadPdfLibDoc(entry.bytes).then(function (src) {
            return outDoc.copyPages(src, src.getPageIndices()).then(function (pages) {
              pages.forEach(function (p) {
                outDoc.addPage(p);
              });
              if (onProgress) onProgress((index + 1) / fileEntries.length);
            });
          });
        });
      });
      return chain.then(function () {
        return engine.savePdfLibDoc(outDoc);
      });
    });
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
