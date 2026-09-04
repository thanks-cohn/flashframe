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

## Resize dialog must close normally

The existing Resize UI currently has a usability bug: once opened, the visible **×** close control does not actually dismiss it, leaving Escape as the practical way out.

Fix this as part of the next pass.

Required behavior:

- the visible **×** button must always close/dismiss the Resize dialog
- Escape should continue to close it as a secondary keyboard path
- any visible **Cancel** control must also close it
- closing without applying must not mutate the image or leave partial resize state behind
- reopening Resize after closing should produce a clean, usable dialog rather than a stale/half-open state
- focus should return sensibly to the invoking object/control after dismissal where practical
- do not require the user to know the Escape-key workaround

This should use the existing dialog lifecycle instead of adding a second resize modal implementation.

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

# 3. Shrink all images to fit — right-click utility

Add a straightforward **Shrink all images to fit** command to the image/object right-click menu.

The purpose is workspace cleanup and recovery: if several images are too large for the usable workspace, the user should be able to make all image objects fit sensibly in one action instead of resizing each one manually.

Requirements:

- expose the command from the normal image/object right-click menu
- operate on all image objects in the current workspace, not only the image that happened to be right-clicked
- preserve each image's aspect ratio
- shrink only when necessary; do not enlarge already-small images merely to fill space
- fit against a sensible usable workspace/viewport bound with margin for controls rather than allowing images to remain partly inaccessible
- preserve image positions as reasonably as possible, but prioritize making oversized images reachable and visible
- do not bake or resample image pixels; this is a workspace/display-size operation, not destructive image resizing
- use the existing object sizing/transform path rather than inventing another size model
- persist the resulting object dimensions through the normal workspace/FCX state
- give a concise status result such as `Shrank 6 images to fit.`; if nothing needed shrinking, say so honestly

The intended mental model is:

> **My workspace got unwieldy. Make every image manageable again.**

---

# 4. Quick Actions panel must remain fully reachable

The vertical Quick Actions panel currently allows some controls to extend below the visible viewport, making lower actions inaccessible.

Keep the compact vertical layout, but make it independently scrollable whenever its contents exceed the available browser height.

Requirements:

- all Quick Actions must always be reachable without resizing the browser window
- the panel should use a bounded viewport-aware height and vertical scrolling when needed
- do not let the page/workspace itself need to scroll merely to reach Quick Actions
- preserve the existing vertical 1990s-Mac-inspired presentation
- avoid horizontal scrolling
- the scrollbar should appear only when needed
- keyboard users must be able to tab through every action, with the panel scrolling the focused control into view naturally
- wheel/trackpad scrolling over the panel should scroll the Quick Actions list rather than losing access to lower controls
- keep important fixed affordances such as the close/hide control usable even when the action list is long, where practical
- do not solve this by shrinking controls until they become hard to read or click
- preserve the dependable system-font/layout fallback if decorative styling fails

The core requirement is simple:

> **If FrameChute shows an action, the user must be able to reach it.**

---

# 5. Context menus must never cover one another

FrameChute currently has more than one right-click/context-menu surface, including the original object/layer menu and the newer Open File workspace menu.

They must be coordinated so one menu never opens directly on top of another and hides it.

Preferred behavior:

- treat context menus as one coordinated menu system wherever practical
- opening a new context menu may close the previous menu when the two are alternate responses to the same right-click interaction
- do not leave two menus stacked at the same coordinates with one obscuring the other
- if there is an intentional case where two menu surfaces should remain open simultaneously, position the newer menu beside or away from the existing menu using collision-aware placement
- respect viewport edges while repositioning so the fix does not merely push a menu offscreen
- clicking outside / Escape should dismiss context-menu state predictably
- keyboard focus must follow whichever menu is actually active
- avoid duplicate `Open File…` surfaces fighting for z-index or click ownership
- where practical, prefer one shared menu-positioning/dismissal coordinator instead of independent menus that know nothing about each other

The user should never have to wonder whether a command disappeared because another menu happened to render over it.

---

# Architecture / longevity requirements

This must build on FrameChute's existing image operations, file/directory permission handling, first-class result objects, native Save/Save As architecture, dialog lifecycle, Quick Actions substrate, object sizing model, and current context-menu architecture.

Do not create parallel systems for:

- image resizing
- image decoding/encoding
- result object creation
- FCX persistence
- native Save As
- directory/file permission handling
- resize-dialog state/lifecycle
- Quick Actions selection/dispatch
- object sizing/transforms
- context-menu positioning/dismissal

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

## E. Resize dismissal

`Open image → Resize → click × → dialog closes immediately → image remains unchanged → reopen Resize → dialog works normally`

Also verify:

`Open Resize → press Escape → closes`

and, if Cancel is present:

`Open Resize → Cancel → closes without mutation`

## F. Shrink all images to fit

`Open several images of mixed sizes → make at least two larger than the usable workspace → right-click an image → Shrink all images to fit → oversized images become fully manageable without changing their source pixel data → already-small images are not enlarged`

## G. Quick Actions overflow

`Use a viewport short enough that the full Quick Actions list cannot fit → select an object with many actions → scroll inside Quick Actions → every action becomes reachable and clickable → keyboard Tab can also reach lower actions`

## H. Context-menu collision

`Open/right-click in a way that can invoke the object menu and Open File menu → verify the menus never stack on top of one another → active commands remain visible and clickable → Escape/outside click dismisses predictably`

---

# Tests / release checks

When this draft is eventually implemented, add focused tests for pure resize/batch naming logic, dialog dismissal/state reset, shrink-all sizing logic, Quick Actions overflow behavior, and context-menu collision/dismissal where practical, then run the repository's normal full test and Chrome Web Store release gates.
