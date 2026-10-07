(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.core = DocForge.core || {};

  var items = [];
  var subscribers = [];
  var uid = 0;

  function notify() {
    subscribers.forEach(function (fn) {
      fn(items.slice());
    });
  }

  function makeItem(file, meta) {
    uid += 1;
    return {
      id: 'f' + uid,
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      meta: meta || {}
    };
  }

  DocForge.core.fileStore = {
    subscribe: function (fn) {
      subscribers.push(fn);
      fn(items.slice());
      return function () {
        subscribers = subscribers.filter(function (s) {
          return s !== fn;
        });
      };
    },
    getAll: function () {
      return items.slice();
    },
    get: function (id) {
      return items.find(function (i) {
        return i.id === id;
      }) || null;
    },
    count: function () {
      return items.length;
    },
    addFiles: function (fileList, meta) {
      var added = [];
      Array.prototype.forEach.call(fileList, function (file) {
        var item = makeItem(file, meta);
        items.push(item);
        added.push(item);
      });
      notify();
      return added;
    },
    remove: function (id) {
      var next = [];
      items.forEach(function (item) {
        if (item.id === id) {
          URL.revokeObjectURL(item.url);
        } else {
          next.push(item);
        }
      });
      items = next;
      notify();
    },
    move: function (id, direction) {
      var index = items.findIndex(function (i) {
        return i.id === id;
      });
      if (index < 0) return;
      var target = index + direction;
      if (target < 0 || target >= items.length) return;
      var tmp = items[index];
      items[index] = items[target];
      items[target] = tmp;
      notify();
    },
    reorder: function (orderedIds) {
      var map = {};
      items.forEach(function (i) {
        map[i.id] = i;
      });
      var next = [];
      orderedIds.forEach(function (id) {
        if (map[id]) next.push(map[id]);
      });
      items.forEach(function (i) {
        if (next.indexOf(i) === -1) next.push(i);
      });
      items = next;
      notify();
    },
    setMeta: function (id, meta) {
      items.forEach(function (item) {
        if (item.id === id) {
          item.meta = Object.assign({}, item.meta, meta);
        }
      });
      notify();
    },
    clear: function () {
      items.forEach(function (item) {
        URL.revokeObjectURL(item.url);
      });
      items = [];
      notify();
    },
    readBytes: function (id) {
      var item = DocForge.core.fileStore.get(id);
      if (!item) return Promise.reject(new Error('File not found'));
      return item.file.arrayBuffer().then(function (buf) {
        return new Uint8Array(buf.slice(0));
      });
    },
    readAllBytes: function () {
      return Promise.all(
        items.map(function (item) {
          return item.file.arrayBuffer().then(function (buf) {
            return {
              id: item.id,
              name: item.name,
              bytes: new Uint8Array(buf.slice(0)),
              meta: item.meta
            };
          });
        })
      );
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
