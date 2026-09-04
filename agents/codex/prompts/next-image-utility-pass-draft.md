# DRAFT — Next FrameChute utility pass

> Planning document only. Keep extending this request incrementally. Do not implement it until the user explicitly says it is ready.

## Product rule

FrameChute should make ordinary visual/file jobs feel immediate rather than forcing the user into separate specialist apps.

> **Preview it. Save it. Keep working with it only if you want to.**

Preserve existing object, save, FCX, ingestion, menu, timing, and media systems. Do not solve these items by creating parallel architectures.

---

# 1. Image Resize — complete single-image workflow

Upgrade the existing Resize Image action into a complete workflow:

`Resize Image → dimensions/options → live preview → Save As… and/or Add to Workspace`

Requirements:

- width and height controls
- preserve aspect ratio
- real live preview of the resized result, not only CSS scaling
- Save As… directly from Resize
- real output bytes at the selected dimensions
- PNG/JPEG/WebP where the existing encoder supports them reliably
- original remains untouched unless overwrite is explicitly chosen
- Add to Workspace is optional, never automatic
- after Save As, optionally offer **Add result to workspace**
- workspace result must use the existing result-object pipeline and remain FCX-durable

### Resize dialog bug

The current Resize dialog can become effectively trapped because the visible × does not close it.

Fix this:

- × closes immediately
- Escape closes
- Cancel closes, if present
- closing without applying does not mutate the image
- reopening gives a clean dialog state
- restore focus sensibly after dismissal
- use the existing dialog lifecycle; no second resize modal

---

# 2. Resize Folder / batch resize

Add **Resize Folder… / Resize Images in Folder…**.

Flow:

`Choose input directory → detect supported images → choose resize settings → choose output directory → preview summary → Resize All`

Requirements:

- explicit directory picker / File System Access where available
- supported images only; unrelated files skipped honestly
- no silent recursive traversal in v1 unless explicitly enabled
- show count before processing
- reuse the same resize engine as single-image Resize
- preserve aspect ratio
- clear fit/contain behavior when both dimensions are supplied
- output directory can differ from input directory
- never silently overwrite originals
- collision-safe output naming
- bounded concurrency and prompt release of decoded resources/object URLs
- progress current/total
- cancellation where practical
- one bad image should not corrupt already completed outputs
- final completed / skipped / failed summary
- do not dump all resized images into the workspace automatically

### Rename numerically

Include:

**Rename outputs numerically** — on/off

When off, preserve source base filenames where practical.

When on, produce deterministic names such as:

`001.jpg`  
`002.jpg`  
`003.jpg`

Also:

- preserve selected output extension
- sensible zero-padding based on batch size
- optional starting number if simple to expose
- natural/stable filename ordering, never accidental filesystem enumeration order
- show source → destination examples before starting

Example:

`IMG_4821.jpg → 001.jpg`

---

# 3. Shrink all images to fit

Add **Shrink all images to fit** to the normal image/object right-click menu.

This is a workspace sizing action, not destructive pixel resizing.

Requirements:

- operate on all image objects in the current workspace
- preserve aspect ratio
- shrink only oversized images; never enlarge smaller ones
- fit within a sensible usable workspace/viewport bound with margin
- preserve positions where practical while prioritizing reachability
- use the existing object sizing/transform system
- persist resulting object dimensions in normal workspace/FCX state
- concise completion status, e.g. `Shrank 6 images to fit.`

---

# 4. Quick Actions must scroll

The vertical Quick Actions panel currently lets lower controls become inaccessible on short windows.

Keep the vertical 1990s-Mac-inspired panel, but make it independently scrollable.

Requirements:

- all actions always reachable
- bounded viewport-aware height
- vertical scrollbar only when necessary
- no horizontal scrollbar
- wheel/trackpad over the panel scrolls the panel
- keyboard Tab reaches lower actions and naturally scrolls them into view
- keep close/hide affordance reachable where practical
- do not shrink controls into unusability just to make them fit
- preserve dependable system-font/layout fallback

> **If FrameChute shows an action, the user must be able to reach it.**

---

# 5. Context menus must not overlap

FrameChute currently has multiple context-menu surfaces, including the original object/layer menu and the Open File menu.

They must never render directly on top of one another and hide commands.

Preferred behavior:

- coordinate context menus as one menu family wherever practical
- opening one alternate context menu may close the previous one
- never leave two menus stacked at identical coordinates
- if two menus intentionally remain open, collision-position the newer one beside the existing menu
- keep menus inside viewport bounds
- outside click and Escape dismiss predictably
- active keyboard focus belongs to the visible/active menu
- avoid duplicate Open File surfaces fighting for z-index or pointer ownership
- prefer shared menu placement/dismissal helpers instead of independent unaware menus

---

# 6. Take object syncing seriously — relative-time linkage

The existing **Sync with…** concept should become genuinely useful for individual media objects.

The user must be able to sync one specific audio/video object to another specific audio/video object.

The key behavior is **relative time movement**, not forced equality of absolute timestamps.

Example:

- Audio A currently at 12.0s
- Video B currently at 47.0s
- user syncs A ↔ B
- user seeks A backward by 3.5s
- B also moves backward by 3.5s, ending at 43.5s

Likewise, if the user seeks B forward by 8s, A moves forward by 8s.

The objects keep their own independent starts, ends, durations, and offsets. Sync means:

> **Whatever time delta I apply to one linked object, apply the same delta to the other linked object(s).**

Requirements:

- Sync with… must allow selecting a specific other object, not only a vague global group
- preserve each object's relative offset at the moment linking is established
- seeking either linked object propagates the same delta to its partner(s)
- works forward and backward
- does not reset both objects to identical currentTime values
- clamp safely at each object's own duration bounds
- avoid feedback loops where A updates B which updates A repeatedly
- retain normal play/pause semantics unless an existing sync mode intentionally coordinates those too
- **Make independent** cleanly breaks the relationship
- persist explicit links/offsets through normal workspace/FCX state if the current sync architecture persists media relationships
- build on the existing media-link/sync system rather than replacing it

This is the foundation for later synchronized tracks, cues, animation, and coordinated scenes.

---

# 7. Warp mode — first spatial deformation foundation

Begin the image warp system now, but keep the first implementation deliberately understandable.

Add **Warp** to the normal image right-click/object menu.

When Warp mode is active, the image temporarily changes from ordinary resize interaction into a deformation surface.

## A. Corner warp

Normally the bottom-right corner remains the existing resize affordance.

**Exception:** after the user explicitly chooses **Warp**, the four image corners become warp control points instead of normal resize handles for the duration of Warp mode.

The user can pull individual corners to create perspective-like / 2.5D deformation.

The original image remains nondestructive until the user applies/exports the result.

Warp mode must have an obvious exit/apply path so ordinary bottom-right resize behavior returns afterward.

## B. Single internal push/pull point

For this first warp pass, also let the user click a point anywhere inside the image and manipulate that local region.

The interaction should feel physical:

`Warp → click point inside image → drag / push / pull → surrounding image bends with it`

The selected point should have a visible influence radius / falloff.

The goal is to support pleasing **concave** and **convex** deformation, including a sense of pushing part of the image backward or pulling it forward in an arc.

Think of it like gently deforming a flexible sheet:

- Pull outward / toward viewer → convex bulge
- Push inward / away from viewer → concave dent
- drag laterally → local directional bend
- preserve a smooth falloff around the chosen point rather than producing a hard tear

The UI should remain simple. A reasonable v1 can expose only:

- control point
- push / pull direction from the drag gesture
- radius
- strength
- reset point / reset warp
- Apply
- Cancel

Do not expose a giant mesh editor yet.

## C. Architecture for later expansion

Although v1 may expose four corner points plus one free internal point, store deformation in a generic control-point model so future versions can add:

- additional edge points
- multiple free points
- pinned/fixed points
- mesh warp
- object pivots / fulcrums
- rotation around an arbitrary point
- orbit/revolution around another point/object
- eventual 2.5D/3D scene transforms

Do not hard-code the model so tightly to four corners that those future additions require replacing the whole system.

Prefer a WebGL/Canvas-backed rendering path for the actual warped raster where appropriate, while allowing lightweight preview techniques if they stay visually faithful.

### Warp mode interaction rules

- normal resize remains normal outside Warp mode
- entering Warp is explicit from the right-click/object menu
- entering Warp must not accidentally resize the object
- leaving Warp restores ordinary grab/resize behavior
- Cancel restores the pre-warp state
- Apply preserves the warp nondestructively in the object state where practical
- Save As must be able to bake the current warp into actual image output
- Add/result behavior should reuse existing image result/save architecture
- FCX should preserve the warp state for workspace-owned objects

This is not yet a full 3D editor. It is the first spatial deformation primitive that can later grow into one.

---

# Architecture / longevity requirements

Build on existing FrameChute primitives for:

- image decoding/encoding
- image transforms
- object sizing/transforms
- result objects
- FCX persistence
- native Save/Save As
- directory/file permissions
- dialog lifecycle
- Quick Actions selection/dispatch
- context-menu positioning/dismissal
- media syncing/linking

Do not create duplicate systems for these responsibilities.

Preserve Manifest V3 and Chrome Web Store constraints. No remote processing.

Graceful degradation is required when a browser capability is unavailable.

---

# Acceptance workflows

## A. Single resize

`Open image → Resize → change dimensions → live preview → Save As → reopen file → actual pixel dimensions match → original unchanged`

`Open image → Resize → Add to Workspace → result becomes normal FrameChute image → FCX restore preserves it`

## B. Batch preserve names

`Choose folder containing images + unrelated files → Resize Folder → numerical rename OFF → output directory → supported images resized → unrelated files ignored → source filenames preserved safely`

## C. Batch numerical names

`Choose folder → Rename outputs numerically ON → preview mapping → run → deterministic 001/002/003… outputs`

## D. Resize dismissal

`Resize → × → closes with no mutation → reopen works`

Also verify Escape and Cancel.

## E. Shrink all

`Several mixed-size images → right-click image → Shrink all images to fit → oversized objects become manageable → small objects are not enlarged`

## F. Quick Actions overflow

`Short viewport → many Quick Actions → scroll panel → every action reachable → Tab reaches lower controls`

## G. Context-menu collision

`Invoke object menu / Open File menu in overlapping scenarios → menus never obscure each other → visible commands remain clickable → Escape/outside click works predictably`

## H. Relative media sync

`Audio at 12s + video at 47s → Sync with… → seek audio -3s → audio 9s, video 44s → seek video +5s → video 49s, audio 14s`

Also test different durations and boundary clamping without losing the stored relative relationship.

## I. Corner warp

`Open image → Warp → drag one corner → image deforms perspectively while object remains otherwise usable → Apply → Save As → output reflects warp → leave Warp → bottom-right returns to normal resize semantics`

## J. Push/pull warp

`Open image → Warp → click center point → pull outward → smooth convex bulge → reset → push inward → smooth concave dent → Cancel restores original → repeat and Apply → FCX restore preserves applied warp state`

---

# Tests / release checks

When this draft is eventually implemented, add focused tests for resize/batch naming logic, dialog dismissal, shrink-all sizing, Quick Actions overflow, context-menu coordination, relative-sync delta propagation/loop prevention, and serializable warp-control-point state where practical.

Then run the repository's normal full automated tests and Chrome Web Store release gates.

---

# Additional object/workspace foundations to fold into the roadmap

These are deliberate compounding features. They are more valuable than adding a long list of unrelated file-format tricks because each one improves many existing and future FrameChute objects.

Do not create dead buttons or placeholder UI. If the whole set is too large for one implementation pass, implement it in the priority order below and leave later items as documented follow-up work rather than half-working features.

## 8. Real Undo / Redo

FrameChute needs a shared workspace history system before object manipulation becomes much deeper.

Required user behavior:

- `Ctrl/Cmd+Z` → Undo
- `Ctrl/Cmd+Shift+Z` → Redo
- where platform conventions make sense, `Ctrl+Y` may also Redo on Windows

At minimum, design the history model to cover:

- move
- object display resize
- rotate
- warp state changes
- delete/remove
- duplicate
- layer-order changes
- image edits that already have semantic state
- timing changes
- media-sync relationship changes
- group/ungroup once added
- opacity and lock/property changes once added

Do not snapshot giant binary blobs for every pointermove. Coalesce continuous gestures into sensible history transactions: one drag should normally be one undo step, one resize gesture one step, one warp gesture one step.

Undo/Redo should restore real object state through the existing object model and notify normal persistence/change systems.

> **Users should be able to experiment without fearing the workspace.**

## 9. Group / Ungroup

Allow multiple selected objects to become one manipulable group while preserving their individual identities.

Flow:

`select several objects → Group → move/resize/rotate group together → Ungroup when desired`

Requirements:

- Group / Ungroup in contextual actions/right-click where appropriate
- children remain real FrameChute objects rather than being flattened into a bitmap
- preserve child-relative positions and transforms
- moving the group moves all children coherently
- scaling/rotating the group should preserve relative layout where supported
- group state must survive FCX snapshot/restore
- group/ungroup integrates with Undo/Redo
- deletion of a group must have clear semantics and never silently destroy recoverability of child state

Architect the group as the beginning of a scene graph so it can later own a pivot/fulcrum and participate in animation, web, presentation, and game-oriented modes.

## 10. Align, distribute, and snapping

Multi-selection should gain fast layout commands:

- Align left
- Align center
- Align right
- Align top
- Align middle
- Align bottom
- Distribute horizontally
- Distribute vertically

Also add lightweight snapping where practical:

- snap to nearby object edges
- snap to nearby object centers
- snap to workspace center

Snapping should assist rather than trap the user. Keep it easy to temporarily bypass if needed and avoid jittery competing snap targets.

These commands must operate through the same object-position/transform model as normal dragging.

## 11. Lock / Unlock object

Add a simple **Lock** command so reference/background objects stop moving accidentally.

Initial behavior can be one understandable state:

- Lock
- Unlock

A locked object should remain visible and usable as content but reject accidental workspace move/resize/rotate/warp gestures unless the user unlocks it.

Later this can grow into separate position/size/edit locks, but do not overcomplicate v1.

Persist lock state in normal workspace/FCX state and integrate it with Undo/Redo.

## 12. Duplicate with visible offset

Make `Ctrl/Cmd+D` a dependable Duplicate shortcut.

A duplicate should appear with a small visible spatial offset so the user can immediately tell duplication occurred rather than thinking nothing happened.

The duplicate must be a normal independent FrameChute object using the existing semantic duplication/result architecture, preserving the appropriate source/edit state without accidentally retaining relationships that should be independent.

## 13. Sync Groups and optional Sync Master

Build on section 6 rather than creating another timing system.

Once specific pairwise relative sync is reliable, allow three or more media objects to belong to the same explicit **Sync Group**.

Example:

```text
Video A   00:10
Audio B   00:43
Video C   01:05

seek A +4s

Video A   00:14
Audio B   00:47
Video C   01:09
```

Every member retains its established relative offset.

Later/where practical, allow **Set as Sync Master**:

- seeking the master propagates relative deltas
- play/pause from the master can coordinate followers if that behavior is explicitly enabled
- followers still retain their own durations and clamp honestly at boundaries

Do not require Sync Master for ordinary two-way relative seeking. The important primitive remains delta-preserving linkage.

## 14. Object Properties

Add a plain, compact **Properties…** surface for precision without crowding the everyday UI.

For applicable objects expose real values such as:

```text
Name
Type
Width × Height
Position X / Y
Rotation
Opacity
Layer
Duration        (media)
Current time    (media)
File size       (when known)
Source          (when meaningful/safe)
```

As capabilities appear, this same properties model can later expose:

```text
Pivot / Fulcrum
Warp
Sync group
Start time
End time
Lock state
```

Editable values must write through existing object state rather than becoming a disconnected inspector model.

## 15. Opacity for visual objects

Give applicable visual objects a simple opacity control, ideally contextual and also visible in Properties.

- range 0–100%
- live preview
- persists in workspace/FCX state
- participates in Undo/Redo
- composes correctly with image warp/crop/masks and grouping

This should become an animatable property later, so represent it semantically rather than baking it into pixels.

## 16. Nondestructive crop / mask state

Continue moving image editing away from unnecessary destructive baking.

Where practical, represent crop/mask as object state over the original source:

```text
source image
+ crop state
+ mask state
+ warp state
+ opacity
+ transform
= visible object
```

The user should be able to:

- Edit Crop
- Reset Crop
- edit/restore mask where supported
- Save As… to bake the current composed result when desired

Do not destroy source pixels merely because the user wants to experiment with a crop or mask inside the workspace.

## 17. Complete the Fit family

Alongside **Shrink all images to fit**, expose understandable single-object fit commands where appropriate:

- Fit to Workspace
- Fit Width
- Fit Height
- Actual Size
- Shrink all images to fit

These are display/workspace sizing operations, not destructive resampling. Preserve aspect ratio unless the action explicitly says otherwise.

## 18. Recent authorized output folders

After the user explicitly chooses/authorizes an output directory, make repeated work less tedious where browser permission semantics permit it.

A Save/Batch flow may show something like:

```text
Recent output folders
- Downloads/FrameChute
- Pictures/Exports
- Project/Assets
- Choose another…
```

Rules:

- never bypass browser permission requirements
- reconnect/re-request permission honestly if the browser no longer grants access
- do not pretend a remembered path is writable when it is not
- keep this convenience local

## 19. Autosave / crash recovery for workspace state

As FrameChute becomes a real working surface, accidental browser closure/crash must not routinely destroy the workspace.

Implement local recovery separately from native file Save:

- periodically preserve recoverable workspace state locally using the existing FCX/workspace serialization primitives where practical
- avoid excessive writes during rapid pointer gestures
- on an unclean/recoverable reopen, offer a clear choice such as:

```text
Recovered workspace from 2 minutes ago
[ Restore ] [ Discard ]
```

- do not silently overwrite source files
- clearly distinguish recovery state from an explicitly exported `.fcx`
- preserve privacy/local-first behavior
- bound storage usage and clean obsolete recovery generations

## 20. Command Palette

As FrameChute gains more abilities, avoid turning the interface into hundreds of permanent buttons.

Add a lightweight command palette, preferably `Ctrl/Cmd+K`, that searches available actions by understandable names.

Examples:

```text
resize
warp
open file
extract frame
save snapshot
sync
fit
convert
properties
```

Requirements:

- contextual actions should respect the current selection/object type
- unavailable actions should not pretend to work
- keyboard-first but fully clickable
- search should be simple and fast
- invoking a palette command should call the same underlying action as the visible menu/Quick Action, not duplicate business logic

This is one of the main ways FrameChute can gain breadth without becoming a giant cockpit.

## 21. Send result to… / explicit result routing

Generalize the current idea that operation outputs are useful objects rather than dead downloads.

When an operation creates a result, give the user explicit destinations where appropriate:

```text
Save As…
Add to Workspace
Copy
```

Later this can become a small **Send result to…** model:

```text
Workspace
Clipboard
File
New canvas
Another compatible FrameChute object
```

Rules:

- never force a result into the workspace just because FrameChute can
- never force a download if the user only wants to keep working with the result
- all routes should converge on existing result/save/clipboard/object primitives
- preserve the product rule: **save it, keep working with it, or both**

---

# Priority after the current resize / warp / sync pass

If these foundations are implemented in stages, prefer this order:

```text
CURRENT PASS
resize + batch resize
warp
relative media sync
menu/Quick Actions/fit fixes

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

RELIABILITY / REACHABILITY PASS
Autosave / Recovery
Command Palette
Recent authorized output folders
Result routing

        ↓

SPATIAL / TIME PASS
Pivot / Fulcrum
Group pivot
Rotate/orbit around pivot
animation cues
```

The principle is not feature count. The goal is to make every new capability strengthen the same shared object/workspace model.