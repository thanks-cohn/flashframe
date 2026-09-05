# ADDENDUM — Spatial permanence, FrameSnap export, and persistent Quick Actions switch

Read this together with:

- `agents/codex/prompts/next-utility-pass-after-pr39.md`
- `agents/codex/prompts/next-utility-pass-context-menu-scroll-addendum.md`
- `agents/codex/prompts/next-utility-pass-open-snapshot-addendum.md`

This is part of the remaining current-priority product/UX work. Build on the existing workspace positioning, object-selection, Quick Actions, context-menu, image/PDF export, and FCX systems. Do not create parallel coordinate or export architectures.

---

# 1. Workspace objects must stay where the user put them

## Current bug / wrong mental model

FrameChute appears to force or clamp objects back into the current viewport / safe area as the user scrolls or changes the visible portion of the workspace, likely to prevent objects from sitting underneath the fixed top toolbar/header.

That behavior is wrong for a spatial workspace.

A user may intentionally be building a very large collage, board, or work of art that extends far beyond the current viewport. Moving the viewport must not move the artwork.

## Product rule

> **The viewport moves over the workspace. The workspace objects do not move with the viewport.**

Object coordinates belong to the workspace/world, not to the currently visible browser rectangle.

Required behavior:

- scrolling/panning the workspace must not mutate an object's stored `x/y`, `left/top`, transform, or equivalent scene coordinates
- resizing the browser window must not silently relocate existing objects merely to keep them visible
- showing/hiding the top toolbar must not push user content to a different workspace position
- if an object ends up visually underneath the fixed top header after the user scrolls, that is acceptable; the object is still exactly where the user placed it
- the header may temporarily occlude content in screen space; that is preferable to altering the document/workspace geometry
- Quick Actions, context menus, toolbars, dialogs, and other UI chrome should still obey viewport-safe positioning; **workspace content should not**
- do not confuse UI collision avoidance with object-position clamping
- object movement should occur only because of an explicit user transform/action, an explicit Fit/Shrink command, an explicit arrange/layout command, or a clearly invoked bring-into-view command
- restoring an FCX snapshot should restore the original workspace coordinates, not normalize them into the current viewport
- preserve large positive workspace coordinates and any currently supported negative/extended-space coordinates according to the existing workspace model

Audit scroll, resize, toolbar visibility, restore, frameless conversion, and object-drag completion paths for any clamp/reposition helper that treats the browser viewport as the permanent artboard.

### Acceptance workflows

1. `Place image high on a large workspace → scroll far down → image remains at the same workspace coordinate and simply leaves the viewport.`

2. `Scroll back up → image is exactly where it was; no silent relocation occurred.`

3. `Place object where it can pass underneath the fixed header → scroll/pan so header visually overlaps it → object coordinates remain unchanged.`

4. `Export FCX → reopen at a different browser/window size → object layout remains spatially faithful rather than being clamped into view.`

5. `Open/close toolbar → workspace objects do not jump.`

---

# 2. FrameSnap — flatten a composition into an image with one obvious action

FrameChute should make it extremely easy to turn a spatial collage/composition into a normal image file.

Name the feature **FrameSnap**.

The core mental model:

```text
arrange things in FrameChute
        ↓
FrameSnap
        ↓
normal image
```

This is not a browser screenshot. It is an export of the workspace composition itself.

## Entry points

Expose clear context actions where appropriate:

- right-click selected visual objects → **FrameSnap Selection…**
- right-click empty workspace / workspace menu → **FrameSnap Workspace…**

If a one-click default is easy to support without ambiguity, an immediately reachable **FrameSnap PNG** action may use sensible defaults, while **FrameSnap…** opens the compact options surface.

Do not bury this deep in Advanced mode.

## What gets captured

For selection mode:

- use the union bounds of the selected objects in workspace coordinates
- preserve the actual spatial arrangement, overlap, rotation, crop, opacity, paint, warp state where supported, and z-order
- do not rearrange selected objects into a grid

For workspace mode:

- capture the meaningful object/content bounds of the workspace, not merely the current browser viewport
- provide an optional **Visible View** choice if useful, but do not make viewport capture the only model

The exported image must exclude FrameChute UI chrome:

- top header/toolbar
- Quick Actions
- context menus
- blue selection outlines
- resize handles
- Grab/Move controls
- mascot
- Settings/player docks
- object menu buttons
- temporary editor chrome

The result should look like the artwork/composition, not a screenshot of the editor.

## Compact export options

Keep the first UI small and obvious:

```text
FrameSnap

Area: Selection / Workspace / Visible View
Format: PNG / JPEG / WebP
Scale: 1× / 2× / Custom
Quality: 0–100%   (where format supports it)
Background: As shown / Transparent (where possible)

[ Cancel ] [ Save As… ] [ Add to Workspace ]
```

Rules:

- preserve aspect ratio of the captured composition bounds
- default PNG is a sensible lossless default for collage/artwork
- JPEG/WebP quality uses the existing image encoding primitives where possible
- transparent background should work only when the underlying composition/background permits it; otherwise be honest
- Save As creates a normal image file
- Add to Workspace creates one flattened image object from the result
- original objects remain unchanged
- do not force both Save As and Add to Workspace

## Rendering architecture

Prefer a composition renderer based on existing FrameChute object geometry/state rather than taking a literal browser/window screenshot.

Reuse existing image/canvas/PDF/document visual surfaces where practical.

The long-term renderer should be capable of representing the scene graph / object geometry consistently with on-screen output. Do not create a throwaway screenshot-only path that cannot later support rotated/warped objects.

For v1, prioritize visual fidelity for the common collage objects already rendered reliably in the workspace, especially images, canvas objects, text, and currently renderable document/PDF surfaces.

---

# 3. FrameSnap PDF — export the same composition directly as a PDF

From the same FrameSnap bounds/renderer, provide a direct **FrameSnap PDF…** / PDF output option.

The first implementation may create a single-page PDF representing the composition exactly as arranged.

Desired flow:

```text
select objects or choose workspace
        ↓
FrameSnap PDF…
        ↓
composition bounds become one PDF page
        ↓
Save As… / Add to Workspace
```

Requirements:

- preserve the spatial composition and z-order
- page dimensions should correspond sensibly to the captured composition, with optional standard page sizing later
- no FrameChute UI chrome in the PDF
- Save As creates a real `.pdf`
- optional Add to Workspace creates a normal FrameChute PDF object
- original objects remain independently editable
- if v1 rasterizes the composition into the PDF for fidelity/simplicity, document that internally and keep the architecture open for later vector/text preservation

This is distinct from the later **Arrange into PDF** multi-object document-assembly feature. FrameSnap PDF means:

> **Take this composition exactly as I arranged it and make it one PDF page.**

Arrange into PDF means:

> **Turn selected heterogeneous objects/pages into an ordered document.**

Keep those concepts separate.

---

# 4. Persistent global Quick Actions switch at the top of the right-click menu

The object/right-click menu should provide an immediately visible application-level switch so a user can suppress the Quick Actions panel entirely.

At or near the top of the right-click/object menu, expose something conceptually like:

```text
Quick Actions    [ ON ]
```

or

```text
Show Quick Actions   ✓
```

This must behave as a real persistent global preference, not merely a one-time dismissal.

## Required behavior

When switched OFF:

- hide the Quick Actions panel immediately
- selecting/clicking/right-clicking objects must not automatically make Quick Actions appear
- changing selection must not resurrect it
- opening another object must not resurrect it
- the preference remains OFF until the user explicitly switches it back ON
- persist the preference using the existing settings/local-preference mechanism so reload/reopen does not unexpectedly turn it back on

When switched ON:

- restore normal Quick Actions behavior
- do not require a reload

## Interaction with existing per-object Show/Hide Quick Actions

There is already per-object Quick Actions visibility state. Do not create two ambiguous controls with unclear precedence.

Use a clear hierarchy:

```text
Global Quick Actions OFF
    → panel stays hidden for every object

Global Quick Actions ON
    → existing per-object Show/Hide preference may apply
```

If the existing per-object command remains, label it clearly as object-specific, for example:

- **Hide Quick Actions for This Object**
- **Show Quick Actions for This Object**

Do not let the per-object command override a globally disabled Quick Actions system.

The global switch belongs near the top because it controls whether this UI system exists at all for the user.

### Acceptance workflows

1. `Right-click → switch Quick Actions OFF → panel disappears → click five different objects → panel remains hidden.`

2. `Reload FrameChute → Quick Actions remains OFF.`

3. `Right-click → switch Quick Actions ON → normal panel behavior returns immediately.`

4. `Global ON + one object locally hidden → that object's existing local preference is honored.`

5. `Global OFF + object locally shown → global OFF wins; panel remains hidden.`

---

# Tests / regression expectations

Add focused tests where practical for:

- scrolling/viewport changes not mutating object workspace coordinates
- toolbar visibility not relocating content
- FCX restore preserving coordinates independent of viewport size
- FrameSnap selection bounds and z-order
- exclusion of editor/UI chrome from FrameSnap output
- output routing: Save As vs Add to Workspace
- FrameSnap PDF single-page generation
- persistent global Quick Actions preference
- precedence between global Quick Actions state and per-object visibility state

Preserve local-first behavior, Manifest V3 / Chrome Web Store compatibility, current Save/Save As semantics, and FCX durability.
