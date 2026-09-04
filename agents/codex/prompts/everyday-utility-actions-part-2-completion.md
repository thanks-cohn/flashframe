# Codex Request: Framechute Everyday Utility Layer — Part 2 of 2

## Mission

Complete the second half of Framechute's everyday utility program **after Part 1 has landed successfully**.

Part 1 request:

`agents/codex/prompts/everyday-utility-actions-part-1-foundation.md`

Do not begin this request from the old pre-Part-1 architecture. Before implementing, inspect `main` as it exists after Part 1 and reuse the selection model, action registry, Quick Actions UI, native Save As helpers, result-object creation, batch orchestration, progress/error handling, and operation modules introduced there.

The Part 2 design principle remains:

> **Select the thing. Do the obvious thing. Save the result.**

The point of Part 2 is not to create another layer of bespoke mini-apps. It is to prove that the Part 1 substrate scales naturally across documents, media, tables, capture, and extraction.

---

# Preconditions

Only start this run once Part 1 is merged or otherwise available in the branch.

First verify that Part 1 provides working versions of the following shared capabilities:

- single + multi-object selection
- action/capability registry
- contextual Quick Actions UI
- result objects on the Framechute substrate
- safe Save As/export helpers
- batch action orchestration/progress
- image transform/export primitives
- PDF page primitives
- CSV/table object
- archive/ZIP foundation
- Extract Frame workflow

If one of these is incomplete, fix the shared primitive rather than creating a second special-case path.

Preserve Manifest V3 / Chrome Web Store constraints. No remote executable code. Do not upload user files to a service merely to implement a utility.

---

# Part 2 scope

Part 2 completes the 50-action utility program and fills the remaining obvious everyday-computing gaps.

## A. Image intelligence / cleanup

### A1. Remove image background

Provide a local/on-device implementation if a packaged dependency/model of reasonable size and license can support it reliably.

Requirements:

- result becomes a normal transparent Framechute image object
- original remains intact
- user can immediately Crop / Resize / Replace Background / Save As
- visible progress for model initialization/inference

If a robust packaged local implementation would make the Chrome Web Store package unreasonable, do not substitute a remote upload. Instead ship a clearly bounded local heuristic only if useful, or leave the capability explicitly unavailable with architecture ready for a future packaged model. Do not fake quality.

### A2. Improve image comparison if Part 1 shipped only a basic version

Add a difference view when inexpensive and useful.

---

## B. PDF/document workflow actions

Build these on top of the merged PDF/DOCX native editing system and Part 1 action architecture.

### B1. Fill existing PDF forms

Detect AcroForm fields where supported and expose normal controls for:

- text fields
- checkbox
- radio
- dropdown/list

Persist values into the saved PDF.

Do not flatten by default unless required for compatibility; if flattening is offered, make it explicit.

### B2. Sign a PDF/document

Implement a simple visual signature workflow:

- draw signature locally and/or import an image
- place/resize signature on PDF page
- preserve as an editable Framechute overlay until Save As
- bake into the exported PDF

This is a visual signature/stamp workflow, not a claim of cryptographic digital-signature support.

Make that distinction clear.

### B3. Highlight and comment

Provide basic PDF annotation workflow:

- highlight selected/marked region
- text comment/note

Where native PDF annotation structures are practical, use them; otherwise preserve via Framechute edit model and export visible annotations reliably.

### B4. Proper redaction

This must **not** be a black rectangle that leaves original text extractable beneath it.

Provide a redaction workflow that, on final export, actually removes or irreversibly obscures the redacted content as robustly as the chosen PDF library permits.

If full structural content removal cannot be guaranteed for a PDF object stream, provide an explicit rasterized-redaction export mode with warning about the tradeoff rather than falsely claiming secure redaction.

### B5. Add page numbers

- choose position
- starting number
- selected/all pages
- simple font/size controls

### B6. Watermark document

Text or image watermark:

- all/selected pages
- position
- opacity
- size

### B7. Password-protect PDF

If the packaged PDF stack can support standards-compatible encryption without introducing a problematic dependency, add Save As encrypted PDF.

If not, keep the action absent/disabled and report the limitation; do not invent fake password protection.

### B8. Extract text from document

PDF/DOCX → create a normal Framechute text object containing extracted text.

For text PDFs, use PDF text content. For DOCX, use parsed document text.

For scanned PDFs, route to OCR when available.

### B9. Compare two documents

For two selected text-bearing documents (TXT/DOCX/PDF where extraction is reliable), provide a readable difference view:

- inserted text
- deleted text
- changed sections

This may be a Framechute comparison object/panel rather than modifying either source.

### B10. Find and Replace across a document

Support sensible scope:

- current DOCX/text document
- current editable PDF text operations where replacement is supported

Do not claim global replacement for glyph-only/scanned PDF text unless OCR/edit support genuinely exists.

### B11. DOCX ↔ PDF

Implement local conversion in both directions to the level the current document models can honestly support.

DOCX → PDF should preserve common document structure/formatting reasonably.

PDF → DOCX is inherently harder. For text PDFs, create a practical editable DOCX using extracted text/layout approximations. For scanned PDFs, use OCR if available.

Make conversion limitations explicit rather than promising Microsoft Word fidelity.

### B12. Markdown / HTML / RTF → DOCX or PDF

Provide straightforward local conversion for common content:

- Markdown → PDF/DOCX
- HTML → PDF/DOCX where practical
- RTF → PDF/DOCX if a compact packaged parser is reasonable

Reuse Framechute text/document rendering infrastructure.

---

## C. Media transformation actions

Part 1 should already have Extract Frame and basic media action contracts. Part 2 should establish a more capable local media transformation backend where needed.

Prefer:

1. native browser playback/encode primitives when sufficient
2. remux/demux without recompression where possible
3. packaged WASM transcoding only when necessary

Do not transcode everything by default.

If adding an FFmpeg-style WASM dependency, keep it packaged locally and verify Chrome Web Store CSP/release checks. Consider lazy loading so ordinary Framechute startup does not pay the cost.

### C1. Join clips

Select compatible clips → order → join → Save As.

Use stream-copy/remux where possible; transcode only when formats require it.

### C2. Crop / rotate video

Simple visual crop/rotation controls → export transformed video.

### C3. Normalize / boost audio

Provide simple user language such as:

- Normalize
- Louder

Avoid exposing unnecessary codec/audio-engine jargon in Classic mode.

### C4. Permanent speed change

Complete any Part 1 placeholder so the exported media itself reflects the speed change, including sane audio handling.

### C5. Extract audio from video

Complete this for the broader supported media set, producing a normal Framechute audio object first and Save As afterward.

### C6. Attach / extract subtitles

Support common sidecars where practical:

- SRT
- VTT
- ASS/SSA when the backend supports it

Actions:

- attach subtitle track for playback
- extract subtitle track from supported containers
- save subtitle file

### C7. GIF ↔ video

- GIF → MP4/WebM where available
- short video → GIF with bounded dimensions/frame rate and clear output-size feedback

### C8. Compress video/audio

Provide simple presets:

- Best quality
- Balanced
- Small

Show before/estimated/after byte size where practical.

Do not make the user choose H.264 profiles/bitrates unless Advanced mode intentionally exposes that detail.

### C9. Compatibility player backend

Use the media backend work to advance the broader product promise:

> **No codec hunting. Drop the file. Framechute figures it out.**

Attempt native playback first. For unsupported containers/codecs, use a packaged fallback/remux/decode path when technically feasible.

Target common problem formats such as MKV/AVI/MPEG/TS/FLV/WMV-family files on a best-effort basis.

Do not claim universal decoding when a codec is not available in the packaged backend.

---

## D. Spreadsheet / table completion

Part 1 should already provide CSV as a table object, editing, sorting/filtering, merge, and duplicate-row removal.

### D1. Split / merge columns

Examples:

- full name → first / last
- combine first + last
- split on delimiter

Include preview before destructive table changes.

### D2. Clean spreadsheet text

Provide useful one-click table cleanup actions:

- trim leading/trailing whitespace
- normalize repeated whitespace
- remove blank rows
- change capitalization

### D3. Quick chart

Select table columns → create a simple chart object.

At minimum:

- bar
- line
- pie only when categorical data makes sense

The chart should become a normal Framechute object that can later be copied/exported as image/SVG where practical.

### D4. XLSX opening/export foundation

This is beyond the exact 50 list but is an important everyday-office gap and should be attempted in Part 2 if the architecture permits it without dominating the run.

Goal:

`Open XLSX → sheet/table appears → basic cell edits/sort/filter → Save As XLSX`

Do not build Excel. Preserve unsupported workbook parts where possible instead of regenerating the entire workbook destructively.

If full native round-trip cannot fit this milestone safely, implement read + table interaction + explicit export limitations and leave a clean workbook adapter for a later run.

### D5. ODS if cheap after XLSX adapter

Only if it naturally falls out from the chosen spreadsheet architecture. Do not let ODS delay the primary Part 2 completion.

---

## E. Capture and extraction

### E1. Screenshot anything

Provide a Framechute capture workflow appropriate to extension permissions and Chrome APIs.

At minimum aim for:

- visible tab capture
- region crop after capture

Full-page capture may be added if it can be implemented reliably without broad persistent permissions.

The screenshot result must become a normal Framechute image object, not just download immediately.

### E2. OCR image / scanned PDF

Provide local OCR if a packaged engine of acceptable size/license can be used.

Requirements:

- image → extracted text object
- scanned PDF page(s) → extracted text
- visible progress
- never upload source to a remote OCR service

If OCR dependency weight is high, lazy-load it and document package impact.

### E3. Quick recording

Implement a straightforward capture action using browser permission-gated APIs:

- screen recording where allowed
- microphone recording where allowed

Result becomes a normal Framechute media object after stopping.

Permissions must be requested only as a consequence of explicit user action.

Do not add blanket permissions unnecessarily.

---

## F. File/archive improvements

Part 1 should already support ZIP/CBZ browsing and extraction.

### F1. Archive UX polish

- drag/open entries naturally
- multi-entry extraction where practical
- create ZIP from selected archive entries/Framechute objects
- guard against ZIP bombs/path traversal on extraction

### F2. More archive-like containers only if cheap

CBZ should already work. Do not add large dependencies for RAR/7z in this run unless a small packaged implementation is already clearly suitable.

---

## G. Publishing / sharing destinations

This is not meant to become a cloud platform in this run. Add **destination adapters**, not a giant account system.

### G1. Local/native destination remains primary

- Save
- Save As
- download
- FCX Export Snapshot

### G2. Publish/export web artifact

Where Advanced Framechute already has or is gaining HTML/CSS/JS export, make generated web artifacts use a clear package/export path.

### G3. Cloud destination hooks

Only if existing APIs/connectors in the repo make this straightforward, structure a destination interface so future Drive/Dropbox/etc. integrations can be added without rewriting exporters.

Do not add OAuth/cloud integration solely to satisfy this request if it would swamp the utility milestone.

---

# Exact 50-action completion checklist

By the end of Part 2, the combined Part 1 + Part 2 implementation should account honestly for every item below.

Mark each in the PR body as:

- ✅ implemented
- 🟡 limited / best-effort, with exact limitation
- ⏸ blocked by browser/library constraint, with reason

Do not mark placeholders as complete.

1. Rename in place
2. Batch rename
3. Duplicate / Save a Copy
4. Move / Copy To
5. Make ZIP from selection
6. Strip image metadata
7. Remove image background
8. Make a color transparent
9. Trim transparent margins
10. Replace image background
11. Straighten an image
12. Perspective correction
13. Blur / pixelate an area
14. Annotate an image
15. Stitch images together
16. Make a contact sheet
17. Generate icons
18. Compare two images
19. Fill PDF forms
20. Sign a PDF/document
21. Highlight and comment
22. Redact properly
23. Crop PDF page margins
24. Compress PDF
25. Add page numbers
26. Watermark document
27. Password-protect a PDF
28. Extract text from a document
29. Compare two documents
30. Find and Replace across a document
31. DOCX ↔ PDF
32. Markdown / HTML / RTF → DOCX or PDF
33. Trim video/audio
34. Join clips
35. Crop / rotate video
36. Mute/remove video audio
37. Normalize / boost audio
38. Change media speed permanently
39. Extract audio from video
40. Attach / extract subtitles
41. GIF ↔ video
42. Compress video/audio
43. Remove duplicate spreadsheet rows
44. Split / merge columns
45. Clean spreadsheet text
46. Merge CSV files
47. Make a quick chart
48. Screenshot anything
49. OCR image/scanned PDF
50. Quick recording (screen and/or microphone)

Also preserve the signature workflows that are broader than the numbered list:

- image Crop / Resize / Rotate / Flip / Convert / Compress / Save As
- **Extract Frame** → editable image object on substrate
- batch image actions
- PDF rotate/delete/duplicate/reorder/extract/merge/pages→images/images→PDF
- CSV table editing
- ZIP/CBZ browsing

---

# Cross-feature product rules

## 1. Results remain useful

Whenever an operation creates a new thing, put it on the Framechute substrate as a first-class object when sensible.

Examples:

`OCR → text object`

`Extract Audio → audio object`

`Screenshot → image object`

`Quick Chart → chart/image/SVG-capable object`

`PDF page → image/PDF object`

The user should not be forced to save/download and reopen the result just to continue working.

## 2. One action engine

Classic and Advanced must call the same operation implementations.

Advanced may expose parameters, precision, chaining, scripting, or batch rules later.

Do not duplicate transformations for each mode.

## 3. Honest capability detection

If an action is unavailable for a selected format, hide/disable it with an understandable reason.

Never create a file with a new extension without actually converting its contents.

## 4. Local first

Do not send user content to remote converters, OCR endpoints, background-removal services, or transcoding services.

## 5. Avoid giant startup cost

Heavy packaged engines/models should be lazy-loaded when possible.

The common path — opening Framechute and manipulating normal images/documents — should remain responsive.

## 6. Security

Pay special attention to:

- archive path traversal
- ZIP bombs / expansion limits
- malformed document/media input
- object URL cleanup
- worker cleanup
- save-before-truncate safety
- redaction claims
- permission prompts only after explicit user gesture

---

# Part 2 acceptance workflows

At minimum smoke-test these end-to-end:

### Workflow 1 — PDF office chore

`Open PDF → fill form field → add signature → redact a region → add page numbers → Save As PDF → reopen result`

### Workflow 2 — document extraction

`Open DOCX/PDF → Extract Text → text appears as editable Framechute object`

### Workflow 3 — media chore

`Open odd/unsupported-or-container-problem video → compatibility path if needed → Extract Frame and/or Extract Audio → manipulate result → Save As`

### Workflow 4 — subtitles

`Open video → attach SRT/VTT → playback shows subtitles → extract/save subtitle track where supported`

### Workflow 5 — table cleanup

`Open CSV → remove duplicates → split/merge column → clean whitespace → make chart → save CSV and export chart`

### Workflow 6 — screenshot/OCR

`Capture visible tab → screenshot becomes image object → crop → OCR → extracted text becomes text object`

### Workflow 7 — recording

`Start explicit recording → permission prompt → stop → recording appears as media object → trim/save`

### Workflow 8 — no architectural regression

Every new Part 2 command should appear through the Part 1 action/capability system rather than bespoke permanent toolbar plumbing.

---

# Testing and delivery

Add automated tests wherever operations can be tested without a live browser:

- file naming/export helpers
- CSV transforms
- archive validation/path sanitization
- document operation serialization
- action applicability
- media command planning/probe logic
- image pure transforms where practical

Run:

- existing unit tests
- syntax checks
- extension validation
- Chrome Web Store packaging/release gate

Do not claim manual browser QA you did not perform.

When finished, open a PR against `main` with:

1. architecture summary
2. complete 50-item status matrix
3. dependency/package-size changes
4. any browser/runtime limitations
5. manual smoke-test checklist
6. explicit confirmation that native Save/Save As remains separate from FCX Export Snapshot

The desired end state is simple to describe:

> **A browser + a filesystem + Framechute should cover most ordinary file, document, media, table, and office chores without making the user hunt for another application or random converter site.**
