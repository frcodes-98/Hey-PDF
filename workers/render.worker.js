/* Phase 1.1 placeholder: move PDF page rendering off the main thread. */
self.onmessage = function (event) {
  var data = event.data || {};
  self.postMessage({
    id: data.id,
    error: 'Render worker is not implemented yet. Rendering runs on the main thread in MVP.'
  });
};
