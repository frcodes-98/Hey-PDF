(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.core = DocForge.core || {};

  DocForge.core.errors = {
    toUserMessage: function (err) {
      if (!err) return 'Something went wrong.';
      var msg = err.message || String(err);
      var lower = msg.toLowerCase();

      if (lower.indexOf('password') !== -1 || lower.indexOf('encrypted') !== -1) {
        return 'This PDF appears to be password-protected and cannot be processed in the browser.';
      }
      if (
        lower.indexOf('pages') !== -1 &&
        (lower.indexOf('undefined') !== -1 || lower.indexOf('cannot read') !== -1)
      ) {
        return 'Could not read this PDF’s page tree for saving. Re-upload the file and try again.';
      }
      if (lower.indexOf('detached') !== -1 || lower.indexOf('buffer was released') !== -1) {
        return 'The PDF data was released before saving. Re-upload the file and try again.';
      }
      if (lower.indexOf('invalid pdf') !== -1 || lower.indexOf('failed to parse') !== -1) {
        return 'The file does not look like a valid PDF.';
      }
      if (lower.indexOf('jszip') !== -1) {
        return 'ZIP support failed to load. Refresh the page and try again.';
      }
      if (lower.indexOf('ocr') !== -1 || lower.indexOf('tesseract') !== -1) {
        return 'OCR could not read this page. Try a clearer scan, or use Text layer only.';
      }
      if (lower.indexOf('memory') !== -1) {
        return 'The file is too large for this browser session. Try a smaller document.';
      }
      return msg || 'Something went wrong while processing your file.';
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
