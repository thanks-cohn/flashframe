# ADDENDUM — DOCX existing-image rendering

## CURRENT CONFIRMED BUG — PRIORITIZE THIS

This is now reproduced in the live extension: ordinary DOCX files containing embedded pictures open with their text visible while their pictures disappear from the FrameChute editor.

Inspection of the current implementation confirms why:

- `src/documents/docx-document.js` parses run content primarily as text/tab/line-break data
- common Word drawing/image nodes are not represented in the editable block/run model
- `renderDocxEditor(...)` therefore has no image contribution to render even though the underlying OOXML package may still contain `word/media/*`
- the least-destructive serializer can preserve unknown original OOXML in some text-only edit cases, but a reconstruction/fallback path must not silently strip drawings, image relationships, or media parts

Treat this as a correctness bug, not an optional fidelity enhancement.

The first successful implementation target is simple:

> **Open an ordinary DOCX containing inline PNG/JPEG images and actually see those images in the editable document in approximately the right places.**

Read this together with:

- `agents/codex/prompts/next-image-utility-pass-draft.md`
- `agents/codex/prompts/next-image-utility-pass-rotation-chrome-addendum.md`
- `agents/codex/prompts/next-image-utility-pass-object-menu-docx-drop-addendum.md`

Do not create a separate DOCX renderer. Extend the existing DOCX open/edit/save path so documents that already contain images actually display them.

---

## Existing images inside DOCX must render

Current bug: FrameChute can open/edit DOCX text, but embedded images in existing Word documents may not appear at all.

That is not acceptable for a document editor. A DOCX opened in FrameChute should show its existing pictures in the correct approximate document position instead of silently dropping them from view.

Required behavior:

- when opening a DOCX, resolve embedded image relationships from the OOXML package and render supported images in the editable document surface
- support the normal Word image storage/relationship path (`word/media/*` referenced through the document relationships) rather than assuming images are external files
- support common embedded raster formats already supported by the browser/image pipeline, including PNG and JPEG at minimum
- preserve image aspect ratio
- respect the document's stored image dimensions where they can be recovered reliably
- place inline images at the corresponding location in document flow rather than collecting them elsewhere
- if a document uses a layout/wrap mode FrameChute does not yet fully support, render a safe inline/anchored approximation rather than hiding the image entirely
- do not silently omit unsupported image types; show an honest placeholder/status when decoding is unavailable
- object URLs / temporary image resources must be released when the document closes or rerenders
- existing images must survive editing and native DOCX Save/Save As without being stripped from the package
- text edits must not accidentally destroy unrelated image relationships/media parts
- FCX persistence of the opened DOCX should continue to preserve the underlying document/package state through the existing document model

The product rule is:

> **Opening a Word document should not make its pictures disappear.**

---

## Existing-image rendering and new image insertion must use the same document model

The separate DOCX drop-routing addendum requires that the user can drag a new image directly into an editable DOCX.

Do not implement existing-image rendering and new image insertion as two unrelated systems.

Prefer one document-image model that can represent:

- images already present in the DOCX package
- images newly inserted by drag/drop or later paste
- relationship id / media part
- document-flow position
- stored width/height where available
- mime/format
- save serialization

A newly inserted image should become indistinguishable, at the document-model level, from an image that was already present when the DOCX was opened.

---

## OOXML handling expectations

Use the existing DOCX unzip/XML/save infrastructure. Inspect and extend the current parser rather than replacing it.

At minimum, account for the common Word drawing relationship path:

```text
word/document.xml
        ↓
relationship id on drawing/image element
        ↓
word/_rels/document.xml.rels
        ↓
word/media/imageN.png / .jpg / etc.
```

Handle the common inline drawing representation first. Older/alternate picture markup can be added where practical, but do not let edge cases block correct rendering of ordinary DOCX images.

Do not flatten the entire document to HTML or a bitmap merely to show pictures.

---

## Editing behavior

For the first pass, keep image editing inside DOCX conservative:

- display existing images
- allow newly dropped images to be inserted
- preserve their placement in document flow
- preserve/recover size
- native DOCX Save/Save As keeps them

Do not promise Word-complete floating text-wrap, crop, rotation, or advanced anchor behavior unless the current editor can round-trip it safely.

If an unsupported advanced layout is encountered, prioritize visible content and package preservation over pretending full fidelity.

---

## Acceptance workflows

1. `Open DOCX containing text + PNG + JPEG → both images appear in the document near their original positions → text remains editable.`

2. `Open image-containing DOCX → edit text only → Save As DOCX → reopen in FrameChute → original images are still present.`

3. `Open image-containing DOCX → drag a new image into the DOCX → new image appears in document → no generic FrameChute duplicate object is created → Save As → reopen → old and new images both remain.`

4. `Open DOCX with an image format/layout FrameChute cannot fully render → show an honest placeholder/approximation rather than silently removing the content.`

5. `Close/reopen document repeatedly → temporary image URLs/resources are cleaned up without breaking persisted document images.`

---

## Tests

Add focused tests where practical for:

- relationship resolution from document XML to `document.xml.rels`
- media-part lookup
- inline image extraction/model creation
- preservation of untouched media parts through text edits and Save/Save As
- serialization of newly inserted images
- no duplicate workspace ingestion when the DOCX editor owns a drop

Include at least one manual browser acceptance DOCX with multiple embedded images.
