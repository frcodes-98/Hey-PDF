(function (global) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var workspace = document.querySelector('.tool-workspace');
    var editorRoot = document.getElementById('js-editor');
    var propsEmpty = document.getElementById('js-props-empty');
    var propsFields = document.getElementById('js-props-fields');
    var deleteBtn = document.getElementById('js-delete-item');
    var useCroppedBtn = document.getElementById('js-use-cropped');

    function refreshCroppedButton() {
      var saved =
        DocForge.core.croppedSignature && typeof DocForge.core.croppedSignature.get === 'function'
          ? DocForge.core.croppedSignature.get()
          : '';
      if (useCroppedBtn) useCroppedBtn.hidden = !saved;
    }

    var editor = DocForge.ui.pdfEditor.mount(editorRoot, {
      tools: ['select', 'sign', 'image'],
      onSelectionChange: function (item) {
        var has = !!item;
        if (propsEmpty) propsEmpty.hidden = has;
        if (propsFields) propsFields.hidden = !has;
      }
    });

    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        editor.deleteSelected();
      });
    }

    if (useCroppedBtn) {
      useCroppedBtn.addEventListener('click', function () {
        var saved = DocForge.core.croppedSignature.get();
        if (!saved) {
          DocForge.ui.toast.warning('Crop a signature first in Crop signature.');
          return;
        }
        editor.addSignatureFromDataUrl(saved);
      });
    }

    refreshCroppedButton();

    DocForge.tools.createToolPage({
      toolId: 'sign',
      dropHint: 'Drop one PDF to sign',
      showFileList: false,
      onFilesAdded: function (items) {
        if (!items.length) return;
        if (workspace) workspace.classList.add('is-editing');
        DocForge.core.fileStore
          .readBytes(items[0].id)
          .then(function (bytes) {
            return editor.load(bytes);
          })
          .then(function () {
            editor.openSignaturePad();
          })
          .catch(function (err) {
            DocForge.ui.toast.error(DocForge.core.errors.toUserMessage(err));
          });
      },
      onReset: function () {
        editor.clear();
        if (workspace) workspace.classList.remove('is-editing');
        if (propsEmpty) propsEmpty.hidden = false;
        if (propsFields) propsFields.hidden = true;
      },
      process: function (ctx) {
        var anns = editor.getAnnotations();
        if (!anns.length) {
          throw new Error('Add a signature or image first.');
        }
        return DocForge.core.fileStore.readBytes(ctx.items[0].id).then(function (bytes) {
          ctx.progress.show('Applying signature…');
          return DocForge.pdf.edit(bytes, anns, function (ratio) {
            ctx.progress.set(ratio, 'Writing signature…');
          }).then(function (blob) {
            DocForge.core.download.saveBlob('signed.pdf', blob);
            return {
              message: 'Downloaded signed.pdf. This is a visual overlay, not a legal electronic signature.',
              toast: 'PDF signed'
            };
          });
        });
      }
    });
  });
})(window);
