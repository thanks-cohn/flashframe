# Proposal: Quick Photoshop / Harmonize

## Summary

Add a simple one-click **Quick Photoshop** feature to Framechute that visually harmonizes multiple transparent image layers so they feel like parts of one consistent composite rather than separate pasted assets.

The feature is intentionally narrow. It does **not** attempt to recreate Photoshop. Instead, it reduces one common compositing workflow to a single action:

> Analyze the visible transparent-image layers, normalize their tonal and color characteristics toward a shared target, then apply a subtle common finishing treatment across the composite.

The result should make assets from different sources feel more visually unified while preserving transparency and leaving the original files untouched.

---

## Problem

Framechute can place multiple transparent PNG/WebP assets together quickly, but assets from different sources often disagree visually:

- one layer is warm while another is cool
- one is very contrasty while another is flat
- black and white points differ
- saturation differs
- highlights and shadows have different color casts
- AI-generated, photographed, illustrated, and web-sourced cutouts can look visibly pasted together

Correcting this manually normally requires adjustment layers, curves, color balance, Match Color, LUTs, Camera Raw, or similar tools in a dedicated image editor.

For Framechute, that workflow is too heavy for a problem that is often perceptually simple: **make these layers feel like they live in the same image.**

---

## Goal

Provide a one-button operation that makes visible transparent image layers more visually consistent.

The feature should:

1. detect eligible visible image layers
2. ignore fully transparent pixels during analysis
3. analyze each layer's tonal and color characteristics
4. derive a shared target look from the current composition
5. move each layer toward that target
6. optionally apply a subtle shared finishing grade
7. remain fully nondestructive and reversible

The primary experience should be:

```text
QUICK PHOTOSHOP

[ HARMONIZE ]

Strength
--------●----
       70%
```

A user should not need to understand curves, histograms, color spaces, or grading terminology.

---

## Naming

Possible UI labels:

- **Quick Photoshop** — clearest description of the intended shortcut
- **Harmonize** — cleaner product-facing name
- **Unify** — shortest conceptual label
- **Match Look** — describes the operation directly

Recommended implementation name: `harmonize`.

Recommended initial UI label: **Quick Photoshop** with **Harmonize** as the action name or tooltip.

---

## User Experience

### Basic flow

1. User composes several transparent images in Framechute.
2. User presses **Quick Photoshop**.
3. Framechute analyzes all eligible visible layers.
4. Corrections are applied immediately.
5. A **Strength** slider allows the user to blend between the original and harmonized result.
6. The operation can be disabled, reset, or undone at any time.

### Selection behavior

Initial MVP behavior:

- If image layers are selected, harmonize the selected eligible layers.
- If no layers are selected, harmonize all visible eligible image layers.
- Ignore text, controls, guides, video, hidden layers, and non-image UI elements.

### Transparency

Transparent pixels must remain transparent.

Pixel analysis should ignore pixels whose alpha is effectively zero. Semi-transparent edge pixels should be handled carefully so antialiased cutout edges do not skew the analysis.

---

## Proposed Analysis

For every eligible image layer, compute statistics over nontransparent pixels.

Suggested measurements:

- perceptual luminance
- median brightness
- dynamic range
- black point
- white point
- contrast
- saturation / chroma
- average color temperature bias
- shadow color bias
- midtone color bias
- highlight color bias

Use a perceptual color space such as **OKLab** or **CIELAB** for color analysis rather than performing all normalization directly in RGB.

This should produce more natural matching because perceptual lightness and chroma are separated more meaningfully than in raw RGB values.

---

## Shared Target Look

The algorithm should derive a target from the composition rather than arbitrarily forcing every asset toward a fixed preset.

For the MVP, the target can be based on robust aggregate statistics across all participating layers.

For example:

```text
targetBrightness = median(layerBrightness)
targetContrast   = median(layerContrast)
targetChroma     = median(layerChroma)
targetWarmth     = median(layerWarmth)
targetBlack      = median(layerBlackPoint)
targetWhite      = median(layerWhitePoint)
```

Median-based targets are preferable to means because one extreme layer should not dictate the look of the entire composite.

Corrections should be clamped to safe ranges so the feature improves cohesion without aggressively recoloring assets.

---

## Layer Corrections

Each participating layer receives a nondestructive correction object.

Possible fields:

```js
layer.harmonize = {
  enabled: true,
  strength: 0.7,
  exposure: -0.08,
  contrast: 1.07,
  saturation: 0.91,
  temperature: 0.04,
  blackPoint: 0.02,
  whitePoint: 0.97,
  shadowTint: [0.0, 0.01, -0.02],
  midtoneTint: [0.01, 0.0, -0.01],
  highlightTint: [0.02, 0.01, 0.0]
};
```

These values are rendering instructions only. The source image data remains unchanged.

The global Strength value should interpolate between the unmodified layer and its calculated correction.

---

## Shared Finishing Layer

After individual normalization, Framechute can optionally apply a very subtle composition-wide finish.

Suggested shared adjustments:

- tiny contrast curve
- subtle shadow/highlight tint
- very light global saturation adjustment
- optional fine grain/noise

Pipeline:

```text
Source layers
    ↓
Per-layer normalization
    ↓
Composite
    ↓
Shared finishing grade
    ↓
Final Framechute render
```

This final shared treatment is useful because a common color cast, contrast response, or tiny amount of texture can make independently sourced images feel like they were captured or processed together.

The finishing layer should be restrained by default.

---

## Rendering Architecture

The feature should be nondestructive and preferably GPU-accelerated.

### Preferred path

If Framechute's renderer already uses WebGL or a shader-capable canvas path, implement harmonization as shader parameters applied per layer, followed by an optional global post-process.

Potential operations:

- exposure / gain
- contrast curve
- saturation
- temperature / tint
- black and white point remapping
- split-toning style shadow/highlight offsets

### Fallback path

If the current rendering pipeline is Canvas 2D only, a first version can use offscreen canvases and pixel transforms, caching the corrected result whenever the harmonization parameters change.

Avoid recalculating every image on every animation frame.

---

## Performance

Analysis should happen only when necessary:

- Quick Photoshop is pressed
- a participating image changes
- a participating layer is added or removed
- the user explicitly requests a recalculation

For large images, analysis does not need full-resolution pixel data.

A downsampled analysis buffer such as 128–512 pixels on the longest side should be enough to estimate color and tonal statistics cheaply.

Rendering corrections can then be applied at normal display resolution.

---

## Nondestructive State and Undo

Quick Photoshop must never overwrite or rewrite the original imported file.

The feature should integrate with Framechute's existing undo/history system as one logical action:

```text
Apply Quick Photoshop
Undo Quick Photoshop
Redo Quick Photoshop
```

The user should also be able to:

- toggle harmonization on/off
- reset the corrections
- adjust Strength
- recalculate the target after changing the composition

---

## Important Limitations

This feature should not pretend to solve every compositing problem.

It will improve color and tonal cohesion, but it cannot reliably correct:

- incompatible lighting directions
- major perspective mismatches
- missing cast shadows
- extremely different image resolutions
- radically different depth of field
- hard studio lighting versus diffuse environmental lighting
- incorrect object scale
- fundamentally incompatible art styles

Those remain manual or generative-editing problems.

The goal is narrower:

> Fix the common case where several otherwise usable cutouts simply look like several separately sourced cutouts pasted together.

---

## MVP

### Version 1

Implement:

- Quick Photoshop / Harmonize button
- selected-layers-or-all-visible behavior
- alpha-aware analysis
- brightness normalization
- contrast normalization
- saturation normalization
- basic temperature/tint matching
- global Strength control
- nondestructive state
- undo/redo support

### Version 1.1

Add:

- black/white point matching
- shadow/midtone/highlight tint matching
- subtle global finishing grade
- cached downsampled analysis

### Later possibilities

- choose a specific layer as the visual reference
- `Match to Selected Layer`
- multiple looks / target presets
- optional shared grain
- optional shadow-generation helper
- environment-aware matching
- automatic detection of the dominant background palette
- local rather than global correction masks

---

## Acceptance Criteria

The MVP is successful if:

1. The user can place several transparent images from visibly different sources into one composition.
2. One click produces a noticeably more cohesive result in typical cases.
3. Transparent regions remain transparent.
4. The source assets are never modified.
5. The user can reduce the effect with one Strength control.
6. Undo restores the exact previous visual state.
7. The feature remains fast enough to feel immediate for ordinary Framechute compositions.
8. The interface does not expose traditional photo-editing complexity unless advanced controls are added later.

---

## Product Principle

Quick Photoshop fits Framechute's core interaction philosophy: take a common creative operation that usually requires a dedicated tool, several panels, and technical knowledge, and collapse the obvious version of that operation into one immediate action.

The feature is not "Photoshop inside Framechute."

It is the small slice of Photoshop many compositing tasks actually need, reduced to:

> **These images do not quite belong together. Make them belong together.**
