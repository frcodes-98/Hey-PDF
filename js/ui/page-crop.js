(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.ui = DocForge.ui || {};

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function luma(r, g, b) {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) {
          reject(new Error('Could not create a PNG from that crop.'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    });
  }

  function scaleCanvas(source, maxDim) {
    var long = Math.max(source.width, source.height);
    if (!maxDim || long <= maxDim) return source;
    var scale = maxDim / long;
    var out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(source.width * scale));
    out.height = Math.max(1, Math.round(source.height * scale));
    var ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, out.width, out.height);
    return out;
  }

  function samplePaper(data, w, h) {
    var insetX = Math.max(1, Math.floor(w * 0.04));
    var insetY = Math.max(1, Math.floor(h * 0.04));
    var size = Math.max(4, Math.min(10, Math.floor(Math.min(w, h) * 0.08)));
    var regions = [
      [insetX, insetY],
      [Math.max(0, w - insetX - size), insetY],
      [insetX, Math.max(0, h - insetY - size)],
      [Math.max(0, w - insetX - size), Math.max(0, h - insetY - size)]
    ];
    var rs = 0;
    var gs = 0;
    var bs = 0;
    var n = 0;
    regions.forEach(function (p) {
      var y;
      var x;
      for (y = 0; y < size; y++) {
        for (x = 0; x < size; x++) {
          var px = p[0] + x;
          var py = p[1] + y;
          if (px < 0 || py < 0 || px >= w || py >= h) continue;
          var ix = (py * w + px) * 4;
          rs += data[ix];
          gs += data[ix + 1];
          bs += data[ix + 2];
          n += 1;
        }
      }
    });
    if (!n) return { r: 255, g: 255, b: 255 };
    return { r: rs / n, g: gs / n, b: bs / n };
  }

  function trimTransparent(canvas, pad) {
    pad = pad == null ? 8 : pad;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var data = img.data;
    var w = canvas.width;
    var h = canvas.height;
    var minX = w;
    var minY = h;
    var maxX = -1;
    var maxY = -1;
    var i;
    for (i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 10) continue;
      var px = (i / 4) % w;
      var py = Math.floor(i / 4 / w);
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
    if (maxX < minX) return canvas;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad);
    maxY = Math.min(h - 1, maxY + pad);
    var cw = maxX - minX + 1;
    var ch = maxY - minY + 1;
    if (cw >= w && ch >= h) return canvas;
    var out = document.createElement('canvas');
    out.width = cw;
    out.height = ch;
    out.getContext('2d').drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
    return out;
  }

  function removeLightBackground(canvas, strength) {
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var d = img.data;
    var w = canvas.width;
    var h = canvas.height;
    var paper = samplePaper(d, w, h);
    var paperL = luma(paper.r, paper.g, paper.b);
    if (paperL < 88) {
      return { canvas: canvas, applied: false };
    }

    var tSoft = strength === 'strong' ? 16 : 28;
    var tHard = strength === 'strong' ? 58 : 86;
    var i;
    for (i = 0; i < d.length; i += 4) {
      var r = d[i];
      var g = d[i + 1];
      var b = d[i + 2];
      var dr = r - paper.r;
      var dg = g - paper.g;
      var db = b - paper.b;
      var dist = Math.sqrt(dr * dr + dg * dg + db * db);
      var darker = paperL - luma(r, g, b);
      var inkScore = dist * 0.5 + Math.max(0, darker) * 1.25;
      var a;
      if (inkScore <= tSoft) {
        a = 0;
      } else if (inkScore >= tHard) {
        a = 255;
      } else {
        a = Math.round(255 * ((inkScore - tSoft) / (tHard - tSoft)));
      }

      if (a < 4) {
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
        d[i + 3] = 0;
        continue;
      }

      var fa = a / 255;
      d[i] = Math.round(clamp((r - paper.r * (1 - fa)) / fa, 0, 255));
      d[i + 1] = Math.round(clamp((g - paper.g * (1 - fa)) / fa, 0, 255));
      d[i + 2] = Math.round(clamp((b - paper.b * (1 - fa)) / fa, 0, 255));
      d[i + 3] = a;
    }
    ctx.putImageData(img, 0, 0);
    return { canvas: trimTransparent(canvas, 10), applied: true };
  }

  function cloneCanvas(source) {
    var out = document.createElement('canvas');
    out.width = Math.max(1, source.width);
    out.height = Math.max(1, source.height);
    out.getContext('2d').drawImage(source, 0, 0);
    return out;
  }

  function imageHasAlpha(data) {
    var i;
    var n = 0;
    for (i = 3; i < data.length; i += 4) {
      if (data[i] < 245) {
        n += 1;
        if (n > 8) return true;
      }
    }
    return false;
  }

  function buildInkMask(data, w, h, transparent) {
    var ink = new Uint8Array(w * h);
    var i;
    var p;
    if (transparent) {
      for (i = 0, p = 0; i < data.length; i += 4, p++) {
        if (data[i + 3] >= 26) ink[p] = 1;
      }
    } else {
      for (i = 0, p = 0; i < data.length; i += 4, p++) {
        if (data[i + 3] < 20) continue;
        if (luma(data[i], data[i + 1], data[i + 2]) < 158) ink[p] = 1;
      }
    }
    return ink;
  }

  function clearInkPixel(data, i, transparent) {
    if (transparent) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
      return;
    }
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }

  function fadeInkPixel(data, i, factor, transparent) {
    if (factor <= 0.04) {
      clearInkPixel(data, i, transparent);
      return;
    }
    if (transparent) {
      data[i + 3] = Math.round(data[i + 3] * factor);
      if (data[i + 3] < 4) clearInkPixel(data, i, true);
      return;
    }
    var t = 1 - factor;
    data[i] = Math.round(data[i] + (255 - data[i]) * t);
    data[i + 1] = Math.round(data[i + 1] + (255 - data[i + 1]) * t);
    data[i + 2] = Math.round(data[i + 2] + (255 - data[i + 2]) * t);
  }

  function countRowInk(ink, w, h) {
    var count = new Uint32Array(h);
    var minX = new Int32Array(h);
    var maxX = new Int32Array(h);
    var y;
    var x;
    var row;
    for (y = 0; y < h; y++) {
      minX[y] = w;
      maxX[y] = -1;
      row = y * w;
      for (x = 0; x < w; x++) {
        if (!ink[row + x]) continue;
        count[y] += 1;
        if (x < minX[y]) minX[y] = x;
        if (x > maxX[y]) maxX[y] = x;
      }
    }
    return { count: count, minX: minX, maxX: maxX };
  }

  function detectHorizontalLines(ink, w, h, rows) {
    var minSpan = Math.max(20, Math.floor(w * 0.42));
    var minCount = Math.max(12, Math.floor(w * 0.16));
    var isRow = new Uint8Array(h);
    var y;
    for (y = 0; y < h; y++) {
      if (rows.count[y] < minCount) continue;
      if (rows.minX[y] > rows.maxX[y]) continue;
      var span = rows.maxX[y] - rows.minX[y] + 1;
      if (span < minSpan) continue;
      if (rows.count[y] / span < 0.32) continue;
      isRow[y] = 1;
    }

    var maxThick = Math.max(3, Math.min(18, Math.round(Math.min(h * 0.08, Math.max(w, h) * 0.02))));
    var bands = [];
    y = 0;
    while (y < h) {
      if (!isRow[y]) {
        y += 1;
        continue;
      }
      var y0 = y;
      while (
        y + 1 < h &&
        (isRow[y + 1] || (y + 2 < h && isRow[y + 2] && y - y0 + 1 < maxThick))
      ) {
        y += 1;
      }
      var y1 = y;
      y += 1;
      var thick = y1 - y0 + 1;
      if (thick > maxThick) continue;

      var c = 0;
      var sSpan = 0;
      var sFill = 0;
      var n = 0;
      var rmin = w;
      var rmax = -1;
      var yy;
      for (yy = y0; yy <= y1; yy++) {
        if (rows.count[yy] === 0) continue;
        n += 1;
        c += rows.count[yy];
        var sp = rows.maxX[yy] - rows.minX[yy] + 1;
        sSpan += sp;
        sFill += rows.count[yy] / sp;
        if (rows.minX[yy] < rmin) rmin = rows.minX[yy];
        if (rows.maxX[yy] > rmax) rmax = rows.maxX[yy];
      }
      if (!n) continue;
      var meanSpan = sSpan / n;
      if (meanSpan < minSpan) continue;
      var meanFill = sFill / n;
      if (meanFill < 0.38 && meanSpan / w < 0.72) continue;

      var look = Math.max(4, thick * 3);
      var above = 0;
      var below = 0;
      var an = 0;
      var bn = 0;
      for (yy = y0 - look; yy < y0; yy++) {
        if (yy < 0) continue;
        above += rows.count[yy];
        an += 1;
      }
      for (yy = y1 + 1; yy <= y1 + look; yy++) {
        if (yy >= h) continue;
        below += rows.count[yy];
        bn += 1;
      }
      var bandMean = c / n;
      var neigh = ((an ? above / an : 0) + (bn ? below / bn : 0)) / 2;
      if (bandMean < neigh * 1.75 && bandMean < w * 0.32) continue;

      bands.push({
        y0: y0,
        y1: y1,
        thick: thick,
        minX: rmin,
        maxX: rmax,
        score: (meanSpan / w) * meanFill * (bandMean / (neigh + 1)),
        count: c,
        meanFill: meanFill,
        meanSpan: meanSpan
      });
    }
    bands.sort(function (a, b) {
      return b.score - a.score;
    });
    return bands;
  }

  function percentileStart(rowCount, from, to, total, frac) {
    if (total <= 0) return from;
    var need = total * frac;
    var acc = 0;
    var y;
    var step = from <= to ? 1 : -1;
    for (y = from; y !== to + step; y += step) {
      acc += rowCount[y];
      if (acc >= need) return y;
    }
    return to;
  }

  function pickSignatureField(bands, rows, w, h) {
    if (!bands.length) return null;
    var minGap = Math.max(8, Math.round(h * 0.1));
    var topN = bands.slice(0, Math.min(6, bands.length));
    var best = null;
    var bestScore = 0;
    var i;
    var j;
    for (i = 0; i < topN.length; i++) {
      for (j = i + 1; j < topN.length; j++) {
        var a = topN[i].y0 <= topN[j].y0 ? topN[i] : topN[j];
        var b = a === topN[i] ? topN[j] : topN[i];
        var gap = b.y0 - a.y1;
        if (gap < minGap || gap > h * 0.88) continue;
        var between = 0;
        var outside = 0;
        var yy;
        for (yy = 0; yy < h; yy++) {
          if (yy >= a.y0 && yy <= a.y1) continue;
          if (yy >= b.y0 && yy <= b.y1) continue;
          if (yy > a.y1 && yy < b.y0) between += rows.count[yy];
          else outside += rows.count[yy];
        }
        var frac = between / (between + outside + 1);
        var pairScore = frac * (a.score + b.score) * Math.min(1, gap / (h * 0.18));
        if (pairScore > bestScore) {
          bestScore = pairScore;
          best = { top: a, bottom: b, frac: frac };
        }
      }
    }
    if (best && best.frac >= 0.42) {
      return { mode: 'box', top: best.top, bottom: best.bottom };
    }

    var line = bands[0];
    if (line.meanFill < 0.48 || line.meanSpan < w * 0.55) return null;
    var inkAbove = 0;
    var inkBelow = 0;
    var y;
    for (y = 0; y < line.y0; y++) inkAbove += rows.count[y];
    for (y = line.y1 + 1; y < h; y++) inkBelow += rows.count[y];
    if (inkAbove + inkBelow < 24) return null;
    if (inkAbove >= inkBelow * 1.15) {
      return {
        mode: 'above-line',
        bottom: line,
        yTop: percentileStart(rows.count, 0, line.y0 - 1, inkAbove, 0.04)
      };
    }
    if (inkBelow >= inkAbove * 1.15) {
      return {
        mode: 'below-line',
        top: line,
        yBottom: percentileStart(rows.count, h - 1, line.y1 + 1, inkBelow, 0.04)
      };
    }
    return { mode: 'line-only', lines: [line] };
  }

  function detectVerticalLines(ink, w, h, fieldTop, fieldBottom) {
    var y0 = Math.max(0, fieldTop);
    var y1 = Math.min(h - 1, fieldBottom);
    var fieldH = y1 - y0 + 1;
    if (fieldH < 12) return [];
    var minCount = Math.max(8, Math.floor(fieldH * 0.55));
    var maxThick = Math.max(3, Math.min(16, Math.round(Math.min(w * 0.06, Math.max(w, h) * 0.02))));
    var colCount = new Uint32Array(w);
    var x;
    var y;
    for (y = y0; y <= y1; y++) {
      var row = y * w;
      for (x = 0; x < w; x++) {
        if (ink[row + x]) colCount[x] += 1;
      }
    }
    var margin = Math.max(6, Math.floor(w * 0.22));
    var isCol = new Uint8Array(w);
    for (x = 0; x < w; x++) {
      if (x > margin && x < w - 1 - margin) continue;
      if (colCount[x] >= minCount) isCol[x] = 1;
    }
    var bands = [];
    x = 0;
    while (x < w) {
      if (!isCol[x]) {
        x += 1;
        continue;
      }
      var x0 = x;
      while (
        x + 1 < w &&
        (isCol[x + 1] || (x + 2 < w && isCol[x + 2] && x - x0 + 1 < maxThick))
      ) {
        x += 1;
      }
      var x1 = x;
      x += 1;
      var thick = x1 - x0 + 1;
      if (thick > maxThick) continue;
      var c = 0;
      var xx;
      for (xx = x0; xx <= x1; xx++) c += colCount[xx];
      if (c / thick < minCount) continue;
      bands.push({ x0: x0, x1: x1, thick: thick });
    }
    return bands;
  }

  function inHLineBand(y, band) {
    return y >= band.y0 && y <= band.y1;
  }

  function eraseHorizontalLine(data, ink, w, h, band, transparent) {
    var look = Math.max(2, band.thick + 1);
    var x;
    var y;
    var dy;
    for (x = 0; x < w; x++) {
      var hasAbove = false;
      var hasBelow = false;
      for (dy = 1; dy <= look; dy++) {
        var ya = band.y0 - dy;
        var yb = band.y1 + dy;
        if (ya >= 0 && ink[ya * w + x]) hasAbove = true;
        if (yb < h && ink[yb * w + x]) hasBelow = true;
      }
      var yStart = Math.max(0, band.y0 - look);
      var yEnd = Math.min(h - 1, band.y1 + look);
      var run = 0;
      var bestRun = 0;
      var inRun = false;
      for (y = yStart; y <= yEnd; y++) {
        if (ink[y * w + x]) {
          if (!inRun) {
            inRun = true;
            run = 1;
          } else {
            run += 1;
          }
          if (run > bestRun) bestRun = run;
        } else {
          inRun = false;
          run = 0;
        }
      }
      if (bestRun > band.thick + 2) continue;
      if (hasAbove || hasBelow) continue;
      for (y = band.y0; y <= band.y1; y++) {
        var p = y * w + x;
        if (!ink[p]) continue;
        clearInkPixel(data, p * 4, transparent);
        ink[p] = 0;
      }
    }
  }

  function eraseVerticalLine(data, ink, w, h, band, y0, y1, transparent) {
    var look = Math.max(2, band.thick + 1);
    var y;
    var x;
    var dx;
    for (y = y0; y <= y1; y++) {
      var hasLeft = false;
      var hasRight = false;
      for (dx = 1; dx <= look; dx++) {
        var xl = band.x0 - dx;
        var xr = band.x1 + dx;
        if (xl >= 0 && ink[y * w + xl]) hasLeft = true;
        if (xr < w && ink[y * w + xr]) hasRight = true;
      }
      var xStart = Math.max(0, band.x0 - look);
      var xEnd = Math.min(w - 1, band.x1 + look);
      var run = 0;
      var bestRun = 0;
      var inRun = false;
      for (x = xStart; x <= xEnd; x++) {
        if (ink[y * w + x]) {
          if (!inRun) {
            inRun = true;
            run = 1;
          } else {
            run += 1;
          }
          if (run > bestRun) bestRun = run;
        } else {
          inRun = false;
          run = 0;
        }
      }
      if (bestRun > band.thick + 2) continue;
      if (hasLeft || hasRight) continue;
      for (x = band.x0; x <= band.x1; x++) {
        var p = y * w + x;
        if (!ink[p]) continue;
        clearInkPixel(data, p * 4, transparent);
        ink[p] = 0;
      }
    }
  }

  function labelComponents(ink, w, h) {
    var labels = new Int32Array(w * h);
    var comps = [];
    var stack = new Int32Array(w * h);
    var i;
    for (i = 0; i < ink.length; i++) {
      if (!ink[i] || labels[i]) continue;
      var id = comps.length + 1;
      var sp = 0;
      stack[sp++] = i;
      labels[i] = id;
      var count = 0;
      var minX = w;
      var minY = h;
      var maxX = -1;
      var maxY = -1;
      var sumX = 0;
      var sumY = 0;
      while (sp) {
        var idx = stack[--sp];
        var x = idx % w;
        var y = (idx - x) / w;
        count += 1;
        sumX += x;
        sumY += y;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        var dy;
        var dx;
        for (dy = -1; dy <= 1; dy++) {
          for (dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            var nx = x + dx;
            var ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            var nidx = ny * w + nx;
            if (!ink[nidx] || labels[nidx]) continue;
            labels[nidx] = id;
            stack[sp++] = nidx;
          }
        }
      }
      comps.push({
        id: id,
        count: count,
        minX: minX,
        minY: minY,
        maxX: maxX,
        maxY: maxY,
        cx: sumX / count,
        cy: sumY / count
      });
    }
    return { labels: labels, comps: comps };
  }

  function componentInsideCount(labels, id, w, h, field) {
    var n = 0;
    var i;
    var x;
    var y;
    for (i = 0; i < labels.length; i++) {
      if (labels[i] !== id) continue;
      x = i % w;
      y = (i - x) / w;
      if (y >= field.keepTop && y <= field.keepBottom && x >= field.keepLeft && x <= field.keepRight) {
        n += 1;
      }
    }
    return n;
  }

  function clipToSignatureBox(canvas) {
    var w = canvas.width;
    var h = canvas.height;
    if (w < 24 || h < 16) return null;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var img = ctx.getImageData(0, 0, w, h);
    var data = img.data;
    var transparent = imageHasAlpha(data);
    var ink = buildInkMask(data, w, h, transparent);
    var rows = countRowInk(ink, w, h);
    var bands = detectHorizontalLines(ink, w, h, rows);
    var picked = pickSignatureField(bands, rows, w, h);
    if (!picked) return null;

    var inward;
    var fieldTop;
    var fieldBottom;
    var hLines = [];
    var clipOpen = false;
    if (picked.mode === 'box') {
      inward = Math.max(1, Math.round(((picked.top.thick + picked.bottom.thick) / 2) * 0.45));
      fieldTop = picked.top.y1 + inward;
      fieldBottom = picked.bottom.y0 - inward;
      hLines = [picked.top, picked.bottom];
    } else if (picked.mode === 'above-line') {
      inward = Math.max(1, Math.round(picked.bottom.thick * 0.45));
      fieldTop = 0;
      fieldBottom = picked.bottom.y0 - inward;
      hLines = [picked.bottom];
      clipOpen = true;
    } else if (picked.mode === 'below-line') {
      inward = Math.max(1, Math.round(picked.top.thick * 0.45));
      fieldTop = picked.top.y1 + inward;
      fieldBottom = h - 1;
      hLines = [picked.top];
      clipOpen = true;
    } else {
      hLines = picked.lines || [];
      fieldTop = 0;
      fieldBottom = h - 1;
      clipOpen = true;
    }

    if (fieldBottom - fieldTop < Math.max(8, Math.round(h * 0.08))) return null;

    var nearPad = Math.max(3, Math.round(h * (clipOpen ? 0.055 : 0.035)));
    var keepTop = Math.max(0, fieldTop - nearPad);
    var keepBottom = Math.min(h - 1, fieldBottom + nearPad);
    var fieldLeft = 0;
    var fieldRight = w - 1;
    if (picked.mode === 'box') {
      fieldLeft = Math.min(picked.top.minX, picked.bottom.minX);
      fieldRight = Math.max(picked.top.maxX, picked.bottom.maxX);
    } else if (hLines.length) {
      fieldLeft = hLines[0].minX;
      fieldRight = hLines[0].maxX;
    }
    var xPad = Math.max(8, Math.round(w * 0.08));
    var keepLeft = Math.max(0, fieldLeft - xPad);
    var keepRight = Math.min(w - 1, fieldRight + xPad);

    var preSignature = 0;
    var p;
    var y;
    var x;
    for (y = 0; y < h; y++) {
      var onLine = false;
      for (p = 0; p < hLines.length; p++) {
        if (inHLineBand(y, hLines[p])) {
          onLine = true;
          break;
        }
      }
      if (onLine) continue;
      var row = y * w;
      for (x = 0; x < w; x++) {
        if (ink[row + x]) preSignature += 1;
      }
    }
    if (preSignature < 20) return null;

    for (p = 0; p < hLines.length; p++) {
      eraseHorizontalLine(data, ink, w, h, hLines[p], transparent);
    }

    if (picked.mode === 'box') {
      var vLines = detectVerticalLines(ink, w, h, fieldTop, fieldBottom);
      for (p = 0; p < vLines.length; p++) {
        eraseVerticalLine(data, ink, w, h, vLines[p], Math.max(0, fieldTop - 2), Math.min(h - 1, fieldBottom + 2), transparent);
      }
    }

    var labeled = labelComponents(ink, w, h);
    if (!labeled.comps.length) return null;
    var main = labeled.comps[0];
    for (p = 1; p < labeled.comps.length; p++) {
      if (labeled.comps[p].count > main.count) main = labeled.comps[p];
    }

    var field = {
      keepTop: keepTop,
      keepBottom: keepBottom,
      keepLeft: keepLeft,
      keepRight: keepRight
    };
    var drop = new Uint8Array(labeled.comps.length + 1);
    var diag = Math.sqrt(w * w + h * h);
    for (p = 0; p < labeled.comps.length; p++) {
      var comp = labeled.comps[p];
      if (comp.id === main.id) continue;
      var inside = componentInsideCount(labeled.labels, comp.id, w, h, field);
      var frac = inside / comp.count;
      var cxOut = comp.cx < keepLeft || comp.cx > keepRight;
      var cyOut = comp.cy < keepTop || comp.cy > keepBottom;
      var dx = 0;
      if (comp.maxX < main.minX) dx = main.minX - comp.maxX;
      else if (comp.minX > main.maxX) dx = comp.minX - main.maxX;
      var dy = 0;
      if (comp.maxY < main.minY) dy = main.minY - comp.maxY;
      else if (comp.minY > main.maxY) dy = comp.minY - main.maxY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var speck = Math.max(12, Math.round(main.count * 0.015));
      if (comp.count < 8) {
        drop[comp.id] = 1;
        continue;
      }
      if (comp.count < speck && dist > Math.max(18, diag * 0.08)) {
        drop[comp.id] = 1;
        continue;
      }
      if (frac < 0.28 && (cyOut || cxOut)) drop[comp.id] = 1;
    }

    var i;
    var keptMain = 0;
    for (i = 0; i < labeled.labels.length; i++) {
      var id = labeled.labels[i];
      if (!id) continue;
      x = i % w;
      y = (i - x) / w;
      if (drop[id]) {
        clearInkPixel(data, i * 4, transparent);
        continue;
      }
      var distY = 0;
      if (y < keepTop) distY = keepTop - y;
      else if (y > keepBottom) distY = y - keepBottom;
      var distX = 0;
      if (x < keepLeft) distX = keepLeft - x;
      else if (x > keepRight) distX = x - keepRight;
      if (picked.mode !== 'box') distX = 0;
      var distOut = Math.max(distY, distX);
      if (!distOut) {
        if (id === main.id) keptMain += 1;
        continue;
      }
      var fade = 1 - distOut / Math.max(nearPad, 1);
      if (fade < 0) fade = 0;
      if (id === main.id) {
        if (fade <= 0) {
          clearInkPixel(data, i * 4, transparent);
        } else {
          fadeInkPixel(data, i * 4, fade * fade, transparent);
          if (data[i * 4 + 3] >= 8) keptMain += 1;
        }
      } else if (fade < 0.35) {
        clearInkPixel(data, i * 4, transparent);
      } else {
        fadeInkPixel(data, i * 4, fade, transparent);
      }
    }

    if (keptMain < main.count * 0.48) return null;

    var remaining = 0;
    for (i = 3; i < data.length; i += 4) {
      if (transparent) {
        if (data[i] >= 10) remaining += 1;
      } else if (luma(data[i - 3], data[i - 2], data[i - 1]) < 158) {
        remaining += 1;
      }
    }
    if (remaining < Math.max(16, preSignature * 0.42)) return null;

    ctx.putImageData(img, 0, 0);
    return trimTransparent(canvas, 10);
  }

  function applyCropFilters(canvas, opts) {
    opts = opts || {};
    var background = opts.background || 'remove';
    var overflow = opts.overflow || 'clip';
    var applied = applyBackground(canvas, background);
    var out = applied.canvas;
    if (overflow === 'clip') {
      var clipped = clipToSignatureBox(out);
      if (clipped) out = clipped;
    }
    return { canvas: out, transparent: applied.transparent };
  }

  function cropRegion(source, rect) {
    var sx = Math.round(rect.x * source.width);
    var sy = Math.round(rect.y * source.height);
    var sw = Math.max(1, Math.round(rect.w * source.width));
    var sh = Math.max(1, Math.round(rect.h * source.height));
    if (sx + sw > source.width) sw = source.width - sx;
    if (sy + sh > source.height) sh = source.height - sy;
    if (sx < 0) {
      sw += sx;
      sx = 0;
    }
    if (sy < 0) {
      sh += sy;
      sy = 0;
    }
    sw = Math.max(1, sw);
    sh = Math.max(1, sh);
    var out = document.createElement('canvas');
    out.width = sw;
    out.height = sh;
    var octx = out.getContext('2d', { alpha: true, willReadFrequently: true });
    octx.imageSmoothingEnabled = false;
    octx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
    return out;
  }

  function applyBackground(canvas, background) {
    if (background === 'remove' || background === 'strong') {
      var cleaned = removeLightBackground(canvas, background);
      return { canvas: cleaned.canvas, transparent: cleaned.applied };
    }
    return { canvas: canvas, transparent: false };
  }

  function storeSignature(canvas) {
    var caps = [0, 1800, 1400, 1000, 720];
    var lastUrl = '';
    var i;
    for (i = 0; i < caps.length; i++) {
      var src = scaleCanvas(canvas, caps[i] || 0);
      lastUrl = src.toDataURL('image/png');
      if (DocForge.core.croppedSignature && DocForge.core.croppedSignature.set(lastUrl)) {
        return { stored: true, dataUrl: lastUrl };
      }
    }
    return { stored: false, dataUrl: lastUrl };
  }

  DocForge.ui.pageCrop = {
    applyFilters: function (canvas, opts) {
      return applyCropFilters(cloneCanvas(canvas), opts || {});
    },
    mount: function (root, options) {
      options = options || {};
      var canvas = root.querySelector('#js-crop-canvas');
      var overlay = root.querySelector('#js-crop-overlay');
      var box = root.querySelector('#js-crop-box');
      var pageLabel = root.querySelector('#js-crop-page-label');
      var stage = root.querySelector('#js-crop-stage');

      var pdfDoc = null;
      var bytes = null;
      var pageCount = 0;
      var pageNumber = 1;
      var crop = null;
      var drawing = null;
      var rendering = false;
      var previewSource = null;
      var previewSourcePage = 0;
      var previewSourcePromise = null;
      var previewSourceGen = 0;
      var PREVIEW_MAX_WIDTH = 1400;

      function emitCrop(meta) {
        if (typeof options.onCropChange === 'function') options.onCropChange(crop, meta || {});
      }

      function invalidatePreviewSource() {
        previewSource = null;
        previewSourcePage = 0;
        previewSourcePromise = null;
        previewSourceGen += 1;
      }

      function ensurePreviewSource() {
        if (!pdfDoc) return Promise.reject(new Error('Open a PDF first.'));
        if (previewSource && previewSourcePage === pageNumber) {
          return Promise.resolve(previewSource);
        }
        if (previewSourcePromise) return previewSourcePromise;
        var targetPage = pageNumber;
        var gen = previewSourceGen;
        var hi = document.createElement('canvas');
        previewSourcePromise = DocForge.pdf.engine
          .renderPageToCanvas(pdfDoc, targetPage, hi, PREVIEW_MAX_WIDTH)
          .then(function () {
            if (gen !== previewSourceGen) {
              previewSourcePromise = null;
              if (!pdfDoc) throw new Error('Open a PDF first.');
              return ensurePreviewSource();
            }
            previewSource = hi;
            previewSourcePage = targetPage;
            previewSourcePromise = null;
            return hi;
          })
          .catch(function (err) {
            if (gen === previewSourceGen) previewSourcePromise = null;
            throw err;
          });
        return previewSourcePromise;
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

      function normalizeRect(a, b) {
        var x1 = Math.min(a.x, b.x);
        var y1 = Math.min(a.y, b.y);
        var x2 = Math.max(a.x, b.x);
        var y2 = Math.max(a.y, b.y);
        return {
          x: x1,
          y: y1,
          w: x2 - x1,
          h: y2 - y1
        };
      }

      function paintBox(rect) {
        if (!box) return;
        if (!rect || rect.w < 0.004 || rect.h < 0.004) {
          box.hidden = true;
          return;
        }
        box.hidden = false;
        box.style.left = rect.x * 100 + '%';
        box.style.top = rect.y * 100 + '%';
        box.style.width = rect.w * 100 + '%';
        box.style.height = rect.h * 100 + '%';
      }

      function updatePageLabel() {
        if (pageLabel) pageLabel.textContent = pageNumber + ' / ' + (pageCount || 1);
      }

      function renderPage() {
        if (!pdfDoc || rendering) return Promise.resolve();
        rendering = true;
        var width = (stage && stage.clientWidth) || 720;
        return DocForge.pdf.engine
          .renderPageToCanvas(pdfDoc, pageNumber, canvas, Math.max(480, Math.min(960, width - 48)))
          .then(function () {
            updatePageLabel();
            paintBox(crop);
            ensurePreviewSource().catch(function () {
              /* preview cache is optional until a crop exists */
            });
          })
          .finally(function () {
            rendering = false;
          });
      }

      function setPage(next) {
        if (!pdfDoc) return;
        pageNumber = clamp(next, 1, pageCount);
        crop = null;
        invalidatePreviewSource();
        paintBox(null);
        emitCrop();
        return renderPage();
      }

      overlay.addEventListener('pointerdown', function (event) {
        if (!pdfDoc) return;
        event.preventDefault();
        drawing = clientToNorm(event.clientX, event.clientY);
        crop = null;
        paintBox(null);
        emitCrop();
        try {
          overlay.setPointerCapture(event.pointerId);
        } catch (err) {
          /* ignore */
        }
      });
      overlay.addEventListener('pointermove', function (event) {
        if (!drawing) return;
        var live = normalizeRect(drawing, clientToNorm(event.clientX, event.clientY));
        paintBox(live);
        if (live.w >= 0.012 && live.h >= 0.008) {
          crop = live;
          emitCrop({ dragging: true });
        }
      });
      overlay.addEventListener('pointerup', function (event) {
        if (!drawing) return;
        var next = normalizeRect(drawing, clientToNorm(event.clientX, event.clientY));
        drawing = null;
        if (next.w < 0.012 || next.h < 0.008) {
          crop = null;
          paintBox(null);
        } else {
          crop = next;
          paintBox(crop);
        }
        emitCrop();
      });
      overlay.addEventListener('pointercancel', function () {
        drawing = null;
        paintBox(crop);
        emitCrop();
      });

      var prevBtn = root.querySelector('#js-crop-prev');
      var nextBtn = root.querySelector('#js-crop-next');
      if (prevBtn) {
        prevBtn.addEventListener('click', function () {
          setPage(pageNumber - 1);
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', function () {
          setPage(pageNumber + 1);
        });
      }

      var resizeTimer = null;
      if (typeof ResizeObserver !== 'undefined' && stage) {
        new ResizeObserver(function () {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(renderPage, 120);
        }).observe(stage);
      }

      return {
        load: function (pdfBytes) {
          bytes = DocForge.pdf.engine.copyBytes(pdfBytes);
          crop = null;
          pageNumber = 1;
          invalidatePreviewSource();
          paintBox(null);
          emitCrop();
          if (pdfDoc) {
            pdfDoc.destroy();
            pdfDoc = null;
          }
          return DocForge.pdf.engine.loadPdfJsDoc(bytes).then(function (doc) {
            pdfDoc = doc;
            pageCount = doc.numPages;
            root.hidden = false;
            return renderPage();
          });
        },
        clear: function () {
          invalidatePreviewSource();
          if (pdfDoc) {
            pdfDoc.destroy();
            pdfDoc = null;
          }
          bytes = null;
          crop = null;
          pageCount = 0;
          pageNumber = 1;
          root.hidden = true;
          paintBox(null);
          emitCrop();
        },
        hasCrop: function () {
          return !!(crop && crop.w > 0 && crop.h > 0);
        },
        cropToPng: function (opts) {
          opts = opts || {};
          if (!bytes || !crop) {
            return Promise.reject(new Error('Draw a box around the signature first.'));
          }
          var src = DocForge.pdf.engine.copyBytes(bytes);
          var rect = { x: crop.x, y: crop.y, w: crop.w, h: crop.h };
          var page = pageNumber;
          var background = opts.background || 'remove';
          var overflow = opts.overflow || 'clip';
          return DocForge.pdf.engine.loadPdfJsDoc(src).then(function (doc) {
            return doc.getPage(page).then(function (pdfPage) {
              var base = pdfPage.getViewport({ scale: 1 });
              var cropLongPts = Math.max(rect.w * base.width, rect.h * base.height);
              var scale = 2200 / Math.max(cropLongPts, 1);
              if (scale < 4) scale = 4;
              if (scale > 8) scale = 8;
              var maxWidth = Math.round(base.width * scale);
              if (maxWidth > 3200) maxWidth = 3200;
              if (maxWidth < 1200) maxWidth = 1200;
              var hi = document.createElement('canvas');
              return DocForge.pdf.engine.renderPageToCanvas(doc, page, hi, maxWidth).then(function () {
                doc.destroy();
                var applied = applyCropFilters(cropRegion(hi, rect), {
                  background: background,
                  overflow: overflow
                });
                var out = applied.canvas;
                return canvasToBlob(out).then(function (blob) {
                  var stored = storeSignature(out);
                  return {
                    blob: blob,
                    dataUrl: stored.dataUrl,
                    stored: stored.stored,
                    width: out.width,
                    height: out.height,
                    transparent: applied.transparent
                  };
                });
              });
            });
          });
        },
        previewPng: function (opts) {
          opts = opts || {};
          if (!pdfDoc || !crop) {
            return Promise.reject(new Error('Draw a box around the signature first.'));
          }
          var rect = { x: crop.x, y: crop.y, w: crop.w, h: crop.h };
          var background = opts.background || 'remove';
          var overflow = opts.overflow || 'clip';
          return ensurePreviewSource().then(function (source) {
            var applied = applyCropFilters(cropRegion(source, rect), {
              background: background,
              overflow: overflow
            });
            var out = applied.canvas;
            return canvasToBlob(out).then(function (blob) {
              return {
                blob: blob,
                width: out.width,
                height: out.height,
                transparent: applied.transparent
              };
            });
          });
        }
      };
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
