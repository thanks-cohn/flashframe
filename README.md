# Flashframe

Flashframe is a spatial workspace that runs on top of Chrome and Chromium.

It is intended to be installed as a browser extension. Opening Flashframe gives the user a full extension-owned workspace tab containing movable, resizable blocks. A block can be a text document, PDF, image gallery, local video, or another type added later.

The central idea is small:

> Arrange a moment. Save it. Return to it.

Flashframe is not trying to replace Chromium. Chromium is the application platform. Flashframe supplies a better workspace model inside it.

## What the user sees

A Flashframe workspace is a large canvas inside a browser tab.

The user can place several independent blocks on that canvas, resize them, move them, overlap them, maximize one temporarily, and save the arrangement.

For example, a writing workspace might contain:

- a text block called `Chapter 4`
- a PDF open on page 83
- a second PDF open on page 17
- an image lightbox showing one image from a chosen reference directory
- a local video paused at 31:18

Saving the Flashframe records enough state to reopen the same useful arrangement later.

The project should prefer small, obvious state over complicated simulation. A PDF does not need its entire internal state preserved: its file identity and current page are enough for the first version. A video needs its file identity and timestamp. A gallery needs its directory and current image. A text block needs its name, text, and visible position in the document, with cursor position optional.

## Chrome / Chromium extension

The first implementation is a Manifest V3 extension.

The extension should have a very small browser-facing shell:

- toolbar action: open or focus the Flashframe workspace
- extension-owned full-page workspace: the main product
- service worker: extension lifecycle and opening/focusing the workspace
- IndexedDB: durable workspace state, file/directory handles where supported, and later historical state
- File System Access API: user-granted access to local text files, PDFs, videos, and directories

Flashframe should not ask for broad website permissions merely to work with local content. The first version is local-first.

## The platform model

Flashframe owns **space**.

It provides:

- a canvas
- blocks
- position and size
- naming
- z-order
- save/restore
- a small state contract that every block type follows

A block has a generic shell:

```text
Block
  id
  type
  name
  x
  y
  width
  height
  z
  source
  state
```

The workspace owns geometry. The block implementation owns the meaning of its `source` and `state`.

This is the main architectural boundary. The canvas should not contain special-case knowledge about PDFs, videos, galleries, or text editors.

## First block types

### Text

Text is a first-class block rather than an afterthought.

Minimum saved state:

```text
name
text
scroll position / top visible position
cursor position (optional)
```

The saved text itself matters. If the underlying text file later changes or disappears, a saved historical state can still contain the text that existed at that moment.

### PDF

Minimum saved state:

```text
file identity
current page
```

Zoom or finer scroll state can be added later if it proves useful. Page restoration is the important first behavior.

### Directory lightbox

A lightbox points to a user-selected local image directory and lets the user move through it from inside one block.

Minimum saved state:

```text
directory identity
current image
```

The exact image name or stable identity matters more than a bare numeric index because directory ordering can change.

The lightbox can later add thumbnails, sorting, fit/fill modes, and slideshow behavior without changing the core block contract.

### Local video

Minimum saved state:

```text
file identity
current timestamp
```

Paused/playing state, volume, mute, and playback rate are useful additions but should not make the first implementation complicated.

## Flashframes

A Flashframe is a deliberate snapshot of the current workspace.

At minimum it records:

- snapshot id
- snapshot name
- creation time
- the blocks that existed
- each block's name
- each block's position and size
- each block's source
- each block's minimal restorable state

A saved Flashframe is conceptually immutable. Opening it creates a live workspace derived from that saved moment. Using the restored workspace should not silently mutate the snapshot that was opened.

## Memorew

Memorew is a separate first-party layer built on top of Flashframe's block-state contract.

Flashframe answers:

> What is on the workspace, and where is it?

Memorew answers:

> What did this workspace look like at that moment?

It does not need to understand every block deeply. Each block already knows how to serialize the tiny amount of state required to recreate itself. Memorew records those states over time and can later ask Flashframe to restore one.

For example, a remembered moment may mean:

- a text block has its earlier name and earlier text
- that text returns near the same visible line, optionally with the old cursor position
- a PDF returns to page 83
- a gallery returns to `image_142.png`
- a video returns to 31:18
- every block returns to its old size and position

This is intentionally not a virtual-machine snapshot or RAM snapshot. It is a reconstruction of the small set of user-visible states that matter.

See `docs/MEMOREW.md` for the boundary between the platform and the time layer.

## Why an extension

The browser is meant to be the environment, not merely one app among many.

An extension lets Flashframe live directly in Chrome/Chromium while still having its own full-page interface and browser lifecycle. The user can click the extension and enter the workspace without launching a separate desktop application.

Local content is selected explicitly by the user. The implementation should use browser-native file and directory pickers and persist handles where the platform allows it, while always handling lost permissions or moved files gracefully.

## Design rules

### Few concepts

A block is something on the workspace. A Flashframe is a saved workspace. New functionality should fit those concepts before a new concept is invented.

### Minimal restorable state

Save what is needed to make returning feel correct, not every property that happens to exist.

### Direct manipulation

Move and resize things directly. Avoid configuration screens for actions that can be obvious on the object itself.

### Local-first

Text, PDFs, images, and local video should work well before remote integrations are attempted.

### Resilient restoration

One missing file should not prevent the rest of a workspace from opening. A missing source becomes a relinkable block in the correct old position.

### The workspace is a platform

New block types should plug into a small contract. They should not require changes to the canvas or historical system merely because their private state differs.

## First useful milestone

The first version does not need every planned feature.

A convincing milestone is:

1. Install the unpacked extension in Chrome/Chromium.
2. Click its toolbar icon to open a Flashframe workspace tab.
3. Add text, PDF, directory-lightbox, and local-video blocks.
4. Move and resize those blocks.
5. Save a named Flashframe.
6. Close the workspace.
7. Reopen it and restore the saved Flashframe.
8. Verify that text content/position, PDF page, gallery image, video timestamp, block names, and block geometry return correctly.

Once that path is solid, Memorew can record the same block states over time instead of requiring the user to create every snapshot deliberately.

## Repository notes

- `docs/DESIGN.md` describes workspace and block behavior.
- `docs/STATE_MODEL.md` describes persistence.
- `docs/ARCHITECTURE.md` describes the Chrome/Chromium extension boundary.
- `docs/MEMOREW.md` describes the optional time layer.
- `docs/IMPLEMENTATION_PLAN.md` gives a bounded build order.

The code should remain boring where possible. The product value is in the interaction model and the state contract, not in unnecessary framework machinery.