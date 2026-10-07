(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.core = DocForge.core || {};

  function extensionOf(name) {
    var parts = (name || '').toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() : '';
  }

  function parseAccept(accept) {
    if (!accept) return { exts: [], mimes: [] };
    var exts = [];
    var mimes = [];
    accept.split(',').forEach(function (part) {
      part = part.trim().toLowerCase();
      if (!part) return;
      if (part.charAt(0) === '.') exts.push(part.slice(1));
      else mimes.push(part);
    });
    return { exts: exts, mimes: mimes };
  }

  DocForge.core.validate = {
    formatBytes: function (bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    },
    isAccepted: function (file, accept) {
      var parsed = parseAccept(accept);
      var ext = extensionOf(file.name);
      if (parsed.exts.length && parsed.exts.indexOf(ext) !== -1) return true;
      if (parsed.mimes.length && parsed.mimes.indexOf((file.type || '').toLowerCase()) !== -1) return true;
      if (!parsed.exts.length && !parsed.mimes.length) return true;
      if (!file.type && parsed.exts.indexOf(ext) !== -1) return true;
      return false;
    },
    validateFiles: function (files, options) {
      options = options || {};
      var cfg = DocForge.config || {};
      var maxBytes = options.maxFileBytes || cfg.maxFileBytes || 100 * 1024 * 1024;
      var maxFiles = options.maxFiles || cfg.maxFiles || 40;
      var accept = options.accept || '';
      var currentCount = options.currentCount || 0;
      var errors = [];
      var accepted = [];

      Array.prototype.forEach.call(files, function (file) {
        if (!file || !file.size) {
          errors.push('Empty file skipped' + (file && file.name ? ': ' + file.name : ''));
          return;
        }
        if (!DocForge.core.validate.isAccepted(file, accept)) {
          errors.push('Unsupported type: ' + file.name);
          return;
        }
        if (file.size > maxBytes) {
          errors.push(
            file.name + ' exceeds ' + DocForge.core.validate.formatBytes(maxBytes)
          );
          return;
        }
        accepted.push(file);
      });

      if (currentCount + accepted.length > maxFiles) {
        var room = Math.max(0, maxFiles - currentCount);
        errors.push('You can add up to ' + maxFiles + ' files.');
        accepted = accepted.slice(0, room);
      }

      return { files: accepted, errors: errors };
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
