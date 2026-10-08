(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.pdf = DocForge.pdf || {};

  function hexToRgb01(hex) {
    hex = String(hex || '#000000').replace('#', '');
    if (hex.length === 3) {
      hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
    }
    var n = parseInt(hex, 16);
    if (!isFinite(n)) n = 0;
    return {
      r: ((n >> 16) & 255) / 255,
      g: ((n >> 8) & 255) / 255,
      b: (n & 255) / 255
    };
  }

  function convertToPdfPoint(viewport, x, y) {
    if (viewport && typeof viewport.convertToPdfPoint === 'function') {
      return viewport.convertToPdfPoint(x, y);
    }
    var m = viewport && viewport.transform;
    if (!m || m.length < 6) {
      var h = (viewport && viewport.height) || 0;
      return [x, h - y];
    }
    var a = m[0];
    var b = m[1];
    var c = m[2];
    var d = m[3];
    var e = m[4];
    var f = m[5];
    var det = a * d - b * c;
    if (!det) return [x, y];
    var ia = d / det;
    var ib = -b / det;
    var ic = -c / det;
    var id = a / det;
    var ie = -(ia * e + ic * f);
    var iff = -(ib * e + id * f);
    return [ia * x + ic * y + ie, ib * x + id * y + iff];
  }

  function visualRectToPdf(ann, viewport) {
    var x1 = ann.x * viewport.width;
    var y1 = ann.y * viewport.height;
    var x2 = (ann.x + ann.w) * viewport.width;
    var y2 = (ann.y + ann.h) * viewport.height;
    var p1 = convertToPdfPoint(viewport, x1, y1);
    var p2 = convertToPdfPoint(viewport, x2, y2);
    var pdfX = Math.min(p1[0], p2[0]);
    var pdfY = Math.min(p1[1], p2[1]);
    return {
      x: pdfX,
      y: pdfY,
      w: Math.abs(p2[0] - p1[0]),
      h: Math.abs(p2[1] - p1[1])
    };
  }

  function visualHeightInPdf(viewport) {
    var a = convertToPdfPoint(viewport, 0, 0);
    var b = convertToPdfPoint(viewport, 0, viewport.height);
    return Math.hypot(b[0] - a[0], b[1] - a[1]) || viewport.height;
  }

  function dataUrlToBytes(dataUrl) {
    var parts = String(dataUrl || '').split(',');
    var binary = atob(parts[1] || '');
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function imageToJpegBytes(dataUrl) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        var ctx = canvas.getContext('2d', { alpha: false });
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(function (blob) {
          if (!blob) {
            reject(new Error('Could not encode image.'));
            return;
          }
          blob.arrayBuffer().then(function (buf) {
            resolve(new Uint8Array(buf));
          });
        }, 'image/jpeg', 0.92);
      };
      img.onerror = function () {
        reject(new Error('Could not read an image overlay.'));
      };
      img.src = dataUrl;
    });
  }

  function embedImage(doc, dataUrl) {
    var mime = (String(dataUrl).match(/^data:([^;]+);/) || [])[1] || '';
    if (mime === 'image/png') {
      return doc.embedPng(dataUrlToBytes(dataUrl));
    }
    if (mime === 'image/jpeg' || mime === 'image/jpg') {
      return doc.embedJpg(dataUrlToBytes(dataUrl));
    }
    return imageToJpegBytes(dataUrl).then(function (bytes) {
      return doc.embedJpg(bytes);
    });
  }

  var FONT_PDF = {
    helvetica: 'Helvetica',
    'helvetica-bold': 'HelveticaBold',
    times: 'TimesRoman',
    'times-bold': 'TimesRomanBold',
    courier: 'Courier',
    'courier-bold': 'CourierBold'
  };

  var FONT_CUSTOM = {
    calibri: 'Carlito-Regular.ttf',
    'calibri-bold': 'Carlito-Bold.ttf',
    cambria: 'Caladea-Regular.ttf',
    'cambria-bold': 'Caladea-Bold.ttf',
    arial: 'Arimo-Regular.ttf',
    'arial-bold': 'Arimo-Bold.ttf',
    'times-new-roman': 'Tinos-Regular.ttf',
    'times-new-roman-bold': 'Tinos-Bold.ttf',
    'courier-new': 'Cousine-Regular.ttf',
    'courier-new-bold': 'Cousine-Bold.ttf',
    georgia: 'Gelasio-Regular.ttf',
    'georgia-bold': 'Gelasio-Bold.ttf',
    'comic-sans': 'ComicNeue-Regular.ttf',
    'comic-sans-bold': 'ComicNeue-Bold.ttf'
  };

  var customFontBytes = {};

  function resolveFontKey(font) {
    if (FONT_CUSTOM[font] || FONT_PDF[font]) return font;
    return 'helvetica';
  }

  function decodeBase64ToBuffer(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    var i;
    for (i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  function looksLikeFont(buf) {
    if (!buf || !buf.byteLength || buf.byteLength < 8) return false;
    var u8 = new Uint8Array(buf);
    return (u8[0] === 0 && u8[1] === 1 && u8[2] === 0 && u8[3] === 0) || String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) === 'wOFF' || String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) === 'OTTO';
  }

  function resolveFontsDir() {
    var scripts = document.getElementsByTagName('script');
    var i;
    for (i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      if (src.indexOf('pdf-lib.min.js') !== -1) {
        return src.replace(/pdf-lib\.min\.js.*$/, 'fonts/');
      }
    }
    return '../../vendor/fonts/';
  }

  function loadFontBytes(filename) {
    if (customFontBytes[filename] && looksLikeFont(customFontBytes[filename])) {
      return Promise.resolve(customFontBytes[filename]);
    }
    var packed = DocForge.embeddedFonts && DocForge.embeddedFonts[filename];
    if (packed) {
      try {
        var embedded = decodeBase64ToBuffer(packed);
        if (looksLikeFont(embedded)) {
          customFontBytes[filename] = embedded;
          return Promise.resolve(embedded);
        }
      } catch (err) {
        /* try fetch next */
      }
    }
    var url = resolveFontsDir() + filename;
    function fromXhr() {
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function () {
          if ((xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) && looksLikeFont(xhr.response)) {
            resolve(xhr.response);
          } else {
            reject(new Error('Could not load font file.'));
          }
        };
        xhr.onerror = function () {
          reject(new Error('Could not load font file.'));
        };
        xhr.send();
      });
    }
    var request =
      typeof fetch === 'function'
        ? fetch(url).then(function (res) {
            if (!res.ok) throw new Error('Could not load font file.');
            return res.arrayBuffer();
          }).then(function (buf) {
            if (!looksLikeFont(buf)) throw new Error('Could not load font file.');
            return buf;
          })
        : fromXhr();
    return request.catch(fromXhr).then(function (buf) {
      customFontBytes[filename] = buf;
      return buf;
    });
  }

  function registerFontkit(outDoc) {
    var kit = global.fontkit;
    if (!kit || typeof outDoc.registerFontkit !== 'function') {
      throw new Error('This font needs the fontkit library to embed in the PDF.');
    }
    outDoc.registerFontkit(kit);
  }

  function embedAnnotationFonts(outDoc, PDFLib, anns) {
    var cache = {};
    var keys = {};
    (anns || []).forEach(function (a) {
      if (a.type === 'text') keys[resolveFontKey(a.font)] = true;
    });
    var names = Object.keys(keys);
    var needsCustom = names.some(function (key) {
      return !!FONT_CUSTOM[key];
    });
    if (needsCustom) {
      registerFontkit(outDoc);
    }
    var chain = Promise.resolve();
    names.forEach(function (key) {
      chain = chain.then(function () {
        if (FONT_CUSTOM[key]) {
          return loadFontBytes(FONT_CUSTOM[key]).then(function (bytes) {
            return outDoc.embedFont(bytes, { subset: true }).then(function (font) {
              cache[key] = { font: font, unicode: true };
            });
          });
        }
        var stdName = FONT_PDF[key] || 'Helvetica';
        return outDoc.embedFont(PDFLib.StandardFonts[stdName]).then(function (font) {
          cache[key] = { font: font, unicode: false };
        });
      });
    });
    return chain.then(function () {
      return cache;
    });
  }

  function drawMark(page, PDFLib, rgb, ann, box) {
    var isTick = ann.type === 'tick';
    var c = hexToRgb01(ann.color || (isTick ? '#1a7f37' : '#c62828'));
    var color = rgb(c.r, c.g, c.b);
    var thickness = Math.max(1.5, Math.min(box.w, box.h) * 0.13);
    var cap = PDFLib.LineCapStyle ? PDFLib.LineCapStyle.Round : undefined;
    var join = PDFLib.LineJoinStyle ? PDFLib.LineJoinStyle.Round : undefined;

    function pt(nx, ny) {
      return {
        x: box.x + nx * box.w,
        y: box.y + (1 - ny) * box.h
      };
    }

    function line(start, end) {
      var opts = {
        start: start,
        end: end,
        thickness: thickness,
        color: color
      };
      if (cap) opts.lineCap = cap;
      if (join) opts.lineJoin = join;
      page.drawLine(opts);
    }

    if (isTick) {
      var mid = pt(0.38, 0.74);
      line(pt(0.14, 0.48), mid);
      line(mid, pt(0.86, 0.18));
    } else {
      line(pt(0.16, 0.16), pt(0.84, 0.84));
      line(pt(0.84, 0.16), pt(0.16, 0.84));
    }
  }

  function toWinAnsi(text) {
    return String(text || '').replace(/[^\t\n\r\u0020-\u007e]/g, '?');
  }

  function drawTextLines(page, font, text, box, size, color, unicode) {
    var lines = String(text || '').split(/\n/);
    var leading = size * 1.25;
    var y = box.y + box.h - size;
    for (var i = 0; i < lines.length; i++) {
      var line = unicode ? String(lines[i] || '') : toWinAnsi(lines[i]);
      if (line) {
        page.drawText(line, {
          x: box.x,
          y: y,
          size: size,
          font: font,
          color: color,
          maxWidth: Math.max(8, box.w)
        });
      }
      y -= leading;
      if (y < box.y - size) break;
    }
  }

  function mapSaveError(err) {
    var msg = (err && err.message) || String(err || '');
    if (/Pages/i.test(msg) && /undefined|cannot read/i.test(msg)) {
      return new Error('Could not read this PDF’s page tree for saving. Re-upload the file and try again.');
    }
    return err;
  }

  function getPdfLibPages(outDoc) {
    if (!outDoc || typeof outDoc.getPages !== 'function') {
      throw new Error('Could not read this PDF for saving. The document catalog looks invalid.');
    }
    try {
      var pages = outDoc.getPages();
      if (!pages || !pages.length) {
        throw new Error('This PDF has no pages to edit.');
      }
      return pages;
    } catch (err) {
      throw mapSaveError(err);
    }
  }

  function destroyJsDoc(jsDoc) {
    if (!jsDoc || typeof jsDoc.destroy !== 'function') return;
    try {
      jsDoc.destroy();
    } catch (err) {
      /* ignore */
    }
  }

  DocForge.pdf.edit = function (bytes, annotations, onProgress) {
    var engine = DocForge.pdf.engine;
    var PDFLib = engine.getPdfLib();
    var rgb = PDFLib.rgb;
    var list = (annotations || []).slice();
    var jsDoc = null;
    var libBytes = engine.copyBytes(bytes);
    var jsBytes = engine.copyBytes(bytes);

    return Promise.all([engine.loadPdfLibDoc(libBytes), engine.loadPdfJsDoc(jsBytes)]).then(function (pair) {
      var outDoc = pair[0];
      jsDoc = pair[1];
      if (!jsDoc || typeof jsDoc.getPage !== 'function') {
        throw new Error('Could not open this PDF for overlay placement.');
      }
      var pages = getPdfLibPages(outDoc);
      return embedAnnotationFonts(outDoc, PDFLib, list).then(function (fontCache) {
        var total = pages.length;
        var chain = Promise.resolve();

        pages.forEach(function (page, index) {
          chain = chain.then(function () {
            var pageNumber = index + 1;
            var anns = list.filter(function (a) {
              return a.page === pageNumber;
            });
            if (!anns.length) {
              if (onProgress) onProgress((index + 1) / total);
              return;
            }
            return jsDoc.getPage(pageNumber).then(function (jsPage) {
              var viewport = jsPage.getViewport({ scale: 1 });
              var visH = visualHeightInPdf(viewport);
              var jobs = Promise.resolve();
              anns.forEach(function (ann) {
                jobs = jobs.then(function () {
                  var box = visualRectToPdf(ann, viewport);
                  if (ann.type === 'highlight' || ann.type === 'redact') {
                    var fill = hexToRgb01(
                      ann.type === 'redact' ? ann.fill || '#000000' : ann.fill || '#f7e26b'
                    );
                    page.drawRectangle({
                      x: box.x,
                      y: box.y,
                      width: box.w,
                      height: box.h,
                      color: rgb(fill.r, fill.g, fill.b),
                      opacity: ann.type === 'redact' ? 1 : ann.opacity == null ? 0.38 : ann.opacity,
                      borderWidth: 0
                    });
                    return;
                  }
                  if (ann.type === 'tick' || ann.type === 'cross') {
                    drawMark(page, PDFLib, rgb, ann, box);
                    return;
                  }
                  if (ann.type === 'text') {
                    var entry = fontCache[resolveFontKey(ann.font)];
                    if (!entry || !entry.font) return;
                    var c = hexToRgb01(ann.color || '#0f1c24');
                    var size = Math.max(3, (ann.fontScale || 0.012) * visH);
                    drawTextLines(page, entry.font, ann.text || '', box, size, rgb(c.r, c.g, c.b), entry.unicode);
                    return;
                  }
                  if ((ann.type === 'image' || ann.type === 'signature') && ann.imageDataUrl) {
                    return embedImage(outDoc, ann.imageDataUrl).then(function (img) {
                      page.drawImage(img, {
                        x: box.x,
                        y: box.y,
                        width: box.w,
                        height: box.h
                      });
                    });
                  }
                });
              });
              return jobs.then(function () {
                if (onProgress) onProgress((index + 1) / total);
              });
            });
          });
        });

        return chain.then(function () {
          destroyJsDoc(jsDoc);
          jsDoc = null;
          return engine.savePdfLibDoc(outDoc);
        });
      });
    }).then(function (blob) {
      return blob;
    }, function (err) {
      destroyJsDoc(jsDoc);
      throw mapSaveError(err);
    });
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
