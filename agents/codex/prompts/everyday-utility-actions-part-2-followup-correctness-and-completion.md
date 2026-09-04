# Codex Follow-up: Part 2 correctness and completion pass

## Mission

Continue **PR #33 on the existing branch** `codex/implement-everyday-utility-program-part-2`.

Do **not** open a separate architecture or parallel utility system. Do **not** merge yet. Treat the current PR as a strong but partial Part 2 implementation that needs correctness fixes plus a truthful completion pass.

Build on the existing Part 1 / Part 1-A substrate:

- shared selection model
- shared action registry / Quick Actions UI
- first-class FrameChute result objects
- native Save / Save As
- FCX Export Snapshot persistence
- existing PDF/DOCX editors
- existing CSV/table object
- existing image operation engine
- existing frameless media behavior

The governing product rule remains:

> **Select the thing. Do the obvious thing. Save the result.**

And for generated/extracted results:

> **If FrameChute says the object exists, FCX must be able to preserve it honestly.**

---

# Priority 1 — correctness blockers in the current PR

## 1. DOCX Find & Replace must preserve document structure

The current implementation replaces `editor.textContent`, which can destroy paragraph/table/formatting structure and can leave the serializer with no meaningful child blocks.

Fix this before anything else.

Requirements:

- do not replace the entire DOCX editor DOM with one text node
- perform replacements through text nodes/runs or through the DOCX semantic model
- preserve paragraphs, headings, tables, lists, and ordinary formatting where possible
- preserve unaffected runs and XML/package parts
- mark the document dirty correctly
- Save / Save As must reopen with the replaced text and the remaining document structure intact
- FCX capture/restore must preserve the edited state

Add a regression test covering a DOCX containing multiple paragraphs plus at least one formatted run and/or table, then perform find/replace and verify the document model remains structurally intact.

## 2. Video keyboard focus and direct manipulation must actually work

The current code uses `block.tabIndex ||= 0`; ordinary non-focusable elements can expose `tabIndex === -1`, which is truthy and therefore may never become keyboard-focusable.

Use an explicit focusability rule such as:

```js
if (block.tabIndex < 0) block.tabIndex = 0;
```

Requirements:

- frameless/video-only video can receive focus
- Space toggles play/pause
- Left/Right seeks backward/forward
- Shift+Left/Right may keep the larger seek step if useful
- do not steal shortcuts while focus is inside native controls, buttons, inputs, textareas, selects, or editable text
- preserve direct dragging of the video object
- preserve bottom-right resize behavior consistent with images
- native video controls must still work

The interaction contract is:

- drag the object = change **where** the video is
- Left/Right = change **where in time** the video is
- Space = start/stop playback
- bottom-right handle = change displayed size

### Video-only / frameless default chrome behavior

When the user chooses **Show video only** / frameless video, the default should become a clean "just the movie" presentation after inactivity.

Default behavior:

- initially show the small upper-left video/menu affordance, the Grab affordance, the selection/focus outline, and the native video player controls
- after **10 seconds of video interaction inactivity**, fade those visible controls away together so only the video remains visible
- pointer movement over the video, focus, keyboard interaction, or another intentional interaction should reveal the controls again and restart the 10-second timer
- while the user is actively dragging, resizing, scrubbing, using controls, or keyboard-seeking, do not fade the controls out underneath the interaction
- the fade should be visually gentle rather than an abrupt `display:none` pop

Expose an understandable per-video visibility preference using the existing chrome/visibility architecture rather than inventing a second system. At minimum support:

- **Auto fade (default)** — controls fade after 10 seconds of inactivity
- **Always show** — controls remain visible

If the existing Show / Fade / Hide setting can represent this cleanly, extend/reuse it rather than adding a parallel setting. "Hide" may remain available where already supported, but the normal video-only default is Auto fade after 10 seconds.

Most important invariant:

> **Fading the affordances must never make the movie impossible to manipulate.**

Even when every visible control has faded away:

- the user must still be able to pick up / drag the movie spatially
- the user must still be able to resize it from the bottom-right corner
- keep the grab surface and resize hotspot interactive even if their visual marks are transparent
- hovering/focusing those invisible hit areas may reveal their visual affordance before or as interaction begins
- transparent hit areas must not interfere with normal native video playback controls when those controls are visible
- do not require the top bar to be restored just to move or resize the movie

The intended result is:

> **After ten quiet seconds, it looks like nothing but the movie. It is still a real FrameChute object underneath: movable, resizable, focusable, and controllable.**

Persist the user's visibility preference through ordinary workspace capture/restore and FCX snapshots.

Add browser-level/manual acceptance coverage when possible for the 10-second reveal/fade cycle and for moving/resizing after the visible affordances have disappeared.

### Shared 10-second selection-outline behavior for images and videos

The visible blue selection/focus box around a frameless image or frameless/video-only video should follow the same inactivity philosophy.

Requirements:

- when an image or video is selected/focused/interacted with, the blue outline may appear normally so the user can see the active object
- after **10 seconds with no interaction on that object**, the blue outline should fade away
- pointer movement over the object, click/tap, focus, keyboard interaction, drag, resize, or another intentional interaction should reveal/restart the outline timer
- while actively dragging/resizing/using controls, never fade the outline underneath the interaction
- this should apply to both frameless images and frameless/video-only videos
- fading the outline is purely visual; selection state must remain intact internally
- the object must remain draggable/resizable even when the outline and resize/grab visuals are hidden
- the invisible bottom-right resize hotspot must remain available after the outline disappears
- for video, the outline timer should coordinate with the same 10-second chrome timer rather than creating a conflicting second timer
- for images, use the same shared inactivity helper/state model where practical so we do not duplicate timing logic

The visual goal is:

> **Interact with it and FrameChute briefly shows you what is selected. Leave it alone for ten seconds and the interface gets out of the way.**

Do not clear selection just because the outline fades. If the user later interacts with the object, reveal the outline immediately and restart the timer.

## 3. PDF Extract Text / PDF → DOCX must operate on the whole document

The current helper reads the currently rendered `.pdf-text-layer`, which can silently extract only the visible page.

Fix it so PDF text extraction walks the PDF model page-by-page and extracts text from the whole document when text content is available.

Requirements:

- Extract Text from a multi-page selectable PDF returns all pages in reading order, with sensible page/paragraph separators
- PDF → DOCX uses full-document extracted text, not only the current page
- scanned/image-only PDFs must report that OCR is required rather than returning a misleading partial result
- do not silently treat an unloaded page as empty
- add a multi-page regression test

## 4. Capability report must be strictly truthful

Audit `docs/EVERYDAY_UTILITIES_PART_2.md` against actual shipped actions and code paths.

Known issue: Part 1 documentation explicitly said permanent media trim/mute/speed remained disabled pending a packaged backend, so item 33 must not be marked complete unless this branch actually implements a real exported trim workflow.

Also do not mark page numbering or watermarking complete merely because a PDF generator has optional parameters. They count as complete only if a user can apply them to an existing PDF through a real action/workflow and Save As the result.

Use only:

- ✅ implemented and user-accessible
- 🟡 limited/best-effort with exact limitation
- ⏸ blocked/deferred with exact reason

No placeholder or helper function counts as completed functionality.

---

# Priority 2 — finish the feasible Part 2 document workflows

Implement the remaining document actions where the current packaged PDF/DOCX stack can support them honestly.

## PDF forms

- inspect existing AcroForm fields
- expose text, checkbox, radio, dropdown/list controls where supported
- persist values into saved PDF
- do not claim universal form designer support

## Visual signature

Implement a simple local signature/stamp workflow:

- draw locally and/or import image
- place on PDF page
- move/resize before export when practical
- bake into Save As PDF
- clearly state this is a visual signature, not a cryptographic digital signature

## Highlight / comment

Provide basic visible annotation:

- highlight region
- text note/comment
- persist visibly on export

## Secure redaction

Do not draw a cosmetic black rectangle over extractable text and call it secure.

If arbitrary PDF object-stream removal cannot be guaranteed with the current stack, implement an explicit **Rasterized Redaction Export** mode for the affected page(s), with a clear tradeoff message, so exported redacted content is no longer recoverable as underlying text.

## Add page numbers

Add a real user-facing action for an existing PDF:

- all/selected pages
- starting number
- basic position choice
- bake into Save As PDF

## Watermark

Add a real user-facing text/image watermark action for an existing PDF:

- all/selected pages
- opacity
- size/position
- bake into Save As PDF

## Password protection

Only implement if the packaged stack can produce standards-compatible encrypted PDFs without an unreasonable dependency. Otherwise keep it explicitly blocked.

---

# Priority 3 — media transformation backend and honest completion

The original Part 2 request asked for items 34–42. The current PR defers almost all of them.

Investigate a **packaged, local, lazy-loaded** media backend that is compatible with Manifest V3 / Chrome Web Store CSP and licensing. Prefer remux/stream-copy before transcoding.

Target, in order:

1. Join compatible clips
2. Crop / rotate video
3. Normalize / boost audio
4. Permanent speed change with sane audio handling
5. Extract audio from video
6. Attach / extract subtitles (SRT/VTT first)
7. GIF ↔ video
8. Compress video/audio with simple presets
9. Compatibility playback/remux path for common unsupported containers

Rules:

- native browser path first
- remux/demux second
- transcode only when needed
- no remote processing
- no relabeling extensions without actual conversion
- heavy WASM must be lazy-loaded
- do not make normal FrameChute startup pay the media-engine cost
- do not break Chrome Web Store packaging

If a reliable packaged backend would make this PR unreasonable or fail CSP/store constraints, implement the shared adapter boundary and keep unsupported actions visibly blocked. Document exactly what remains.

Do not mark 34–42 ✅ unless the user can actually perform the transformation and receive a valid first-class result or saved file.

---

# Priority 4 — OCR, background removal, and office-format foundations

These should be attempted only after the correctness blockers and core document/media work above are stable.

## OCR

If a practical packaged local OCR engine can be included and lazy-loaded:

- image → editable text object
- scanned PDF pages → editable text object
- progress indicator
- no remote upload

Otherwise leave OCR explicitly blocked and keep a clean future adapter point.

## Background removal

If a reasonably sized packaged local segmentation model can be used reliably:

- image → transparent first-class image result
- original unchanged
- visible progress
- no remote service

Otherwise leave blocked; do not fake quality with a misleading heuristic.

## XLSX foundation

If feasible without dominating the run:

- Open XLSX
- render a sheet into the existing table interaction model
- basic cell edits/sort/filter
- Save As XLSX only if unsupported workbook structures can be preserved safely

If safe round-trip cannot be achieved, ship read/table interaction plus explicit export limitation and a clean workbook adapter.

Do not let XLSX delay correctness fixes.

---

# Priority 5 — preserve the shared substrate

Audit all new Part 2 actions for these invariants:

- result objects are first-class FrameChute objects when sensible
- generated media survives FCX Export Snapshot / restore
- native Save / Save As remains separate from FCX
- no duplicate selection/action/result/save/batch systems
- Classic and Advanced invoke the same operation implementations
- no remote file conversion/OCR/background-removal shortcuts
- object URLs/workers/streams are cleaned up
- permission prompts happen only after explicit user gestures
- browser failure/cancel paths leave the workspace usable

---

# Required acceptance workflows

At minimum validate these end-to-end.

## A. DOCX structure-safe replace

`Open DOCX with paragraphs + formatting/table → Find & Replace → Save As DOCX → reopen → replacement is present and unaffected structure remains`

## B. Multi-page PDF extraction

`Open multi-page text PDF → Extract Text → result contains text from every page → Convert to DOCX → resulting DOCX contains full document text`

## C. Video direct manipulation and auto-fade

`Open video → Show video only / hide header → controls + blue active outline initially visible → wait 10 seconds without interacting → upper-left affordance + Grab + native video controls + blue outline fade away → only video remains → move/drag video anyway → resize from bottom-right anyway → move pointer/focus object and controls + outline reappear → Space toggles playback → Left/Right seeks → wait again and controls/outline fade → switch to Always show and verify video controls no longer auto-fade`

Also verify that active scrubbing, dragging, resizing, and keyboard interaction reset/suspend the inactivity timer and that invisible grab/resize hit targets do not block native controls when those controls are visible.

## C2. Frameless image selection-outline fade

`Open image → Show image only → select/interact with image → blue outline visible → wait 10 seconds → blue outline fades but selection state remains → drag image successfully → resize from bottom-right hotspot successfully → outline reappears on renewed interaction and timer restarts`

## D. Existing-PDF office chore

Where implemented:

`Open PDF → fill form field → add visual signature → add page numbers or watermark → Save As PDF → reopen and verify output`

For redaction:

`Open PDF with extractable text → redact region → secure/rasterized redaction export → reopen → hidden source text is not recoverable from the redacted area by normal text extraction`

## E. Media transformation

For every media action marked ✅:

`Open source → perform action → generated result is valid/playable → result is a first-class object where appropriate → FCX snapshot preserves generated result → Save As/export produces correct bytes`

## F. Truthful capability report

Every one of the 50 actions must be marked against the actual implementation, not the intended implementation.

---

# Tests and release validation

Add focused regression coverage for:

- structure-preserving DOCX find/replace
- multi-page PDF extraction
- focusability/keyboard decision logic where practical
- shared 10-second inactivity state/timer behavior for frameless image/video selection outlines
- video-only 10-second auto-fade state/timer logic where practical
- persistence of per-video visibility preference
- ensure fading outline/chrome never clears selection or disables grab/resize hit targets
- any new PDF page-number/watermark/redaction helpers
- media adapter capability detection and conversion helpers if added
- FCX durability for newly generated result kinds

Then run:

```text
node --test tests/*.test.mjs
node --check on all modified JS/MJS files
git diff --check
sh scripts/package-web-store.sh
```

Also run browser/manual smoke checks when a Chromium runtime is available. If unavailable, say so explicitly in the PR body.

Update **the existing PR #33** description after the follow-up so it accurately distinguishes implemented, limited, and blocked capabilities.

Do not open a new PR unless the existing branch/PR is technically unusable.

---

# Final benchmark

Part 2 is not complete because a helper function exists. It is complete only when the user can actually perform the workflow through FrameChute and the result is honest, durable, and saveable.

The benchmark remains:

> **Give me the file. FrameChute should either let me do the obvious thing, or clearly tell me why that operation is not available yet.**
