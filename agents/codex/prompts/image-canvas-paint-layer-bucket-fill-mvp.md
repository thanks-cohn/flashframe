# Codex Request: Image Canvas Paint Layer + Bucket Fill MVP

## Mission

Build the next FrameChute image-editing primitive on top of the current `main` branch after the merged everyday-utilities work.

The goal is **not** to build a miniature Photoshop.

The goal is to give an image object a **simple attached canvas editing layer with its own small contextual popup**, so a normal user can immediately:

- draw directly on the image
- choose a color
- change brush/line thickness
- erase or restore paint
- fill a bounded region with a color using a paint-bucket / flood-fill tool
- make selected/painted regions transparent where the tool supports it
- move/resize the image afterward and have the edit layer follow it correctly
- save the edited result as a new PNG/WebP while preserving the original source

The governing product principle is:

> **Simple interface. Powerful primitive.**

And the interaction rule is:

> **Select the image. Edit what you see. Save a new result.**

This implementation should become the first concrete step toward the broader Region Object proposal in:

`Proposals/region-objects-proto-bitmap-layer.md`

Do not attempt the whole proposal in this PR. Build the paint/mask canvas substrate cleanly enough that Region Objects, selections, transparency masks, and later cues can reuse it.

---

# Product experience

## Entering image edit mode

When exactly one editable image object is selected, expose an obvious action such as:

```text
Edit Image
```

or

```text
Paint / Mask
```

Choose the label that best matches the existing FrameChute UI language.

Entering the mode should:

1. keep the original source image intact
2. attach or activate an editable canvas layer that matches the image's intrinsic pixel coordinate space
3. show a **small floating/contextual toolbar near the image**
4. make the editing surface visually obvious without surrounding it with a large permanent application shell

Exiting edit mode should return the object to ordinary FrameChute movement/resize behavior.

The user should not need to understand canvas, alpha channels, masks, raster layers, compositing, or pixel buffers.

---

# Contextual popup toolbar

Keep the toolbar deliberately small.

Recommended initial controls:

```text
[ Brush ] [ Bucket ] [ Erase ] [ Restore ]
[ Color ● ] [ Thickness ━━━ ] [ Undo ] [ Done ]
```

If one control can combine cleanly with another without harming clarity, that is acceptable.

Do not create a large permanent side panel.

The toolbar should belong to the selected image/edit layer and disappear when the user leaves edit mode or selects another incompatible object.

## Brush

- freehand drawing with Pointer Events
- smooth enough for ordinary annotation/painting
- uses the selected color
- uses selected thickness
- preserve alpha
- support mouse, pen, and touch where practical
- do not break ordinary page scrolling outside the active editing gesture

A professional brush engine is explicitly out of scope.

## Color

Use an immediately understandable color control.

At minimum:

- native color picker or small palette + native picker
- current color visibly indicated
- brush and bucket use the same selected color

Do not expose color-management terminology.

## Thickness

Provide a compact thickness control.

A slider is fine, but the user should be able to understand it visually.

Reasonable bounded range; do not allow accidental absurd values that freeze or cover the entire canvas.

## Erase

Erase paint from the editable layer by restoring alpha on the paint overlay.

Important: erasing paint must **not** erase the original source image unless the user is explicitly in a transparency/mask operation.

## Restore

Restore erased paint/mask where practical.

For the initial overlay this may simply repaint alpha in the edit layer or restore mask coverage. Keep the internal API clean enough that future mask editing can reuse it.

---

# Paint bucket / bounded region fill

This is a required feature, not a placeholder.

The Bucket tool should perform an actual **contiguous flood fill** from the clicked pixel.

The user expectation is the familiar paint-bucket behavior:

> Click inside a bounded area → the connected area fills with the chosen color.

## Required behavior

- choose a seed pixel from the active image/edit composite
- determine contiguous neighboring pixels that are similar enough to the seed according to a modest tolerance
- fill only the connected region, not every matching pixel elsewhere in the image
- respect image/canvas bounds
- avoid infinite loops and unbounded memory use
- update interactively without blocking the UI for ordinary image sizes
- apply the selected color with proper alpha
- preserve hard boundaries reasonably well for illustrations, screenshots, diagrams, line drawings, and simple artwork

A simple 4-neighbor or 8-neighbor flood-fill algorithm is acceptable. Choose the one that gives the best predictable UX.

## Tolerance

The first version may use either:

- a small hidden/default tolerance chosen for predictable behavior, or
- one compact visual tolerance control if it materially improves usefulness without cluttering the toolbar

Do not expose RGB-distance math or technical thresholds to the user.

Internally, make tolerance an explicit parameter so it can be surfaced later.

## Source used for boundary detection

For the first version, define and document a deterministic rule.

Recommended:

- bucket boundary detection should inspect the **current visible image plus existing paint overlay** as seen by the user
- the new fill itself should be written into the editable overlay, not destructively into the original source

This gives the user the intuitive result that bucket fill follows the boundaries they currently see while preserving nondestructive editing.

If this approach creates unacceptable complexity with the current image pipeline, use the source image as the boundary map for MVP but structure the code so the composite can be substituted later.

Do not implement a fake rectangle fill and call it a bucket.

---

# Transparency / mask foundation

This PR should lay the foundation for the transparency workflow discussed in the Region Object proposal.

At minimum, design the edit-layer model so a pixel can represent:

- painted color
- transparent paint
- future source-image mask coverage

If feasible without ballooning scope, include a simple action such as:

```text
Make Transparent
```

that allows the active brush/bucket operation to remove source-image visibility in the affected region through an attached alpha mask.

If included, the critical behavior is:

- the transparency belongs to the image object
- move image → transparent region moves with it
- resize image → mask scales with it
- rotate/flip image → mask follows the same object transform
- Save As PNG/WebP bakes the transparency into the new file
- original source bytes remain untouched

If full source masking is too large for this PR, implement the internal mask representation and persistence boundary now, but do **not** expose a misleading incomplete UI. Document what remains.

---

# The edit layer must follow the image

This is a core acceptance requirement.

Do not implement the drawing canvas as an unrelated workspace element positioned approximately over the image.

The edit layer must be logically attached to the image object.

When the image is:

- moved
- resized
- maximized/restored
- shown frameless
- flipped
- rotated
- restored from FCX

its paint/mask layer must remain registered to the correct image coordinates.

Prefer storing edits in **intrinsic image pixel coordinates** or another transform-independent local coordinate system.

The render path should then map those edits through the image object's displayed geometry.

This is important for later Region Object and cue support.

---

# Nondestructive model

Do not immediately overwrite the source image.

Conceptually, the image should become:

```text
IMAGE OBJECT
├── original/source pixels
├── existing image transforms
├── paint overlay
│   ├── strokes
│   └── bucket fills / raster edit buffer
└── optional alpha mask foundation
```

Implementation does not need to store every stroke as an individual vector operation if a raster overlay is substantially simpler.

A practical MVP is:

- original image remains source
- one editable RGBA paint canvas is stored with the object
- one optional mask canvas/bitmap can be reserved or implemented for source transparency
- compositing happens when rendering/exporting

The key requirements are:

- source untouched
- edits reversible during the workspace session
- edits persist through FCX
- Save As produces correct flattened output

---

# Undo

Provide at least lightweight undo within image edit mode.

Acceptable MVP strategies:

- bounded ImageData snapshots before each committed gesture/fill
- compact command history if straightforward

Do not create an unlimited history that can consume unbounded memory.

A reasonable cap such as 20–50 edit operations is fine.

Undo must support at least:

- brush gesture
- erase gesture
- bucket fill
- mask/transparency gesture if shipped

If redo is easy, add it; redo is not required for the first version.

---

# Save As / generated result

The user must be able to turn the edited image into a real new file.

Reuse the existing native Save As / image export pipeline rather than creating a second save architecture.

Required:

```text
original image
      +
paint overlay
      +
optional transparency mask
      +
existing transforms where appropriate
      ↓
composite
      ↓
PNG / WebP / JPEG when valid
```

Rules:

- PNG and WebP must preserve alpha
- JPEG must flatten against an explicit/known background because JPEG has no transparency
- saving must not mutate the original source file
- generated saved result should be valid and reopen correctly
- if the current FrameChute action model normally creates a result object before Save As, follow the existing convention; do not invent a parallel result path

An optional action such as **Create Edited Copy** is welcome if it naturally creates another first-class FrameChute image object with the composited bytes.

---

# FCX persistence

This feature is not complete if the user paints on an image and loses it when exporting/reopening an FCX snapshot.

Persist the paint/edit state through the existing FCX substrate.

Requirements:

- capture the edit layer in the image object's state
- avoid absurd JSON expansion for normal painted images
- binary/PNG/WebP encoded overlay assets are preferable if the FCX asset system makes this natural
- restore edits at the correct intrinsic coordinates
- preserve source image independently
- avoid duplicate embedding when possible

Test:

```text
open image
→ paint
→ bucket fill
→ move + resize
→ Export Snapshot (.fcx)
→ reopen
→ image geometry and edits are still correct
→ Save As PNG
→ output matches restored visual result
```

---

# Integration with existing image transforms

FrameChute already has image transforms and utility actions.

Do not replace them with a second image engine.

Audit integration with at least:

- crop
- resize
- rotate
- flip horizontal/vertical
- straighten where relevant
- existing annotations
- make-color-transparent / background handling
- Save As PNG/JPEG/WebP

Choose and document a clear ordering for compositing and transforms.

For example:

```text
source + mask + paint overlay
→ intrinsic composite
→ geometric transform / export transform
→ encoded output
```

or another ordering if the existing architecture demands it.

The important thing is deterministic behavior and no double application of transforms after FCX restore.

---

# UI / simplicity requirements

The user explicitly wants this to remain **simple but powerful**.

Do not ship:

- Photoshop-style docked panels
- layer palettes with dozens of controls
- advanced brush settings
- blending-mode grids
- filter browsers
- node graphs
- modal prompts for every brush operation

The preferred experience is direct manipulation:

```text
select image
→ Edit
→ tiny toolbar appears
→ choose Brush / Bucket / Erase
→ choose color + thickness
→ touch the image
→ Done
→ move it normally
→ Save As
```

Avoid `prompt()` / `confirm()` for the normal paint workflow.

Use proper small controls in the contextual popup.

Classic mode should remain approachable. If Advanced mode exposes extra diagnostics or future hooks, the underlying operation must remain the same implementation.

---

# Architecture expectations

Prefer a focused module boundary rather than putting everything into `quick-actions.js`.

Possible organization (adapt to the actual repo):

```text
src/image-edit/
  paint-layer.js
  flood-fill.js
  paint-toolbar.js
  image-composite.js
  paint-persistence.js
```

or equivalent modules under the existing actions/image structure.

Important separations:

- flood-fill algorithm should be testable without DOM UI
- coordinate mapping should be testable
- serialization/persistence should be testable
- compositing/export should reuse existing image code where practical
- toolbar should invoke operations, not own the pixel algorithms

Do not create a second selection model, save system, FCX format, or workspace object type solely for this feature unless genuinely required.

---

# Performance and safety

## Flood fill

Avoid naive recursion that can overflow the JS call stack on large regions.

Use an iterative queue/stack or scanline flood-fill implementation.

Bound memory usage sensibly.

For large images, avoid cloning multiple full-resolution buffers more often than necessary.

## Pointer painting

- batch/interpolate pointer points enough to avoid gaps at normal movement speeds
- do not do expensive export encoding on every pointermove
- commit history on gesture end rather than each point

## Object URLs / buffers

Clean up temporary object URLs and large transient buffers when edit mode ends or objects are removed.

---

# Accessibility and input behavior

- toolbar buttons must be keyboard focusable
- active tool state must be conveyed visually and with `aria-pressed` or equivalent
- color/thickness controls need labels/tooltips
- pressing Escape should leave the current drawing gesture/edit state safely where practical
- do not steal normal text-input shortcuts
- Pointer Events should support mouse, stylus, and touch when practical

---

# Required acceptance workflows

## A. Simple brush

```text
Open PNG
→ Edit Image
→ choose red
→ choose medium thickness
→ Brush
→ draw a line
→ Done
→ move image
→ drawing moves with image
→ resize image
→ drawing stays registered correctly
```

## B. Bucket fill

Use a simple black-line drawing with multiple enclosed white regions.

```text
Open drawing
→ Edit Image
→ choose blue
→ Bucket
→ click inside one enclosed region
→ only that contiguous region fills blue
→ neighboring enclosed region remains unchanged
```

Also test a boundary touching the image edge.

## C. Undo

```text
Brush stroke
→ bucket fill
→ Undo
→ fill disappears but brush remains
→ Undo
→ brush disappears
```

## D. Save with alpha

```text
Open transparent PNG
→ paint
→ erase paint
→ optional source-mask transparency if implemented
→ Save As PNG
→ reopen result
→ alpha and paint are correct
→ original source remains unchanged
```

## E. Move/resize persistence

```text
Paint image
→ move
→ resize
→ Export Snapshot
→ reopen .fcx
→ visual paint alignment remains correct
```

## F. Existing transform interaction

At minimum test painted image with:

- rotate
- flip
- resize
- Save As

No detached overlay, double rotation, stale-size canvas, or paint drift is acceptable.

---

# Tests

Add focused automated tests for non-UI logic.

At minimum:

1. flood fill fills only one connected region
2. tolerance behavior is deterministic
3. fill handles image boundaries
4. fill does not recurse/overflow on a large flat region
5. local/intrinsic coordinate mapping remains stable across display resizing
6. paint-layer serialization round-trip
7. export compositing preserves alpha
8. FCX capture/restore path preserves image edit state or encoded overlay asset

Add browser-level/manual smoke notes for pointer drawing and contextual toolbar behavior.

Run:

```text
node --test tests/*.test.mjs
node --check on all modified JS/MJS files
git diff --check
sh scripts/package-web-store.sh
```

The Chrome Web Store / Manifest V3 release gate must remain clean.

No remote executable code and no remote image-processing service.

---

# Explicit non-goals

Do not spend this PR on:

- AI background removal
- OCR
- full Region Object extraction
- lasso selection unless trivial after the core substrate
- professional vector tools
- advanced filters
- animation/cues
- GIF editing
- video painting/tracking
- PSD compatibility
- full layer manager
- brush libraries

Those belong after this primitive is proven.

However, do not architect the paint layer in a way that prevents later:

- region extraction
- image masks
- isolated transparent objects
- paint promoted to its own Region Object
- cue/timeline animation
- GIF/video-derived regions

---

# Product benchmark

The feature succeeds if someone with no raster-editing vocabulary can discover this workflow:

> **Click image → Edit → pick a color → draw or bucket-fill → Done → move it → Save As.**

Underneath, FrameChute should have gained a reusable paint/mask substrate powerful enough to support the next generation of Region Object work.

Do not maximize the number of controls.

Maximize what the user can accomplish with the smallest understandable interface.
