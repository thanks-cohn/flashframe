# Everyday utilities — Part 2 capability report

FrameChute continues to use the Part 1 selection, action registry, result-object, native Save As, and FCX persistence paths. All processing remains in the browser; capture permissions are requested only after a capture button is pressed.

## Added in Part 2

- Document text extraction (DOCX, text, and currently rendered selectable PDF text), word-level comparison, scoped find/replace, and practical text/DOCX/PDF conversion.
- CSV column splitting/merging with preview, whitespace/capitalization cleanup, blank-row removal, and SVG quick charts as first-class image objects.
- Permission-gated screen screenshots, screen recording, and microphone recording. Results are inserted before saving.
- Frameless and header-hidden video Grab affordance, bottom-right resize handle, and focused Space/Left/Right playback controls.

## Honest 50-action status

✅ 1–6 rename, batch rename, duplicate, copy to, ZIP, strip image metadata.  
⏸ 7 background removal: no suitably small packaged local segmentation model; no remote substitute.  
✅ 8–18 image transparency, trim, background, straighten, perspective, privacy region, annotate, stitch, contact sheet, icons, compare. Comparison is opacity-based.  
🟡 19 PDF forms: existing field appearance editing only; no new universal AcroForm designer.  
⏸ 20–22 signature, annotation, secure redaction: not presented as complete; secure arbitrary PDF stream removal needs a future packaged backend.  
✅ 23–26 crop, conservative compression, page-number/watermark PDF generation.  
⏸ 27 encrypted PDF: pdf-lib does not provide standards-compatible encryption.  
🟡 28 text extraction: DOCX/text and selectable PDF text; scanned PDFs require a future packaged OCR model.  
✅ 29–30 document comparison and DOCX/text find/replace.  
🟡 31 DOCX ↔ PDF: local, editable text-oriented conversion; complex Word/PDF layout is intentionally not promised.  
🟡 32 HTML/Markdown text can convert through the text object; RTF parsing is not shipped.  
✅ 33 media trim from Part 1.  
⏸ 34–42 advanced media transcode/subtitle workflows: native playback remains available, but no large WASM codec bundle is shipped and extensions are never relabeled as conversions.  
✅ 43–47 duplicate rows, split/merge columns, cleanup, CSV merge, SVG chart.  
✅ 48 screen capture to image object.  
⏸ 49 OCR: no remote upload and no misleading browser-only heuristic.  
✅ 50 permission-gated screen and microphone recording to media objects.

XLSX/ODS round-trip remains deferred rather than destructively regenerating unsupported workbook structures. Password protection, OCR, background segmentation, and non-native codecs expose no fake actions.
