# FrameChute — next utility pass after PR #39

PR #39 completed and merged the following items. **Do not re-implement them in this pass:**

- single-image Resize workflow with live preview, Save As, optional Add to Workspace, and working × / Cancel / Escape dismissal
- Quick Actions default placement on the left
- Quick Actions independent vertical scrolling and safe top placement below the header
- explicit Settings Grab / Move affordance
- Close Object moved near the top of the object menu

This document is now the source of truth for the remaining current-priority work. Build on the existing systems from latest `main`; do not create parallel architectures.

---

# 1. Resize Folder / batch image resize

Add **Resize Folder… / Resize Images in Folder…** using the same image-resize engine as the single-image Resize flow.

Required flow:

`Choose input folder → detect supported images → choose dimensions/options → choose output folder → preview summary → Resize All`

Requirements:

- explicit directory picker / File System Access where available
- supported images only; unrelated files skipped honestly
- no silent recursive traversal in v1 unless explicitly offered
- show supported-image count before processing
- width, height, preserve aspect ratio, and clear fit/contain behavior
- output format where the existing encoder supports it reliably
- output folder may differ from input folder
- never silently overwrite originals
- safe collision handling
- progress current/total
- cancellation where practical
- bounded concurrency and prompt release of decoded resources/object URLs
- one bad image must not corrupt already completed output
- final completed / skipped / failed summary
- do not automatically add every output to the workspace

### Numerical renaming

Add **Rename outputs numerically** on/off.

When enabled:

- deterministic sequence such as `001.jpg`, `002.jpg`, `003.jpg`
- preserve selected output extension
- sensible zero-padding based on batch size
- optional starting number if simple to expose
- natural/stable source ordering
- show a few source → destination mappings before processing

---

# 2. Fit / shrink behavior for image objects

Add dependable display-size commands to the normal image/object menu:

- **Shrink to Fit** for the individual image
- **Fit to Workspace**
- **Fit Width**
- **Fit Height**
- **Actual Size**
- **Shrink all images to fit**

These are workspace/display-size operations, not destructive pixel resampling.

Requirements:

- preserve aspect ratio unless explicitly overridden elsewhere
- individual Shrink to Fit affects only the chosen image
- Shrink all images to fit affects every image object in the current workspace
- shrink only when necessary; do not enlarge smaller images
- use sensible visible workspace bounds and margins
- preserve object positions where practical while prioritizing reachability
- persist resulting object dimensions through normal workspace/FCX state

### Removing the frame must also repair object bounds

Current issue: removing an image frame can leave stale empty space around the actual visible image.

Required behavior:

`Remove frame → recompute bounds around visible image → remove stale frame space → shrink to fit if still oversized`

- removing the frame must not leave a large invisible/empty rectangle
- preserve aspect ratio
- keep normal grab/resize behavior
- use the actual visible object geometry as the source of truth

---

# 3. Context menus must never obscure one another

FrameChute has multiple context-menu surfaces, including the object/layer menu and Open File/workspace menu.

Requirements:

- coordinate them as one menu family where practical
- opening an alternate menu may dismiss the prior one
- never stack two menus at the same coordinates
- if two menus intentionally coexist, collision-position the newer menu beside the existing one
- keep menus inside viewport bounds
- outside click and Escape dismiss predictably
- keyboard focus belongs to the actually active menu
- avoid duplicate Open File surfaces fighting for pointer/z-index ownership
- prefer shared placement/dismissal helpers over independent unaware menus

---

# 4. Relative-time media syncing

Make **Sync with…** work between specific audio/video objects.

The key behavior is relative delta preservation, not forcing equal absolute timestamps.

Example:

- Audio A at 12s
- Video B at 47s
- link A ↔ B
- seek A backward 3s
- A becomes 9s and B becomes 44s

Likewise, seeking B forward by 5s moves A forward by the same 5s.

Requirements:

- choose a specific other media object to sync with
- preserve the relative offset established at link time
- seeking either linked object propagates the same delta
- forward and backward both work
- objects retain independent durations/start/end semantics
- clamp honestly at each object's own media bounds
- avoid A→B→A feedback loops
- **Make independent** cleanly removes the link
- persist links/offsets through workspace/FCX state where the existing media relationship model supports it
- build on the current media sync/link infrastructure

---

# 5. Warp mode — first deformation foundation

Add **Warp** to the normal image right-click/object menu.

Outside Warp mode, current resize behavior remains unchanged.

### Corner warp

While Warp mode is active:

- four image corners become warp control points
- pulling a corner creates perspective-like / 2.5D deformation
- bottom-right acts as a warp corner only during Warp mode; outside Warp it remains the normal resize affordance
- Apply / Cancel / Reset are obvious
- Cancel restores the pre-warp state

### One internal push/pull point

Also allow one free control point inside the image:

`Warp → click point inside image → drag/push/pull → surrounding pixels deform with smooth falloff`

Desired effects:

- pull toward viewer → convex bulge
- push away → concave dent
- lateral drag → directional bend
- smooth radius/falloff, not a hard tear

Keep v1 simple:

- one free point
- radius
- strength
- reset point / reset warp
- Apply
- Cancel

Store this in a generic control-point model so later versions can support multiple points, edge points, pinned points, fulcrums, group pivots, and 2.5D/3D transforms without replacing the system.

Save As must be able to bake the current warp into actual image output. FCX should preserve nondestructive warp state for workspace-owned objects.

---

# 6. Rotated / flipped image chrome must follow current geometry

Current bug: an image can rotate while the blue selection outline remains in the old axis-aligned shape.

Required behavior:

- blue selection/focus outline follows the actual transformed image geometry
- for a rotated rectangle, the visible outline rotates with it
- do not fake this with a larger axis-aligned rectangle
- resize/selection affordances should correspond to the transformed geometry
- architecture should remain compatible with later quadrilateral/warp geometry

### Object menu control

The object menu button should be aesthetically anchored at the **visual top-left of the transformed object**.

- anchor follows rotation/flip/later warp geometry
- button itself remains upright in screen space
- flipping/mirroring the image must not mirror the menu icon
- preserve a small deliberate screen-space inset
- keep hit target reliable and accessible

Object content may rotate/flip/warp; object chrome anchors follow it while the UI itself remains readable.

---

# 7. DOCX must render existing embedded images

Current bug: opened Word/DOCX documents can show text while their embedded images are missing.

Required behavior:

- render existing inline DOCX images from normal OOXML relationships/media parts
- support common embedded PNG/JPEG at minimum
- preserve image aspect ratio and stored dimensions where practical
- keep images near their correct document-flow positions
- unsupported image types should fail honestly rather than silently disappearing
- existing images must survive ordinary text edits and Save / Save As
- preserve existing package media/relationships instead of dropping them during serialization
- newly inserted images should use the same document-image model rather than a separate path

Acceptance:

`Open DOCX containing text + several images → images are visible → edit text → Save As DOCX → reopen → original images remain.`

---

# 8. Drag images into an editable DOCX without workspace hijacking

When the user drags an image over the actual editable DOCX surface, the DOCX editor must get first refusal on the drop.

Use the rule:

> **The most specific eligible drop target wins.**

Desired flow:

`open DOCX → drag image onto DOCX body → DOCX inserts image → no global FrameChute drop overlay over the document → no duplicate workspace image object`

Requirements:

- explicit nested drop-zone precedence: DOCX editor first, workspace second
- suppress the global FrameChute drop overlay while over an eligible DOCX insertion target
- once DOCX handles the drop, generic workspace ingestion/copy behavior must stand down
- dropping the same image outside the DOCX must still use normal workspace ingestion
- support local image files first
- insert near the nearest supported paragraph/caret/drop position
- preserve aspect ratio and choose a sensible initial size that fits the document body
- dirty the DOCX and preserve inserted image state through Save / Save As and FCX
- use the existing OOXML serialization path; do not flatten the entire document
- avoid scattered ad-hoc propagation hacks; prefer one coherent handled-drop ownership contract usable by future editors

Acceptance:

1. `Open DOCX → drag PNG onto DOCX → image appears inside DOCX → no second workspace image object → Save As → reopen → inserted image remains.`
2. `Drag PNG onto empty workspace → normal FrameChute ingestion occurs.`
3. `Drag toward DOCX → workspace overlay may appear initially → entering DOCX suppresses it → leaving DOCX restores normal workspace feedback.`

---

# Architecture / longevity

Build on existing FrameChute primitives for:

- image transforms/encoding
- object sizing/transforms
- native Save / Save As
- FCX persistence
- directory permissions
- context-menu placement/dismissal
- media linking/sync
- DOCX OOXML parsing/serialization
- workspace ingestion/drop routing

Do not create duplicate systems for those responsibilities.

Preserve local-first behavior, Manifest V3, Chrome Web Store constraints, and existing file semantics.

---

# Tests / release checks

Add focused tests where practical for:

- batch naming/order logic
- fit/shrink calculations and frame-removal bound repair
- context-menu coordination
- relative sync delta propagation and loop prevention
- serializable warp control-point state
- rotated outline/menu-anchor geometry
- DOCX existing-image relationship preservation
- DOCX-vs-workspace drop ownership

Run the repository's normal automated tests and Chrome Web Store/release gates.

---

# Future major feature — document assembly via Select Mode

This is the next major product direction after the remaining correctness/utility work above is stable. **Do not half-implement it in this pass.**

General model:

`Enter Select Mode → select multiple FrameChute objects → right-click selection → Arrange into PDF…`

The selection may eventually include:

- images
- text blocks
- DOCX files
- existing PDF files/pages
- screenshots/canvas objects later

The organizer should allow reorder by thumbnail and, per selected item, optional pre-PDF preparation instructions such as image extension/format, dimensions, and quality. By default, reuse existing source content without unnecessary conversion/recompression; only transform an item when the user explicitly requests it, and perform those conversions when **Make PDF** is invoked.

After mixed-object PDF assembly succeeds, generalize the same selection/organizer model toward **Arrange into DOCX…** as a later phase.
