# DRAFT — Next FrameChute utility pass

> Planning/source-of-truth document for the next Codex pass. Keep FrameChute simple, direct, local-first, and built on existing primitives. Do not create parallel systems when the current object, save, FCX, ingestion, menu, media, timing, or workspace architecture can be extended.

## Product rule

> **Select the thing → do the obvious thing → save it, keep working with it, or both.**

The current pass should improve practical everyday use first. Later roadmap items are architectural direction and should not be half-built merely to check boxes.

---

# CURRENT PRIORITY PASS

## 1. Image Resize — complete single-image workflow

Upgrade the existing Resize Image action into a complete workflow:

`Resize Image → dimensions/options → live preview → Save As… and/or Add to Workspace`

Requirements:

- width and height controls
- preserve aspect ratio
- live preview of the actual resized result, not merely CSS scaling
- Save As… directly from Resize
- output real resized bytes at the requested dimensions
- PNG/JPEG/WebP where the existing encoder supports them reliably
- never modify the original automatically
- **Add to Workspace** is explicit and optional
- if the user only saves, do not clutter the workspace with another object
- after Save As, optionally offer **Add result to workspace**
- workspace results use the existing result-object pipeline and remain FCX-durable

### Resize dialog dismissal bug

The current Resize surface can feel trapped because the visible × does not reliably dismiss it.

Fix it:

- × closes immediately
- Escape closes
- Cancel closes, if present
- closing without applying leaves the image unchanged
- reopening Resize starts cleanly, with no stale partial state
- return focus sensibly to the invoking object/control
- reuse the existing dialog lifecycle; do not create another resize modal

---

## 2. Resize Folder / batch resize

Add **Resize Folder… / Resize Images in Folder…**.

Flow:

`Choose input directory → find supported images → set resize options → choose output directory → preview summary → Resize All`

Requirements:

- explicit directory picker / File System Access where available
- supported images only; unrelated files skipped honestly
- do not silently recurse into subfolders in v1 unless the UI explicitly offers it
- show how many supported images were found before processing
- reuse the same resize engine as single-image Resize
- preserve aspect ratio
- provide a clear fit/contain behavior when both dimensions are supplied
- output directory may differ from input directory
- never silently overwrite originals
- collision-safe output names
- bounded concurrency and prompt resource/object-URL cleanup
- progress current/total
- cancellation where practical
- one bad image must not corrupt already completed outputs
- final completed / skipped / failed summary
- do not automatically add every resized image to the workspace

### Rename numerically

Include an explicit option:

**Rename outputs numerically** — on/off

When off, preserve original base filenames where practical.

When on, use deterministic names such as:

`001.jpg`
`002.jpg`
`003.jpg`

Also:

- use the actual/selected output extension
- sensible zero-padding based on batch size
- optional starting number if it stays simple
- stable natural filename ordering, not filesystem enumeration accident
- preview several source → destination mappings before running

Example:

`IMG_4821.jpg → 001.jpg`

---

## 3. Fit / Shrink commands — individual images and all images

FrameChute needs both **per-image** and **all-image** display fitting.

These are workspace/display-size operations. They must not resample or destructively change source pixels.

### Individual image commands

For each image object, expose appropriate right-click/object commands:

- **Shrink to Fit**
- **Fit to Workspace**
- **Fit Width**
- **Fit Height**
- **Actual Size**

**Shrink to Fit** should:

- operate only on the selected/right-clicked image
- preserve aspect ratio
- shrink only if the image exceeds the usable workspace/viewport bounds
- never enlarge an already smaller image
- keep the image reachable with a sensible margin
- use the existing object sizing/transform path
- persist the resulting display dimensions through normal workspace/FCX state

### Shrink all images to fit

Also expose **Shrink all images to fit** from the normal image/object right-click menu.

Requirements:

- operate on every image object in the current workspace
- preserve aspect ratio
- shrink only oversized images
- never enlarge small images
- fit against sensible usable workspace/viewport bounds
- preserve positions as reasonably as possible while prioritizing reachability
- concise result status, e.g. `Shrank 6 images to fit.`

### Frameless / remove-frame behavior must automatically tidy bounds

When the user removes an image frame / chooses the image-only or frameless presentation, FrameChute should not leave the old framed object's awkward extra spacing behind.

The default transition to frameless/image-only should:

1. remove the frame/header/footer chrome as intended
2. recompute the object's visible/display bounds around the actual image content
3. eliminate stale empty gutters/space inherited from the removed frame
4. automatically apply the same **individual Shrink to Fit** logic if the resulting image is still too large for the usable workspace
5. preserve aspect ratio
6. never resample the underlying image just because the frame was removed
7. retain normal direct grab/resize behavior afterward

The result should feel like:

> **Remove frame → the image itself becomes the clean object.**

No weird leftover blank area should remain merely because the previous framed box was larger.

---

## 4. Quick Actions — LEFT by default, scrollable, and collision-safe

The vertical Quick Actions panel currently has several immediate UX problems:

- it starts on the right, where it can collide with the FrameChute mascot
- lower actions can become inaccessible because the list does not properly scroll
- it must never cover the top header/menu area

### Default placement

- Quick Actions opens on the **left side of the workspace by default**
- use a sensible left inset rather than sitting flush against the browser edge
- keep the right side free enough for the mascot
- initial placement must be **below the actual top header/menu**, never on top of it
- calculate/use the real header/menu bounds where practical rather than relying on one fragile magic number
- if the header changes height, the Quick Actions safe top inset should still remain correct
- if responsive constraints make the default position impossible, reposition intelligently rather than covering the mascot, header, or other essential controls
- if Quick Actions becomes movable/persistent later, the initial/default position remains left
- avoid hard-coding in a way that blocks future draggable/persisted panel positioning

### Scrolling

The action list must become independently vertically scrollable whenever its contents exceed the available height **between the header-safe top and the bottom viewport margin**.

Requirements:

- every action is always reachable
- bounded viewport-aware height
- vertical scrollbar only when needed
- no horizontal scrollbar
- wheel/trackpad over the panel scrolls the panel
- keyboard Tab reaches lower controls and scrolls them into view naturally
- keep important header/close/hide affordances reachable where practical while the action list scrolls
- do not shrink controls into unusability simply to make them fit
- do not make the entire workspace/page scroll just to reach a Quick Action
- preserve dependable system-font/layout fallback

Acceptance example:

`short browser window → select object with many Quick Actions → panel opens on left below top header → mascot remains unobstructed → panel scrolls internally → every action is reachable`

> **If FrameChute shows an action, the user must be able to reach it.**

---

## 5. Settings dock — explicit Grab / Move affordance

The Settings surface should follow the same discoverability rule as movable FrameChute objects.

The current little cross/star-like drag affordance is counterintuitive.

Requirements:

- add a clear **Grab / Move** affordance for Settings
- prefer visible `Grab` or `Move` wording where space permits
- otherwise use an unmistakable grip/hand with tooltip and ARIA text such as `Grab / Move Settings`
- dragging that affordance moves the Settings dock
- keep the hit target comfortably usable
- × means close; Grab means move
- never overload the close control as the drag control
- if the old cross/star remains anywhere, it cannot be the only movement clue
- keyboard/focus behavior remains sensible
- retain existing Settings functionality; this is a discoverability fix, not a Settings rewrite

Apply the **Grab / Move** vocabulary consistently to other floating docks with ambiguous movement controls where practical.

---

## 6. Context menus must never cover one another

FrameChute currently has multiple context-menu surfaces, including the original object/layer menu and the newer Open File menu.

Requirements:

- coordinate them as one context-menu family wherever practical
- opening an alternate menu may close the previous menu
- never leave two menus stacked at the same coordinates with one obscuring the other
- if two menus intentionally remain open, collision-position the newer one beside/away from the existing one
- keep menus inside viewport bounds
- outside click and Escape dismiss predictably
- keyboard focus follows the active visible menu
- avoid duplicate Open File surfaces fighting for z-index/pointer ownership
- prefer shared menu placement/dismissal helpers rather than independent unaware menus

---

## 7. Relative media syncing between specific objects

Take **Sync with…** seriously for individual audio/video objects.

The key behavior is preserving relative time offsets, not forcing identical absolute timestamps.

Example:

- Audio A = 12.0s
- Video B = 47.0s
- link A ↔ B
- seek A backward by 3.5s
- B also moves backward by 3.5s → 43.5s

Likewise, seek B forward by 8s and A moves forward by 8s.

Requirements:

- Sync with… lets the user choose a specific other media object
- preserve the offset that exists when the link is established
- seeking either linked object propagates the same Δt to partner(s)
- works forward and backward
- do not reset all objects to identical `currentTime`
- clamp safely at each object's own duration bounds
- avoid feedback loops where A updates B and B recursively updates A
- keep normal play/pause semantics unless an existing explicit sync mode coordinates those too
- **Make independent** cleanly breaks the relationship
- persist explicit links/offsets through normal workspace/FCX state where the current architecture supports media relationships
- extend the existing media-link/sync architecture rather than replacing it

This is the foundation for later Sync Groups, Sync Master, cues, and coordinated scenes.

---

## 8. Warp mode — first spatial deformation foundation

Add **Warp** to the normal image right-click/object menu.

Normal mode keeps the existing bottom-right resize behavior. Only after the user explicitly chooses Warp do the image controls temporarily become deformation controls.

### A. Corner warp

- while Warp is active, all four image corners become warp control points
- pulling an individual corner produces perspective-like / 2.5D deformation
- entering Warp must not accidentally resize the object
- leaving Warp restores ordinary resize behavior
- source remains nondestructive until the user applies/exports the result

### B. One internal push/pull point

For v1, allow one free control point anywhere inside the image:

`Warp → click point inside image → drag / push / pull → surrounding image bends smoothly`

The point should have a visible influence radius/falloff.

Desired effects:

- pull outward / toward viewer → smooth convex bulge
- push inward / away from viewer → smooth concave dent
- drag laterally → local directional bend
- allow the deformation to feel like pulling part of a flexible sheet forward/backward in an arc
- avoid hard tearing/discontinuous edges

Keep v1 simple:

- point
- drag-derived push/pull direction
- radius
- strength
- Reset point / Reset Warp
- Apply
- Cancel

### C. Architecture for later expansion

Store deformation generically enough to later support:

- additional edge points
- multiple free points
- pin/fixed points
- mesh warp
- arbitrary pivot/fulcrum
- rotation around a chosen point
- orbit/revolution
- eventual 2.5D/3D scene transforms

Do not hard-code the model so tightly to four corners that later control points require replacing it.

Prefer Canvas/WebGL for faithful warped raster rendering where appropriate.

Warp behavior:

- Cancel restores the pre-warp state
- Apply preserves warp semantically/nondestructively where practical
- Save As can bake the visible warp into actual output bytes
- optional result objects reuse existing image result/save architecture
- FCX preserves applied warp state for workspace-owned objects

---

# ARCHITECTURE / LONGEVITY RULES

Build on existing FrameChute primitives for:

- image decoding/encoding
- image transforms
- object sizing/transforms
- object/menu actions
- result objects
- FCX persistence
- native Save/Save As
- directory/file permissions
- dialog lifecycle
- Quick Actions selection/dispatch
- floating-dock movement/placement
- context-menu coordination
- media linking/sync

Do not create duplicate systems for those responsibilities.

Preserve Manifest V3 and Chrome Web Store constraints. No remote image/media processing as a shortcut.

Gracefully degrade when a browser capability is unavailable.

---

# ACCEPTANCE WORKFLOWS — CURRENT PASS

### Single resize

`Open image → Resize → change dimensions → live preview → Save As → reopen output → actual pixel dimensions match → original unchanged`

`Open image → Resize → Add to Workspace → result becomes normal FrameChute image → FCX restore preserves it`

### Batch resize / names

`Choose folder containing images + unrelated files → Resize Folder → rename OFF → output directory → supported images resized → unrelated files skipped → names preserved safely`

`Choose folder → Rename numerically ON → preview mappings → run → deterministic 001/002/003… outputs`

### Resize dismissal

`Resize → × → closes with no mutation → reopen works`

Also verify Escape and Cancel.

### Individual fit

`Open oversized image → right-click image → Shrink to Fit → only that image shrinks → aspect ratio preserved → source pixels unchanged`

### Shrink all

`Several mixed-size images → right-click image → Shrink all images to fit → oversized images become manageable → small images are not enlarged`

### Frameless cleanup

`Open framed oversized image → choose image-only/frameless → frame disappears → object bounds collapse to actual image content → stale empty frame space disappears → image auto-shrinks only if needed → normal grab/resize still works`

### Quick Actions placement and overflow

`Short viewport → many Quick Actions → panel starts on left below top header → mascot remains unobstructed → internal scroll reaches every action → keyboard Tab reaches lower controls`

### Settings Grab

`Open Settings → drag explicit Grab / Move control → Settings moves → × remains only the close control`

### Context-menu collision

`Invoke object/Open File menu scenarios → menus never obscure one another → commands remain visible/clickable → Escape/outside click dismisses predictably`

### Relative media sync

`Audio 12s + Video 47s → Sync with… → seek Audio -3s → Audio 9s / Video 44s → seek Video +5s → Video 49s / Audio 14s`

Test different durations and clamping without losing the stored relative relationship.

### Corner warp

`Image → Warp → drag corner → perspective deformation → Apply → Save As reflects warp → leave Warp → bottom-right returns to normal resize`

### Push/pull warp

`Image → Warp → click center → pull → convex bulge → Reset → push → concave dent → Cancel restores original → repeat + Apply → FCX restore preserves warp state`

---

# TESTS / RELEASE CHECKS — CURRENT PASS

Add focused tests where practical for:

- resize/batch naming logic
- resize-dialog dismissal/state reset
- single-image fit logic
- shrink-all sizing logic
- frameless/image-only bound cleanup and auto-fit behavior
- Quick Actions left/default placement, header collision avoidance, mascot avoidance, and scroll reachability
- Settings Grab/Move semantics
- context-menu coordination
- relative sync delta propagation / loop prevention
- serializable warp-control-point state

Then run the repository's normal full automated test suite and Chrome Web Store/release gates.

---

# FOLLOW-UP OBJECT / WORKSPACE FOUNDATIONS

These are compounding features. If they are too large for one implementation pass, leave later items as documented follow-up rather than dead/partial UI.

## 9. Real Undo / Redo

Shared history:

- Ctrl/Cmd+Z Undo
- Ctrl/Cmd+Shift+Z Redo
- Ctrl+Y may also Redo on Windows
- cover move, display resize, rotate, warp, delete, duplicate, layer order, semantic image edits, timing, media-sync changes, groups, opacity, lock/properties
- coalesce a continuous drag/resize/warp gesture into one history transaction rather than one entry per pointermove
- restore state through the existing object model and persistence/change notifications

## 10. Group / Ungroup

- group selected objects without flattening them
- preserve child identities and relative transforms
- move/scale/rotate group coherently where supported
- FCX-durable
- Undo/Redo-aware
- architect as the beginning of a scene graph capable of later owning a pivot/fulcrum

## 11. Align / Distribute / Snap

- Align left/center/right
- Align top/middle/bottom
- Distribute horizontally/vertically
- snap to nearby object edges/centers and workspace center
- snapping should assist, not trap or jitter

## 12. Lock / Unlock

- simple Lock/Unlock v1
- locked object remains visible but rejects accidental move/resize/rotate/warp
- persist through workspace/FCX
- Undo/Redo-aware

## 13. Duplicate with visible offset

- Ctrl/Cmd+D
- normal independent duplicate
- slight spatial offset so duplication is obvious
- reuse existing semantic duplication architecture

## 14. Sync Groups / optional Sync Master

Build on relative-time links:

```text
Video A   00:10
Audio B   00:43
Video C   01:05

seek A +4s

Video A   00:14
Audio B   00:47
Video C   01:09
```

Later allow an explicit Sync Master for coordinated seek/play behavior without changing the core delta-preserving relationship.

## 15. Object Properties

Compact Properties surface for real values such as:

- Name / Type
- Width × Height
- X / Y
- Rotation
- Opacity
- Layer
- Duration / Current time for media
- File size/source where meaningful
- later: Pivot/Fulcrum, Warp, Sync group, Start/End time, Lock state

Editable values must write through real object state.

## 16. Opacity

- 0–100%
- live preview
- workspace/FCX persistence
- Undo/Redo-aware
- semantic, so it can become animatable later

## 17. Nondestructive crop / mask state

Prefer:

```text
source image
+ crop state
+ mask state
+ warp state
+ opacity
+ transform
= visible object
```

Allow Edit Crop / Reset Crop / mask editing and Save As to bake the composed result only when desired.

## 18. Recent authorized output folders

Remember explicitly authorized/recent output folders where browser permissions allow it, but never bypass permission checks or pretend a stale remembered path remains writable.

## 19. Autosave / crash recovery

- local recoverable workspace state using existing FCX/workspace serialization where practical
- throttle writes during rapid gestures
- offer Restore / Discard after recoverable reopen
- never silently overwrite source files
- distinguish recovery state from explicitly exported `.fcx`
- bounded local storage generations

## 20. Command Palette

Prefer Ctrl/Cmd+K.

Search understandable commands such as:

`resize · warp · open file · extract frame · save snapshot · sync · fit · convert · properties`

Commands invoke the same underlying actions as visible menus/Quick Actions.

## 21. Send result to… / result routing

When an operation produces something, expose appropriate destinations:

- Save As…
- Add to Workspace
- Copy

Later generalize to Workspace / Clipboard / File / New canvas / another compatible FrameChute object.

Never force a result into the workspace or force a download unnecessarily.

---

# PRIORITY ORDER

```text
CURRENT PASS
resize + batch resize
individual/all fit + frameless cleanup
Quick Actions placement/scroll/collision fixes
Settings Grab
context-menu coordination
relative media sync
warp

        ↓

FOUNDATION PASS
Undo / Redo
Group / Ungroup
Lock
Align / Distribute / Snap
Duplicate shortcut
Opacity
Object Properties

        ↓

RELIABILITY / REACHABILITY
Autosave / Recovery
Command Palette
Recent authorized output folders
Result routing

        ↓

SPATIAL / TIME
Pivot / Fulcrum
Group pivot
Rotate/orbit around pivot
animation cues
```

The goal is not feature count. Every addition should strengthen one shared object/workspace model.