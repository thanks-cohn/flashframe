# Proposal: PDF-First Universal Browser Workbench

## Summary

Framechute should evolve into a browser-native workbench for manipulating visual media, text, documents, presentations, web content, forms, and eventually simple interactive 3D scenes.

The near-term priority should be narrow and concrete:

> **Make PDF handling marvelous in the normal, non-advanced Framechute experience.**

The default interaction model should remain almost entirely direct manipulation:

- drag and drop
- click to select
- type to edit
- drag to move
- grab a corner to resize
- link one thing to another
- press Play for interactive content
- export when finished

A first-time user should not need documentation to edit a PDF, make a meme, add text, place an image, build a form, link a button, or rearrange content.

Advanced mode should not become a second product. It should reveal deeper web-development, logic, and interaction primitives beneath the same objects and projects.

---

## Product Thesis

A user may have only a browser available. They may be on a Chromebook, a locked-down workstation, a borrowed machine, or simply not want to install a pile of specialist software.

Today, a relatively simple job can require bouncing between multiple tools:

- PDF editor
- image editor
- presentation software
- font service
- media converter
- form builder
- web builder
- lightweight animation or 3D utility

Framechute should collapse that friction.

The product promise becomes:

> **If it can appear in a browser, Framechute should increasingly let you manipulate it.**

The browser is already a rendering engine, media player, font system, JavaScript runtime, WebAssembly host, WebGL environment, networking client, and increasingly capable local file interface. Framechute should make those capabilities feel like one coherent application.

---

## Near-Term Priority: Own PDFs First

PDF is an ideal flagship format because it is universal, heavily used, and still surprisingly awkward to manipulate without dedicated software.

Framechute should make a PDF feel less like a frozen document and more like a live canvas.

The normal/simple experience should eventually support:

- open PDFs locally
- reorder pages
- split and merge
- rotate and crop
- delete pages
- drag images directly onto a page
- move and resize those images with normal Framechute handles
- add text
- select and edit existing text where possible
- reconstruct editable text regions when the source PDF is messy
- extract images
- annotate and draw
- redact
- duplicate content
- compare versions
- export selected pages
- save a non-destructive Framechute project
- export a normal PDF

The important UX rule is that PDF editing should **not** feel like entering an Acrobat-style subsystem.

If an image is on a PDF page, it should behave like an image anywhere else in Framechute.

If text is editable, the user should simply click it, type, choose a font, and continue.

### Example

```text
Drop PDF
-> drag logo onto page
-> resize from corner
-> double-click old date
-> type new date
-> choose font
-> delete page 4
-> move page 9 earlier
-> export PDF
```

That is the target experience.

---

## PDF Text Editing Strategy

PDF internals are inconsistent, so Framechute should use multiple strategies behind one simple interaction.

### 1. Native text edit

When text can be safely traced to actual PDF text objects, edit those source objects directly.

### 2. Reconstructed text region

When a PDF stores text as awkward positioned glyphs or fragmented runs, reconstruct those glyphs into a logical editable region.

### 3. Visual recovery

For scans, outlined text, broken encodings, or flattened pages, recover the visible region into an editable representation when possible.

The user should not need to know which strategy was used.

The interface should still be:

```text
Double-click text
-> type replacement
-> choose font if desired
-> resize/reflow if needed
-> export
```

Where practical, preserve the original PDF and keep Framechute edits non-destructive until export.

---

## Universal Interaction Grammar

Framechute should be built around a very small set of physical actions rather than a permanent wall of controls.

```text
Drop         -> import/place
Click        -> select
Drag         -> move
Corner       -> resize/scale
Double-click -> edit/open
Delete       -> remove
Ctrl/Cmd-Z   -> undo
Link         -> connect/navigation/action
Play         -> run behavior
Export       -> produce a usable artifact
```

This grammar should apply wherever practical to:

- images
- text
- PDF regions and pages
- SVG
- video
- audio representations
- shapes
- forms
- web elements
- frames
- simple 3D primitives

Menus and property inspectors remain available, but they are precision tools and escape hatches rather than the primary interaction model.

---

## Contextual Controls

Controls should appear because an object is selected, not because Framechute theoretically supports them.

### Select text

- font
- size
- weight
- alignment
- color
- spacing

### Select image

- crop
- rotate
- opacity
- mask
- harmonize
- replace source

### Select video

- trim
- loop
- speed
- poster frame
- audio

### Select PDF page or region

- edit text
- move
- crop
- rotate
- delete
- extract
- reorder

### Select form element

- field type
- label
- required/optional
- validation
- destination/action
- success behavior

### Select 3D primitive

- position
- rotation
- scale
- material
- behavior
- physics role

The interface should grow in capability without visually growing at the same rate.

---

## Fonts as Infrastructure

Typography should feel as immediate as resizing an image.

Framechute should support a large searchable catalog of open web fonts, potentially through cached/downloadable metadata and web-font providers.

Desired flow:

```text
Click text
-> type
-> open Font
-> search "retro" / "handwritten" / "condensed"
-> choose
-> done
```

Possible export strategies:

- embed an allowed font into the project/export
- reference a web font when exporting a website
- bundle self-hostable font files when licensing permits
- use a fallback stack when necessary

This makes Framechute immediately useful for memes, posters, thumbnails, flyers, captions, PDFs, presentations, resumes, and web pages.

---

## Frames as the Common Substrate

A Frame should not be defined only as a slide.

A Frame is a visual scene containing objects, layout, behavior, and optional navigation semantics.

The same project can therefore be interpreted in different ways.

### Presentation

```text
Frame 1 -> slide 1
Frame 2 -> slide 2
Frame 3 -> slide 3
```

### Website

```text
Frame 1 -> /
Frame 2 -> /about
Frame 3 -> /contact
```

### Interactive state / scene

```text
Frame 1 -> menu
Frame 2 -> level
Frame 3 -> result
```

This avoids creating separate document, slide, website, and interactive project models where the same primitives would otherwise be duplicated.

---

## Forms, Links, and Small Web Applications

Framechute should support useful web-native constructs without requiring users to think like programmers.

A user should be able to drag in:

- button
- text input
- textarea
- checkbox
- radio group
- select menu
- image link
- navigation element
- simple form

Then visually define behavior such as:

```text
Button -> go to Frame 3
Image -> open URL
Submit -> POST to endpoint
Success -> show message
Failure -> show error state
```

In simple mode, these are direct actions.

In Advanced mode, a web developer could see or configure:

- method
- action URL
- field names
- validation rules
- event handlers
- route behavior
- accessibility attributes
- generated HTML

The simple and advanced views must refer to the same underlying object.

---

## Advanced Mode for Web Developers

Advanced mode should quietly respect conventions web developers already know.

Framechute should not invent strange proprietary concepts where established web concepts already work.

Potential advanced capabilities:

- DOM-like object hierarchy
- CSS-compatible properties
- responsive constraints and breakpoints
- semantic element roles
- reusable components
- routes
- forms
- links
- events
- state and variables
- JavaScript hooks
- asset bundling
- Three.js/WebGL scene properties
- export inspection

A serious web developer should be able to look at Framechute and immediately understand the escape hatches.

The product should not need an elaborate sales pitch to technical users. The value proposition is obvious:

> Why pay for multiple specialized subscriptions when a cheap utility can also edit PDFs, manipulate media, build interactive pages, and export normal web artifacts?

Framechute does not need to replace every specialist tool feature-for-feature. It needs to cover enough common work that reaching for another paid service becomes optional rather than automatic.

---

## Provider-Agnostic Deployment

Framechute should build and export artifacts, not lock users into a hosting service.

A website export should be deployable through the provider of the user's choice.

Potential output:

```text
/index.html
/styles.css
/runtime.js
/assets/
/fonts/
/scenes/
```

Users should be able to deploy that output with any compatible provider, including static hosting, object storage, conventional web servers, or their own infrastructure.

Framechute may eventually offer convenient publishing integrations, but hosting should not be mandatory.

Core principle:

> **Create here. Deploy anywhere.**

This is especially important for web developers, who may already have preferred hosting, CI/CD, domains, CDNs, or infrastructure.

---

## Portable Project Format

The long-term value of Framechute depends heavily on portability.

A project bundle, for example `.frame` or another future extension, should be capable of describing:

- frames
- assets
- text
- fonts or font references
- object hierarchy
- transforms
- layout constraints
- animation
- events
- actions
- variables
- routes
- forms
- 3D scene data
- project metadata

The format should be documented and designed so exported work remains useful outside Framechute.

A user should never feel that building something in Framechute traps the result inside a proprietary viewer.

---

## Lightweight 3D: Toybox, Not Blender

Framechute should eventually support simple 3D construction, but it should not attempt to become a full Blender replacement.

The goal is **Toybox 3D**:

- cube
- sphere
- cylinder
- cone
- plane
- capsule
- simple materials
- lights
- camera
- grouping
- transforms
- simple physics roles
- simple behaviors

The emphasis is on making interactive 3D objects from primitives with almost no learning curve.

### Benchmark: The Box With Silly Wheels

A defining test for the 3D system should be whether a user can create and drive a silly little car without reading documentation.

```text
Drop cube
-> stretch into car body
-> add four cylinders
-> mark cylinders as wheels
-> group
-> add vehicle behavior
-> W/S = forward/reverse
-> A/D = steer
-> Space = brake
-> PLAY
```

If that works naturally, the interaction model is succeeding.

---

## Universal Logic Model

Web behavior, animation behavior, and simple game behavior should share one event/action system rather than becoming separate editors.

### Objects

Text, image, video, PDF region, shape, form field, button, audio, 3D object, camera, light, etc.

### Properties

Position, dimensions, opacity, font, material, playback state, physics properties, value, visibility, and so on.

### Events

- click
- hover
- key press
- page load
- scroll
- timer
- collision
- trigger entry
- variable change
- form submit

### Actions

- move
- rotate
- show
- hide
- play
- pause
- navigate
- modify property
- set variable
- submit form
- spawn
- destroy
- run custom code

Example:

```text
IF player touches red cube
THEN hide red cube
AND score += 1
```

Or:

```text
IF button clicked
THEN navigate to /contact
```

Or:

```text
IF form submitted successfully
THEN show Thank You frame
```

The visual logic layer should feel like connecting behaviors, while Advanced/Developer mode can reveal the generated or attached code beneath it.

---

## Export Philosophy

Framechute should export usable artifacts rather than requiring a proprietary runtime whenever possible.

Potential outputs include:

- PNG/JPEG/WebP
- SVG
- PDF
- video
- presentation-like web bundle
- static website
- interactive website
- PWA
- embeddable widget
- lightweight Three.js/WebGL scene

If a project does not use a feature, its export should not pay the runtime cost for that feature.

Where practical, bundle only what is required.

---

## Pricing / Strategic Principle

Framechute's breadth can itself become part of its competitive advantage.

A developer or power user may otherwise spend tens of dollars per month across multiple specialized products.

Framechute can instead aim to be:

- inexpensive enough to be an easy purchase
- useful enough to keep installed
- broad enough to replace several occasional-use subscriptions
- open enough that developers can export and deploy elsewhere

The strategic goal is not to force users into an ecosystem.

It is to become the obvious utility they keep around because it repeatedly saves them from needing another one.

---

## Development Order

This proposal is intentionally long-range. Implementation should remain staged.

### Phase 1: Marvelous PDF Handling

Focus heavily on simple-mode PDF workflows:

- reliable rendering
- page operations
- image placement
- transforms
- annotations
- text insertion
- existing-text editing/reconstruction
- robust save/export
- undo/redo

### Phase 2: Universal Object Model

Unify manipulation semantics across text, image, PDF, SVG, and video.

### Phase 3: Frames + Web Export

Add frames, links, navigation, responsive layout, forms, and clean provider-agnostic website export.

### Phase 4: Advanced / Developer Layer

Expose web conventions, events, variables, CSS-like properties, routes, forms, and JavaScript escape hatches.

### Phase 5: Toybox 3D + Logic

Add primitive 3D objects, basic physics roles, Play mode, visual events/actions, and lightweight Three.js/WebGL export.

---

## Non-Goals

Framechute should not initially attempt to:

- reproduce every Adobe Acrobat feature
- reproduce Photoshop's complete editing model
- reproduce Blender's modeling stack
- become a full professional game engine
- build a proprietary hosting dependency
- require code for normal workflows
- expose every advanced control in the default UI

Complexity should exist underneath the interface, not dominate it.

---

## Design Law

The entire direction can be summarized in one rule:

> **Anything commonly performed visually should have a visual, physical interaction before it has a menu command.**

Menus are escape hatches.

Property panels are precision instruments.

Code is the deepest escape hatch.

Dragging, clicking, typing, linking, playing, and exporting are Framechute.

---

## Long-Term Test

A useful test for the product vision:

> Could a competent person survive for a week on a browser-only machine using Framechute for most routine visual/document/web work?

And a second test:

> Could a first-time user make a meme, edit a PDF, build a tiny linked form, and drive a box with silly wheels without reading documentation?

If both become true, Framechute has moved beyond being a viewer or editor and become a genuine browser-native workbench.
