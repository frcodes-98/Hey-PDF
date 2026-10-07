(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.core = DocForge.core || {};

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1500);
  }

  DocForge.core.download = {
    saveBlob: function (filename, blob) {
      triggerDownload(blob, filename);
    },
    saveText: function (filename, text, mime) {
      var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
      triggerDownload(blob, filename);
    },
    saveZip: function (filename, entries) {
      if (!global.JSZip) {
        return Promise.reject(new Error('JSZip is not loaded'));
      }
      var zip = new global.JSZip();
      entries.forEach(function (entry) {
        zip.file(entry.name, entry.data);
      });
      return zip.generateAsync({ type: 'blob' }).then(function (blob) {
        triggerDownload(blob, filename);
        return blob;
      });
    },
    saveDocx: function (filename, text) {
      return DocForge.core.docx.fromText(text).then(function (blob) {
        triggerDownload(blob, filename || 'extracted-text.docx');
        return blob;
      });
    },
    saveXlsx: function (filename, blob) {
      triggerDownload(blob, filename || 'converted.xlsx');
      return blob;
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
