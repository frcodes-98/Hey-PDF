(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.core = DocForge.core || {};

  DocForge.core.workerBridge = {
    create: function (url) {
      var worker = new Worker(url);
      var pending = new Map();
      var seq = 0;

      worker.onmessage = function (event) {
        var data = event.data || {};
        var entry = pending.get(data.id);
        if (!entry) return;
        pending.delete(data.id);
        if (data.error) entry.reject(new Error(data.error));
        else entry.resolve(data.result);
      };

      worker.onerror = function (event) {
        pending.forEach(function (entry) {
          entry.reject(event.error || new Error('Worker failed'));
        });
        pending.clear();
      };

      return {
        post: function (type, payload, transfer) {
          seq += 1;
          var id = seq;
          return new Promise(function (resolve, reject) {
            pending.set(id, { resolve: resolve, reject: reject });
            worker.postMessage({ id: id, type: type, payload: payload }, transfer || []);
          });
        },
        terminate: function () {
          worker.terminate();
          pending.clear();
        }
      };
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
