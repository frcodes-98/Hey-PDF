(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.core = DocForge.core || {};

  function storageKey() {
    return (DocForge.config && DocForge.config.croppedSignatureKey) || 'docforge-cropped-signature';
  }

  DocForge.core.croppedSignature = {
    get: function () {
      try {
        return global.localStorage.getItem(storageKey()) || '';
      } catch (err) {
        return '';
      }
    },
    set: function (dataUrl) {
      if (!dataUrl) return false;
      try {
        global.localStorage.setItem(storageKey(), dataUrl);
        return true;
      } catch (err) {
        return false;
      }
    },
    clear: function () {
      try {
        global.localStorage.removeItem(storageKey());
      } catch (err) {
        /* ignore quota / private mode */
      }
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
