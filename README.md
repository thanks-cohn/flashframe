# FrameChute

**Open it. Change it. Save it.**

FrameChute is a **lightweight, intuitive, browser-native document and media workspace** for Chrome and Chromium browsers.

It combines a freeform spatial canvas with practical editing and file utilities, so images, PDFs, DOCX files, video, audio, CSV tables, archives, notes, captures, and webpages can live together and be worked on directly.

**Your browser has tabs. FrameChute gives it a desk.**

The larger idea is simple:

> **Give me the file. I’ll figure out what to do with it.**

Instead of asking which application should open a thing, FrameChute tries to ask the more useful question:

> **What do you want to do to it?**

---

# The design rule

FrameChute is being built around a deliberate constraint:

> **Simple to understand. Surprisingly powerful underneath.**

The goal is not to reproduce every menu, panel, and specialist feature from Photoshop, Premiere, After Effects, Word, Acrobat, Canva, Audacity, or other large suites.

The goal is to identify the small number of operations people repeatedly open those programs for, distill them into understandable primitives, and make those primitives work together on the same substrate.

That means preferring interactions such as:

- select the thing
- move it
- resize it
- select part of it
- make that part transparent
- draw on it
- extract something from it
- change when it appears
- save the result

Instead of making a user understand the machinery first, FrameChute should make the useful action obvious first.

---

# Why FrameChute exists

A surprising amount of ordinary computer work is made harder than it needs to be.

Crop an image. Resize forty pictures. Pull a frame from a video. Reorder a PDF. Edit a Word document. Clean a CSV. Open a ZIP. Compare two documents. Capture the screen. Record the microphone. Put a note beside a reference image. Convert something. Save the result.

For jobs like these, people are often pushed toward a collection of separate applications, converter websites, subscriptions, and professional suites.

FrameChute is not trying to replace every specialist tool feature-for-feature.

It is trying to make the **coveted, frequently needed parts** of those tools accessible in one lightweight environment.

> **Select the thing. Do the obvious thing. Save the result.**

---

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
- screenshots
- screen recordings
- microphone recordings

Objects can be moved, resized, renamed, layered, maximized, arranged beside related material, and kept together as a working surface instead of disappearing into separate applications and tabs.

A PDF can sit beside the note about it. A video can sit beside its extracted frame. A table can stay beside the document it came from. The position itself can carry meaning.

---

# Quick Actions

FrameChute has a contextual Quick Actions system built around the selected object or objects.

Rather than expose every command all the time, it asks what makes sense for what you selected.

The shared action system supports:

- single-object actions
- multi-selection
- batch work
- progress-aware operations
- nondestructive image transforms
- generated result objects that become normal FrameChute objects
- native Save / Save As flows
- FCX persistence for workspace-owned generated results

This shared substrate is important: new utilities should plug into the same selection, action, result-object, save, and persistence systems instead of becoming isolated mini-applications.

---

# Image editing

Current image tools include:

- visual crop
- resize with aspect locking
- rotate
- flip horizontal and vertical
- straighten
- basic perspective correction
- PNG / JPEG / WebP conversion
- compression
- metadata-stripping re-encode
- trim transparent margins
- make a selected color transparent
- fill transparent backgrounds
- blur / pixelate a region
- basic text, rectangle, and arrow annotation
- stitch images vertically or horizontally
- create contact sheets
- generate common icon sizes
- compare two images
- create a PDF from selected images
- batch resize / convert / compress
- native Save As

Many image changes remain nondestructive inside the workspace until the user chooses to bake them into a saved result.

## Immediate image direction: region masking

One of the next important primitives is intentionally simple:

```text
select part of image
        ↓
Remove / Keep
        ↓
transparent region stays attached to the image
        ↓
move · resize · rotate normally
        ↓
Save As a new transparent PNG / WebP
```

The transparency should belong to the image object, so it follows the image when the image moves, scales, or rotates.

The first version should stay small and understandable: region selection, remove, keep, invert, restore/erase, and transparent export.

Later, the same primitive can grow into derived **Region Objects**: select part of something, make that part independently manipulable, layer it above or below other objects, draw on it, and eventually animate it without requiring a traditional professional compositing interface.

---

# Video and media

FrameChute can open local playable media directly on the canvas beside documents, images, notes, and other media.

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

Current media behavior also includes:

- local video and audio playback
- media trim where supported by the current native path
- looping and synchronization features already present in the workspace
- frameless media presentation
- a small Grab affordance for frameless/header-hidden video
- direct bottom-right resizing for visual media
- focused Space playback toggle
- focused Left / Right keyboard scrubbing
- screen recording
- microphone recording

The interaction direction is intentionally physical:

> **Move it to change where it is. Scrub it to change when it is.**

---

# Screen and microphone capture

FrameChute can create new workspace objects directly from browser capture APIs.

Current capture actions include:

- screenshot the selected screen/window/tab
- record the screen
- record the microphone

Permission is requested only when the user actually invokes a capture action.

The result is inserted into the workspace first, where it can participate in the same editing, arrangement, extraction, and Save As workflows as other FrameChute objects.

---

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
- page-number / watermark generation paths
- extract currently rendered selectable text
- native Save
- native Save As

A core rule is:

> **The thing you open should remain independently saveable as that thing.**

A PDF stays a PDF. Workspace persistence does not replace native file saving.

Scanned-document OCR, secure arbitrary PDF redaction, standards-compatible PDF encryption, and a universal AcroForm designer are not currently presented as solved features.

---

# DOCX and text documents

DOCX files open as editable document objects instead of being treated as opaque downloads.

Current document utilities include:

- practical DOCX editing
- native DOCX Save / Save As
- text extraction from DOCX
- word-level comparison between supported text documents
- scoped find and replace
- text-oriented DOCX → PDF conversion
- text / selectable-PDF → simple DOCX conversion
- editable text result objects

FrameChute preserves the original OOXML package where practical, while deliberately not promising perfect round-trip fidelity for every complex Word layout.

The goal is not to recreate every corner of Microsoft Word. The goal is that ordinary document work does not automatically require leaving the browser.

---

# CSV tables

Drop a CSV and FrameChute can treat it as a table rather than a text blob.

Current table work includes:

- editable cells
- add and remove rows
- remove columns
- sort
- find / filter
- remove exact duplicate rows
- split a column with preview
- merge selected columns with preview
- normalize whitespace
- capitalization cleanup
- remove blank rows
- merge compatible CSV tables
- create a quick SVG chart as a first-class image object
- Save As CSV

The chart result is intentionally an object rather than a dead side effect: once generated, it can be moved, resized, combined with other material, or saved like other visual content.

---

# ZIP and CBZ

Archives can be opened as containers rather than dead files.

FrameChute can browse entries, show file paths and sizes, open supported contents into the workspace, and treat CBZ archives as image-oriented comic/gallery sequences.

Archive handling uses bounded entry/count/size rules to avoid treating arbitrary compressed input as harmless.

---

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

---

# Frameless objects

Sometimes you want the content, not a miniature application window around it.

FrameChute can remove visible framing so images and media sit directly on the substrate.

Images and video can remain spatially manipulable while retaining the behaviors that make them their actual media type.

The broader interaction rule is:

> **Anything visible on the substrate should be directly movable and resizable unless there is a strong reason otherwise.**

That rule is being carried across image, video, document, and future scene-based workflows.

---

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

---

# Classic and Advanced

FrameChute keeps everyday work approachable while allowing deeper controls to exist on the same substrate.

Classic keeps the interface cleaner. Advanced can expose more timing, sequencing, media, movement, source, and coordination tools.

Turning Advanced on or off does not create a different project. It changes how much machinery is shown around the same objects.

The long-term direction is not one giant cockpit. It is a small number of understandable contextual surfaces over one shared object model.

---

# Timing, movement, and cues

FrameChute's object model naturally extends beyond static files.

Objects can already participate in timing-oriented behavior such as media state, looping, synchronization, and movement-oriented workspace behavior. The deeper direction is a visual cue model where the user manipulates the object directly instead of programming animation numerically.

The intended mental model is:

> **At this moment I want it here. At that moment I want it there.**

A future cue system can interpolate position, scale, rotation, opacity, and other properties between those moments.

That creates a natural bridge between ordinary file work and presentations, motion graphics, GIF-like mini-films, cutscenes, interactive web pages, and other scene-oriented workflows.

A useful way to think about it is:

> **A scene is a collection of objects arranged in space, optionally arranged in time.**

---

# Local-first by design

FrameChute is local-first.

It does not require a FrameChute account or cloud service simply to use the workspace and utility tools.

Files you choose remain local unless **you** deliberately send or upload them somewhere else.

Normal browser security still applies, including file-permission prompts and situations where Chrome may require the user to reconnect a local source.

FrameChute does not use remote file-processing services as a shortcut for local editing.

This also means some heavyweight features are deliberately deferred until they can be implemented honestly. Current examples include packaged OCR, high-quality local background segmentation, non-native media codec workflows, robust XLSX/ODS round-trip, and standards-compatible PDF encryption.

---

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

---

# Where FrameChute is going

The immediate goal is not feature count for its own sake.

The goal is to make FrameChute the program people instinctively open first for a surprisingly wide range of visual, document, and media jobs.

The next layer of development emphasizes **powerful primitives with very small interfaces**:

1. region masking and transparent export
2. derived Region Objects
3. tiny contextual image editing tools such as color, line/brush thickness, fill, erase, and restore
4. stronger relative layering and compositing
5. visual cues for position, scale, opacity, rotation, start, and stop
6. simple object states and interactions
7. portable web export as HTML, CSS, JavaScript, and assets

The principle is that these features should compose.

A region cut from an image should be able to become an object. That object should be able to sit behind another object. It should be drawable on. Later it should be able to move on a cue. The result should be exportable without trapping the user inside FrameChute.

Beyond that, the same object system can support specialized creative modes without turning them into unrelated products:

```text
Everyday
  files + actions

Image
  objects + masks + paint + layers

Motion / Video
  objects + scenes + cues + time + audio

Presentation
  objects + scenes + cues + interaction

Web
  objects + responsive layout + events + state
```

The important part is that these modes share the same objects, files, assets, transforms, masks, save/export behavior, and scenes.

An image edited in one place should still be the same image when used in a presentation or video. A region extracted from that image should not have to be flattened simply because it moves into another workflow.

---

# The argument

FrameChute is deliberately small in spirit even as its capability grows.

It is not based on the idea that every ordinary task deserves another heavyweight application.

It is based on the opposite idea:

> **A lightweight, intuitive editing surface should be able to handle a surprisingly large amount of real computer work.**

Instead of recreating whole professional suites, FrameChute aims to distill the parts people actually reach for most often and make them work together.

The long-term test is simple:

> **Why am I opening a giant application just to do this?**

If FrameChute can make that job immediate, local, understandable, and saveable, it has done something useful.

---

# Install

## Chrome / Chromium

The Chrome Web Store build provides the straightforward FrameChute experience.

The GitHub build generally contains the newest work first.

## Development / current GitHub build

Clone or download this repository, then open your Chromium browser's extension page:

1. Turn on **Developer mode**.
2. Choose **Load unpacked**.
3. Select the FrameChute extension directory.

---

# The idea in one sentence

**FrameChute is a lightweight browser-native workspace where files become things you can move, change, select, combine, time, and save.**
