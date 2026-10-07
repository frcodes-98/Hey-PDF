/* Phase 1.1 placeholder: move compress rendering off the main thread. */
self.onmessage = function (event) {
  var data = event.data || {};
  self.postMessage({
    id: data.id,
    error: 'Compress worker is not implemented yet. Compression runs on the main thread in MVP.'
  });
};
