(function (global) {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var workspace = document.querySelector('.tool-workspace');
    var editorRoot = document.getElementById('js-editor');
    var propsEmpty = document.getElementById('js-props-empty');
    var propsFields = document.getElementById('js-props-fields');
    var redactDefaults = document.getElementById('js-redact-defaults');
    var textField = document.getElementById('opt-edit-text');
    var fontField = document.getElementById('opt-edit-font');
    var defaultFontField = document.getElementById('opt-edit-default-font');
    var sizeField = document.getElementById('opt-edit-size');
    var sizeValue = document.getElementById('opt-edit-size-value');
    var colorField = document.getElementById('opt-edit-color');
    var colorLabel = document.getElementById('js-prop-color-label');
    var fillField = document.getElementById('opt-edit-fill');
    var fillLabel = document.getElementById('js-prop-fill-label');
    var fillHelp = document.getElementById('js-fill-help');
    var fillActions = document.getElementById('js-fill-actions');
    var redactDefaultField = document.getElementById('opt-redact-default');
    var textWrap = document.getElementById('js-prop-text');
    var fontWrap = document.getElementById('js-prop-font');
    var sizeWrap = document.getElementById('js-prop-size');
    var colorWrap = document.getElementById('js-prop-color');
    var fillWrap = document.getElementById('js-prop-fill');
    var deleteBtn = document.getElementById('js-delete-item');
    var pickBtn = document.getElementById('js-pick-color');
    var detectBtn = document.getElementById('js-detect-color');
    var pickDefaultBtn = document.getElementById('js-pick-color-default');
    var detectDefaultBtn = document.getElementById('js-detect-color-default');
    var syncing = false;

    var editor = null;
    editor = DocForge.ui.pdfEditor.mount(editorRoot, {
      tools: ['select', 'text', 'image', 'highlight', 'redact', 'sign', 'tick', 'cross'],
      onSelectionChange: syncProps,
      onToolChange: function () {
        if (!editor) return;
        syncProps(editor.getSelected());
      }
    });

    if (defaultFontField) {
      editor.setDefaultFont(defaultFontField.value);
    }
    syncProps(editor.getSelected());

    function applyFill(hex, selected) {
      if (selected && (selected.type === 'redact' || selected.type === 'highlight')) {
        editor.updateSelected({ fill: hex });
      }
      if (!selected || selected.type === 'redact') {
        editor.setDefaultRedactFill(hex);
        if (redactDefaultField) redactDefaultField.value = hex;
      }
      if (fillField) fillField.value = hex;
    }

    function startPick() {
      var ok = editor.beginColorPick(function (hex) {
        applyFill(hex, editor.getSelected());
        DocForge.ui.toast.success('Color set to ' + hex);
      });
      if (ok) DocForge.ui.toast.success('Click the page to sample a color.');
    }

    function runDetect() {
      var hex = editor.detectFillColor();
      applyFill(hex, editor.getSelected());
      DocForge.ui.toast.success('Detected ' + hex);
    }

    function syncProps(item) {
      syncing = true;
      var tool = editor.getTool ? editor.getTool() : 'select';
      var has = !!item;
      var isRedactTool = tool === 'redact' && !has;
      if (propsEmpty) propsEmpty.hidden = has || isRedactTool;
      if (redactDefaults) redactDefaults.hidden = !isRedactTool;
      if (propsFields) propsFields.hidden = !has;
      if (!item) {
        if (redactDefaultField) redactDefaultField.value = editor.getDefaultRedactFill();
        syncing = false;
        return;
      }
      var isText = item.type === 'text';
      var isHighlight = item.type === 'highlight';
      var isRedact = item.type === 'redact';
      var isTick = item.type === 'tick';
      var isCross = item.type === 'cross';
      if (textWrap) textWrap.hidden = !isText;
      if (fontWrap) fontWrap.hidden = !isText;
      if (sizeWrap) sizeWrap.hidden = !isText;
      if (colorWrap) colorWrap.hidden = !(isText || isTick || isCross);
      if (fillWrap) fillWrap.hidden = !(isHighlight || isRedact);
      if (fillActions) fillActions.hidden = !isRedact;
      if (fillLabel) fillLabel.textContent = isRedact ? 'Redact color' : 'Highlight color';
      if (fillHelp) {
        fillHelp.textContent = isRedact
          ? 'Black covers the area. Pick samples a pixel; Detect matches paper around the box.'
          : 'Used for the highlight overlay.';
      }
      if (colorLabel) {
        colorLabel.textContent = isTick ? 'Tick color' : isCross ? 'Cross color' : 'Text color';
      }
      if (textField) textField.value = item.text || '';
      if (fontField) fontField.value = item.font || 'helvetica';
      if (sizeField) {
        var size = Math.round((item.fontScale || 0.012) * 1000) / 10;
        sizeField.value = String(size);
        if (sizeValue) sizeValue.textContent = size.toFixed(1);
      }
      if (colorField) {
        var fallback = isTick ? '#1a7f37' : isCross ? '#c62828' : '#0f1c24';
        colorField.value = item.color || fallback;
      }
      if (fillField) {
        fillField.value = item.fill || (isRedact ? '#000000' : '#f7e26b');
      }
      syncing = false;
    }

    if (textField) {
      textField.addEventListener('input', function () {
        if (!syncing) editor.updateSelected({ text: textField.value });
      });
    }
    if (fontField) {
      fontField.addEventListener('change', function () {
        if (!syncing) editor.updateSelected({ font: fontField.value });
      });
    }
    if (defaultFontField) {
      defaultFontField.addEventListener('change', function () {
        editor.setDefaultFont(defaultFontField.value);
      });
    }
    if (sizeField) {
      sizeField.addEventListener('input', function () {
        var size = Number(sizeField.value);
        if (sizeValue) sizeValue.textContent = size.toFixed(1);
        if (!syncing) editor.updateSelected({ fontScale: size / 100 });
      });
    }
    if (colorField) {
      colorField.addEventListener('input', function () {
        if (!syncing) editor.updateSelected({ color: colorField.value });
      });
    }
    if (fillField) {
      fillField.addEventListener('input', function () {
        if (syncing) return;
        applyFill(fillField.value, editor.getSelected());
      });
    }
    if (redactDefaultField) {
      redactDefaultField.addEventListener('input', function () {
        editor.setDefaultRedactFill(redactDefaultField.value);
      });
    }
    if (pickBtn) pickBtn.addEventListener('click', startPick);
    if (pickDefaultBtn) pickDefaultBtn.addEventListener('click', startPick);
    if (detectBtn) detectBtn.addEventListener('click', runDetect);
    if (detectDefaultBtn) detectDefaultBtn.addEventListener('click', runDetect);
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        editor.deleteSelected();
      });
    }

    DocForge.tools.createToolPage({
      toolId: 'edit',
      dropHint: 'Drop one PDF to edit on the page',
      showFileList: false,
      onFilesAdded: function (items) {
        if (!items.length) return;
        if (workspace) workspace.classList.add('is-editing');
        DocForge.core.fileStore.readBytes(items[0].id).then(function (bytes) {
          return editor.load(bytes);
        }).catch(function (err) {
          DocForge.ui.toast.error(DocForge.core.errors.toUserMessage(err));
        });
      },
      onReset: function () {
        editor.clear();
        if (workspace) workspace.classList.remove('is-editing');
        syncProps(null);
      },
      process: function (ctx) {
        var anns = editor.getAnnotations();
        if (!anns.length) {
          throw new Error('Add text, a tick or cross, an image, a signature, a highlight, or a redaction first.');
        }
        return DocForge.core.fileStore.readBytes(ctx.items[0].id).then(function (bytes) {
          ctx.progress.show('Applying edits…');
          return DocForge.pdf.edit(bytes, anns, function (ratio) {
            ctx.progress.set(ratio, 'Writing overlays…');
          }).then(function (blob) {
            DocForge.core.download.saveBlob('edited.pdf', blob);
            return {
              message: 'Downloaded edited.pdf with ' + anns.length + ' overlay(s). Original page content is unchanged underneath.',
              toast: 'PDF edited'
            };
          });
        });
      }
    });
  });
})(window);
