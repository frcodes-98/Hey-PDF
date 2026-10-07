(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.ui = DocForge.ui || {};

  DocForge.ui.pageThumbnails = {
    mount: function (el, options) {
      options = options || {};
      el.classList.add('thumb-grid');
      var pages = [];
      var selected = new Set();
      var mode = options.mode || 'select';

      function emit() {
        if (typeof options.onChange === 'function') {
          options.onChange({
            pages: pages.slice(),
            selected: Array.from(selected)
          });
        }
      }

      function render() {
        el.innerHTML = '';
        if (!pages.length) {
          el.innerHTML = '<div class="empty-state">Page previews will appear here after you add a PDF.</div>';
          return;
        }
        pages.forEach(function (page, index) {
          var card = document.createElement('div');
          card.className = 'thumb' + (selected.has(page.pageNumber) ? ' is-selected' : '');
          card.setAttribute('data-page', String(page.pageNumber));
          card.draggable = mode === 'reorder';
          card.innerHTML =
            '<div class="thumb__check">✓</div>' +
            '<div class="thumb__canvas-wrap"></div>' +
            '<div class="thumb__label"><span></span><span class="thumb__rot"></span></div>';
          card.querySelector('.thumb__label span').textContent = 'Page ' + page.pageNumber;
          if (page.rotation) {
            card.querySelector('.thumb__rot').textContent = page.rotation + '°';
          }
          var wrap = card.querySelector('.thumb__canvas-wrap');
          if (page.imageUrl) {
            var img = document.createElement('img');
            img.alt = 'Page ' + page.pageNumber;
            img.src = page.imageUrl;
            wrap.appendChild(img);
          } else {
            wrap.textContent = String(page.pageNumber);
          }
          el.appendChild(card);
        });
      }

      el.addEventListener('click', function (e) {
        var card = e.target.closest('.thumb');
        if (!card) return;
        var pageNumber = Number(card.getAttribute('data-page'));
        if (mode === 'select' || mode === 'multi') {
          if (selected.has(pageNumber)) selected.delete(pageNumber);
          else selected.add(pageNumber);
          render();
          emit();
        }
        if (typeof options.onPageClick === 'function') {
          options.onPageClick(pageNumber, selected.has(pageNumber));
        }
      });

      var dragPage = null;
      el.addEventListener('dragstart', function (e) {
        if (mode !== 'reorder') return;
        var card = e.target.closest('.thumb');
        if (!card) return;
        dragPage = Number(card.getAttribute('data-page'));
        e.dataTransfer.effectAllowed = 'move';
      });

      el.addEventListener('dragover', function (e) {
        if (mode !== 'reorder') return;
        e.preventDefault();
      });

      el.addEventListener('drop', function (e) {
        if (mode !== 'reorder' || dragPage == null) return;
        e.preventDefault();
        var card = e.target.closest('.thumb');
        if (!card) return;
        var target = Number(card.getAttribute('data-page'));
        if (target === dragPage) return;
        var from = pages.findIndex(function (p) {
          return p.pageNumber === dragPage;
        });
        var to = pages.findIndex(function (p) {
          return p.pageNumber === target;
        });
        if (from < 0 || to < 0) return;
        var moved = pages.splice(from, 1)[0];
        pages.splice(to, 0, moved);
        dragPage = null;
        render();
        emit();
      });

      render();

      return {
        setPages: function (nextPages) {
          pages = (nextPages || []).map(function (p) {
            return Object.assign({}, p);
          });
          render();
          emit();
        },
        getOrder: function () {
          return pages.map(function (p) {
            return p.pageNumber;
          });
        },
        getSelected: function () {
          return Array.from(selected).sort(function (a, b) {
            return a - b;
          });
        },
        setSelected: function (nums) {
          selected = new Set(nums || []);
          render();
          emit();
        },
        updatePage: function (pageNumber, patch) {
          pages = pages.map(function (p) {
            return p.pageNumber === pageNumber ? Object.assign({}, p, patch) : p;
          });
          render();
          emit();
        },
        clear: function () {
          pages = [];
          selected.clear();
          render();
          emit();
        }
      };
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
