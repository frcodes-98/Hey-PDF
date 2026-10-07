(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.ui = DocForge.ui || {};

  function ensureRoot() {
    var root = document.getElementById('modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'modal-root';
      root.className = 'modal-root';
      root.hidden = true;
      document.body.appendChild(root);
    }
    return root;
  }

  DocForge.ui.modal = {
    confirm: function (options) {
      options = options || {};
      return new Promise(function (resolve) {
        var root = ensureRoot();
        root.hidden = false;
        root.innerHTML =
          '<div class="modal" role="dialog" aria-modal="true">' +
          '<h2 class="modal__title"></h2>' +
          '<p class="modal__body"></p>' +
          '<div class="modal__actions">' +
          '<button type="button" class="btn btn--secondary" data-action="cancel"></button>' +
          '<button type="button" class="btn btn--primary" data-action="ok"></button>' +
          '</div></div>';

        root.querySelector('.modal__title').textContent = options.title || 'Confirm';
        root.querySelector('.modal__body').textContent = options.body || '';
        root.querySelector('[data-action="cancel"]').textContent = options.cancelLabel || 'Cancel';
        var ok = root.querySelector('[data-action="ok"]');
        ok.textContent = options.okLabel || 'Continue';
        if (options.danger) {
          ok.classList.remove('btn--primary');
          ok.classList.add('btn--danger');
        }

        function close(result) {
          root.hidden = true;
          root.innerHTML = '';
          resolve(result);
        }

        root.querySelector('[data-action="cancel"]').onclick = function () {
          close(false);
        };
        ok.onclick = function () {
          close(true);
        };
        root.onclick = function (e) {
          if (e.target === root) close(false);
        };
      });
    },
    signaturePad: function () {
      return new Promise(function (resolve) {
        var root = ensureRoot();
        root.hidden = false;
        root.innerHTML =
          '<div class="modal modal--signature" role="dialog" aria-modal="true" aria-labelledby="js-sign-title">' +
          '<h2 class="modal__title" id="js-sign-title">Draw signature</h2>' +
          '<p class="modal__body">Draw with your pointer or upload an image. This places a picture on the page — it is not a legal electronic signature, and DocForge does not detect signatures already in the PDF.</p>' +
          '<div class="signature-pad">' +
          '<canvas class="signature-pad__canvas" id="js-sign-canvas" aria-label="Signature drawing area"></canvas>' +
          '</div>' +
          '<div class="signature-pad__actions">' +
          '<button type="button" class="btn btn--ghost btn--sm" data-action="clear">Clear</button>' +
          '<button type="button" class="btn btn--secondary btn--sm" data-action="upload">Upload image</button>' +
          '<button type="button" class="btn btn--secondary btn--sm" data-action="cropped" hidden>Use cropped signature</button>' +
          '<input class="u-hidden" id="js-sign-upload" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" />' +
          '</div>' +
          '<div class="modal__actions">' +
          '<button type="button" class="btn btn--secondary" data-action="cancel">Cancel</button>' +
          '<button type="button" class="btn btn--primary" data-action="ok" disabled>Use signature</button>' +
          '</div></div>';

        var canvas = root.querySelector('#js-sign-canvas');
        var upload = root.querySelector('#js-sign-upload');
        var ok = root.querySelector('[data-action="ok"]');
        var drawing = false;
        var dirty = false;
        var last = null;
        var dpr = window.devicePixelRatio || 1;

        function cssSize() {
          return {
            w: canvas.clientWidth || 520,
            h: canvas.clientHeight || 180
          };
        }

        function context() {
          return canvas.getContext('2d');
        }

        function resetSurface() {
          var size = cssSize();
          canvas.width = Math.max(1, Math.round(size.w * dpr));
          canvas.height = Math.max(1, Math.round(size.h * dpr));
          var ctx = context();
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, size.w, size.h);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = '#111827';
          ctx.lineWidth = 2.4;
          dirty = false;
          ok.disabled = true;
        }

        function pointFromEvent(event) {
          var rect = canvas.getBoundingClientRect();
          return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          };
        }

        function markDirty() {
          dirty = true;
          ok.disabled = false;
        }

        function cropDataUrl() {
          var src = context().getImageData(0, 0, canvas.width, canvas.height);
          var data = src.data;
          var w = canvas.width;
          var h = canvas.height;
          var minX = w;
          var minY = h;
          var maxX = 0;
          var maxY = 0;
          var i;
          for (i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 12) {
              var px = (i / 4) % w;
              var py = Math.floor(i / 4 / w);
              if (px < minX) minX = px;
              if (py < minY) minY = py;
              if (px > maxX) maxX = px;
              if (py > maxY) maxY = py;
            }
          }
          if (maxX < minX) return null;
          var pad = Math.round(8 * dpr);
          minX = Math.max(0, minX - pad);
          minY = Math.max(0, minY - pad);
          maxX = Math.min(w - 1, maxX + pad);
          maxY = Math.min(h - 1, maxY + pad);
          var cw = Math.max(1, maxX - minX + 1);
          var ch = Math.max(1, maxY - minY + 1);
          var out = document.createElement('canvas');
          out.width = cw;
          out.height = ch;
          out.getContext('2d').putImageData(context().getImageData(minX, minY, cw, ch), 0, 0);
          return out.toDataURL('image/png');
        }

        function close(result) {
          document.removeEventListener('keydown', onKey);
          root.hidden = true;
          root.innerHTML = '';
          resolve(result);
        }

        function onKey(event) {
          if (event.key === 'Escape') {
            event.preventDefault();
            close(null);
          }
        }

        canvas.addEventListener('pointerdown', function (event) {
          event.preventDefault();
          drawing = true;
          last = pointFromEvent(event);
          var ctx = context();
          ctx.beginPath();
          ctx.fillStyle = '#111827';
          ctx.arc(last.x, last.y, 1.2, 0, Math.PI * 2);
          ctx.fill();
          markDirty();
          try {
            canvas.setPointerCapture(event.pointerId);
          } catch (err) {
            /* synthetic events in some browsers cannot capture */
          }
        });
        canvas.addEventListener('pointermove', function (event) {
          if (!drawing || !last) return;
          var next = pointFromEvent(event);
          var ctx = context();
          ctx.beginPath();
          ctx.moveTo(last.x, last.y);
          ctx.lineTo(next.x, next.y);
          ctx.stroke();
          last = next;
          markDirty();
        });
        canvas.addEventListener('pointerup', function () {
          drawing = false;
          last = null;
        });
        canvas.addEventListener('pointercancel', function () {
          drawing = false;
          last = null;
        });

        root.querySelector('[data-action="clear"]').onclick = function () {
          resetSurface();
        };
        root.querySelector('[data-action="upload"]').onclick = function () {
          upload.click();
        };
        upload.addEventListener('change', function () {
          var file = upload.files && upload.files[0];
          upload.value = '';
          if (!file) return;
          var reader = new FileReader();
          reader.onload = function () {
            var img = new Image();
            img.onload = function () {
              resetSurface();
              var size = cssSize();
              var ratio = Math.min(size.w / (img.naturalWidth || 1), size.h / (img.naturalHeight || 1));
              var dw = (img.naturalWidth || 1) * ratio * 0.92;
              var dh = (img.naturalHeight || 1) * ratio * 0.92;
              context().drawImage(img, (size.w - dw) / 2, (size.h - dh) / 2, dw, dh);
              markDirty();
            };
            img.src = reader.result;
          };
          reader.readAsDataURL(file);
        });
        var croppedBtn = root.querySelector('[data-action="cropped"]');
        var savedCrop =
          DocForge.core.croppedSignature && typeof DocForge.core.croppedSignature.get === 'function'
            ? DocForge.core.croppedSignature.get()
            : '';
        if (croppedBtn && savedCrop) {
          croppedBtn.hidden = false;
          croppedBtn.onclick = function () {
            close(savedCrop);
          };
        }

        root.querySelector('[data-action="cancel"]').onclick = function () {
          close(null);
        };
        ok.onclick = function () {
          if (!dirty) return;
          close(cropDataUrl() || canvas.toDataURL('image/png'));
        };
        root.onclick = function (e) {
          if (e.target === root) close(null);
        };
        document.addEventListener('keydown', onKey);
        resetSurface();
        root.querySelector('[data-action="cancel"]').focus();
      });
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
