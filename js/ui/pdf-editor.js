(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.ui = DocForge.ui || {};

  var FONT_KEYS = ['helvetica', 'helvetica-bold', 'arial', 'arial-bold', 'times', 'times-bold', 'courier'];

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function uid() {
    uid.n = (uid.n || 0) + 1;
    return 'a' + uid.n;
  }

  function normalizeFont(font) {
    return FONT_KEYS.indexOf(font) !== -1 ? font : 'helvetica';
  }

  function cssForFont(font) {
    var key = normalizeFont(font);
    if (key === 'times' || key === 'times-bold') {
      return { family: '"Times New Roman", Times, Georgia, serif', bold: key === 'times-bold' };
    }
    if (key === 'courier') {
      return { family: 'Courier, "Courier New", monospace', bold: false };
    }
    if (key === 'arial' || key === 'arial-bold') {
      return { family: 'DocForgeArial, Arial, Helvetica, sans-serif', bold: key === 'arial-bold' };
    }
    return { family: 'Helvetica, Arial, sans-serif', bold: key === 'helvetica-bold' };
  }

  function safeHex(hex, fallback) {
    var v = String(hex || '');
    if (/^#[0-9A-Fa-f]{6}$/.test(v) || /^#[0-9A-Fa-f]{3}$/.test(v)) return v;
    return fallback;
  }

  function stampSvg(type, color) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('edit-item__mark');
    var stroke = document.createElementNS('http://www.w3.org/2000/svg', type === 'tick' ? 'polyline' : 'path');
    stroke.setAttribute('fill', 'none');
    stroke.setAttribute('stroke', color);
    stroke.setAttribute('stroke-width', '3.2');
    stroke.setAttribute('stroke-linecap', 'round');
    stroke.setAttribute('stroke-linejoin', 'round');
    if (type === 'tick') {
      stroke.setAttribute('points', '4 12.5 9.5 18 20 6');
    } else {
      stroke.setAttribute('d', 'M6 6 L18 18 M18 6 L6 18');
    }
    svg.appendChild(stroke);
    return svg;
  }

  DocForge.ui.pdfEditor = {
    fonts: FONT_KEYS.slice(),
    mount: function (root, options) {
      options = options || {};
      var canvas = root.querySelector('#js-edit-canvas');
      var overlay = root.querySelector('#js-edit-overlay');
      var pageWrap = root.querySelector('#js-edit-page');
      var stage = root.querySelector('#js-edit-stage');
      var marquee = root.querySelector('#js-edit-marquee');
      var pageLabel = root.querySelector('#js-edit-page-label');
      var toolButtons = root.querySelectorAll('[data-edit-tool]');
      var imageInput = root.querySelector('#js-edit-image-input');

      var allowedTools = Array.isArray(options.tools) && options.tools.length
        ? options.tools.slice()
        : null;
      var defaultFont = normalizeFont(options.defaultFont);

      var pdfDoc = null;
      var bytes = null;
      var pageCount = 0;
      var pageNumber = 1;
      var annotations = [];
      var selectedId = null;
      var tool = 'select';
      var rendering = false;
      var drag = null;
      var pickingColor = false;
      var pickCallback = null;
      var defaultRedactFill = '#000000';

      function hasTool(name) {
        if (allowedTools) return allowedTools.indexOf(name) !== -1;
        var found = false;
        Array.prototype.forEach.call(toolButtons, function (btn) {
          if (btn.getAttribute('data-edit-tool') === name) found = true;
        });
        return found;
      }

      if (allowedTools) {
        Array.prototype.forEach.call(toolButtons, function (btn) {
          var name = btn.getAttribute('data-edit-tool');
          btn.hidden = allowedTools.indexOf(name) === -1;
        });
      }

      function emitChange() {
        if (typeof options.onChange === 'function') options.onChange(annotations.slice());
      }

      function emitSelection() {
        var item = getSelected();
        if (typeof options.onSelectionChange === 'function') options.onSelectionChange(item);
      }

      function getSelected() {
        return annotations.find(function (a) {
          return a.id === selectedId;
        }) || null;
      }

      function setTool(next) {
        if (next && next !== 'select' && !hasTool(next)) return;
        tool = next || 'select';
        Array.prototype.forEach.call(toolButtons, function (btn) {
          var active = btn.getAttribute('data-edit-tool') === tool;
          btn.classList.toggle('is-active', active);
          btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        overlay.setAttribute('data-tool', tool);
        if (typeof options.onToolChange === 'function') options.onToolChange(tool);
      }

      function setSelected(id) {
        selectedId = id || null;
        renderOverlay();
        emitSelection();
      }

      function pageItems() {
        return annotations.filter(function (a) {
          return a.page === pageNumber;
        });
      }

      function overlayRect() {
        return overlay.getBoundingClientRect();
      }

      function clientToNorm(clientX, clientY) {
        var rect = overlayRect();
        return {
          x: clamp((clientX - rect.left) / rect.width, 0, 1),
          y: clamp((clientY - rect.top) / rect.height, 0, 1)
        };
      }

      function defaultStampSize() {
        var rect = overlayRect();
        var rw = Math.max(1, rect.width);
        var rh = Math.max(1, rect.height);
        var px = Math.max(24, Math.min(rw, rh) * 0.045);
        return { w: px / rw, h: px / rh };
      }

      function renderOverlay() {
        overlay.querySelectorAll('.edit-item').forEach(function (node) {
          node.remove();
        });
        pageItems().forEach(function (ann) {
          var el = document.createElement('div');
          el.className = 'edit-item edit-item--' + ann.type + (ann.id === selectedId ? ' is-selected' : '');
          el.setAttribute('data-id', ann.id);
          el.style.left = ann.x * 100 + '%';
          el.style.top = ann.y * 100 + '%';
          el.style.width = ann.w * 100 + '%';
          el.style.height = ann.h * 100 + '%';

          var body = document.createElement('div');
          body.className = 'edit-item__body';
          if (ann.type === 'text') {
            var face = cssForFont(ann.font);
            body.textContent = ann.text || 'Text';
            body.style.color = safeHex(ann.color, '#0f1c24');
            body.style.fontSize = (ann.fontScale || 0.012) * overlay.clientHeight + 'px';
            body.style.fontFamily = face.family;
            body.style.fontWeight = face.bold ? '700' : '400';
          } else if ((ann.type === 'image' || ann.type === 'signature') && ann.imageDataUrl) {
            var img = document.createElement('img');
            img.alt = ann.type === 'signature' ? 'Signature' : '';
            img.draggable = false;
            img.src = ann.imageDataUrl;
            body.appendChild(img);
          } else if (ann.type === 'highlight') {
            body.style.background = ann.fill || '#f7e26b';
            body.style.opacity = String(ann.opacity == null ? 0.38 : ann.opacity);
          } else if (ann.type === 'redact') {
            body.style.background = safeHex(ann.fill, '#000000');
          } else if (ann.type === 'tick' || ann.type === 'cross') {
            var markColor = safeHex(ann.color, ann.type === 'tick' ? '#1a7f37' : '#c62828');
            body.appendChild(stampSvg(ann.type, markColor));
          }
          el.appendChild(body);

          ['nw', 'ne', 'sw', 'se'].forEach(function (handle) {
            var h = document.createElement('button');
            h.type = 'button';
            h.className = 'edit-item__handle edit-item__handle--' + handle;
            h.setAttribute('data-handle', handle);
            h.setAttribute('aria-label', 'Resize ' + handle);
            el.appendChild(h);
          });
          overlay.appendChild(el);
        });
        if (pageLabel) pageLabel.textContent = pageNumber + ' / ' + (pageCount || 1);
      }

      function renderPage() {
        if (!pdfDoc || !canvas || rendering) return Promise.resolve();
        rendering = true;
        var maxWidth = Math.max(320, Math.floor((stage && stage.clientWidth) || 720) - 48);
        return DocForge.pdf.engine.renderPageToCanvas(pdfDoc, pageNumber, canvas, maxWidth).then(function () {
          if (pageWrap) {
            pageWrap.style.width = canvas.width + 'px';
            pageWrap.style.height = canvas.height + 'px';
          }
          renderOverlay();
        }).catch(function (err) {
          DocForge.ui.toast.error(DocForge.core.errors.toUserMessage(err));
        }).then(function () {
          rendering = false;
        });
      }

      function addAnnotation(ann) {
        annotations.push(ann);
        setSelected(ann.id);
        emitChange();
      }

      function modalIsOpen() {
        var modalRoot = document.getElementById('modal-root');
        return !!(modalRoot && !modalRoot.hidden);
      }

      function placeImageOverlay(url, type) {
        var probe = new Image();
        probe.onload = function () {
          var ratio = (probe.naturalWidth || 1) / (probe.naturalHeight || 1);
          var isSign = type === 'signature';
          var w = isSign ? 0.36 : 0.32;
          var h = w / ratio;
          var maxH = isSign ? 0.18 : 0.36;
          if (h > maxH) {
            h = maxH;
            w = h * ratio;
          }
          addAnnotation({
            id: uid(),
            type: isSign ? 'signature' : 'image',
            page: pageNumber,
            x: clamp(0.5 - w / 2, 0, 1 - w),
            y: clamp((isSign ? 0.78 : 0.5) - (isSign ? h : h / 2), 0, 1 - h),
            w: w,
            h: h,
            imageDataUrl: url
          });
          setTool('select');
        };
        probe.onerror = function () {
          DocForge.ui.toast.error('Could not read that image.');
        };
        probe.src = url;
      }

      var padOpen = false;
      function openSignaturePad() {
        if (!pdfDoc || padOpen || typeof DocForge.ui.modal.signaturePad !== 'function') return;
        padOpen = true;
        DocForge.ui.modal.signaturePad().then(function (dataUrl) {
          padOpen = false;
          if (!dataUrl || !pdfDoc) return;
          placeImageOverlay(dataUrl, 'signature');
        }).catch(function (err) {
          padOpen = false;
          DocForge.ui.toast.error(DocForge.core.errors.toUserMessage(err));
        });
      }

      function updateAnnotation(id, patch, quiet) {
        if (patch && patch.font) patch = Object.assign({}, patch, { font: normalizeFont(patch.font) });
        annotations = annotations.map(function (a) {
          return a.id === id ? Object.assign({}, a, patch) : a;
        });
        if (quiet) {
          var node = overlay.querySelector('[data-id="' + id + '"]');
          var ann = annotations.find(function (a) {
            return a.id === id;
          });
          if (node && ann) {
            node.style.left = ann.x * 100 + '%';
            node.style.top = ann.y * 100 + '%';
            node.style.width = ann.w * 100 + '%';
            node.style.height = ann.h * 100 + '%';
          }
        } else {
          renderOverlay();
          emitSelection();
        }
        emitChange();
      }

      function deleteSelected() {
        if (!selectedId) return;
        annotations = annotations.filter(function (a) {
          return a.id !== selectedId;
        });
        selectedId = null;
        renderOverlay();
        emitChange();
        emitSelection();
      }

      function startItemDrag(id, event) {
        var ann = annotations.find(function (a) {
          return a.id === id;
        });
        if (!ann) return;
        drag = {
          kind: 'move',
          id: id,
          startX: event.clientX,
          startY: event.clientY,
          orig: { x: ann.x, y: ann.y, w: ann.w, h: ann.h }
        };
        overlay.setPointerCapture(event.pointerId);
      }

      function startResize(id, handle, event) {
        var ann = annotations.find(function (a) {
          return a.id === id;
        });
        if (!ann) return;
        drag = {
          kind: 'resize',
          id: id,
          handle: handle,
          startX: event.clientX,
          startY: event.clientY,
          orig: { x: ann.x, y: ann.y, w: ann.w, h: ann.h }
        };
        overlay.setPointerCapture(event.pointerId);
      }

      function applyDrag(event) {
        if (!drag) return;
        var rect = overlayRect();
        var dx = (event.clientX - drag.startX) / rect.width;
        var dy = (event.clientY - drag.startY) / rect.height;
        var o = drag.orig;
        var next = { x: o.x, y: o.y, w: o.w, h: o.h };
        if (drag.kind === 'move') {
          next.x = clamp(o.x + dx, 0, 1 - o.w);
          next.y = clamp(o.y + dy, 0, 1 - o.h);
        } else {
          var h = drag.handle;
          if (h.indexOf('e') !== -1) next.w = clamp(o.w + dx, 0.04, 1 - o.x);
          if (h.indexOf('s') !== -1) next.h = clamp(o.h + dy, 0.03, 1 - o.y);
          if (h.indexOf('w') !== -1) {
            next.x = clamp(o.x + dx, 0, o.x + o.w - 0.04);
            next.w = clamp(o.w - dx, 0.04, 1);
          }
          if (h.indexOf('n') !== -1) {
            next.y = clamp(o.y + dy, 0, o.y + o.h - 0.03);
            next.h = clamp(o.h - dy, 0.03, 1);
          }
          if (next.x + next.w > 1) next.w = 1 - next.x;
          if (next.y + next.h > 1) next.h = 1 - next.y;
        }
        updateAnnotation(drag.id, next, true);
      }

      function finishMarquee(event) {
        if (!drag || drag.kind !== 'draw') return;
        var a = drag.origin;
        var usedTool = drag.tool || tool;
        var b = clientToNorm(event.clientX, event.clientY);
        var x = Math.min(a.x, b.x);
        var y = Math.min(a.y, b.y);
        var w = Math.abs(b.x - a.x);
        var h = Math.abs(b.y - a.y);
        marquee.hidden = true;
        drag = null;
        var isStamp = usedTool === 'tick' || usedTool === 'cross';
        if (w < 0.02 || h < 0.015) {
          if (!isStamp) return;
          var sz = defaultStampSize();
          w = sz.w;
          h = sz.h;
          x = clamp(a.x - w / 2, 0, 1 - w);
          y = clamp(a.y - h / 2, 0, 1 - h);
        }
        var ann = {
          id: uid(),
          type: usedTool,
          page: pageNumber,
          x: x,
          y: y,
          w: w,
          h: h
        };
        if (usedTool === 'highlight') {
          ann.fill = '#f7e26b';
          ann.opacity = 0.38;
        } else if (usedTool === 'redact') {
          ann.fill = defaultRedactFill || '#000000';
        } else if (usedTool === 'tick') {
          ann.color = '#1a7f37';
        } else if (usedTool === 'cross') {
          ann.color = '#c62828';
        }
        addAnnotation(ann);
        setTool('select');
      }

      function rgbToHex(r, g, b) {
        function to(n) {
          var s = Math.max(0, Math.min(255, Math.round(n))).toString(16);
          return s.length === 1 ? '0' + s : s;
        }
        return '#' + to(r) + to(g) + to(b);
      }

      function sampleCanvasHex(clientX, clientY) {
        if (!canvas) return '#000000';
        var rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return '#000000';
        var x = Math.round(((clientX - rect.left) / rect.width) * canvas.width);
        var y = Math.round(((clientY - rect.top) / rect.height) * canvas.height);
        x = clamp(x, 0, canvas.width - 1);
        y = clamp(y, 0, canvas.height - 1);
        var ctx = canvas.getContext('2d');
        var px = ctx.getImageData(x, y, 1, 1).data;
        return rgbToHex(px[0], px[1], px[2]);
      }

      function sampleCanvasXY(px, py) {
        var ctx = canvas.getContext('2d');
        var x = clamp(Math.round(px), 0, canvas.width - 1);
        var y = clamp(Math.round(py), 0, canvas.height - 1);
        var data = ctx.getImageData(x, y, 1, 1).data;
        return rgbToHex(data[0], data[1], data[2]);
      }

      function detectFillColor() {
        if (!canvas || !canvas.width) return defaultRedactFill || '#000000';
        var samples = [];
        var item = getSelected();
        if (item && (item.type === 'redact' || item.type === 'highlight')) {
          var x0 = item.x * canvas.width;
          var y0 = item.y * canvas.height;
          var x1 = (item.x + item.w) * canvas.width;
          var y1 = (item.y + item.h) * canvas.height;
          var pad = Math.max(3, Math.min(14, Math.round(Math.min(item.w * canvas.width, item.h * canvas.height) * 0.08)));
          var points = [
            [x0 - pad, y0 - pad],
            [x1 + pad, y0 - pad],
            [x0 - pad, y1 + pad],
            [x1 + pad, y1 + pad],
            [(x0 + x1) / 2, y0 - pad],
            [(x0 + x1) / 2, y1 + pad],
            [x0 - pad, (y0 + y1) / 2],
            [x1 + pad, (y0 + y1) / 2]
          ];
          points.forEach(function (pt) {
            samples.push(sampleCanvasXY(pt[0], pt[1]));
          });
        } else {
          var inset = Math.max(8, Math.round(Math.min(canvas.width, canvas.height) * 0.04));
          [
            [inset, inset],
            [canvas.width - inset, inset],
            [inset, canvas.height - inset],
            [canvas.width - inset, canvas.height - inset],
            [canvas.width / 2, inset],
            [canvas.width / 2, canvas.height - inset]
          ].forEach(function (pt) {
            samples.push(sampleCanvasXY(pt[0], pt[1]));
          });
        }
        var counts = {};
        var best = samples[0] || '#000000';
        var bestN = 0;
        samples.forEach(function (hex) {
          counts[hex] = (counts[hex] || 0) + 1;
          if (counts[hex] > bestN) {
            bestN = counts[hex];
            best = hex;
          }
        });
        return best;
      }

      overlay.addEventListener('pointerdown', function (event) {
        if (!pdfDoc) return;
        if (pickingColor) {
          event.preventDefault();
          event.stopPropagation();
          var hex = sampleCanvasHex(event.clientX, event.clientY);
          pickingColor = false;
          overlay.classList.remove('is-picking');
          var cb = pickCallback;
          pickCallback = null;
          if (typeof cb === 'function') cb(hex);
          return;
        }
        var handle = event.target.closest('[data-handle]');
        var item = event.target.closest('.edit-item');
        if (handle && item) {
          event.preventDefault();
          setSelected(item.getAttribute('data-id'));
          startResize(item.getAttribute('data-id'), handle.getAttribute('data-handle'), event);
          return;
        }
        if (item) {
          event.preventDefault();
          setSelected(item.getAttribute('data-id'));
          if (event.detail === 2 && item.classList.contains('edit-item--text')) {
            var body = item.querySelector('.edit-item__body');
            body.contentEditable = 'true';
            body.focus();
            return;
          }
          startItemDrag(item.getAttribute('data-id'), event);
          return;
        }
        if (tool === 'text') {
          var p = clientToNorm(event.clientX, event.clientY);
          addAnnotation({
            id: uid(),
            type: 'text',
            page: pageNumber,
            x: clamp(p.x, 0, 0.6),
            y: clamp(p.y, 0, 0.92),
            w: 0.38,
            h: 0.045,
            text: 'New text',
            fontScale: 0.012,
            color: '#0f1c24',
            font: defaultFont
          });
          setTool('select');
          return;
        }
        if (tool === 'highlight' || tool === 'redact' || tool === 'tick' || tool === 'cross') {
          drag = { kind: 'draw', tool: tool, origin: clientToNorm(event.clientX, event.clientY) };
          marquee.hidden = false;
          overlay.setPointerCapture(event.pointerId);
          return;
        }
        setSelected(null);
      });

      overlay.addEventListener('pointermove', function (event) {
        if (!drag) return;
        if (drag.kind === 'draw') {
          var a = drag.origin;
          var b = clientToNorm(event.clientX, event.clientY);
          var rect = overlayRect();
          marquee.style.left = Math.min(a.x, b.x) * rect.width + 'px';
          marquee.style.top = Math.min(a.y, b.y) * rect.height + 'px';
          marquee.style.width = Math.abs(b.x - a.x) * rect.width + 'px';
          marquee.style.height = Math.abs(b.y - a.y) * rect.height + 'px';
          return;
        }
        applyDrag(event);
      });

      overlay.addEventListener('pointerup', function (event) {
        if (drag && drag.kind === 'draw') finishMarquee(event);
        else if (drag) emitSelection();
        drag = null;
      });

      overlay.addEventListener('pointercancel', function () {
        marquee.hidden = true;
        drag = null;
      });

      overlay.addEventListener('focusout', function (event) {
        var body = event.target.closest && event.target.closest('.edit-item__body');
        if (!body || !body.isContentEditable) return;
        var item = body.closest('.edit-item');
        if (!item) return;
        body.contentEditable = 'false';
        updateAnnotation(item.getAttribute('data-id'), { text: body.textContent || '' });
      });

      Array.prototype.forEach.call(toolButtons, function (btn) {
        btn.addEventListener('click', function () {
          var next = btn.getAttribute('data-edit-tool');
          if (next === 'image') {
            if (imageInput) imageInput.click();
            return;
          }
          if (next === 'sign') {
            openSignaturePad();
            return;
          }
          setTool(next);
        });
      });

      if (imageInput) {
        imageInput.addEventListener('change', function () {
          var file = imageInput.files && imageInput.files[0];
          imageInput.value = '';
          if (!file || !pdfDoc) return;
          var reader = new FileReader();
          reader.onload = function () {
            placeImageOverlay(reader.result, 'image');
          };
          reader.readAsDataURL(file);
        });
      }

      var prevBtn = root.querySelector('#js-edit-prev');
      var nextBtn = root.querySelector('#js-edit-next');
      if (prevBtn) {
        prevBtn.addEventListener('click', function () {
          if (pageNumber <= 1) return;
          pageNumber -= 1;
          selectedId = null;
          renderPage();
          emitSelection();
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', function () {
          if (pageNumber >= pageCount) return;
          pageNumber += 1;
          selectedId = null;
          renderPage();
          emitSelection();
        });
      }

      document.addEventListener('keydown', function (event) {
        if (root.hidden || modalIsOpen()) return;
        var tag = (event.target && event.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target.isContentEditable) return;
        if (event.key === 'Delete' || event.key === 'Backspace') {
          if (selectedId) {
            event.preventDefault();
            deleteSelected();
          }
        }
        if (event.key === 'Escape') {
          if (pickingColor) {
            pickingColor = false;
            overlay.classList.remove('is-picking');
            pickCallback = null;
            return;
          }
          setSelected(null);
        }
        if (event.key === 'v' || event.key === 'V') setTool('select');
        if ((event.key === 't' || event.key === 'T') && hasTool('text')) setTool('text');
        if ((event.key === 'h' || event.key === 'H') && hasTool('highlight')) setTool('highlight');
        if ((event.key === 'r' || event.key === 'R') && hasTool('redact')) setTool('redact');
        if ((event.key === 'k' || event.key === 'K') && hasTool('tick')) setTool('tick');
        if ((event.key === 'x' || event.key === 'X') && hasTool('cross')) setTool('cross');
        if ((event.key === 's' || event.key === 'S') && hasTool('sign')) {
          event.preventDefault();
          openSignaturePad();
        }
      });

      var resizeTimer = null;
      if (typeof ResizeObserver !== 'undefined' && stage) {
        new ResizeObserver(function () {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(renderPage, 120);
        }).observe(stage);
      }

      setTool('select');

      return {
        load: function (pdfBytes) {
          bytes = DocForge.pdf.engine.copyBytes(pdfBytes);
          annotations = [];
          selectedId = null;
          pageNumber = 1;
          if (pdfDoc) {
            pdfDoc.destroy();
            pdfDoc = null;
          }
          return DocForge.pdf.engine.loadPdfJsDoc(bytes).then(function (doc) {
            pdfDoc = doc;
            pageCount = doc.numPages;
            root.hidden = false;
            emitChange();
            emitSelection();
            return renderPage();
          });
        },
        clear: function () {
          if (pdfDoc) {
            pdfDoc.destroy();
            pdfDoc = null;
          }
          bytes = null;
          annotations = [];
          selectedId = null;
          pageCount = 0;
          pageNumber = 1;
          root.hidden = true;
          overlay.querySelectorAll('.edit-item').forEach(function (node) {
            node.remove();
          });
          emitChange();
          emitSelection();
        },
        getAnnotations: function () {
          return annotations.slice();
        },
        getSelected: getSelected,
        updateSelected: function (patch) {
          if (!selectedId) return;
          updateAnnotation(selectedId, patch);
        },
        deleteSelected: deleteSelected,
        setTool: setTool,
        hasTool: hasTool,
        getDefaultFont: function () {
          return defaultFont;
        },
        setDefaultFont: function (font) {
          defaultFont = normalizeFont(font);
        },
        getTool: function () {
          return tool;
        },
        getDefaultRedactFill: function () {
          return defaultRedactFill;
        },
        setDefaultRedactFill: function (hex) {
          defaultRedactFill = safeHex(hex, '#000000');
        },
        beginColorPick: function (callback) {
          if (!pdfDoc) return false;
          pickingColor = true;
          pickCallback = callback;
          overlay.classList.add('is-picking');
          return true;
        },
        detectFillColor: detectFillColor,
        openSignaturePad: openSignaturePad,
        addSignatureFromDataUrl: function (dataUrl) {
          if (!pdfDoc || !dataUrl) return false;
          placeImageOverlay(dataUrl, 'signature');
          return true;
        }
      };
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
