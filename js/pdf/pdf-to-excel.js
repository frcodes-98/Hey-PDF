(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.pdf = DocForge.pdf || {};

  function median(values) {
    if (!values.length) return 0;
    var sorted = values.slice().sort(function (a, b) {
      return a - b;
    });
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function itemsFromContent(content) {
    return (content.items || [])
      .map(function (item) {
        var t = item.transform || [1, 0, 0, 1, 0, 0];
        return {
          str: String(item.str || '').replace(/\s+/g, ' ').trim(),
          x: t[4] || 0,
          y: t[5] || 0,
          w: item.width || 0,
          h: item.height || Math.abs(t[3]) || 10
        };
      })
      .filter(function (item) {
        return item.str;
      });
  }

  function clusterToRows(items) {
    var list = items.slice().sort(function (a, b) {
      return b.y - a.y || a.x - b.x;
    });
    var rowTol = Math.max(4, median(list.map(function (i) { return i.h; })) * 0.65);
    var rows = [];
    list.forEach(function (item) {
      var last = rows[rows.length - 1];
      if (last && Math.abs(last[0].y - item.y) <= rowTol) {
        last.push(item);
      } else {
        rows.push([item]);
      }
    });
    rows.forEach(function (row) {
      row.sort(function (a, b) {
        return a.x - b.x;
      });
    });
    return rows;
  }

  function columnCenters(rows) {
    var xs = [];
    rows.forEach(function (row) {
      row.forEach(function (item) {
        xs.push(item.x);
      });
    });
    xs.sort(function (a, b) {
      return a - b;
    });
    var widths = [];
    rows.forEach(function (row) {
      row.forEach(function (item) {
        if (item.w) widths.push(item.w);
      });
    });
    var colTol = Math.max(10, median(widths.length ? widths : [24]) * 0.85);
    var cols = [];
    xs.forEach(function (x) {
      var last = cols[cols.length - 1];
      if (!last || x - last.center > colTol) {
        cols.push({ center: x, n: 1 });
      } else {
        last.center = (last.center * last.n + x) / (last.n + 1);
        last.n += 1;
      }
    });
    return cols;
  }

  function nearestCol(cols, x) {
    var best = 0;
    var dist = Infinity;
    cols.forEach(function (col, i) {
      var d = Math.abs(col.center - x);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    return best;
  }

  function rowsToGrid(rows) {
    if (!rows.length) return [['(No extractable text found)']];
    var cols = columnCenters(rows);
    if (cols.length <= 1) {
      return rows.map(function (row) {
        return [
          row
            .map(function (item) {
              return item.str;
            })
            .join(' ')
        ];
      });
    }
    return rows.map(function (row) {
      var cells = [];
      var i;
      for (i = 0; i < cols.length; i++) cells[i] = '';
      row.forEach(function (item) {
        var c = nearestCol(cols, item.x);
        cells[c] = cells[c] ? cells[c] + ' ' + item.str : item.str;
      });
      return cells;
    });
  }

  function linesToGrid(text) {
    var lines = String(text || '')
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);
    if (!lines.length) return [['(No extractable text found)']];
    return lines.map(function (line) {
      return [line];
    });
  }

  DocForge.pdf.pdfToExcel = function (bytes, options, onProgress) {
    options = options || {};
    var mode = options.mode || 'auto';
    var engine = DocForge.pdf.engine;
    return engine.loadPdfJsDoc(engine.copyBytes(bytes)).then(function (pdfDoc) {
      var total = pdfDoc.numPages;
      var sheets = [];
      var ocrPages = 0;
      var chain = Promise.resolve();

      for (var i = 1; i <= total; i++) {
        (function (pageNumber) {
          chain = chain.then(function () {
            return pdfDoc.getPage(pageNumber).then(function (page) {
              return page.getTextContent().then(function (content) {
                var items = itemsFromContent(content);
                var empty = items.length < 3;
                var needOcr = mode === 'ocr' || (mode === 'auto' && empty);
                if (!needOcr) {
                  sheets.push({ name: 'Page ' + pageNumber, rows: rowsToGrid(clusterToRows(items)) });
                  if (onProgress) onProgress(pageNumber / total, 'Reading page ' + pageNumber);
                  return;
                }
                if (onProgress) onProgress((pageNumber - 0.5) / total, 'OCR page ' + pageNumber + '…');
                if (!DocForge.pdf.ocr || typeof DocForge.pdf.ocr.recognizePage !== 'function') {
                  sheets.push({
                    name: 'Page ' + pageNumber,
                    rows: items.length ? rowsToGrid(clusterToRows(items)) : [['(No extractable text found)']]
                  });
                  return;
                }
                return DocForge.pdf.ocr
                  .recognizePage(pdfDoc, pageNumber)
                  .then(function (ocrText) {
                    ocrPages += 1;
                    sheets.push({ name: 'Page ' + pageNumber, rows: linesToGrid(ocrText) });
                    if (onProgress) onProgress(pageNumber / total, 'Finished page ' + pageNumber);
                  })
                  .catch(function () {
                    sheets.push({
                      name: 'Page ' + pageNumber,
                      rows: items.length ? rowsToGrid(clusterToRows(items)) : [['(OCR could not read this scanned page)']]
                    });
                    if (onProgress) onProgress(pageNumber / total, 'Finished page ' + pageNumber);
                  });
              });
            });
          });
        })(i);
      }

      return chain.then(function () {
        pdfDoc.destroy();
        return DocForge.core.xlsx.fromSheets(sheets).then(function (blob) {
          return { blob: blob, sheets: sheets, ocrPages: ocrPages };
        });
      });
    });
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
