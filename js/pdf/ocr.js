(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.pdf = DocForge.pdf || {};

  var workerPromise = null;

  function resolveBase() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      if (src.indexOf('tesseract.min.js') !== -1) {
        return src.replace(/tesseract\.min\.js.*$/, '');
      }
    }
    return '../../vendor/tesseract/';
  }

  function getWorker(onInfo) {
    if (!global.Tesseract || typeof global.Tesseract.createWorker !== 'function') {
      return Promise.reject(new Error('OCR engine is not loaded.'));
    }
    if (workerPromise) return workerPromise;
    var base = resolveBase();
    workerPromise = global.Tesseract.createWorker('eng', 1, {
      workerPath: base + 'worker.min.js',
      corePath: base.replace(/\/?$/, '/'),
      langPath: base.replace(/\/?$/, '/') + 'lang-data',
      workerBlobURL: false,
      gzip: true,
      logger: function (info) {
        if (typeof onInfo === 'function') onInfo(info);
      }
    }).catch(function (err) {
      workerPromise = null;
      throw err;
    });
    return workerPromise;
  }

  DocForge.pdf.ocr = {
    recognizeCanvas: function (canvas, onInfo) {
      return getWorker(onInfo).then(function (worker) {
        return worker.recognize(canvas).then(function (res) {
          var text = res && res.data && res.data.text;
          return String(text || '').replace(/[ \t]+\n/g, '\n').trim();
        });
      });
    },
    recognizePage: function (pdfDoc, pageNumber, onInfo) {
      var canvas = document.createElement('canvas');
      return DocForge.pdf.engine.renderPageToCanvas(pdfDoc, pageNumber, canvas, 1600).then(function () {
        return DocForge.pdf.ocr.recognizeCanvas(canvas, onInfo);
      });
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
