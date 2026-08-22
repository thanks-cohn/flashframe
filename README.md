# Flashframe

Flashframe is a browser-based spatial workspace for arranging media and other useful objects as movable, resizable blocks, then saving and restoring the exact state of that workspace.

The first goal is intentionally small: make it pleasant to work with several local videos and image collections at once inside one browser tab.

A Flashframe workspace should feel more like a desk than a playlist. The user places things where they want them, resizes them, leaves them at useful points, and comes back later without having to reconstruct the arrangement by memory.

## Core idea

A workspace contains blocks.

Every block has two kinds of state:

1. **Spatial state** — where the block is and how large it is.
2. **Content state** — what the block itself was doing.

For example, a local video block may remember:

- which video file it points to
- playback position
- paused or playing state
- volume
- playback speed
- block position
- block size

An image lightbox block may remember:

- which directory it points to
- the current image
- sort order
- fit/zoom mode
- slideshow state
- block position
- block size

Saving a Flashframe means saving the workspace as a moment. Restoring it means rebuilding that moment as closely as the browser and local file permissions allow.

## First block types

### Local video

A local video is a normal movable and resizable block with its own playback controls.

Multiple videos may exist in the same workspace. They are independent: one can be playing while another is paused, and each remembers its own playback position.

The important part is not merely opening several videos. It is being able to return to the same arrangement and the same points in those videos later.

### Directory lightbox

A lightbox block points to a user-chosen image directory rather than a single image.

Inside the block, the user can move through the directory without opening a separate file browser. The block should eventually support:

- previous / next image
- keyboard navigation
- thumbnail navigation
- fit, fill, and original-size viewing modes
- filename and date sorting
- optional slideshow behavior
- remembering the exact image currently being viewed

The directory should be treated as the source. Flashframe should avoid copying an entire image collection into its own storage when it can keep a reference to the chosen directory instead.

## Workspace behavior

Blocks should be direct-manipulation objects.

The user should be able to:

- drag a block to move it
- resize it from its edges or corners
- bring it forward
- maximize it temporarily
- return it to its previous size and position
- remove it from the workspace without deleting the underlying file
- add several blocks of the same type

The canvas may later support panning and zooming so a workspace can grow beyond the visible browser area without becoming cramped.

## Flashframes

A Flashframe is a saved snapshot of a workspace.

At minimum, a snapshot should preserve:

- workspace identity
- all blocks present
- block type
- block source
- block position
- block size
- block-specific state
- creation time
- optional user-provided name

A saved Flashframe should be safe to restore repeatedly. Restoring it should not destroy the saved snapshot.

Examples:

- a research workspace with three local videos parked at useful timestamps
- an art-reference workspace with separate lightboxes for characters, clothing, and poses
- a mixed workspace containing local video and image-reference blocks

## Design principles

### State matters as much as content

Opening the same file is not enough. Flashframe should restore the useful state around the file.

### Position is meaningful

Where the user places a block is part of the workspace, not incidental decoration.

### Local-first

The first version should work well with local files before depending on remote services or site-specific integrations.

### Few concepts

The application should remain understandable without a manual. A block is something on the workspace. A Flashframe is a saved workspace state.

### Direct manipulation

Moving, resizing, navigating, and restoring should happen through obvious interactions rather than nested configuration screens.

### No forced project ceremony

A user should be able to open Flashframe, drop or choose media, arrange it, and save the state without first creating a complicated project structure.

## Initial scope

The first useful version does not need to be a general-purpose browser window manager.

It needs to do a smaller set of things very well:

1. Create a workspace in one browser tab.
2. Add multiple local video blocks.
3. Add image lightbox blocks backed by chosen local directories.
4. Move and resize blocks freely.
5. Save the workspace state.
6. Close the workspace.
7. Restore it later with the same layout and block state.

That is enough to prove the central idea.

## Possible later block types

These are extensions of the same model, not requirements for the first version:

- single image
- PDF
- text note
- audio
- YouTube video
- browser content where embedding rules permit it

The block model should be designed so that new types can provide their own serializable state without changing the meaning of the workspace itself.

## Mental model

Flashframe is not primarily a media player.

It is a spatial workspace whose contents can remember their state.

The simplest description is:

> Arrange a moment. Save it. Return to it.
