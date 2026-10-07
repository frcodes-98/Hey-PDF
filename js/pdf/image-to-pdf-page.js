(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.pdf = DocForge.pdf || {};

  // Shared helper used by images-to-pdf; kept as a named module per architecture.
  DocForge.pdf.imageToPdfPage = {
    embedJpegPage: function (outDoc, jpegBytes) {
      return outDoc.embedJpg(jpegBytes).then(function (img) {
        var page = outDoc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        return page;
      });
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
