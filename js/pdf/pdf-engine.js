(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.pdf = DocForge.pdf || {};

  var pdfJsConfigured = false;

  function resolveWorkerSrc() {
    var scripts = document.getElementsByTagName('script');
    var workerSrc = 'vendor/pdf.worker.min.js';
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      if (src.indexOf('pdf.min.js') !== -1) {
        workerSrc = src.replace('pdf.min.js', 'pdf.worker.min.js');
        break;
      }
    }
    return workerSrc;
  }

  function ensurePdfJs() {
    if (!global.pdfjsLib) {
      throw new Error('PDF.js is not loaded');
    }
    if (!pdfJsConfigured) {
      var workerSrc = resolveWorkerSrc();
      // file:// pages often block module workers; blob worker keeps offline open-from-disk working
      if (global.location && global.location.protocol === 'file:') {
        try {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', workerSrc, false);
          xhr.send(null);
          if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
            var blob = new Blob([xhr.responseText], { type: 'application/javascript' });
            workerSrc = URL.createObjectURL(blob);
          }
        } catch (err) {
          console.warn('PDF.js worker blob fallback failed', err);
        }
      }
      global.pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      pdfJsConfigured = true;
    }
    return global.pdfjsLib;
  }

  function ensurePdfLib() {
    if (!global.PDFLib) {
      throw new Error('pdf-lib is not loaded');
    }
    return global.PDFLib;
  }

  function copyPdfBytes(bytes) {
    if (bytes == null) {
      throw new Error('No PDF data was provided.');
    }
    var src;
    if (bytes instanceof Uint8Array) {
      src = bytes;
    } else if (typeof ArrayBuffer !== 'undefined' && bytes instanceof ArrayBuffer) {
      src = new Uint8Array(bytes);
    } else if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(bytes)) {
      src = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    } else {
      throw new Error('PDF data must be a byte array.');
    }
    if (!src.byteLength) {
      throw new Error('PDF data is empty. Re-upload the file and try again.');
    }
    try {
      return src.slice();
    } catch (err) {
      throw new Error('Could not copy PDF bytes (the file buffer was released). Re-upload the file and try again.');
    }
  }

  DocForge.pdf.engine = {
    copyBytes: copyPdfBytes,
    loadPdfLibDoc: function (bytes) {
      var PDFLib = ensurePdfLib();
      var data = copyPdfBytes(bytes);
      return PDFLib.PDFDocument.load(data, { ignoreEncryption: false });
    },
    createPdfLibDoc: function () {
      return ensurePdfLib().PDFDocument.create();
    },
    savePdfLibDoc: function (doc) {
      return doc.save({ useObjectStreams: true }).then(function (bytes) {
        return new Blob([bytes], { type: 'application/pdf' });
      });
    },
    getPdfLib: function () {
      return ensurePdfLib();
    },
    loadPdfJsDoc: function (bytes) {
      var pdfjs = ensurePdfJs();
      var data = copyPdfBytes(bytes);
      return pdfjs.getDocument({ data: data }).promise;
    },
    getPageCountPdfJs: function (bytes) {
      return DocForge.pdf.engine.loadPdfJsDoc(bytes).then(function (doc) {
        var n = doc.numPages;
        doc.destroy();
        return n;
      });
    },
    renderPageThumbnail: function (pdfDoc, pageNumber, maxWidth) {
      maxWidth = maxWidth || 160;
      return pdfDoc.getPage(pageNumber).then(function (page) {
        var base = page.getViewport({ scale: 1 });
        var scale = maxWidth / base.width;
        var viewport = page.getViewport({ scale: scale });
        var canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        var ctx = canvas.getContext('2d', { alpha: false });
        return page
          .render({ canvasContext: ctx, viewport: viewport })
          .promise.then(function () {
            return {
              pageNumber: pageNumber,
              width: canvas.width,
              height: canvas.height,
              imageUrl: canvas.toDataURL('image/jpeg', 0.72),
              canvas: canvas
            };
          });
      });
    },
    renderAllThumbnails: function (bytes, onProgress) {
      return DocForge.pdf.engine.loadPdfJsDoc(bytes).then(function (doc) {
        var total = doc.numPages;
        var results = [];
        var chain = Promise.resolve();
        for (var i = 1; i <= total; i++) {
          (function (pageNumber) {
            chain = chain.then(function () {
              return DocForge.pdf.engine.renderPageThumbnail(doc, pageNumber).then(function (thumb) {
                results.push(thumb);
                if (onProgress) onProgress(pageNumber / total, pageNumber, total);
                return results;
              });
            });
          })(i);
        }
        return chain.then(function () {
          doc.destroy();
          return results;
        });
      });
    },
    renderPageToCanvas: function (pdfDoc, pageNumber, canvas, maxWidth) {
      maxWidth = maxWidth || 720;
      return pdfDoc.getPage(pageNumber).then(function (page) {
        var base = page.getViewport({ scale: 1 });
        var scale = maxWidth / base.width;
        var viewport = page.getViewport({ scale: scale });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        var ctx = canvas.getContext('2d', { alpha: false });
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
          return {
            page: page,
            viewport: viewport,
            scale: scale,
            width: canvas.width,
            height: canvas.height
          };
        });
      });
    },
    pageToImageBlob: function (pdfDoc, pageNumber, options) {
      options = options || {};
      var scale = options.scale || 2;
      var type = options.type || 'image/png';
      var quality = options.quality == null ? 0.92 : options.quality;
      return pdfDoc.getPage(pageNumber).then(function (page) {
        var viewport = page.getViewport({ scale: scale });
        var canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        var ctx = canvas.getContext('2d', { alpha: false });
        return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
          return new Promise(function (resolve) {
            canvas.toBlob(
              function (blob) {
                resolve(blob);
              },
              type,
              quality
            );
          });
        });
      });
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
