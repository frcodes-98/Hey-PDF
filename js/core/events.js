(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.core = DocForge.core || {};

  var listeners = {};

  DocForge.core.events = {
    on: function (type, fn) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
      return function () {
        DocForge.core.events.off(type, fn);
      };
    },
    off: function (type, fn) {
      var list = listeners[type];
      if (!list) return;
      listeners[type] = list.filter(function (f) {
        return f !== fn;
      });
    },
    emit: function (type, payload) {
      var list = listeners[type] || [];
      list.slice().forEach(function (fn) {
        try {
          fn(payload);
        } catch (err) {
          console.error(err);
        }
      });
    },
    clear: function () {
      listeners = {};
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
