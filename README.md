# FrameChute

**Open it. Change it. Save it.**

FrameChute is a **lightweight, intuitive, easy-to-use document and media editing surface** for Chrome and Chromium browsers.

It combines a freeform spatial workspace with practical file utilities, so images, PDFs, DOCX files, video, audio, CSV tables, archives, notes, and webpages can live together on one canvas and be worked on directly.

**Your browser has tabs. FrameChute gives it a desk.**

The larger idea is simple:

> **Give me the file. I’ll figure out what to do with it.**

Instead of asking which application should open a thing, FrameChute tries to ask the more useful question:

> **What do you want to do to it?**

# Why FrameChute exists

A surprising amount of ordinary computer work is made harder than it needs to be.

Crop an image. Resize forty pictures. Pull a frame from a video. Reorder a PDF. Merge two PDFs. Edit a Word document. Clean a CSV. Open a ZIP. Put a note beside a reference image. Convert something. Save the result.

For jobs like these, people are often pushed toward a collection of separate applications, converter websites, subscriptions, and professional suites.

**For a lightweight browser extension, FrameChute deliberately seeks to fill the niche that a lot of expensive suites seem to demand ownership of.**

FrameChute is not trying to replace every specialist tool. It is trying to make the common job obvious, quick, and local.

> **Select the thing. Do the obvious thing. Save the result.**

# What FrameChute can do today

FrameChute is both a **spatial workspace** and an increasingly capable **document and media utility layer**.

## Put different kinds of material on one canvas

FrameChute can work with:

- notes and text
- PDFs
- DOCX documents
- images
- image folders / galleries
- local video and audio
- webpages when the site permits embedding
- CSV tables
- ZIP and CBZ archives

Objects can be moved, resized, renamed, layered, maximized, arranged beside related material, and kept together as a working surface instead of disappearing into separate applications and tabs.

A PDF can sit beside the note about it. A video can sit beside its reference images. A table can stay beside the document it came from. The position itself can carry meaning.

# Quick Actions

FrameChute has a contextual Quick Actions system built around the selected object or objects.

Rather than expose every command all the time, it asks what makes sense for what you selected.

The action system supports:

- single-object actions
- multi-selection
- batch work
- progress-aware operations
- generated result objects that can continue living on the workspace
- native Save As flows

This is the foundation for a much broader browser-native utility layer.

# Image editing

Current image tools include:

- visual crop
- resize with aspect locking
- rotate
- flip
- straighten
- basic perspective correction
- PNG / JPEG / WebP conversion
- compression
- metadata-stripping re-encode
- trim transparent margins
- make a selected color transparent
- fill transparent backgrounds
- blur / pixelate a region
- basic annotation
- stitch images vertically or horizontally
- create contact sheets
- generate common icon sizes
- compare two images
- create a PDF from selected images
- batch resize / convert / compress
- native Save As

Many image changes remain non-destructive inside the workspace until the user chooses to bake them into a saved result.

# Video and media

FrameChute can open local playable media directly on the canvas, beside the documents, images, notes, and other media that belong with it.

A signature workflow is **Extract Frame**:

```text
video
  ↓
seek to the moment
  ↓
Extract Frame
  ↓
normal FrameChute image object
  ↓
crop · resize · annotate · convert · save
```

The extracted frame is not merely downloaded and forgotten. It becomes another editable object on the FrameChute substrate.

FrameChute also supports media state, looping, synchronization, timing, and scene-oriented behavior.

The interaction direction is intentionally physical: a visible video should behave spatially like an image while still retaining time. In other words, move it to change **where** it is; scrub it to change **when** it is.

# PDFs

FrameChute can open PDFs as editable document objects.

Current PDF capabilities include:

- page navigation
- editing visible PDF text through the current editing model
- rotate pages
- delete pages
- duplicate pages
- reorder / move pages
- extract pages
- insert / merge another PDF
- turn PDF pages into PNG result objects
- crop page margins
- conservative PDF optimization
- native Save
- native Save As

A core rule is:

> **The thing you open should remain independently saveable as that thing.**

A PDF stays a PDF. Workspace persistence does not replace native file saving.

# DOCX

DOCX files open as editable document objects instead of being treated as opaque downloads.

FrameChute provides a practical browser-native editing surface and native Save / Save As behavior while preserving the original OOXML package where practical.

The goal is not to recreate every corner of Microsoft Word. The goal is that a normal document still looks and behaves like a document, and ordinary edits do not require leaving the browser.

# CSV tables

Drop a CSV and FrameChute can treat it as a table rather than a text blob.

Current table work includes:

- editable cells
- add and remove rows
- remove columns
- sort
- find / filter
- remove exact duplicate rows
- merge compatible CSV tables
- Save As CSV

# ZIP and CBZ

Archives can be opened as containers rather than dead files.

FrameChute can browse entries, show file paths and sizes, open supported contents into the workspace, and treat CBZ archives as image-oriented comic/gallery sequences.

# Batch work

Multi-selection is part of the architecture rather than an afterthought.

For example:

```text
40 images
→ Resize
→ 1200 px
→ apply once
→ results
```

or:

```text
several images
→ Convert
→ WebP
→ one configuration
→ packaged results
```

The same action engine is intended to serve both tiny one-off jobs and deeper workflows later.

# Frameless objects

Sometimes you want the content, not a miniature application window around it.

FrameChute can remove visible framing so images and media sit directly on the substrate.

For images, the visible object itself can be dragged and resized, with the resize affordance following the actual visible image rather than invisible letterboxed space.

The broader interaction rule is:

> **Anything visible on the substrate should be directly movable and resizable unless there is a strong reason otherwise.**

That rule is being carried across image, video, document, and future scene-based workflows.

# Save the file vs save the workspace

FrameChute intentionally separates two different concepts.

## Native Save / Save As

The thing you opened stays independently saveable in its native or chosen output format.

Examples:

```text
image → PNG / JPEG / WebP
PDF   → PDF
DOCX  → DOCX
CSV   → CSV
```

## Export Snapshot

**Export Snapshot** saves the larger FrameChute workspace as `.fcx`.

FCX exists to preserve the arrangement and state of the workspace, including supported embedded assets and generated results.

Ordinary editing does not require adopting FCX.

# Classic and Advanced

FrameChute keeps everyday work approachable while allowing deeper controls to exist on the same substrate.

Classic keeps the interface cleaner. Advanced exposes more timing, sequencing, media, movement, source, and coordination tools.

Turning Advanced on or off does not create a different project. It changes the amount of machinery shown around the same objects.

The long-term direction is to separate deeper workflows into clearer specialized surfaces rather than turn one Advanced screen into a giant cockpit.

# Timing, movement, and scenes

FrameChute already contains ideas that go beyond a static file canvas.

Objects can participate in:

- timed movement
- shared master time
- timed layer behavior
- coordinated media
- looping
- scene-like arrangements

A useful way to think about the direction is:

> **A scene is a collection of objects arranged in space, optionally arranged in time.**

That creates a natural bridge between ordinary file work and future video, web, presentation, and interactive workflows.

# Local-first by design

FrameChute is local-first.

It does not require a FrameChute account or cloud service simply to use the workspace and utility tools.

Files you choose remain local unless **you** deliberately send or upload them somewhere else.

Normal browser security still applies, including file-permission prompts and situations where Chrome may require the user to reconnect a local source.

FrameChute does not use remote file-processing services as a shortcut for local editing.

# Chute + FrameChute

FrameChute works especially well with [Chute](https://github.com/thanks-cohn/chute).

A simple way to remember the pair:

**Chute catches things. FrameChute arranges and works on them.**

```text
webpage / file / image
        ↓
      Chute
        ↓
    FrameChute
        ↓
move · edit · resize · compare · play · save
```

Neither extension requires the other.

# Where FrameChute is going

The immediate goal is to make FrameChute an unusually complete **lightweight document and media editing surface**: the place where a normal person can handle the annoying little file jobs that otherwise send them searching for a new application or website.

That means continuing to deepen practical support for things such as:

- richer PDF editing, forms, signatures, redaction, and annotation
- stronger DOCX editing and conversion
- OCR and scanned-document workflows
- screenshots and screen recording
- audio extraction and editing
- video trim, split, crop, speed, mute, subtitle, and conversion tools
- broader media compatibility
- spreadsheet work beyond CSV, including XLSX
- presentations, including PPTX
- stronger batch operations
- better print / capture / scan flows
- more robust undo, recovery, large-file handling, and keyboard workflows

Beyond that, the same underlying object system is intended to support specialized creative modes without turning them into unrelated products:

```text
Everyday
  files + actions

Image Editing
  objects + layers + visual transforms

Video Editing
  objects + scenes + time + audio

Web Builder
  objects + scenes + time + events + state + logic

Game Builder
  objects + scenes + input + physics + gameplay state
```

The important part is that these modes should share the same objects, files, assets, transforms, save/export behavior, and scenes.

An image edited in one place should still be the same image when used in a video. A video scene should be transferable into a web scene without being flattened. A future game scene should be able to reuse the same images, sounds, video, timing, and layout work already created elsewhere in FrameChute.

# The argument

FrameChute is deliberately small in spirit even as its capability grows.

It is not based on the idea that every ordinary task deserves another heavyweight application.

It is based on the opposite idea:

> **A lightweight, intuitive document and media editing surface should be able to handle a surprisingly large amount of everyday computer work.**

For a lightweight extension, FrameChute seeks to fill the niche that many expensive suites seem to demand: opening the thing, making the obvious change, combining it with something else, and getting a useful file back out.

If the browser can already display the material, FrameChute asks how much of the rest of the job can happen right there too.

# Install

## Chrome / Chromium

The Chrome Web Store build provides the straightforward FrameChute experience.

The GitHub build generally contains the newest work first.

## Development / current GitHub build

Clone or download this repository, then open your Chromium browser's extension page:

1. Turn on **Developer mode**.
2. Choose **Load unpacked**.
3. Select the FrameChute extension directory.

# The idea in one sentence

**FrameChute is a lightweight browser-native document and media editing surface where files become things you can move, change, combine, and save.**
