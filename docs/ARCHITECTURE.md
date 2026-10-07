# DocForge Architecture

DocForge is a static, browser-only document toolkit. Open `index.html` — no backend, npm, or build step.

## Layers

1. **Presentation** — HTML pages, CSS, `js/ui/*`
2. **Application** — `js/tools/tool-page.js` + `*.page.js`
3. **Domain** — `js/pdf/*` operations behind `pdf-engine.js`
4. **Platform** — `js/core/*`, `vendor/*`, optional `workers/*`

## Conventions

- Global namespace: `window.DocForge`
- Tool registry lives in `js/config.js` and drives home grid, menus, and related tools
- Classic `<script>` tags in dependency order (no ES modules required)
- Vendored UMD builds in `/vendor`

## MVP tools

Organize: Merge, Split, Organize, Delete pages, Rotate, Edit PDF (visual overlays), Sign PDF, Crop signature  
Optimize: Compress (best-effort page re-encode)  
Convert: PDF → Images, Images → PDF, Extract text, PDF → Word, PDF → Excel (text layer + in-browser OCR; Word/Excel are not layout-faithful)

## Privacy

All processing runs in the browser. Theme preference and an optional cropped-signature PNG may be stored in `localStorage`.
