(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.tools = DocForge.tools || {};

  DocForge.tools.createToolPage = function (options) {
    options = options || {};
    var tool = DocForge.config.getTool(options.toolId);
    if (!tool) {
      console.error('Unknown tool', options.toolId);
      return null;
    }

    var dropzoneEl = document.getElementById('js-dropzone');
    var fileListEl = document.getElementById('js-file-list');
    var progressEl = document.getElementById('js-progress');
    var resultEl = document.getElementById('js-result');
    var processBtn = document.getElementById('js-process');
    var resetBtn = document.getElementById('js-reset');
    var processBtnMobile = document.getElementById('js-process-mobile');
    var thumbsEl = document.getElementById('js-thumbs');

    var progress = DocForge.ui.progress.mount(progressEl);
    var thumbs = thumbsEl
      ? DocForge.ui.pageThumbnails.mount(thumbsEl, {
          mode: options.thumbMode || 'select',
          onChange: options.onThumbsChange
        })
      : null;

    if (fileListEl && options.showFileList !== false) {
      DocForge.ui.fileList.mount(fileListEl);
    }

    function setBusy(busy) {
      [processBtn, processBtnMobile, resetBtn].forEach(function (btn) {
        if (btn) btn.disabled = !!busy;
      });
    }

    function showResult(htmlOrText, isHtml) {
      if (!resultEl) return;
      resultEl.classList.add('is-visible');
      if (isHtml) resultEl.innerHTML = htmlOrText;
      else {
        resultEl.innerHTML = '';
        var title = document.createElement('div');
        title.className = 'result__title';
        title.textContent = 'Done';
        var body = document.createElement('div');
        body.textContent = htmlOrText;
        resultEl.appendChild(title);
        resultEl.appendChild(body);
      }
    }

    function hideResult() {
      if (!resultEl) return;
      resultEl.classList.remove('is-visible');
      resultEl.innerHTML = '';
    }

    function addFiles(fileList) {
      var result = DocForge.core.validate.validateFiles(fileList, {
        accept: tool.accept,
        multiple: tool.multiple,
        maxFiles: tool.multiple ? DocForge.config.maxFiles : 1,
        currentCount: tool.multiple ? DocForge.core.fileStore.count() : 0
      });

      if (result.errors.length) {
        result.errors.forEach(function (err) {
          DocForge.ui.toast.warning(err);
        });
      }

      if (!result.files.length) return;

      if (!tool.multiple) {
        DocForge.core.fileStore.clear();
        if (thumbs) thumbs.clear();
      }

      DocForge.core.fileStore.addFiles(result.files);
      hideResult();

      if (typeof options.onFilesAdded === 'function') {
        options.onFilesAdded(DocForge.core.fileStore.getAll(), thumbs);
      }
    }

    if (dropzoneEl) {
      DocForge.ui.dropzone.mount(dropzoneEl, {
        multiple: tool.multiple,
        accept: tool.accept,
        hint: options.dropHint || tool.short,
        onFiles: addFiles
      });
    }

    async function runProcess() {
      var items = DocForge.core.fileStore.getAll();
      var minFiles = tool.minFiles || 1;
      if (items.length < minFiles) {
        DocForge.ui.toast.warning(
          minFiles === 1 ? 'Add a file to continue.' : 'Add at least ' + minFiles + ' files.'
        );
        return;
      }

      setBusy(true);
      hideResult();
      progress.indeterminate('Processing…');

      try {
        var output = await options.process({
          items: items,
          thumbs: thumbs,
          progress: progress,
          tool: tool
        });
        progress.set(1, 'Complete');
        if (output && output.message) showResult(output.message, !!output.html);
        DocForge.ui.toast.success(output && output.toast ? output.toast : 'Finished');
      } catch (err) {
        console.error(err);
        progress.hide();
        DocForge.ui.toast.error(DocForge.core.errors.toUserMessage(err));
      } finally {
        setBusy(false);
      }
    }

    async function reset() {
      var ok = await DocForge.ui.modal.confirm({
        title: 'Start over?',
        body: 'This clears the current files and results for this tool.',
        okLabel: 'Clear',
        danger: true
      });
      if (!ok) return;
      DocForge.core.fileStore.clear();
      if (thumbs) thumbs.clear();
      hideResult();
      progress.hide();
      if (typeof options.onReset === 'function') options.onReset();
    }

    if (processBtn) processBtn.addEventListener('click', runProcess);
    if (processBtnMobile) processBtnMobile.addEventListener('click', runProcess);
    if (resetBtn) resetBtn.addEventListener('click', reset);

    DocForge.ui.toolbar.bind(document, {
      process: runProcess,
      reset: reset
    });

    return {
      thumbs: thumbs,
      progress: progress,
      showResult: showResult,
      hideResult: hideResult
    };
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
