# DRAFT — Next FrameChute image utility pass

> Planning document only. Build this request incrementally and do not run it until the user says it is ready.

## Product rule

FrameChute image utilities should support both a quick one-off job and the natural batch version of the same job without forcing unnecessary workspace clutter.

> **Preview it. Save it. Keep working with it only if you want to.**

The original source must remain untouched unless the user explicitly chooses an overwrite-capable workflow.

---

# 1. Image Resize — single image workflow

Upgrade the existing image resize action into a complete, user-facing workflow.

## Required flow

`Resize Image → set dimensions/options → live preview → Save As… and/or Add to Workspace`

Requirements:

- show width and height controls
- preserve-aspect-ratio option
- update a real preview as the user changes dimensions
- preview should represent the actual resized output as closely as practical, not merely CSS-scale the existing object and call that the result
- expose **Save As…** directly from the resize workflow
- native Save As must create a real resized image file
- preserve sensible source/output formats; allow PNG/JPEG/WebP choices where the existing image pipeline can encode them reliably
- do not modify the original image automatically
- provide **Add to Workspace** as an explicit optional action
- if the user only saves the file, do not automatically add another FrameChute object
- after a successful Save As, a small optional **Add result to workspace** action may remain available
- if the user chooses Add to Workspace first, create a normal first-class FrameChute image result using the existing result-object pipeline
- generated workspace results must remain FCX-durable under the existing result persistence rules

The intended interaction is:

> **Preview → Save it, keep working with it, or both.**

---

# 2. Resize Folder / batch image resize

The same resize capability must scale naturally to an explicitly selected directory.

Add a user-facing **Resize Folder…** / **Resize Images in Folder…** workflow.

## Input directory

- user explicitly chooses a directory through the browser-native directory picker / File System Access path where available
- FrameChute enumerates supported image files in that directory
- unsupported/non-image files are skipped honestly rather than treated as failures
- do not silently recurse into subdirectories in the initial version unless the UI explicitly offers that option
- the user must be shown how many supported images were found before processing

## Resize settings

At minimum:

- width
- height
- preserve aspect ratio
- a clear fit behavior if both dimensions are supplied (for example contain/fit rather than accidental distortion)
- output format only where the existing encoder can produce it reliably

The batch operation should reuse the same resize implementation as the single-image workflow rather than adding a second image-resize engine.

## Output directory

- allow the user to explicitly choose an output directory
- input and output directories may be different
- default behavior must never silently overwrite source files
- if the selected output location would collide with existing files, use a safe conflict strategy or ask before overwrite
- if output directory equals input directory, preserve originals by default through safe names/subfolder behavior unless the user explicitly chooses otherwise

## Rename numerically

Provide an explicit option:

**Rename outputs numerically** — Yes / No

Prefer a normal checkbox/toggle in the UI rather than a literal modal `y/n` prompt.

When disabled:

- preserve the original base filename where practical

When enabled:

- output names become a deterministic numerical sequence such as:
  - `001.jpg`
  - `002.jpg`
  - `003.jpg`
- use the selected/actual output extension
- allow a starting number if it can be added without making the workflow cumbersome
- choose sensible zero-padding from the batch size so alphabetical ordering matches numerical ordering
- show a filename preview before running, for example:
  - `IMG_4821.jpg → 001.jpg`
  - `IMG_4822.jpg → 002.jpg`

Ordering must be deterministic. Use a documented stable order such as filename/natural sort rather than filesystem enumeration accident.

## Preview / confirmation

Before starting the batch, show a compact summary containing at least:

- number of supported images
- target dimensions / fit behavior
- output format if changed
- output directory
- whether numerical renaming is enabled
- a few example source → output names

The user should be able to cancel before any output is written.

## Processing

- show progress (`current / total`)
- allow cancellation where practical
- process with bounded concurrency so a large directory does not exhaust browser memory
- release decoded image resources/object URLs promptly
- one bad image should be reported without corrupting or silently aborting already completed outputs
- summarize completed / skipped / failed counts at the end

## Workspace behavior after batch

Do **not** automatically dump every resized image into the workspace.

Default completion is simply:

> **Done — resized files were written to the chosen directory.**

Optionally provide an explicit action such as:

- **Add results to workspace**
- or **Open output folder** where browser capabilities permit an honest workflow

If Add results to workspace is chosen, route those outputs through the existing FrameChute image/result-object substrate.

---

# Architecture / longevity requirements

This must build on FrameChute's existing image operations, file/directory permission handling, first-class result objects, and native Save/Save As architecture.

Do not create parallel systems for:

- image resizing
- image decoding/encoding
- result object creation
- FCX persistence
- native Save As
- directory/file permission handling

Prefer small adapters around existing primitives.

Graceful degradation matters:

- if a preferred browser directory API is unavailable, provide an honest fallback where practical
- never fake a successful batch write if directory write access is unavailable
- keep the basic single-image Resize + Save As workflow functional even if batch-directory support is unavailable in a given browser/runtime

Preserve Manifest V3 and Chrome Web Store constraints. No remote image processing.

---

# Acceptance workflows

## A. Single image

`Open image → Resize → change dimensions → preview updates → Save As → reopen saved file and verify actual pixel dimensions → original remains unchanged`

Then separately:

`Open image → Resize → Add to Workspace → resized result appears as a normal FrameChute image object → FCX snapshot/restore preserves it`

## B. Batch preserve names

`Choose folder with supported images + unrelated files → Resize Folder → numerical rename OFF → choose output directory → run → supported images are resized, unrelated files ignored, original filenames are preserved safely`

## C. Batch numerical names

`Choose folder → Resize Folder → Rename outputs numerically ON → preview mapping → run → output directory contains deterministic 001/002/003… sequence with correct resized bytes`

## D. Safety

`Choose input directory as output directory → run without explicit overwrite approval → originals remain intact`

---

# Tests / release checks

When this draft is eventually implemented, add focused tests for pure resize/batch naming logic where practical and run the repository's normal full test and Chrome Web Store release gates.
