# Tool page contract

Every tool page should follow the same shell and lifecycle.

## HTML shell checklist

- `data-depth="2"` and `data-tool="{id}"` on `<body>`
- Shared header / footer (same markup as other tool pages)
- Breadcrumb: Home / Tools / {Title}
- `#js-dropzone` mount point
- Optional `#js-file-list`, `#js-thumbs`, `#js-editor` (Edit PDF / Sign PDF), `#js-cropper` (Crop signature)
- `#js-progress`, `#js-result`
- `#js-process`, `#js-reset`, optional `#js-process-mobile`
- `[data-related-tools]` container
- `#toast-root`, `#modal-root`

## Edit PDF / Sign PDF

Visual overlays via `js/ui/pdf-editor.js` + `js/pdf/edit.js`. Sign PDF opens the signature pad after a file loads. A cropped PNG from Crop signature can be reused via localStorage (`docforge-cropped-signature`).

## Crop signature

Draw a box on a page preview (`js/ui/page-crop.js`) and download a PNG. This copies pixels; it does not detect signatures.

## Extract text

Uses the PDF.js text layer first. Scanned pages use vendored Tesseract.js (`vendor/tesseract`) for English OCR in the browser. Download as Word (`.docx` via JSZip OOXML), plain text, or a ZIP of both. Word export is simple paragraphs — not PDF layout.

## Lifecycle

1. Accept files (dropzone)
2. Validate (`DocForge.core.validate`)
3. Collect options from the Options panel
4. Process via `DocForge.pdf.*` with progress callbacks
5. Offer download (`DocForge.core.download`)
6. Reset clears `fileStore`, thumbs, progress, and result

## Adding a tool

1. Register in `js/config.js`
2. Copy an existing `pages/tools/*.html` shell
3. Add `js/pdf/{id}.js` and `js/tools/{id}.page.js`
4. Wire scripts in the HTML page
5. Add related tool ids + icon name in `js/ui/icons.js` if needed
