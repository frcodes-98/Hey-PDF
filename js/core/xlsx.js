(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};
  DocForge.core = DocForge.core || {};

  function xmlEscape(text) {
    return String(text || '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function colName(index) {
    var n = index + 1;
    var s = '';
    while (n > 0) {
      var m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  function safeSheetName(name, index) {
    var cleaned = String(name || 'Sheet' + (index + 1))
      .replace(/[:\\/?*\[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) cleaned = 'Sheet' + (index + 1);
    if (cleaned.length > 31) cleaned = cleaned.slice(0, 31);
    return cleaned;
  }

  function sheetXml(rows) {
    var body = [];
    (rows || []).forEach(function (row, r) {
      var cells = [];
      (row || []).forEach(function (value, c) {
        var text = String(value == null ? '' : value);
        if (!text) return;
        if (text.length > 32767) text = text.slice(0, 32767);
        var ref = colName(c) + String(r + 1);
        cells.push(
          '<c r="' +
            ref +
            '" t="inlineStr"><is><t xml:space="preserve">' +
            xmlEscape(text) +
            '</t></is></c>'
        );
      });
      if (cells.length) {
        body.push('<row r="' + String(r + 1) + '">' + cells.join('') + '</row>');
      }
    });
    if (!body.length) {
      body.push('<row r="1"><c r="A1" t="inlineStr"><is><t>(No extractable text found)</t></is></c></row>');
    }
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetData>' +
      body.join('') +
      '</sheetData></worksheet>'
    );
  }

  DocForge.core.xlsx = {
    fromSheets: function (sheets) {
      if (!global.JSZip) {
        return Promise.reject(new Error('JSZip is not loaded'));
      }
      var list = (sheets || []).length ? sheets : [{ name: 'Sheet1', rows: [['(No extractable text found)']] }];
      var used = {};
      var names = list.map(function (sheet, i) {
        var base = safeSheetName(sheet.name, i);
        var name = base;
        var n = 2;
        while (used[name.toLowerCase()]) {
          var suffix = ' ' + n;
          name = (base.slice(0, Math.max(1, 31 - suffix.length)) + suffix).trim();
          n += 1;
        }
        used[name.toLowerCase()] = true;
        return name;
      });

      var overrides = [
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      ];
      var workbookSheets = [];
      var wbRels = [];
      var zip = new global.JSZip();
      list.forEach(function (sheet, i) {
        var id = 'rId' + (i + 1);
        var path = 'worksheets/sheet' + (i + 1) + '.xml';
        overrides.push(
          '<Override PartName="/xl/' +
            path +
            '" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        );
        workbookSheets.push(
          '<sheet name="' + xmlEscape(names[i]) + '" sheetId="' + String(i + 1) + '" r:id="' + id + '"/>'
        );
        wbRels.push(
          '<Relationship Id="' +
            id +
            '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="' +
            path +
            '"/>'
        );
        zip.folder('xl').folder('worksheets').file('sheet' + (i + 1) + '.xml', sheetXml(sheet.rows));
      });

      zip.file(
        '[Content_Types].xml',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          overrides.join('') +
          '</Types>'
      );
      zip.folder('_rels').file(
        '.rels',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          '</Relationships>'
      );
      zip.folder('xl').file(
        'workbook.xml',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          '<sheets>' +
          workbookSheets.join('') +
          '</sheets></workbook>'
      );
      zip.folder('xl').folder('_rels').file(
        'workbook.xml.rels',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          wbRels.join('') +
          '</Relationships>'
      );
      return zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
