(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.pdf = DocForge.pdf || {};

  var MIN_LAYER_CHARS = 24;

  function layerTextFromContent(content) {
    var strings = (content.items || []).map(function (item) {
      return item.str;
    });
    return strings.join(' ').replace(/\s+/g, ' ').trim();
  }

  function looksEmpty(text) {
    var compact = String(text || '').replace(/\s+/g, '');
    return compact.length < MIN_LAYER_CHARS;
  }

  DocForge.pdf.extractText = function (bytes, options, onProgress) {
    if (typeof options === 'function') {
      onProgress = options;
      options = {};
    }
    options = options || {};
    var mode = options.mode || 'auto';
    var engine = DocForge.pdf.engine;

    return engine.loadPdfJsDoc(bytes).then(function (pdfDoc) {
      var total = pdfDoc.numPages;
      var parts = [];
      var ocrPages = 0;
      var chain = Promise.resolve();

      for (var i = 1; i <= total; i++) {
        (function (pageNumber) {
          chain = chain.then(function () {
            return pdfDoc.getPage(pageNumber).then(function (page) {
              return page.getTextContent().then(function (content) {
                var layer = layerTextFromContent(content);
                var needOcr = mode === 'ocr' || (mode === 'auto' && looksEmpty(layer));
                if (!needOcr) {
                  parts.push('--- Page ' + pageNumber + ' ---\n' + (layer || '(No extractable text found)'));
                  if (onProgress) onProgress(pageNumber / total, 'Reading page ' + pageNumber);
                  return;
                }
                if (onProgress) onProgress((pageNumber - 0.5) / total, 'OCR page ' + pageNumber + '…');
                return DocForge.pdf.ocr
                  .recognizePage(pdfDoc, pageNumber, function (info) {
                    if (info && info.progress != null && onProgress) {
                      var inner = Math.max(0, Math.min(1, info.progress));
                      onProgress((pageNumber - 1 + inner * 0.9) / total, 'OCR page ' + pageNumber + '…');
                    }
                  })
                  .then(function (ocrText) {
                    ocrPages += 1;
                    var body = ocrText || layer || '(No extractable text found)';
                    parts.push('--- Page ' + pageNumber + ' ---\n' + body);
                    if (onProgress) onProgress(pageNumber / total, 'Finished page ' + pageNumber);
                  })
                  .catch(function () {
                    parts.push(
                      '--- Page ' +
                        pageNumber +
                        ' ---\n' +
                        (layer || '(OCR could not read this scanned page)')
                    );
                    if (onProgress) onProgress(pageNumber / total, 'Finished page ' + pageNumber);
                  });
              });
            });
          });
        })(i);
      }

      return chain.then(function () {
        pdfDoc.destroy();
        return {
          text: parts.join('\n\n'),
          ocrPages: ocrPages,
          pageCount: total
        };
      });
    });
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
