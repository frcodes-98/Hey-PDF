(function (global) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var workspace = document.querySelector('.tool-workspace');
    var cropRoot = document.getElementById('js-cropper');
    var preview = document.getElementById('js-crop-preview');
    var previewEmpty = document.getElementById('js-crop-empty');
    var bgSelect = document.getElementById('opt-crop-bg');
    var overflowSelect = document.getElementById('opt-crop-overflow');
    var previewUrl = '';
    var previewTimer = 0;
    var previewGen = 0;
    var cropper;

    function cropOpts() {
      return {
        background: bgSelect ? bgSelect.value : 'remove',
        overflow: overflowSelect ? overflowSelect.value : 'clip'
      };
    }

    function revokePreview() {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = '';
      }
    }

    function showEmptyPreview() {
      clearTimeout(previewTimer);
      previewTimer = 0;
      previewGen += 1;
      revokePreview();
      if (preview) {
        preview.removeAttribute('src');
        preview.hidden = true;
        preview.classList.remove('is-transparent');
      }
      if (previewEmpty) previewEmpty.hidden = false;
    }

    function applyPreviewResult(result) {
      revokePreview();
      previewUrl = URL.createObjectURL(result.blob);
      if (preview) {
        preview.src = previewUrl;
        preview.hidden = false;
        preview.classList.toggle('is-transparent', !!result.transparent);
      }
      if (previewEmpty) previewEmpty.hidden = true;
    }

    function runPreview() {
      previewTimer = 0;
      if (!cropper || !cropper.hasCrop()) {
        showEmptyPreview();
        return;
      }
      var gen = ++previewGen;
      var opts = cropOpts();
      if (previewEmpty) previewEmpty.hidden = true;
      cropper
        .previewPng(opts)
        .then(function (result) {
          if (gen !== previewGen) return;
          applyPreviewResult(result);
        })
        .catch(function () {
          /* Live preview is best-effort; Download PNG still uses cropToPng. */
        });
    }

    function schedulePreview(immediate) {
      clearTimeout(previewTimer);
      previewTimer = 0;
      if (!cropper || !cropper.hasCrop()) {
        showEmptyPreview();
        return;
      }
      if (previewEmpty) previewEmpty.hidden = true;
      if (immediate) {
        runPreview();
        return;
      }
      previewTimer = setTimeout(runPreview, 180);
    }

    cropper = DocForge.ui.pageCrop.mount(cropRoot, {
      onCropChange: function (crop, meta) {
        meta = meta || {};
        if (!crop) {
          showEmptyPreview();
          return;
        }
        schedulePreview(!meta.dragging);
      }
    });

    if (bgSelect) {
      bgSelect.addEventListener('change', function () {
        schedulePreview(true);
      });
    }
    if (overflowSelect) {
      overflowSelect.addEventListener('change', function () {
        schedulePreview(true);
      });
    }

    DocForge.tools.createToolPage({
      toolId: 'crop-signature',
      dropHint: 'Drop one PDF to crop a signature from a page',
      showFileList: false,
      onFilesAdded: function (items) {
        if (!items.length) return;
        if (workspace) workspace.classList.add('is-editing');
        DocForge.core.fileStore
          .readBytes(items[0].id)
          .then(function (bytes) {
            return cropper.load(bytes);
          })
          .catch(function (err) {
            DocForge.ui.toast.error(DocForge.core.errors.toUserMessage(err));
          });
      },
      onReset: function () {
        cropper.clear();
        if (workspace) workspace.classList.remove('is-editing');
      },
      process: function (ctx) {
        if (!cropper.hasCrop()) {
          throw new Error('Draw a box around the signature first.');
        }
        var opts = cropOpts();
        ctx.progress.show('Rendering a sharp crop…');
        return cropper.cropToPng(opts).then(function (result) {
          ctx.progress.set(0.85, 'Saving PNG…');
          DocForge.core.download.saveBlob('signature.png', result.blob);
          previewGen += 1;
          applyPreviewResult(result);
          var extra = result.stored
            ? ' Open Sign PDF and choose “Use cropped signature” to stamp it.'
            : ' The PNG downloaded, but this browser could not store it for Sign PDF (storage full or blocked).';
          return {
            message:
              'Downloaded a ' +
              result.width +
              '×' +
              result.height +
              ' PNG' +
              (result.transparent ? ' with the light background removed' : '') +
              '.' +
              extra,
            toast: 'Signature cropped'
          };
        });
      }
    });
  });
})(window);
