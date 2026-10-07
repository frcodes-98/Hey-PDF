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

  function paragraph(text, heading) {
    var t = xmlEscape(text).replace(/\r/g, '');
    if (!t) {
      return '<w:p/>';
    }
    var runProps = heading
      ? '<w:rPr><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>'
      : '<w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>';
    return (
      '<w:p><w:r>' +
      runProps +
      '<w:t xml:space="preserve">' +
      t +
      '</w:t></w:r></w:p>'
    );
  }

  function bodyXml(text) {
    var blocks = String(text || '').replace(/\r\n/g, '\n').split('\n');
    var parts = [];
    blocks.forEach(function (line) {
      var heading = /^---\s*Page\s+\d+\s*---$/i.test(line.trim());
      parts.push(paragraph(heading ? line.trim() : line, heading));
    });
    if (!parts.length) parts.push(paragraph('(No extractable text found)', false));
    return parts.join('');
  }

  var CONTENT_TYPES =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>';

  var RELS =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>';

  var DOC_RELS =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';

  DocForge.core.docx = {
    fromText: function (text) {
      if (!global.JSZip) {
        return Promise.reject(new Error('JSZip is not loaded'));
      }
      var documentXml =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:body>' +
        bodyXml(text) +
        '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>' +
        '</w:body></w:document>';
      var zip = new global.JSZip();
      zip.file('[Content_Types].xml', CONTENT_TYPES);
      zip.folder('_rels').file('.rels', RELS);
      zip.folder('word').file('document.xml', documentXml);
      zip.folder('word/_rels').file('document.xml.rels', DOC_RELS);
      return zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
