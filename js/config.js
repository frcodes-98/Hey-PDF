(function (global) {
  'use strict';

  var DocForge = global.DocForge || {};

  DocForge.config = {
    brand: 'DocForge',
    tagline: 'Professional PDF tools in your browser',
    maxFileBytes: 100 * 1024 * 1024,
    maxFiles: 40,
    maxPagesWarning: 200,
    croppedSignatureKey: 'docforge-cropped-signature',
    groups: [
      { id: 'organize', label: 'Organize' },
      { id: 'optimize', label: 'Optimize' },
      { id: 'convert', label: 'Convert' }
    ],
    tools: [
      {
        id: 'merge',
        title: 'Merge PDF',
        short: 'Combine PDFs into one file',
        description: 'Join multiple PDF files in any order into a single document.',
        path: 'pages/tools/merge.html',
        group: 'organize',
        accept: '.pdf,application/pdf',
        multiple: true,
        minFiles: 2,
        icon: 'merge',
        related: ['split', 'organize', 'edit']
      },
      {
        id: 'split',
        title: 'Split PDF',
        short: 'Extract pages or ranges',
        description: 'Split a PDF into separate files by page ranges or extract every page.',
        path: 'pages/tools/split.html',
        group: 'organize',
        accept: '.pdf,application/pdf',
        multiple: false,
        minFiles: 1,
        icon: 'split',
        related: ['merge', 'delete-pages', 'edit']
      },
      {
        id: 'organize',
        title: 'Organize pages',
        short: 'Reorder PDF pages',
        description: 'Drag pages into a new order, then download the rearranged PDF.',
        path: 'pages/tools/organize.html',
        group: 'organize',
        accept: '.pdf,application/pdf',
        multiple: false,
        minFiles: 1,
        icon: 'organize',
        related: ['edit', 'rotate', 'delete-pages']
      },
      {
        id: 'delete-pages',
        title: 'Delete pages',
        short: 'Remove unwanted pages',
        description: 'Select pages to remove and download a cleaned-up PDF.',
        path: 'pages/tools/delete-pages.html',
        group: 'organize',
        accept: '.pdf,application/pdf',
        multiple: false,
        minFiles: 1,
        icon: 'delete',
        related: ['split', 'organize', 'edit']
      },
      {
        id: 'rotate',
        title: 'Rotate PDF',
        short: 'Fix page orientation',
        description: 'Rotate all pages or selected pages by 90°, 180°, or 270°.',
        path: 'pages/tools/rotate.html',
        group: 'organize',
        accept: '.pdf,application/pdf',
        multiple: false,
        minFiles: 1,
        icon: 'rotate',
        related: ['sign', 'organize', 'delete-pages']
      },
      {
        id: 'edit',
        title: 'Edit PDF',
        short: 'Annotate pages visually',
        description: 'Add text, tick and cross stamps, images, signatures, highlights, and redactions on a live page preview. Drag to place, then download.',
        path: 'pages/tools/edit.html',
        group: 'organize',
        accept: '.pdf,application/pdf',
        multiple: false,
        minFiles: 1,
        icon: 'edit',
        related: ['sign', 'crop-signature', 'organize']
      },
      {
        id: 'sign',
        title: 'Sign PDF',
        short: 'Draw or stamp a signature',
        description: 'Draw a signature or upload an image, place it on the page, then download.',
        path: 'pages/tools/sign.html',
        group: 'organize',
        accept: '.pdf,application/pdf',
        multiple: false,
        minFiles: 1,
        icon: 'sign',
        related: ['edit', 'crop-signature', 'organize']
      },
      {
        id: 'crop-signature',
        title: 'Crop signature',
        short: 'Cut a signature from a page',
        description: 'Draw a box around a signature, optionally remove the paper background, and download a sharp PNG for Sign PDF.',
        path: 'pages/tools/crop-signature.html',
        group: 'organize',
        accept: '.pdf,application/pdf',
        multiple: false,
        minFiles: 1,
        icon: 'crop',
        related: ['sign', 'edit', 'extract-text']
      },
      {
        id: 'compress',
        title: 'Compress PDF',
        short: 'Reduce file size',
        description: 'Best-effort compression by rewriting the PDF. Results vary by content.',
        path: 'pages/tools/compress.html',
        group: 'optimize',
        accept: '.pdf,application/pdf',
        multiple: false,
        minFiles: 1,
        icon: 'compress',
        related: ['merge', 'pdf-to-images', 'images-to-pdf']
      },
      {
        id: 'pdf-to-images',
        title: 'PDF to Images',
        short: 'Export pages as images',
        description: 'Render each PDF page to PNG or JPEG and download as a ZIP.',
        path: 'pages/tools/pdf-to-images.html',
        group: 'convert',
        accept: '.pdf,application/pdf',
        multiple: false,
        minFiles: 1,
        icon: 'pdf-image',
        related: ['images-to-pdf', 'pdf-to-word', 'extract-text']
      },
      {
        id: 'images-to-pdf',
        title: 'Images to PDF',
        short: 'Build a PDF from images',
        description: 'Combine JPG, PNG, or WebP images into a single PDF document.',
        path: 'pages/tools/images-to-pdf.html',
        group: 'convert',
        accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
        multiple: true,
        minFiles: 1,
        icon: 'image-pdf',
        related: ['pdf-to-images', 'merge', 'compress']
      },
      {
        id: 'extract-text',
        title: 'Extract text',
        short: 'Pull text into Word or TXT',
        description: 'Extract text from a PDF, including scanned pages with in-browser OCR, then download a Word (.docx) or text file.',
        path: 'pages/tools/extract-text.html',
        group: 'convert',
        accept: '.pdf,application/pdf',
        multiple: false,
        minFiles: 1,
        icon: 'text',
        related: ['pdf-to-word', 'pdf-to-excel', 'pdf-to-images']
      },
      {
        id: 'pdf-to-word',
        title: 'PDF to Word',
        short: 'Convert a PDF to .docx',
        description: 'Extract text from a PDF, including scanned pages with OCR, and download a simple Word file. Layout is not preserved.',
        path: 'pages/tools/pdf-to-word.html',
        group: 'convert',
        accept: '.pdf,application/pdf',
        multiple: false,
        minFiles: 1,
        icon: 'word',
        related: ['extract-text', 'pdf-to-excel', 'pdf-to-images']
      },
      {
        id: 'pdf-to-excel',
        title: 'PDF to Excel',
        short: 'Convert a PDF to .xlsx',
        description: 'Pull text into a spreadsheet, grouping aligned values into columns when possible. Scanned pages use in-browser OCR.',
        path: 'pages/tools/pdf-to-excel.html',
        group: 'convert',
        accept: '.pdf,application/pdf',
        multiple: false,
        minFiles: 1,
        icon: 'excel',
        related: ['pdf-to-word', 'extract-text', 'pdf-to-images']
      }
    ]
  };

  DocForge.config.getTool = function (id) {
    return DocForge.config.tools.find(function (t) {
      return t.id === id;
    }) || null;
  };

  DocForge.config.toolsByGroup = function () {
    var map = {};
    DocForge.config.groups.forEach(function (g) {
      map[g.id] = [];
    });
    DocForge.config.tools.forEach(function (t) {
      if (!map[t.group]) map[t.group] = [];
      map[t.group].push(t);
    });
    return map;
  };

  DocForge.config.resolvePath = function (relativeFromRoot, fromFile) {
    var depth = (fromFile || '').split('/').filter(Boolean).length - 1;
    if (depth < 0) depth = 0;
    var prefix = '';
    for (var i = 0; i < depth; i++) prefix += '../';
    return prefix + relativeFromRoot.replace(/^\//, '');
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
