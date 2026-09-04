# Quick Actions utility architecture (Part 1)

FrameChute's utility layer follows **select → act → save/result**. Clicking a block selects it; Shift/Ctrl/Command-click adds or removes blocks, and right-click selects without beginning a drag. The contextual bar only asks the action registry for actions applicable to the current selection.

## Extension points

- `actions/action-registry.js` owns registration, applicability, invocation, progress, cancellation, and bounded batch execution. Part 2 actions should register here rather than add another menu dispatch switch.
- `actions/selection-model.js` is object-agnostic and supports single, homogeneous batch, and mixed selections.
- `actions/native-save.js` normalizes names and serializes before creating/truncating a writable destination. Native Save As remains separate from FCX **Export Snapshot**.
- `framechute:add-result-object` is the result bridge. Extraction/generation dispatches a Blob and `web-drop.js` creates a normal image object that is immediately selectable and editable.
- `actions/image-operations.js` bakes non-destructive crop/size/rotation/flip/straighten/background/format state only when saving or generating a result.
- `actions/data-utilities.js` provides local CSV tables and lazy, size-bounded ZIP/CBZ entry browsing using the already packaged Fflate build.

## Part 1 delivered

- Image: non-destructive crop, resize/batch resize, rotate, flip, straighten, alpha-margin trim, PNG/JPEG/WebP conversion and quality export, metadata-stripping re-encode, explicit JPEG background, stitching, and native Save As.
- Video: current decoded frame extraction into a first-class image result.
- Files: rename/batch sequential rename, workspace duplicate, and ZIP creation from a selection.
- PDF: page rotate/delete/duplicate/reorder with native Save and Save As.
- CSV: quoted parsing/serialization, editable cells, add row, sort, filter/find, exact duplicate removal, and Save As CSV.
- ZIP/CBZ: local listing, per-entry sizes, image-oriented opening into a result object, and individual unsupported-entry extraction.

## Honest Part 1 limits / Part 2 backends

Browser canvas cannot safely demux or encode arbitrary media, so extract-audio, permanent trim/mute/speed, and transcode actions are not advertised until Part 2 supplies a packaged local backend. PDF merge/extract/pages-to-images/images-to-PDF, PDF crop/compression, image annotations/area blur/color-key/perspective correction/contact sheets/icons/compare, true filesystem copy/move, rich batch rename preview, and archive hierarchy are also deferred. The registry, selection, progress, Save As, result bridge, and transform state are ready for those implementations; no action fakes a successful conversion.
