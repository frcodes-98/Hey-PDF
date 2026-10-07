(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.ui = DocForge.ui || {};

  DocForge.ui.progress = {
    mount: function (el) {
      if (!el) return null;
      el.classList.add('progress');
      el.innerHTML =
        '<div class="progress__track"><div class="progress__bar"></div></div>' +
        '<div class="progress__label"></div>';
      var bar = el.querySelector('.progress__bar');
      var label = el.querySelector('.progress__label');

      return {
        show: function (text) {
          el.classList.add('is-visible');
          label.textContent = text || 'Working…';
        },
        hide: function () {
          el.classList.remove('is-visible', 'is-indeterminate');
          bar.style.width = '0%';
          label.textContent = '';
        },
        set: function (ratio, text) {
          el.classList.add('is-visible');
          el.classList.remove('is-indeterminate');
          var pct = Math.max(0, Math.min(100, Math.round((ratio || 0) * 100)));
          bar.style.width = pct + '%';
          if (text) label.textContent = text;
        },
        indeterminate: function (text) {
          el.classList.add('is-visible', 'is-indeterminate');
          bar.style.width = '';
          label.textContent = text || 'Working…';
        }
      };
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
