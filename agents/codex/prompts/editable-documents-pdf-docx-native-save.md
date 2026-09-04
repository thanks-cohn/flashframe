# Codex Request: Editable PDF + DOCX Documents with Native Save / Save As

## Mission

Implement Framechute's first **real document-editing milestone**.

The product direction is intentionally simple:

> Open a file. Change the thing you can see. Save the file again.

Framechute should become a one-stop browser-native suite for ordinary editing. Advanced mode can expose deeper controls later, but the normal experience must remain obvious enough that a user can open a document, make a small change, save it, and leave without learning a new workflow.

For this task, make **PDF** and **DOCX** first-class editable document types.

The core loop must be:

```text
Open PDF / DOCX
        ↓
Edit the document itself
        ↓
Save
or
Save As
        ↓
ordinary .pdf / .docx file
```

This is separate from Framechute's `.fcx` workspace snapshot feature.

**Do not require the user to export an `.fcx` merely to keep a modified PDF or DOCX.**

The architectural rule is:

> Native-format editing and workspace persistence are separate concerns.

A PDF should be independently saveable as PDF. A DOCX should be independently saveable as DOCX. `.fcx` preserves the wider Framechute workspace when the user wants that.

---

## Product expectations

The first release does **not** need Acrobat or Microsoft Word feature parity.

It does need to feel like a coherent small professional editor rather than a viewer with a few decorative buttons.

For common files, the user should be able to say:

> "I opened the document, changed it, saved it, and the saved file contains my changes."

Favor an end-to-end reliable editing loop over a huge incomplete feature surface.

The most important promises are:

1. PDF and DOCX open inside Framechute.
2. Common visible text is actually editable.
3. The document is independently saveable in its native format.
4. Save As lets the user choose a new file/location.
5. Unsaved document edits are not silently discarded.
6. FCX can preserve the editable state when the user chooses to snapshot the whole workspace.
7. Simple/Classic and Advanced mode both retain the document workflow.

---

# Study the repository first

Before changing code, inspect the current architecture and reuse it rather than building a disconnected mini-app.

At minimum study:

- `src/workspace.js`
- `src/workspace.html`
- `src/workspace.css`
- `src/file-access.js`
- `src/drop-local-sources.js`
- `src/web-drop.js`
- `src/advanced-mode.js`
- `src/workspace-extras.js`
- `src/fcx-portable.js`
- `src/fcx-format.mjs`
- `docs/FCX_FORMAT.md`
- `src/persistence.js`
- `src/archive.js`
- `src/controls.js`
- the current legacy/local workspace save compatibility code
- the extension manifest and validation/build scripts
- existing tests and fixture conventions

Important current facts to preserve:

- PDF already exists as a Framechute block type, but it currently delegates display to an iframe/browser PDF viewer.
- Block types already have semantic `capture()` / `restore()` behavior.
- File sources are represented through source records / handle keys.
- `.fcx` already serializes workspace state and optionally embeds local files.
- The old local workspace Save/Restore path is now a legacy/compatibility feature, not the primary user-facing durability promise.

Do not undo those product decisions.

Do not make document saving depend on the old workspace Save/Restore feature.

---

# Keep the implementation modular

Do not turn `workspace.js` into a giant PDF/DOCX implementation file.

Add focused modules for document behavior where appropriate, for example conceptually:

```text
src/documents/
  document-save.js
  pdf-document.js
  docx-document.js
  ...
```

Exact paths are up to you after studying the existing project conventions.

The important design point is that the workspace owns block creation/serialization while the document modules own document parsing, rendering, editing, and native file generation.

A document block should conceptually have:

- original/local source identity
- editable document model or edit operations
- current view state
- dirty / clean state
- native Save behavior
- native Save As behavior
- serializable Framechute state for FCX

Avoid format-specific hacks scattered through unrelated media code.

---

# Shared document Save / Save As behavior

Both PDF and DOCX must have **document-local** actions.

The controls may live in the document block toolbar/header using the existing visual language.

At minimum expose:

```text
Save
Save As
```

These actions save the document itself, not the Framechute workspace.

## Save

If the source is a real writable `FileSystemFileHandle`, attempt to save back to that file.

When write permission is required, request it at the moment the user chooses Save rather than demanding broad write permission merely to open a document.

Generate the complete output Blob/data before opening/truncating the target writer. A serialization error must not destroy the user's original file.

If the original source cannot be written safely, do not pretend Save succeeded. Fall back to or offer **Save As** clearly.

Examples include:

- source does not expose a writable handle
- browser permission is unavailable/denied
- source came from a synthetic/imported handle
- document came from an FCX embedded asset that is not tied to an original writable location

## Save As

Use the Chromium File System Access save picker where available and appropriate.

Use the correct extension and a sensible default filename:

```text
.pdf
.docx
```

If a platform/API limitation requires a download fallback, make that fallback explicit and still produce a correctly named native file.

After a successful Save As, when a real returned file handle is available, make that new file the document block's current writable source so subsequent Save can target it.

## Dirty state

A native document becomes dirty when the user changes its editable content.

Show a subtle, understandable dirty indicator. Do not create a noisy warning system.

After successful Save / Save As, mark it clean.

Do not silently discard dirty document changes when the user removes a document block or when an operation is about to replace/clear the entire workspace. A concise confirmation is sufficient.

FCX snapshotting may preserve the editable document state, but that does not mean the native file itself has been saved. Keep those concepts distinct.

---

# PDF: replace the viewer-only surface with a Framechute-owned document surface

The current PDF block uses a browser/iframe viewer. That is useful for viewing but is a dead end for editing.

For this milestone, Framechute needs to own the PDF rendering surface.

Use a browser-compatible packaged renderer such as PDF.js or another appropriate local library after inspecting the repository and extension constraints.

Do not use a remote CDN or runtime-downloaded executable code.

If a worker is required, package it with the extension and keep it compatible with Manifest V3/CSP.

## PDF opening/rendering

At minimum preserve the current useful behavior:

- local PDF picker
- drag/drop opening when supported by the existing source router
- page navigation
- current page state
- reconnect behavior
- block resize / workspace placement

Replace the iframe display with an application-owned PDF surface that can support editing.

A reasonable implementation is a rendered page/canvas plus a positioned text/edit layer, but choose the architecture that best fits the libraries and current code.

Rendering should respect:

- page size/aspect ratio
- page rotation
- zoom/fit behavior as needed for usability
- selectable/locatable text when the PDF contains a text layer

Do not implement OCR in this task.

A scanned/image-only PDF may remain non-text-editable in v1, but the application should fail gracefully rather than presenting fake editable text.

---

# PDF text editing

The primary PDF editing benchmark is intentionally simple:

> Open an ordinary text PDF, click/double-click visible text, change it, save a PDF, reopen that saved PDF, and see the changed text where the user put it.

Implement a practical first version of existing-text editing.

The user should not need to understand PDF content streams, glyph operators, annotations, or text-layer internals.

The visible interaction should feel approximately like:

```text
double-click text
      ↓
editable text region
      ↓
type replacement
      ↓
click away / Enter
      ↓
document is dirty
```

Preserve, where reasonably derivable:

- position
- font size
- approximate font family/fallback
- color
- line orientation
- page location

Do not make the UI depend on one gigantic textarea representing the whole PDF.

Track edits in an explicit serializable model/operation list rather than mutating incidental DOM and hoping it can be reconstructed later.

Conceptually an edit record may contain fields such as:

```text
page
original text identity / source span hint
x/y/width/height
replacement text
font/style information
```

Use whatever stable shape fits the actual implementation.

---

# PDF save strategy: what the user sees must survive the save

PDF internals can make perfect arbitrary source-text replacement difficult.

Do not fake success.

Use this priority order:

1. **Preserve original PDF structure and modify content safely when the library/source representation makes that reliable.**
2. If direct replacement is unsafe, use a deterministic visual reconstruction/flattening strategy for the affected content/page so the saved PDF visually matches the Framechute editor.
3. Keep unmodified pages in their original form whenever practical instead of rasterizing an entire document unnecessarily.

The guiding rule is:

> The saved PDF should look like the document the user was looking at when they pressed Save.

Visual fidelity of the edited result is more important than pretending to preserve hidden semantics that we cannot safely rewrite yet.

If an edited page must be flattened in this first version, document that limitation in code/docs and keep the architecture open for better source-level PDF edits later.

Do not silently corrupt complex PDFs.

Preserve page count/order/rotation unless the user explicitly changes them; page editing/reordering can be a later milestone if it materially expands scope.

## Optional small convenience

If it fits cleanly after the core existing-text editing loop works, allowing **Add Text** to a PDF is useful. Do not let this optional feature delay reliable existing-text edit + save.

Image insertion, crop, signatures, OCR, forms, redaction tooling, page reordering, and full object editing are **not required in this task** unless they are naturally trivial after the core architecture lands.

---

# DOCX: add a first-class editable document block

DOCX does not currently have a first-class block type in the core workspace.

Add one.

## Opening DOCX

Add DOCX to the file access/picker layer with appropriate extension and MIME handling.

Add an obvious user action:

```text
Open DOCX
```

It should be available in both Simple/Classic and Advanced workflows.

A dropped `.docx` should route to the same document-opening behavior when the existing drop architecture makes that appropriate.

Do not open DOCX as plain text.

Do not merely extract all text into the existing note textarea and call the feature complete.

The result should look and behave like a document.

---

# DOCX import/rendering fidelity for v1

Use a packaged browser-compatible OOXML/DOCX library or a carefully scoped parser after inspecting the extension architecture.

The first version should preserve common Word-document structure well enough to be genuinely useful.

Prioritize these common elements:

- paragraphs
- paragraph breaks
- normal text runs
- bold
- italic
- underline
- headings/styles where practical
- text alignment
- bulleted lists
- numbered lists
- hyperlinks
- tables
- inline images
- explicit line breaks
- basic page size/margins where practical

Do not attempt every Word feature in v1.

Features such as macros, tracked changes, comments, equations, SmartArt, embedded OLE objects, complex section layouts, exotic fields, and perfect pagination are not required.

However, do not silently destroy unknown OOXML if the chosen architecture can preserve it while editing the parts Framechute understands.

Prefer a **least-destructive round-trip strategy**.

If feasible, retain the original DOCX ZIP/package and rewrite only the package parts Framechute understands rather than regenerating an unrelated simplified DOCX every time.

If a library-based reserialization is more practical for this milestone, make the supported fidelity boundary explicit and test it carefully.

---

# DOCX editing surface

Render the imported DOCX into an editable document surface, not a read-only preview.

Use structured editable DOM/model state so editing can later grow without another rewrite.

At minimum support ordinary typing/deleting and selection-based formatting for the common model.

A compact formatting surface should support at least:

```text
Bold
Italic
Underline
```

If headings, lists, and alignment can be exposed cleanly without turning the toolbar into a miniature Microsoft Word ribbon, include them.

The project philosophy is:

> obvious common editing, not cockpit UI.

The document itself should remain the center of attention.

---

# DOCX native save

Generate a valid `.docx` that common external applications can reopen.

At minimum test the generated file against the OOXML ZIP structure and reopen it through Framechute's own importer.

Where practical, preserve:

- formatting of untouched content
- images
- tables
- hyperlinks
- styles referenced by supported content
- document relationships
- package metadata/parts not directly edited

The first benchmark document should contain:

- a heading
- multiple paragraphs
- bold and italic runs
- a list
- a small table
- an inline image

Change ordinary text, Save As, reopen the saved DOCX, and verify both the change and the common surrounding structure remain.

---

# Simple/Classic and Advanced mode

The document workflow is a core feature, not an Advanced-only feature.

Both modes must be able to:

- Open PDF
- Open DOCX
- edit supported document content
- Save
- Save As

Advanced mode may eventually expose deeper document/object controls, but **do not create a second document implementation for Advanced mode**.

Use the same underlying document object/model.

Simple mode should remain obvious and uncluttered.

---

# FCX integration

A user may edit a document and choose **Export Snapshot** before saving the native file.

That snapshot should preserve the editable Framechute document state.

For PDF, preserve at minimum:

- source relationship/portable asset behavior already used by FCX
- current page/view state
- explicit edit operations/model
- dirty state if useful for truthful UI restoration

For DOCX, preserve at minimum:

- source relationship/portable asset behavior
- current document view/scroll state where practical
- editable semantic document state or a deterministic serialized edit model
- dirty state if useful

When FCX is exported with **Include Files**, the source document should participate in the existing asset packaging rather than being hidden in an unrelated one-off store.

When FCX is State Only, preserve the existing reconnect philosophy.

Do not force a new FCX version unless the actual format contract requires it. New block state should normally fit the existing extensible semantic workspace record.

Do not make `.fcx` the only place edits can be saved.

---

# File identity and handles

Continue using the existing source/handle abstractions where possible.

For imported native files, retain enough information to support:

- reconnect
- FCX embedding/reference
- Save to original when a writable real handle is available
- Save As to a new handle
- sensible display name

Do not write function-bearing synthetic handles to IndexedDB in a way that repeats the FCX structured-clone problem already solved elsewhere.

If document-specific synthetic handles are needed, use the established transient/synthetic-handle pattern.

---

# Extension constraints / dependencies

This is a Chrome/Chromium extension.

Do not rely on remote runtime JavaScript, CDN PDF workers, CDN DOCX libraries, or a hosted backend to perform normal editing.

If third-party libraries are required:

- choose maintained browser-compatible libraries
- package the production code locally with the extension
- include required license notices
- keep Manifest V3/CSP compatibility
- avoid adding an unnecessary server/toolchain if the repository does not already need one
- update build/validation packaging so required worker/library assets are included in the Chrome Web Store candidate

Do not silently make the extension depend on internet access for local document editing.

---

# Error handling

Treat user documents as valuable data.

Failures should be explicit and non-destructive.

Examples:

- unsupported/corrupt PDF -> show an understandable error; do not clear unrelated workspace state
- unsupported/corrupt DOCX -> show an understandable error
- native Save serialization failure -> original file remains untouched
- write permission denied -> document remains dirty and user can choose Save As
- Save As cancelled -> document remains open and dirty
- FCX restore with missing original source -> preserve the normal reconnect state rather than dropping the document

Do not claim a native file was saved until writing successfully completes.

---

# Tests

Add focused automated tests wherever the architecture allows it.

At minimum cover:

## Shared native save behavior

- dirty -> clean transition after successful save
- Save As filename/extension normalization helper if one is introduced
- failure/cancel does not mark the document clean
- serialization completes before writing begins where practical to test

## PDF

- PDF state/edit records serialize and restore deterministically
- simple generated/test PDF opens through the parsing layer
- a simple text replacement produces a readable PDF output
- reopening the output reflects the intended changed text/visual result
- malformed PDF fails without replacing workspace state

## DOCX

- open a small fixture with common paragraphs/runs
- preserve common bold/italic/underline structure
- edit text -> serialize -> reopen -> changed text remains
- table/list/image fixture survives the supported round-trip as designed
- malformed DOCX fails cleanly

## FCX interaction

- document block state remains JSON-serializable
- editable state restores without depending on incidental live DOM

Use small generated fixtures where practical instead of committing giant binaries.

---

# Manual acceptance checklist

Before considering the task complete, manually verify in the actual unpacked Chromium extension:

1. Start in Simple/Classic mode.
2. Open an ordinary text PDF.
3. Navigate pages.
4. Edit visible text on a page.
5. Confirm the block becomes dirty.
6. Choose **Save As** and write a new `.pdf`.
7. Reopen that PDF and confirm the visible change survived.
8. If the original handle is writable, edit again and verify **Save** updates it.
9. Open a normal `.docx` containing a heading, paragraphs, bold/italic text, a list, table, and image.
10. Edit ordinary text and basic formatting.
11. Save As a new `.docx`.
12. Reopen it and confirm the edited content plus common surrounding structure survived.
13. Verify a write-permission denial leaves the document dirty and still usable.
14. Export an `.fcx` while a PDF or DOCX has unsaved native edits, clear/reopen the workspace snapshot, and verify the editable Framechute state returns.
15. Switch to Advanced mode and verify PDF/DOCX Open, Save, and Save As still exist and use the same document implementation.
16. Verify existing text/image/gallery/video/media behavior is not regressed.
17. Run extension validation/build checks and confirm all packaged PDF/DOCX library/worker assets are present in the submission candidate.

---

# Out of scope for this request

Keep this milestone focused.

Do **not** broaden it into:

- PPTX editing
- XLSX editing
- full image manipulation/cropping
- universal media codec fallback
- OCR
- signatures
- PDF forms
- redaction suite
- full page reordering/cropping tools
- collaborative editing
- cloud storage
- a new FCX format version without a real need
- a broad application redesign
- perfect Microsoft Word or Adobe Acrobat parity

Those can build on the document substrate later.

---

# Definition of done

This task is done when Framechute has an end-to-end, user-visible first document workflow in which:

> a normal user can open a common PDF or DOCX, make a supported visible text edit, save the modified file as PDF/DOCX independently of FCX, reopen that native file, and see the change preserved.

Do not stop at parsing libraries, read-only previews, toolbar placeholders, or an internal document model with no native save path.

The product benchmark is not "the code understands DOCX/PDF."

The benchmark is:

> **Open it. Change it. Save it.**
