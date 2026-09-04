# Codex Request: Framechute Everyday Utility Layer — Part 1 of 2

## Mission

Build the first half of Framechute's **everyday utility layer**: the part of a computer people constantly wish were simpler.

The product principle is:

> **Select the thing. Do the obvious thing. Save the result.**

Framechute should not force users to think in terms of launching specialist applications. A user should be able to select an image, video, PDF, table, or group of files and immediately see the sensible actions for that object.

This request is **Part 1 of a two-run program**. Part 1 must do two things at once:

1. Ship a large set of genuinely useful actions now.
2. Build the shared action/selection/export architecture so that Part 2 can add the remaining utilities without inventing parallel systems or rewriting Part 1.

Part 2 already has its own request file:

`agents/codex/prompts/everyday-utility-actions-part-2-completion.md`

Read it before designing Part 1 so the architecture anticipates it, but **do not implement Part 2 features in this run unless they fall out naturally from shared primitives**.

---

## Product context

Framechute is becoming a browser-native utility/editor layer for ordinary file work.

Current direction:

- open common media and documents
- edit PDF and DOCX
- save native files independently of FCX
- export a whole Framechute workspace as `.fcx`
- treat the substrate as a place where extracted/generated results become first-class objects
- Simple/Classic and Advanced modes share the same underlying object/action engines

Important persistence rule:

- **Native Save / Save As** saves the selected file/document itself.
- **Export Snapshot** saves the whole Framechute workspace as `.fcx`.
- Do not route ordinary file edits through legacy workspace Save/Restore.

The recently merged editable PDF/DOCX milestone should be treated as existing architecture, not replaced.

Before coding, inspect at minimum:

- `src/workspace.js`
- `src/workspace.html`
- `src/workspace.css`
- `src/advanced-mode.js`
- `src/file-access.js`
- `src/drop-local-sources.js`
- `src/documents/`
- image/gallery/media handling
- context-menu / frameless media modules
- FCX capture/restore hooks
- tests and release/package scripts

Preserve Manifest V3 / Chrome Web Store constraints. Keep executable dependencies packaged locally. Do not introduce remote executable code.

---

# Core interaction architecture to build first

Part 1 must establish a reusable **Quick Actions substrate** rather than implementing dozens of unrelated buttons.

## 1. Selection model

Add or extend a coherent selection model that can represent:

- one selected Framechute object
- multiple selected objects
- homogeneous selections, such as 20 images
- mixed selections where only shared actions appear

Selection must not break ordinary drag/move behavior.

Keyboard modifiers may support multi-select, but every important workflow must also be possible by click/tap UI.

## 2. Capability/action registry

Create a small extensible registry/API where an object type declares actions and applicability, conceptually similar to:

```js
registerAction({
  id: "image.resize",
  label: "Resize",
  appliesTo(selection) { ... },
  async run(context) { ... }
});
```

Exact API is your design decision.

Requirements:

- no giant switch statement duplicated across menus
- actions reusable from context menu, compact quick-actions UI, and later Advanced automation
- single-selection and batch actions can share implementation
- action availability derived from capability/object type
- async operations can report progress/error/cancel where practical
- action results can become new Framechute objects

## 3. Contextual Quick Actions UI

When an object is selected, surface a small, understandable action set for that object.

Examples:

Image:

`Crop · Resize · Rotate · Convert · Compress · Save As`

Video:

`Extract Frame · Trim · Extract Audio · Mute · Convert/Save As`

PDF:

`Pages · Rotate · Extract · Merge · Save As`

Multiple images:

`Resize Selected · Convert Selected · Compress Selected · Make PDF`

Avoid building a giant permanent ribbon. Prefer contextual controls and existing Framechute visual language.

Simple/Classic mode must expose ordinary actions. Advanced mode may expose more detail but must call the same engines.

## 4. Non-destructive operation model

Where practical, manipulations should remain editable in Framechute until the user explicitly exports/saves the result.

For an image, for example, retain source + transforms such as:

- crop
- output dimensions
- rotation/flip
- background choice
- quality/format settings

Then bake the result when the user chooses Save As/export.

Do not destructively overwrite source files silently.

## 5. Result-object rule

**Extraction should create editable Framechute objects whenever possible.**

This is a central product rule.

Examples:

- Extract Frame → image object on substrate
- Extract Audio → audio object
- PDF page → image/PDF object
- generated contact sheet → image object
- images → PDF → PDF/document object or saved result
- extracted archive file → normal object if Framechute understands the type

The user should be able to continue acting on the result immediately.

## 6. Shared Save As/export helpers

Generalize native Save As helpers beyond PDF/DOCX where appropriate so image/media/generated-file actions have a consistent, safe save path.

Requirements:

- correct extension normalization
- correct MIME type
- serialize/render before opening/truncating a writable target where safety matters
- File System Access API when available
- download fallback when appropriate
- never silently overwrite the original

## 7. Multi-select/batch foundation

Batch work must reuse the same action implementations as single-object work when possible.

Examples:

- resize 40 images
- convert selected images to WebP
- compress selected images
- batch rename

Provide bounded concurrency/progress so large selections do not freeze the extension.

---

# Part 1 implementation scope

Implement the following features in this run. Prefer robust, small implementations over elaborate editor chrome.

## A. Image Quick Actions

### A1. Crop

Select image → Crop → visible crop box → adjust → Apply/Enter.

- nondestructive while in workspace
- obvious cancel path
- use image-native/perceptual bounds where existing Framechute frameless behavior supports it

### A2. Resize

Simple popover/dialog:

- width
- height
- lock aspect ratio
- percentage presets if easy

Allow export at the requested dimensions.

### A3. Rotate / Flip

- rotate left/right
- flip horizontal/vertical

### A4. Convert image format

At minimum support practical browser encoders:

- PNG
- JPEG
- WebP

Add AVIF only if browser support is reliable and feature-detected.

If converting transparency to JPEG, ask for or use an explicit background rather than silently producing surprising black/transparent output.

### A5. Compress image

Provide simple choices or a simple quality control, not codec jargon.

Show useful before/after byte size when known, e.g.:

`5.2 MB → 740 KB`

### A6. Strip metadata

Provide a privacy-oriented re-encode path that removes EXIF/location/device metadata from supported raster images.

### A7. Make a color transparent

A simple color-pick/tolerance operation is sufficient for v1.

### A8. Trim transparent margins

Detect alpha bounds and crop away empty transparent canvas.

### A9. Replace/fill transparent background

Allow a transparent image to be flattened onto a chosen background before export.

### A10. Blur / pixelate selected area

Allow the user to mark a rectangular region and apply blur or pixelation.

This is useful for faces, addresses, names, account data, etc.

### A11. Basic annotation

Provide a minimal annotation layer for images:

- text
- arrow or line
- rectangle/circle if easy
- freehand if existing pointer infrastructure makes it inexpensive

Do not build Photoshop.

### A12. Stitch images

Select multiple images → stitch vertically or horizontally → create one resulting image object.

### A13. Contact sheet

Select multiple images → create a simple grid/contact sheet, optionally with filenames when practical.

### A14. Generate common icon sizes

One image → produce common favicon/app icon dimensions as files or a packaged export.

Keep the preset list small and sensible.

### A15. Compare two images

For exactly two selected images, provide a simple comparison mode such as:

- side by side
- opacity slider / wipe

A difference visualization is optional if inexpensive.

### A16. Straighten image

Implement a modest rotation/straighten interaction suitable for photographed pages/horizons.

### A17. Perspective correction

If feasible with the existing canvas stack, allow four-corner perspective correction for a photographed document/sign.

If a robust implementation would destabilize the milestone, build the reusable transform primitive and ship a clearly marked basic v1 rather than pretending to support arbitrary geometry.

---

## B. Video/audio Quick Actions

### B1. Extract Frame — signature workflow

This is important.

User pauses/seeks a local video and chooses **Extract Frame**.

Framechute captures the current decoded frame and places it on the substrate as a normal Framechute image object.

From there it must immediately support image Quick Actions:

`Crop → Resize → Convert → Save As`

Do not make Extract Frame merely download a screenshot.

### B2. Extract Audio

Video → Extract Audio → create an audio result when a practical local implementation is available.

If native browser APIs cannot demux the source format, structure the action behind a media-operation capability so Part 2's compatibility/transcode layer can provide the backend later. Do not fake success.

### B3. Trim media

For browser-decodable audio/video, implement a simple start/end trim UI and export path where practical.

Do not expose codec complexity in Simple mode.

### B4. Mute/remove video audio

Provide a simple mute/remove-audio export action where the current media backend can support it safely.

### B5. Change playback speed for exported result

Allow a selected speed multiplier for an exported transformed clip when supported by the chosen local pipeline.

Playback-rate-only state is not sufficient; the request is for an actual exported transformed result.

If full encode support is intentionally deferred to Part 2, expose the shared action contract and keep the action disabled with an honest reason rather than producing a mislabeled file.

---

## C. Batch + file utility actions

### C1. Rename in place

Provide obvious file/object rename behavior.

### C2. Batch rename

Support at minimum:

- sequential numbering
- prefix/suffix
- search/replace

Preview resulting names before applying.

### C3. Duplicate / Save a Copy

Make creating a copy predictable and non-destructive.

### C4. Move / Copy To…

Where File System Access handles permit it, provide a straightforward destination-picker workflow.

If the browser API cannot truly move a file, use copy + explicit delete only with user confirmation; otherwise expose Copy To and do not lie about Move.

### C5. Make ZIP from selection

Select multiple result/source files → `Compress to ZIP` → save archive.

Reuse already packaged ZIP tooling when sensible (e.g. FFLATE), rather than adding another giant dependency.

---

## D. PDF page utilities

The recently merged PDF editor should be extended, not replaced.

Implement page-level operations in a way that preserves unmodified pages as faithfully as the selected PDF library permits.

### D1. Rotate page

### D2. Delete page

### D3. Duplicate page

### D4. Reorder pages

Prefer direct drag/drop in a page list/thumbnail strip if practical, with accessible button alternatives.

### D5. Extract page

Extract selected page(s) as a new PDF result and/or Save As.

### D6. Merge another PDF

Open/add another PDF and append/insert pages.

### D7. PDF pages → images

Render selected/all pages to PNG/JPEG and make them available as Framechute image objects/files.

### D8. Images → PDF

Select images in the workspace → create a PDF in selection/order.

### D9. Crop PDF page margins

Provide a basic page crop-box workflow.

### D10. Compress PDF

Implement a conservative v1 where possible. Do not claim dramatic compression when the underlying library only rewrites structure without recompressing embedded images.

If meaningful compression requires a heavier backend, provide the action plumbing and an honest limited v1, leaving aggressive compression for Part 2.

---

## E. CSV/table utility

Do **CSV before trying to build Excel**.

### E1. Open/drop CSV as a table object

Do not route CSV only to a plain text editor once this feature exists.

### E2. Basic table interactions

- edit cells
- add/remove rows
- add/remove columns if inexpensive
- sort by column
- filter
- find

### E3. Save As CSV

Preserve quoting/escaping correctly.

### E4. Merge compatible CSV files

Select/drop multiple CSV files → merge rows into one table when headers are compatible.

### E5. Remove duplicate rows

Provide exact-row duplicate removal with preview/count.

---

## F. ZIP / CBZ browsing foundation

This is included in Part 1 because it establishes another important rule: **an archive should feel like a container, not a dead blob**.

### F1. Open ZIP

Drop/open ZIP → show contained entries in a lightweight archive block/browser.

- folders shown hierarchically or as paths
- file sizes when known
- do not eagerly inflate enormous archives unnecessarily

### F2. Open contained supported files

Double-click/open an entry that Framechute understands → create a normal Framechute object from that entry.

### F3. Extract selected entry

Save/extract an individual file.

### F4. CBZ

Treat `.cbz` as ZIP with image-oriented presentation; a simple gallery/comic sequence is sufficient.

---

# The full 50-action program

The two requests together must cover the complete utility program below. Part 1 implements a large dependency-heavy foundation; Part 2 completes and deepens the remainder.

Keep this list in mind when designing APIs so Part 2 is easy.

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

In addition, the program explicitly includes the earlier signature utilities:

- Image Crop / Resize / Rotate / Flip / Convert / Compress / Save As
- **Extract Frame** into the Framechute substrate
- batch image resize/convert/compress
- PDF rotate/delete/duplicate/reorder/extract/merge/pages→images/images→PDF
- CSV table editing
- ZIP/CBZ browsing/extraction

---

# Part 1 acceptance benchmarks

Do not judge this milestone by number of buttons. Judge it by complete little workflows.

At minimum these should work end-to-end after Part 1:

### Benchmark 1 — the stupidly easy image resize

`Open/drop image → select → Resize → enter 1200 px width with aspect lock → Save As WebP/JPEG/PNG`

### Benchmark 2 — Extract Frame

`Open video → seek/pause → Extract Frame → resulting image appears on substrate → Crop → Resize → Save As PNG`

### Benchmark 3 — batch images

`Select many images → Resize Selected and/or Convert Selected → save results without repeating the dialog for every file`

### Benchmark 4 — PDF pages

`Open PDF → reorder/delete/rotate pages → Save As PDF`

and:

`Open two PDFs → insert/merge pages → Save As PDF`

### Benchmark 5 — images to PDF

`Select images → Make PDF → Save As PDF`

### Benchmark 6 — CSV

`Drop CSV → table appears → sort/filter/edit/remove duplicates → Save As CSV`

### Benchmark 7 — ZIP

`Drop ZIP → browse entries → open a contained image/text/media file → it becomes a normal Framechute object`

### Benchmark 8 — architecture

Adding a new Part 2 action should require registering an action + implementing its operation, **not** redesigning selection, menus, save/export, result-object creation, or batch orchestration.

---

# Safety / reliability / UX rules

- Never silently overwrite user source files.
- Long operations need visible progress and should avoid blocking the main thread where practical.
- Large batches/archives must have sensible limits and error handling.
- If a browser API cannot provide a requested semantic (e.g. true file move), do not pretend it did.
- If a transform cannot be supported for a given codec/format, explain succinctly in the UI.
- Never upload user files to a remote service as an implementation shortcut.
- Prefer local browser APIs and packaged libraries.
- Do not add remote executable code.
- Preserve Chrome Web Store release checks.
- Add tests around pure transformation/serialization helpers and regression-prone code.
- Keep code modular. Do not turn `workspace.js` into a monolith; use dedicated modules/directories for action registry, selection, image operations, table/archive operations, etc.

---

# Scope discipline

This is already a large milestone. Do not spend the run on unrelated branding or broad refactors.

Do not attempt to build:

- Photoshop
- Premiere
- Excel
- a cloud collaboration server
- a new FCX format
- a replacement browser filesystem

The goal is a **surprisingly capable everyday utility layer** whose architecture deliberately makes Part 2 straightforward.

When finished:

1. summarize architecture added
2. list which Part 1 actions are fully working
3. explicitly list any limited/deferred sub-actions and why
4. run tests/syntax checks/release packaging
5. open a PR against `main`
6. include a concise manual smoke-test checklist in the PR body
