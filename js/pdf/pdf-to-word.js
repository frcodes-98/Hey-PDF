(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.pdf = DocForge.pdf || {};

  DocForge.pdf.pdfToWord = function (bytes, options, onProgress) {
    return DocForge.pdf.extractText(bytes, options || { mode: 'auto' }, onProgress).then(function (result) {
      var text = typeof result === 'string' ? result : result.text;
      return DocForge.core.docx.fromText(text || '').then(function (blob) {
        return {
          blob: blob,
          text: text || '',
          ocrPages: result && result.ocrPages ? result.ocrPages : 0
        };
      });
    });
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
