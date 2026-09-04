# Codex Request: Object Menu + Standalone Canvas MVP

## Mission

Work from the latest `main` of `thanks-cohn/framechute`.

Build the next coherent interaction layer for Framechute around two ideas:

1. **Selecting an object and opening controls for that object are separate actions.**
2. **A Canvas is just another first-class Framechute object, except it starts with blank pixels instead of imported pixels.**

This should build directly on the merged Quick Actions visibility work and the existing image paint layer from PR #34. Do not create a parallel drawing engine or parallel object system.

The governing product rule is:

> **Click the thing to select the thing. Click its menu to do things to it.**

And for canvas:

> **Blank pixels should behave like any other Framechute image object once created.**

Keep the interface small, direct, and obvious.

---

# Part 1 — Fix image selection semantics

## Ordinary image click must never reopen Quick Actions

Current behavior still couples selection and toolbar visibility too closely.

Change the interaction contract so:

```text
click image
→ select/focus image
→ do NOT open Quick Actions
```

If Quick Actions are currently hidden for that image, a normal click must leave them hidden.

If Quick Actions are already visible for that image, selecting it may keep them visible, but ordinary image selection must never be the event that restores them after the user deliberately hid them.

This must apply to:

- ordinary left-click
- clicking after moving the object
- clicking after resizing
- clicking after paint mode
- clicking after another object was selected
- restoring an FCX snapshot where Quick Actions were hidden

Do not silently reset per-object visibility just because selection changes.

### Selection behavior should remain intuitive

Preserve existing multi-selection semantics where appropriate:

- normal click selects one object
- Ctrl/Cmd/Shift selection behavior continues to work
- clicking object chrome should not unexpectedly clear selection

But menu visibility and selection state must remain independent concepts.

---

# Part 2 — Replace the current blue image button with a real object menu button

The current upper-left blue selection affordance is visually weak and semantically confusing.

Replace/refactor it into a polished **object menu button**.

## Visual requirements

The button should:

- be a **perfect circle**
- live in the reserved upper-left object-control zone
- use a familiar menu glyph by default, preferably `☰`
- have a clean, neutral Framechute appearance rather than looking like a debug/selection chip
- remain clearly clickable without dominating the image
- have proper hover/focus states
- have an accessible label such as `Open object menu`
- remain usable in frameless image mode
- not overlap Grab, resize, paint, native media, or header controls

Do not solve placement with arbitrary giant z-index values. Respect the object-control zone convention established in the prior PR.

Suggested visual mental model:

```text
   ( ☰ )
┌──────────────────┐
│                  │
│      IMAGE       │
│                  │
└──────────────────┘
```

The menu button should be present/recoverable even when Quick Actions themselves are hidden. It is the durable affordance that lets the user get controls back.

---

# Part 3 — Clicking the circular menu button opens the object's menu

Clicking `☰` should open a compact object-specific menu for that image.

Right-clicking the image should open the same menu, or the same underlying menu model rendered through the right-click path.

Do not maintain two unrelated action lists.

## Minimum image object menu

At minimum include sensible entries such as:

```text
Quick Actions
Edit Image
Duplicate
Save As
----------------
Remove
```

Where useful, Quick Actions should reflect current state:

- if hidden: `Show Quick Actions`
- if visible: `Hide Quick Actions`

The exact ordering can be adapted to the existing architecture, but the menu should stay small and obvious.

### Important behavior

- opening the menu must not itself toggle Quick Actions
- clicking the image itself must not open this menu
- clicking `☰` explicitly opens this menu
- right-click explicitly opens this menu
- hiding Quick Actions does not deselect the object
- hiding Quick Actions does not disable actions
- restoring Quick Actions is explicit

Dismiss the menu on:

- outside click
- Escape
- scroll/resize if needed to avoid orphaned positioning
- removal of the owning object

Keep it on-screen near viewport edges.

---

# Part 4 — Reuse per-object Quick Actions visibility correctly

Build on the existing per-image Quick Actions hide/show state from PR #35.

Do not replace it with a global preference.

Required behavior:

```text
Image A: Quick Actions hidden
Image B: Quick Actions visible
```

Selecting A must not make its toolbar reappear.

Selecting B must not change A.

The circular object menu should be the primary way to restore hidden controls for that specific image.

The existing Quick Actions bar close button may remain, but its behavior should be consistent with the same per-object state.

Persist the state through normal Framechute/FCX capture and restore.

This visibility state is workspace UI state only and must never affect exported image bytes.

---

# Part 5 — Add a first-class standalone Canvas object

Framechute should allow the user to create a blank drawing surface without first opening an image.

Add a straightforward **New Canvas** command in the normal creation/upload/add flow.

The user-facing concept should be extremely simple:

```text
New Canvas
→ choose size
→ canvas object appears
→ draw / fill / erase
→ move / resize / duplicate
→ Save As PNG/WebP
```

## Canvas creation dialog

Keep this small.

Useful presets may include:

- 1920 × 1080
- 1080 × 1080
- 1080 × 1920
- Current viewport / workspace view size if practical
- Custom width × height

Do not turn this into a Photoshop-style New Document dialog.

### Default background

The default Canvas should be **transparent**.

Optionally allow an initial solid background color if it can be added without clutter, but transparency should remain the default and first-class state.

---

# Part 6 — Canvas must reuse the existing image paint engine

Do not build another drawing system.

A standalone Canvas should reuse the same paint-layer infrastructure already used for image objects:

- Brush
- color selection
- thickness
- Bucket / bounded flood fill
- Erase
- Undo
- any correctly implemented restore behavior that already exists

Where possible, factor shared code rather than adding canvas-specific copies of paint logic.

The desired architecture is conceptually:

```text
Image object
├── source pixels
└── paint layer

Canvas object
├── blank transparent base pixels
└── same paint layer
```

Or an equivalent shared object representation that fits the current codebase.

A Canvas should not be a mysterious DOM-only drawing surface. It must have honest backing pixel state that can be saved and restored.

---

# Part 7 — Canvas is a first-class Framechute object

Once created, a Canvas should participate in normal object behavior.

Required:

- selectable
- movable
- resizable
- duplicateable
- removable with Delete/Backspace through the existing removal path
- object menu via the same circular `☰` control
- right-click object menu
- Quick Actions where appropriate
- paint/edit mode
- FCX persistence
- Save As

Do not create a special floating art app inside Framechute.

Canvas should feel like another object on the desk.

---

# Part 8 — Canvas Save As and output semantics

Canvas must be exportable without first converting it through some hidden temporary path.

At minimum support:

- PNG
- WebP

PNG must preserve transparency.

WebP should preserve transparency where supported by the existing export pipeline.

JPEG can be offered only if the existing Save As system naturally supports it and a background must be flattened, but it is not required for this MVP.

Expected workflow:

```text
New Canvas
→ draw
→ bucket fill
→ erase to transparency
→ Save As PNG
→ reopen PNG
→ result visually matches canvas
```

The saved file must contain the actual rendered canvas pixels, not just metadata describing future edits.

---

# Part 9 — FCX persistence

FCX export/restore must honestly preserve standalone Canvas objects.

After snapshot restore, preserve:

- canvas dimensions
- transparent/solid base state
- paint strokes / overlay pixel state
- bucket-fill results
- erased transparency
- position
- size
- object Quick Actions visibility state
- enough object metadata for the circular menu and normal editing to continue working

A restored Canvas must remain editable, not merely become a screenshot unless flattening is explicitly the current Framechute persistence design for equivalent image objects.

Use the existing block-state / custom-object persistence substrate rather than inventing a second project format.

---

# Part 10 — Object menu architecture should be reusable

Although this PR is primarily about images and Canvas, do not hard-code the menu in a way that prevents later reuse for:

- video
- text
- PDF
- Region Objects
- cue-enabled objects

A small object-menu abstraction is preferable if it fits naturally.

However, do not expand this PR into redesigning every object type.

The MVP success criterion is that image and Canvas object menus feel coherent and the architecture can grow later.

---

# Part 11 — UI interaction laws

Please enforce these explicitly in code and tests where practical:

## Law A

> **Click object = select object.**

No hidden side effect that resurrects dismissed UI.

## Law B

> **Click `☰` = open object controls.**

## Law C

> **Right-click object = open object controls.**

## Law D

> **Dismissed object chrome stays dismissed until explicitly restored.**

## Law E

> **Blank Canvas and imported Image share the same editing language whenever possible.**

These rules matter more than adding extra menu items.

---

# Part 12 — Avoid regressions

Preserve existing behavior from PR #34 and PR #35:

- image paint coordinates remain correct after rotate/flip/resize
- Crop still produces a visible first-class cropped result object
- Delete/Backspace still removes selected objects safely
- object controls still avoid stacking on top of one another
- per-image Quick Actions state still persists
- paint state still survives FCX
- Save As still composes current paint edits correctly
- Quick Actions multi-selection remains usable

Do not reintroduce the old issue where the blue/menu affordance collides with Grab.

---

# Part 13 — Suggested implementation direction

Use the current architecture rather than treating this as mandatory filenames, but likely areas include:

- `src/actions/quick-actions.js`
- the current per-object Quick Actions visibility module added after PR #35
- image/block creation helpers
- workspace Add/Upload UI
- `src/image-edit/paint-runtime.js`
- `src/image-edit/paint-layer.mjs`
- FCX block capture/restore code
- object-control CSS

Prefer a shared object-menu module if that keeps `quick-actions.js` from becoming another large monolith.

Do not build a framework merely for its own sake.

---

# Part 14 — Tests

Add focused automated tests where the architecture allows.

At minimum cover logic for:

- Quick Actions hidden state is not changed by ordinary selection
- explicit Show/Hide changes per-object state only
- object menu action state reflects visibility
- Canvas serialization/restoration metadata
- Canvas pixel export/composition helper behavior
- transparent canvas preservation
- paint/flood-fill reuse rather than divergent canvas-only implementation where testable

If DOM-heavy behavior cannot be unit tested cleanly in the current repository, document the manual browser test honestly rather than inventing fake coverage.

---

# Required manual Chromium smoke test

Before declaring the PR complete, manually validate if Chromium is available:

```text
Open Image A
→ Quick Actions visible
→ close Quick Actions
→ click Image A
→ Quick Actions remain hidden

Click circular ☰ on Image A
→ object menu opens
→ choose Show Quick Actions
→ Quick Actions appear

Right-click Image A
→ same coherent object menu appears
→ choose Hide Quick Actions
→ toolbar hides

Open Image B
→ Image B state independent from Image A

Verify circular ☰:
→ perfect circle
→ readable menu icon
→ upper-left zone
→ does not overlap Grab
→ does not overlap resize handle
→ remains clickable in frameless mode

Create New Canvas
→ choose 1080×1080
→ transparent canvas object appears
→ move it
→ resize it
→ open ☰ menu
→ enter Edit/Paint
→ draw line
→ change color
→ change thickness
→ bucket-fill a bounded region
→ erase part back to transparency
→ undo
→ Save As PNG
→ reopen saved PNG
→ transparency and paint match

Duplicate Canvas
→ copy is independent

Select Canvas
→ Delete
→ Canvas closes through normal removal path

Create Canvas again
→ paint on it
→ hide its Quick Actions
→ Export FCX
→ reopen FCX
→ canvas dimensions, artwork, transparency, position, and hidden toolbar state survive
```

---

# Validation

Run the normal repository checks after implementation:

```text
node --test tests/*.test.mjs
node --check on modified JS/MJS modules
git diff --check
sh scripts/package-web-store.sh
```

If there are additional repository-specific checks, run them too.

---

# Scope boundaries

Do **not** add in this PR:

- Region Object extraction
- AI background removal
- advanced mask painting
- vector path tools
- Photoshop-style layers panel
- complex brush engines
- animation/cues
- web export
- video drawing
- collaborative editing

Those can build on this later.

The goal is not "make a paint app."

The goal is:

> **Give every image-like object a clean explicit control surface, and let Framechute create blank image-like objects too.**

---

# Deliverable

Implement this fully on a new branch from current `main`, add/update tests and documentation, run the validation suite, and open a PR when complete.

In the PR description, clearly call out:

- selection no longer reopens Quick Actions
- circular `☰` object menu button
- shared right-click/object menu behavior
- per-object Quick Actions persistence
- first-class standalone Canvas
- reuse of existing paint/flood-fill infrastructure
- transparent Save As
- FCX persistence
- test results and any manual-browser limitations
