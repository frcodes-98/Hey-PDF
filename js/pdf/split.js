(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.pdf = DocForge.pdf || {};

  function parseRanges(spec, pageCount) {
    var pages = [];
    var seen = {};
    String(spec || '')
      .split(',')
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean)
      .forEach(function (part) {
        if (part.indexOf('-') !== -1) {
          var ends = part.split('-');
          var start = parseInt(ends[0], 10);
          var end = parseInt(ends[1], 10);
          if (!isFinite(start) || !isFinite(end)) return;
          if (start > end) {
            var tmp = start;
            start = end;
            end = tmp;
          }
          for (var i = start; i <= end; i++) {
            if (i >= 1 && i <= pageCount && !seen[i]) {
              seen[i] = true;
              pages.push(i);
            }
          }
        } else {
          var n = parseInt(part, 10);
          if (n >= 1 && n <= pageCount && !seen[n]) {
            seen[n] = true;
            pages.push(n);
          }
        }
      });
    return pages;
  }

  DocForge.pdf.split = {
    parseRanges: parseRanges,
    extractPages: function (bytes, pageNumbers, onProgress) {
      var engine = DocForge.pdf.engine;
      return engine.loadPdfLibDoc(bytes).then(function (src) {
        return engine.createPdfLibDoc().then(function (outDoc) {
          var zeroBased = pageNumbers.map(function (n) {
            return n - 1;
          });
          return outDoc.copyPages(src, zeroBased).then(function (pages) {
            pages.forEach(function (p, i) {
              outDoc.addPage(p);
              if (onProgress) onProgress((i + 1) / pages.length);
            });
            return engine.savePdfLibDoc(outDoc);
          });
        });
      });
    },
    everyPage: function (bytes, onProgress) {
      var engine = DocForge.pdf.engine;
      return engine.loadPdfLibDoc(bytes).then(function (src) {
        var indices = src.getPageIndices();
        var outputs = [];
        var chain = Promise.resolve();
        indices.forEach(function (index) {
          chain = chain.then(function () {
            return engine.createPdfLibDoc().then(function (outDoc) {
              return outDoc.copyPages(src, [index]).then(function (pages) {
                outDoc.addPage(pages[0]);
                return engine.savePdfLibDoc(outDoc).then(function (blob) {
                  outputs.push({
                    name: 'page-' + String(index + 1).padStart(3, '0') + '.pdf',
                    data: blob
                  });
                  if (onProgress) onProgress((index + 1) / indices.length);
                });
              });
            });
          });
        });
        return chain.then(function () {
          return outputs;
        });
      });
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
