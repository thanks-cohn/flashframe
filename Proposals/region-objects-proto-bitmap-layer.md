# Proposal: Region Objects / Proto Bitmap Layer

## Summary

Add a new Framechute primitive that lets the user **select any visual region and turn that region into an independently manipulable object without immediately destroying its relationship to the source**.

Working implementation concept: **Proto Bitmap Layer**.

Recommended product-facing name: **Region Object**.

The core interaction should be extremely simple:

> **See something → select it → make it an object.**

A Region Object can then be moved, resized, recolored, painted on, masked, layered relative to other objects, exported, and later participate in Framechute cues and timed motion.

The guiding product principle is:

> **Simple sure, but powerful.**

For the initial implementation, simplicity is the priority. The underlying model should remain capable enough to grow into sophisticated compositing and animation later without forcing that complexity into the first UI.

---

## Product Principle: Simplicity Is the Interface Contract

This feature should not become a miniature Photoshop panel.

The user should encounter a tiny set of obvious controls that map to much deeper operations underneath.

A novice should be able to understand the feature immediately:

1. select something
2. make it an object
3. edit it
4. put it above or below something else

Advanced capability should come from **composition of simple actions**, not from exposing dozens of expert controls.

Implementation decisions should be judged against one question:

> Can a novice do this immediately without preventing an advanced user from doing something much more sophisticated with the same primitive?

---

## Motivation

Many media-editing tasks are really about taking **one meaningful portion of something** and manipulating it independently.

Examples:

- isolate sketch lines while making the paper transparent
- select a face, prop, or shape and move it independently
- take one portion of an image and recolor it
- draw over a selected region
- keep only a drawing or set of marks and remove the surrounding pixels
- split one source image into foreground and background pieces
- put one extracted object above another image but below a third object
- select a chart from a PDF and use it independently

Traditional tools expose these tasks through masks, mattes, raster layers, clipping groups, smart objects, selections, alpha channels, and other specialized concepts.

Framechute should reduce the mental model to:

> **Select it. Make it an object. Edit it. Place it.**

---

## Core Model

A Region Object is **derived from a source but independently editable**.

Instead of immediately flattening selected pixels into a permanent bitmap, Framechute should initially preserve a lightweight recipe describing how the object was produced.

Conceptually:

```text
SOURCE
  ↓
REGION
  ↓
SELECTION / MASK
  ↓
INTERPRETATION
  ↓
PAINT / EFFECTS
  ↓
REGION OBJECT
```

Example internal representation:

```text
source: painting.png
region: [x, y, width, height]
mask: mask-004
interpretation: lines-only
paintOverlay: paint-002
compositing: above background, below character
```

The user does not need to see this representation.

The Region Object should simply behave like an ordinary object on the Framechute canvas.

At any time the user may choose:

> **Bake to Bitmap**

This freezes the result into ordinary raster pixels.

---

## Initial Selection Modes

The MVP should deliberately keep selection options small.

### 1. Whole Region

The complete selected rectangle or lasso area becomes an object exactly as seen.

Use case:

> Turn this part of the image into its own movable piece.

### 2. Selected Pixels

Only the active selected pixels remain. Everything outside becomes transparent.

Use case:

> Keep this subject and remove what surrounds it.

### 3. Lines / Marks

Preserve visible linework or marks while making the surrounding field transparent.

Useful for:

- sketches
- signatures
- handwriting
- diagrams
- ink drawings
- annotations

Typical workflow:

```text
white paper + black drawing
          ↓
Make Lines Object
          ↓
transparent + black drawing
```

### 4. Light / Dark Pixels

Keep pixels according to a simple threshold.

Useful for isolating:

- black handwriting from white paper
- white chalk from a dark board
- silhouettes
- highlights

The threshold should be adjusted visually, not through technical numeric controls.

### 5. Color Range

Sample a color and keep similar pixels.

Initial controls:

```text
Color      [ eyedropper ]
Tolerance  ----●-----
Softness   --●-------
```

This is enough for many poster, illustration, chroma-like, and recoloring workflows.

---

## Contextual Mini Toolbar

Every Region Object should get its own **small contextual toolbar** when selected.

This toolbar is central to the feature.

It should remain visually light and obvious rather than becoming a large permanent properties panel.

Suggested initial toolbar:

```text
[ Color ] [ Brush ] [ Thickness ] [ Erase ] [ Fill ] [ Select ] [ Above/Below ] [ More ]
```

The exact controls may vary by object state, but the initial emphasis should be on a few high-value actions.

### Color

Change the color of extracted lines, fills, or paint strokes.

### Brush

Enable lightweight drawing directly on the Region Object.

### Thickness

Choose stroke/brush thickness with a small visual selector.

Example:

```text
Thin   Medium   Thick
  •       ●       ⬤
```

No advanced brush engine is required initially.

### Erase

Erase paint or mask regions nondestructively where practical.

### Fill

Fill a selected area with a chosen color.

### Select

Refine or replace the active region/mask.

### Above / Below

Place the Region Object relative to another object in the scene.

The interaction should read naturally:

```text
Place this:

ABOVE  [ Character ]
BELOW  [ Hand ]
```

The user should not have to think in terms of numeric z-index values.

### More

Advanced or uncommon operations can live behind a secondary menu rather than occupying the primary toolbar.

---

## Paint Overlay

A Region Object should optionally have a lightweight nondestructive paint overlay.

Conceptually:

```text
REGION OBJECT
├── source pixels
├── mask
├── paint overlay
│   ├── strokes
│   ├── fills
│   └── erasures
└── effects
```

This lets the user add color or lines without permanently modifying the original source.

Possible actions after painting:

```text
[ Keep as Overlay ]
[ Flatten into Region ]
[ Make Paint an Object ]
```

**Make Paint an Object** is especially useful: the lines or marks the user just drew can become their own independent Framechute object with transparency around them.

That new object can then be moved, recolored, layered, duplicated, or eventually animated.

---

## Region Objects Can Be Derived Again

A Region Object should be selectable like any other source.

This allows recursive artistic workflows:

```text
IMAGE
 ↓ select face
FACE REGION
 ↓ select eye
EYE REGION
 ↓ draw highlight
HIGHLIGHT OBJECT
```

This makes complex compositions possible through repeated use of one simple operation rather than a collection of unrelated tools.

---

## Relative Layering

Framechute should eventually allow users to describe visual relationships rather than only assigning absolute layer numbers.

Example:

```text
Sword
  above torso
  below hand
```

or:

```text
Text
  above video background
  below extracted person
```

Internally Framechute can resolve these relationships into rendering order.

This gives artists a natural mental model:

> Put this behind her arm but in front of her body.

rather than:

> Move this to layer 37.

For the MVP, simple Above / Below controls are enough. The internal representation should avoid preventing richer relative compositing later.

---

## Source Types

The architecture should not assume that Region Objects only come from static PNG files.

The same model should eventually support regions derived from:

- PNG
- JPEG
- WebP
- GIF
- SVG render output
- video frames
- PDF pages
- Canvas output
- other Framechute objects

The first implementation can focus on ordinary bitmap images while keeping the source abstraction generic.

---

## Future: Cues, Timing, GIFs, and Mini-Films

This is **not required for the initial Region Object implementation**, but the architecture should deliberately leave room for it.

Once a Region Object is a normal Framechute object, it should eventually participate in Framechute's cue and motion systems.

That enables workflows such as:

```text
00:00  region at left
00:02  region moves center
00:04  region expands
00:05  color changes
00:06  region disappears
```

For GIFs or moving sources, a derived Region Object could preserve source timing while allowing the object itself to move independently.

Conceptually:

```text
Animated GIF region
      +
Framechute movement cues
      +
other regions / text / audio
      ↓
small animated scene / mini-film
```

This could later support:

- moving collage
- simple character animation
- animated memes
- motion graphics
- pseudo-cutscenes
- lightweight mini-films
- text behind moving subjects
- timed annotation

The important rule for now is that **timing and motion are future extensions of the same Region Object**, not a second incompatible system.

---

## Non-Goals for the Initial Version

Do not turn this proposal into a full professional raster editor.

The initial version does **not** need:

- Photoshop-grade brush libraries
- complex Bézier masks
- professional rotoscoping
- node graphs
- advanced vector tracing
- AI segmentation as a hard dependency
- frame-by-frame video tracking
- dozens of blend modes
- full color-management controls

Those may become useful later, but they are not necessary to prove the primitive.

The MVP should prove that a user can:

1. select part of an image
2. make it independent
3. keep all pixels or isolate marks/colors
4. add simple lines/color through a tiny toolbar
5. make the surrounding area transparent when desired
6. place the result above or below other objects
7. continue editing without modifying the original source

---

## Suggested MVP

### Phase 1 — Region Creation

- rectangular region selection
- whole-region object creation
- selected-pixel transparency
- duplicate/copy region as independent object
- preserve source reference

### Phase 2 — Simple Extraction

- lines/dark/light extraction
- color-range selection
- threshold/tolerance controls
- editable mask

### Phase 3 — Mini Toolbar

- color
- simple brush
- thickness
- eraser
- fill
- reselect/refine
- above/below

### Phase 4 — Nondestructive Paint

- paint overlay
- toggle overlay
- flatten paint
- promote paint to new object

### Phase 5 — Later Integration

- cues
- motion
- GIF timing
- video-derived regions
- tracking
- advanced relative compositing

---

## Why This Fits Framechute

Framechute already emphasizes direct visual manipulation rather than forcing users through heavyweight professional workflows.

Region Objects extend that philosophy with another universal interaction:

> **See something, make it an object.**

Combined later with Framechute's cue philosophy:

> **At a time, change it.**

these two primitives can support a surprisingly broad range of creative work while preserving a very small mental model.

A user can gradually move from:

```text
select → recolor
```

to:

```text
select → isolate → draw → layer → cue → animate → export
```

without switching applications or learning a new conceptual system at every stage.

---

## Design Rule

The strongest version of this feature is not the one with the most controls.

It is the one where a user sees something on the canvas, selects it, and immediately understands what to do next.

Framechute should hide implementation complexity while preserving expressive power.

The target is:

> **A tiny interface with disproportionately large creative reach.**
