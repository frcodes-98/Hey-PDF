(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.pdf = DocForge.pdf || {};

  DocForge.pdf.pdfToImages = function (bytes, options, onProgress) {
    options = options || {};
    var format = options.format === 'jpeg' ? 'jpeg' : 'png';
    var mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    var ext = format === 'jpeg' ? 'jpg' : 'png';
    var scale = options.scale || 2;
    var quality = options.quality == null ? 0.92 : options.quality;
    var engine = DocForge.pdf.engine;

    return engine.loadPdfJsDoc(bytes).then(function (pdfDoc) {
      var total = pdfDoc.numPages;
      var outputs = [];
      var chain = Promise.resolve();

      for (var i = 1; i <= total; i++) {
        (function (pageNumber) {
          chain = chain.then(function () {
            return engine
              .pageToImageBlob(pdfDoc, pageNumber, {
                scale: scale,
                type: mime,
                quality: quality
              })
              .then(function (blob) {
                outputs.push({
                  name: 'page-' + String(pageNumber).padStart(3, '0') + '.' + ext,
                  data: blob
                });
                if (onProgress) onProgress(pageNumber / total);
              });
          });
        })(i);
      }

      return chain.then(function () {
        pdfDoc.destroy();
        return outputs;
      });
    });
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
