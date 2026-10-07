(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.pdf = DocForge.pdf || {};

  var QUALITY = {
    high: { scale: 1.5, quality: 0.82 },
    medium: { scale: 1.15, quality: 0.68 },
    low: { scale: 0.9, quality: 0.52 }
  };

  DocForge.pdf.compress = function (bytes, options, onProgress) {
    options = options || {};
    var preset = QUALITY[options.level] || QUALITY.medium;
    var engine = DocForge.pdf.engine;

    return engine.loadPdfJsDoc(bytes).then(function (pdfDoc) {
      return engine.createPdfLibDoc().then(function (outDoc) {
        var total = pdfDoc.numPages;
        var chain = Promise.resolve();

        for (var i = 1; i <= total; i++) {
          (function (pageNumber) {
            chain = chain.then(function () {
              return engine
                .pageToImageBlob(pdfDoc, pageNumber, {
                  scale: preset.scale,
                  type: 'image/jpeg',
                  quality: preset.quality
                })
                .then(function (blob) {
                  return blob.arrayBuffer().then(function (buf) {
                    return outDoc.embedJpg(new Uint8Array(buf)).then(function (img) {
                      var page = outDoc.addPage([img.width, img.height]);
                      page.drawImage(img, {
                        x: 0,
                        y: 0,
                        width: img.width,
                        height: img.height
                      });
                      if (onProgress) onProgress(pageNumber / total);
                    });
                  });
                });
            });
          })(i);
        }

        return chain.then(function () {
          pdfDoc.destroy();
          return engine.savePdfLibDoc(outDoc);
        });
      });
    });
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
