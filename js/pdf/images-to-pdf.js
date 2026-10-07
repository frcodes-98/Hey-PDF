(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.pdf = DocForge.pdf || {};

  function loadImageElement(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        reject(new Error('Could not read an image file.'));
      };
      img.src = url;
    });
  }

  function canvasFromImage(img) {
    var canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    var ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return canvas;
  }

  function canvasToJpegBytes(canvas, quality) {
    return new Promise(function (resolve) {
      canvas.toBlob(
        function (blob) {
          blob.arrayBuffer().then(function (buf) {
            resolve(new Uint8Array(buf));
          });
        },
        'image/jpeg',
        quality == null ? 0.92 : quality
      );
    });
  }

  DocForge.pdf.imagesToPdf = function (items, onProgress) {
    var engine = DocForge.pdf.engine;
    return engine.createPdfLibDoc().then(function (outDoc) {
      var chain = Promise.resolve();
      items.forEach(function (item, index) {
        chain = chain.then(function () {
          return loadImageElement(item.url).then(function (img) {
            var canvas = canvasFromImage(img);
            return canvasToJpegBytes(canvas).then(function (jpg) {
              return outDoc.embedJpg(jpg).then(function (embedded) {
                var page = outDoc.addPage([embedded.width, embedded.height]);
                page.drawImage(embedded, {
                  x: 0,
                  y: 0,
                  width: embedded.width,
                  height: embedded.height
                });
                if (onProgress) onProgress((index + 1) / items.length);
              });
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
