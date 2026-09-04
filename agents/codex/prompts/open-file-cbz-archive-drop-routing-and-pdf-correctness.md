# Codex Request: Open File, CBZ/ZIP, Drop Routing, and PDF Correctness

## Mission

Work from the latest `main` of `thanks-cohn/framechute`.

This is a focused correctness-and-file-ingestion pass for Framechute. It addresses several related issues that all point to the same architectural need:

> **Framechute must know what an object semantically is, must route drops to the right destination, and must open common files deliberately rather than relying on accidental browser behavior.**

Do not treat this as a request to add a giant file manager. Keep the implementation direct, local-first, and consistent with the existing object model.

The key user-facing rules are:

1. **Open a file. Framechute figures out what kind of object it should become.**
2. **Semantic object type always overrides persistence/storage representation.**
3. **Internal serialization must never leak into user-visible media or conversions.**
4. **Dragging onto an editor should go to the editor, not trigger the global “Drop into Framechute” overlay.**
5. **A successful drop must visibly finish; overlays must not remain stuck on top of the result.**
6. **A conversion that creates useful media should produce a real first-class Framechute result object immediately.**

Build on existing infrastructure instead of creating parallel systems.

---

# Part 1 — Introduce one canonical semantic object-type resolver

Framechute currently has multiple layers of representation, including custom objects persisted through text-backed marker payloads. That is acceptable as an implementation detail, but action eligibility must never use the persistence container as the semantic type.

Create/refactor toward one canonical semantic object-kind resolver used by Quick Actions and other object-aware features.

Conceptually:

```text
DOM / persistence representation
        ↓
semanticObjectKind(block)
        ↓
image | gallery | video | audio | pdf | docx | text | markdown | cbz | archive | canvas | file | web | ...
```

Do not let code repeatedly infer meaning with inconsistent checks.

At minimum, correctly distinguish existing custom/local object markers such as:

- `dataset.customKind`
- `dataset.customLocalKind`
- `dataset.utilityKind`
- true native `data-block-type`
- recognizable classes only as a compatibility fallback

Important current failure to eliminate:

```text
Gallery object
→ stored internally in a text-backed custom block
→ Quick Actions sees data-block-type="text"
→ treats hidden state as user text
→ Convert to PDF generates a strange PDF/object containing internal marker text
```

That must become impossible.

## Required invariant

> **Storage type is not semantic type.**

If a gallery is persisted through a text textarea, its semantic type is still `gallery`.

If a future CBZ or archive uses a custom text payload for persistence, it must still be `cbz` or `archive` to every action system.

Add tests around the type resolver.

---

# Part 2 — Hidden state fields must never be interpreted as document content

Audit all content-extraction helpers, especially Quick Actions `textOf()` or equivalents.

A hidden custom state store such as `.custom-state-store` must never be returned as user-authored text.

Protect against any internal marker payload such as:

- `__FLASHFRAME_CUSTOM_BLOCK_V1__`
- `__FLASHFRAME_LOCAL_DROP_V1__`
- future internal marker formats

appearing in:

- generated PDFs
- extracted text
- DOCX conversions
- clipboard output
- visible notes
- exported media captions
- any user-facing result object

If an action asks for text from a semantic object that is not a text/document type, return no text or reject the operation rather than falling back to an internal textarea.

Add a regression test that proves an internal Framechute marker string cannot appear in a generated PDF or text conversion.

---

# Part 3 — Fix Gallery → PDF intentionally

The current accidental gallery-to-PDF behavior is wrong, but **Gallery → PDF is a useful real feature** and should remain available when implemented correctly.

Desired behavior:

```text
Select gallery
→ Convert to PDF
→ every gallery image becomes a page
→ new first-class PDF Framechute object appears immediately
```

Requirements:

- use the actual gallery images, not hidden serialized state
- include all gallery entries, not only the currently displayed image
- preserve natural gallery order
- use natural filename sorting rather than naive lexical sorting where practical (`1, 2, 10`, not `1, 10, 2`)
- preserve each source image’s aspect ratio
- page size may match each image’s pixel dimensions or use a consistent sensible mapping; do not visibly distort images
- resulting PDF should be a real Framechute PDF object
- it should open immediately in the workspace on page 1
- original gallery remains unchanged
- if gallery source access is unavailable, use the normal reconnect path rather than generating an empty/garbage PDF
- do not silently download the PDF as the only result
- FCX should preserve the resulting PDF according to existing result-object semantics

Where possible, factor an image-sequence-to-PDF primitive that can later be reused for CBZ → PDF.

---

# Part 4 — Add first-class CBZ support

A `.cbz` file should be recognized as a comic-book archive rather than as a generic file.

CBZ is ZIP-based, so use the existing local ZIP/fflate substrate if practical. Do not introduce a remote service or upload requirement.

## Desired workflow

```text
Drop/Open comic.cbz
→ Framechute recognizes CBZ
→ reads image entries locally
→ creates a Comic / CBZ object
→ page 1 appears
→ user can move through pages
```

## CBZ object behavior

At minimum support:

- visible current page image
- previous page button
- next page button
- `current / total` indicator
- filename or page label when useful
- keyboard Left / Right while the comic object is focused/selected, without hijacking text editors
- Home / End for first/last page if easy and consistent
- natural filename ordering
- skip non-image archive entries such as metadata files, hidden files, `__MACOSX`, etc.
- tolerate nested folders within the archive
- clear error if no supported images exist

Do not require extracting the archive to disk.

## Persistence

Persist enough semantic state that FCX restore can recover:

- semantic kind = CBZ/comic
- current page index
- current entry name when useful
- display name
- source identity / reconnect metadata
- geometry and z-order through the ordinary workspace system

If the user exports an FCX with local files embedded and the current FCX architecture supports embedding the original CBZ bytes, include them through that existing path.

If the snapshot is state-only or the source is unavailable after reload, show a clear reconnect affordance:

```text
Reconnect comic.cbz
```

Do not show a stale image that disappears silently after refresh.

Do not rely on temporary `blob:` URLs as persistence.

## CBZ → PDF

If the shared image-sequence-to-PDF primitive is implemented in this pass, add a useful action:

```text
CBZ → Convert to PDF
```

using the same page order as the reader.

This is desirable but should not destabilize the reader implementation.

---

# Part 5 — Add intentional ZIP/archive handling

A normal `.zip` should not automatically be treated as a CBZ.

Recognize ZIP as an archive semantic type.

Minimum useful archive object:

```text
Open archive.zip
→ Archive object
→ list entries
→ allow user to inspect names / sizes
```

Prefer a modest first version over a file-manager clone.

Useful actions may include:

- open an individual supported entry as a Framechute result object
- extract/save an individual entry
- if the ZIP is overwhelmingly image-based, offer **Open as Gallery** rather than guessing automatically

Do not execute scripts or HTML from archives automatically.

Do not create object URLs for every archive entry at once if avoidable; release resources when the object closes.

CBZ remains special because its extension explicitly declares comic-book semantics.

CBR/RAR support is **not required** for this pass unless the repository already has a safe, packaged local decoder. Do not add a large new dependency solely for CBR.

---

# Part 6 — Create a unified `Open ▾` / `Open File…` workflow

The current UI asks the user to decide in advance whether they are opening an image, PDF, DOCX, video, gallery, etc.

Evolve this toward a simpler user-facing model.

Recommended primary menu:

```text
Open ▾

Open File…
Open Folder…
Open URL…
────────────
New Note
New Canvas   (only if the separate Canvas work is already merged)
```

Do not duplicate or conflict with the separate standalone Canvas prompt. If Canvas is not yet present when this task runs, simply leave the existing creation command alone.

## `Open File…` automatic dispatch

The user should be able to choose one file and let Framechute decide:

```text
PNG/JPG/GIF/WebP/etc.  → Image object
MP4/WebM/etc.          → Video object
MP3/WAV/etc.           → Audio object
PDF                     → PDF object
DOCX                    → DOCX object
TXT/MD/etc.             → Text/Markdown object
CBZ                     → Comic object
ZIP                     → Archive object
FCX                     → Open Framechute snapshot using the existing FCX flow
unknown                 → Generic file object
```

Use extension + MIME + lightweight signature/sniffing where appropriate. Do not trust an obviously wrong MIME type when the extension or magic bytes make the real type clear.

Keep specialized existing commands only where they remain genuinely useful. The primary mental model should become:

> **Open file.**

not:

> “First decide what technical category the file belongs to.”

## `Open Folder…`

Continue to support folder gallery behavior, but route it through the same semantic object model.

A folder of images should open as a gallery.

Do not conflate a folder gallery with a ZIP archive or CBZ.

---

# Part 7 — Fix the global “Drop into Framechute” overlay routing

The global drop overlay currently appears too aggressively and can block valid in-object/editor drops.

This is especially wrong when a user is dragging an image toward an editable document surface such as DOCX, and in the future Markdown/text surfaces that support embedded media.

Create an explicit drag/drop routing layer.

Conceptually distinguish:

```text
A. External file dragged over empty Framechute workspace
   → show global Drop into Framechute overlay

B. External file dragged over a block/editor that accepts that file
   → block/editor owns the drag
   → global overlay stays hidden

C. Existing Framechute object dragged internally
   → object move/reorder/embed semantics
   → global external-file overlay stays hidden
```

The global overlay should only activate for a drag that is actually eligible to create a new top-level Framechute object in the workspace.

## Detect intended drop targets

Introduce a simple target capability contract rather than hard-coding random selectors throughout the global drop listener.

For example, block/editor surfaces can declare or expose whether they accept:

- image
- file
- text
- URL
- internal Framechute object

The exact implementation is up to Codex, but the routing decision should be centralized and testable.

At minimum the global workspace drop handler must yield to:

- `.docx-editor`
- text/markdown editor surfaces where dropping is meaningful
- future explicit object drop zones
- dialogs or controls that own drag/drop behavior

Do not show the global overlay over an editor that is accepting the drag.

---

# Part 8 — Allow image insertion into DOCX where safely possible

The user specifically expects that dragging an image onto a DOCX editor should be able to put the image into the document rather than creating an unrelated top-level workspace object.

Inspect the existing DOCX parse/serialize architecture first.

If the current DOCX serializer can be extended safely in this pass, implement a minimal image insertion flow:

```text
Drag image file or image Framechute object
→ drop inside DOCX editor
→ image appears at/near insertion point
→ document becomes dirty
→ Save / Save As preserves the image in the DOCX
→ FCX preserves the editable/open document state
```

Requirements if implemented:

- local-only
- support common raster formats at minimum PNG/JPEG/WebP where encoding permits
- preserve aspect ratio
- use a sensible default display width, constrained to the editor width
- avoid huge original pixel dimensions causing absurd layout sizes
- image should be visible immediately
- no base64 marker text displayed to the user
- native DOCX Save As must round-trip the inserted image

If the current DOCX writer architecture makes native image round-trip significantly unsafe or out-of-scope, do **not** fake support. In that case:

- still fix drag routing so the workspace overlay does not steal the event
- leave a clean documented extension point for DOCX image embedding
- show an explicit user-facing unsupported message when an image is dropped on DOCX rather than silently spawning an unrelated workspace object

But prefer actual minimal image embedding if feasible without destabilizing document save.

---

# Part 9 — Prepare Markdown/text drop routing without overbuilding it

Markdown embedded-image support is expected later, so make the drop router extensible now.

Do not build a full Markdown editor solely for this task if one does not exist yet.

But design target capability handling so a future Markdown editor can easily say:

```text
accept image drop
→ insert local asset/reference or data representation according to the Markdown object model
```

Avoid a global drop handler that will have to be rewritten again for every future editor type.

---

# Part 10 — Fix drop overlay lifecycle and stuck overlay behavior

A reported problem is that after dropping a file, the “Drop into Framechute” overlay can remain visible over the newly created object.

Audit all of:

- `dragenter`
- `dragover`
- `dragleave`
- `drop`
- cancellation
- window blur
- pointer leaving the browser window
- nested dragenter/dragleave depth tracking
- errors during drop parsing

Requirements:

- successful drop always clears the overlay immediately
- canceled/invalid drop clears the overlay
- an exception while processing a file must still clear the overlay in `finally`
- leaving the browser/window clears stale drag state
- editor-target drag routing must not increment the global overlay state incorrectly
- dropping multiple files must not leave drag depth nonzero

Prefer an explicit `showDropOverlay()` / `hideDropOverlay()` / `resetDropState()` style lifecycle over scattered class toggles.

Add regression tests where practical.

---

# Part 11 — Audit Quick Actions by semantic type

Once canonical semantic kinds exist, audit every registered Quick Action.

An action should appear only when it actually makes sense for the semantic object type.

Examples:

- image edit actions → images/canvas only as appropriate
- gallery conversion → gallery
- CBZ conversion → CBZ
- document text actions → actual text/docx/pdf semantics only
- archive actions → archive
- generic file actions → file

Do not expose an action merely because a hidden textarea happens to exist inside the object.

Document or test the action/type matrix for the major object kinds.

---

# Part 12 — Result-object semantics

All new conversions in this task should obey the existing Framechute rule:

> **Press a button. Something you can see happens.**

Therefore:

```text
Gallery → PDF
CBZ → PDF
Archive entry → Open
```

should create immediate visible result objects where that operation creates useful media.

Creating a Framechute object is not the same thing as saving to disk.

Desired flow:

```text
Do something
→ see result in Framechute
→ continue working
→ optionally Save As
```

Do not make the user guess whether an operation silently saved metadata somewhere.

---

# Part 13 — Source lifecycle and refresh behavior

Local-source-backed objects must not pretend temporary object URLs are durable state.

Audit CBZ, ZIP/archive, gallery, and any new opened-file objects for refresh/restore behavior.

Requirements:

- revoke obsolete object URLs
- create object URLs only for active display/use
- persist stable source identity through existing handle/storage infrastructure where possible
- after refresh/FCX restore, either reconnect automatically with retained permission or show a clear reconnect affordance
- never silently show an image briefly and then lose it after refresh with no explanation
- removal from Framechute must not delete the source file

---

# Part 14 — Tests

Add focused automated tests for logic that does not require a full browser UI.

At minimum cover:

## Semantic typing

- gallery custom block resolves to `gallery`, never `text`
- CBZ resolves to `cbz`
- ZIP resolves to `archive`
- real text note resolves to `text`
- image result resolves to `image`

## Internal-state leakage

- text extraction refuses hidden custom state
- Gallery → PDF never consumes marker JSON/text

## CBZ

- recognizes `.cbz`
- filters supported image entries
- ignores metadata/non-image entries
- natural sorting works (`1`, `2`, `10`)
- current page state serializes/restores

## Archive

- `.zip` is not automatically classified as CBZ
- image-heavy ZIP can be detected for optional `Open as Gallery`

## Drop routing

- workspace background external file drag → workspace route
- DOCX editor image drag → editor route
- internal Framechute object drag → not global external-file overlay route
- overlay reset occurs after drop/cancel/error

## PDF

- Gallery → PDF page count equals image count
- output is valid PDF bytes
- internal marker text does not appear in generated PDF content

Keep DOM-heavy browser behavior covered by a manual smoke checklist if headless infrastructure is unavailable.

---

# Part 15 — Required manual smoke test

Before declaring this complete, manually test in Chromium if available:

### Open File

```text
Open ▾ → Open File… → PNG
→ image object appears

Open File… → PDF
→ PDF object appears

Open File… → DOCX
→ document object appears

Open File… → CBZ
→ comic object appears

Open File… → ZIP
→ archive object appears
```

### CBZ

```text
Open CBZ
→ page 1 visible
→ Next several times
→ Left/Right navigation works
→ close/reopen snapshot
→ same page restored or clear reconnect shown
→ no stale/blank image after refresh
```

### Gallery PDF

```text
Open image folder as gallery
→ select gallery
→ Convert to PDF
→ new PDF object appears
→ page count matches gallery image count
→ pages contain images, not Framechute marker text
```

### Drop overlay

```text
Drag image from OS over empty workspace
→ Drop into Framechute overlay appears
→ drop
→ image object appears
→ overlay disappears immediately
```

Then:

```text
Drag image over DOCX editor
→ global overlay does NOT cover the editor
→ editor owns the drop
→ image embeds if this pass implements DOCX image embedding
   OR a clear unsupported message appears without creating an unrelated top-level object
```

Also test:

```text
Drag existing Framechute image object across workspace/editor
→ global external-file overlay does not appear
```

### Error cleanup

```text
Drag malformed/unsupported file
→ clear error/status
→ overlay disappears
→ workspace remains usable
```

### FCX

```text
Save/export snapshot with gallery / CBZ / archive objects
→ reopen
→ semantic types remain correct
→ no internal marker text appears visibly
```

---

# Part 16 — Validation

Run the repository’s normal validation after implementation, including at minimum:

```text
node --test tests/*.test.mjs
node --check on all modified JS/MJS files
git diff --check
sh scripts/package-web-store.sh
```

Run any additional existing document/PDF/FCX tests touched by this work.

If Chromium/manual browser testing is unavailable in the environment, document exactly which UI smoke tests remain manual.

---

# Non-goals for this pass

Do not expand this into:

- a full desktop file manager
- remote archive services
- cloud conversion
- RAR/CBR support requiring a large new decoder dependency
- a full Markdown editor if one does not already exist
- advanced comic reading modes such as manga spread detection, guided view, OCR, or annotations
- arbitrary archive code execution
- a second persistence architecture
- a second PDF engine
- a second drag/drop framework living beside the existing one

Refactor shared logic where needed, but keep scope centered on **semantic typing, file opening, CBZ/ZIP, drop ownership, overlay correctness, and honest conversions**.

---

# Product principles to preserve

This pass should reinforce the broader Framechute interaction model:

> **Give Framechute a file. It figures out what kind of thing it is and gives you the appropriate object.**

> **Semantic object type always wins over storage representation.**

> **Internal serialization is never user content.**

> **Drop onto a thing means the thing gets first chance to handle the drop.**

> **Press a button. Something you can see happens.**

> **Do something → see result in Framechute → keep working → optionally Save As.**

Keep the interface simple even as the underlying object model becomes more capable.

When complete, open a PR with a concise explanation of:

- semantic type cleanup
- Open File dispatch
- CBZ support
- ZIP/archive handling
- Gallery → PDF correction
- drop-router/overlay changes
- DOCX image-drop behavior, including any limitation if native image round-trip was not safely feasible
- automated/manual test results
