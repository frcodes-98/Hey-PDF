(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.ui = DocForge.ui || {};

  DocForge.ui.dropzone = {
    mount: function (el, options) {
      options = options || {};
      var multiple = !!options.multiple;
      var accept = options.accept || '';

      el.classList.add('dropzone');
      el.innerHTML =
        '<p class="dropzone__title">Drop files here</p>' +
        '<p class="dropzone__hint"></p>' +
        '<button type="button" class="btn btn--secondary">Choose files</button>' +
        '<input class="dropzone__input" type="file" />';

      var input = el.querySelector('.dropzone__input');
      var hint = el.querySelector('.dropzone__hint');
      var button = el.querySelector('.btn');
      input.multiple = multiple;
      if (accept) input.accept = accept;
      hint.textContent = options.hint || (multiple ? 'PDF files' : 'One PDF file');

      function handleFiles(fileList) {
        if (!fileList || !fileList.length) return;
        el.classList.add('is-ready');
        setTimeout(function () {
          el.classList.remove('is-ready');
        }, 700);
        if (typeof options.onFiles === 'function') options.onFiles(fileList);
      }

      button.addEventListener('click', function (e) {
        e.preventDefault();
        input.click();
      });

      input.addEventListener('change', function () {
        handleFiles(input.files);
        input.value = '';
      });

      ['dragenter', 'dragover'].forEach(function (type) {
        el.addEventListener(type, function (e) {
          e.preventDefault();
          e.stopPropagation();
          el.classList.add('is-dragover');
        });
      });

      ['dragleave', 'drop'].forEach(function (type) {
        el.addEventListener(type, function (e) {
          e.preventDefault();
          e.stopPropagation();
          el.classList.remove('is-dragover');
        });
      });

      el.addEventListener('drop', function (e) {
        handleFiles(e.dataTransfer.files);
      });

      return {
        setHint: function (text) {
          hint.textContent = text;
        },
        open: function () {
          input.click();
        }
      };
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
