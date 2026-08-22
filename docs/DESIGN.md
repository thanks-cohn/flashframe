# Flashframe Design Notes

This document describes the intended behavior of Flashframe in enough detail that the project can be resumed later without having to reconstruct the idea from memory.

## 1. The workspace

Flashframe presents one large browser workspace containing independent blocks.

The workspace is not a traditional document. It is closer to a spatial desktop or visual desk. Blocks may overlap, sit beside one another, or be arranged into clusters according to the user's own habits.

The workspace should eventually support:

- free positioning
- free resizing
- z-order / bring-to-front behavior
- temporary maximization
- restoration to previous geometry after maximization
- optional pan and zoom
- a clean empty-state for dropping or choosing the first piece of media

Coordinates should belong to the workspace, not to the current browser viewport. This keeps saved layouts meaningful even if the visible area changes.

## 2. The block contract

Every block type should implement the same basic conceptual contract.

A block needs:

- a stable id
- a type
- a position
- a size
- a source description
- serializable content state
- a way to restore from that state

Conceptually:

```text
Block
  id
  type
  x
  y
  width
  height
  zIndex
  source
  state
```

The workspace should not need to understand the private details of every block's state. It only needs to know how to ask a block to serialize and restore itself.

This is important because future block types should be addable without redesigning the workspace format.

## 3. Local video block

The local video block is the simplest proof that Flashframe saves more than layout.

### Source

The source should be a user-selected local video file or a retained file handle where supported.

### Saved state

At minimum:

```text
currentTime
paused
volume
muted
playbackRate
```

The block itself also inherits workspace geometry such as x, y, width, height, and z-order.

### Restore behavior

On restore:

1. Resolve or request access to the original local file.
2. Create the video element.
3. Wait until enough metadata is available to seek safely.
4. Restore `currentTime`.
5. Restore volume, mute state, and playback rate.
6. Restore playing/paused state when browser policy permits it.

If autoplay is blocked, the restored timestamp is still valuable. The UI should clearly indicate that playback is ready and requires user interaction rather than treating this as an error.

### Missing source behavior

If the original file moved, disappeared, or permission was lost, the block should remain visible as a recoverable placeholder.

It should say what file it expected and offer the user a way to relink it.

A missing source should not cause the entire Flashframe to fail.

## 4. Directory lightbox block

The lightbox is a block backed by a local image directory.

Its purpose is to let the user operate on a collection visually without repeatedly returning to a file explorer.

### Source

The source is a directory selected by the user.

The application should enumerate supported image files from that directory and keep a lightweight ordered list rather than loading all image bytes at once.

Likely image extensions include:

- png
- jpg / jpeg
- webp
- gif
- avif where supported
- svg where appropriate

### Saved state

At minimum:

```text
currentEntry
currentIndex
sortMode
sortDirection
viewMode
zoom
slideshowEnabled
slideshowInterval
```

`currentEntry` should preferably use a filename or another stable identifier rather than relying only on an integer index. That way, adding a file earlier in the sort order does not necessarily make the restored block open the wrong image.

### Navigation

The first version should make these operations obvious:

- previous image
- next image
- keyboard left/right
- jump through thumbnails
- fit image to block
- fill block
- show natural/original size

The user should not need to reopen the directory chooser simply to move to another image in the same directory.

### Large directories

A directory may contain hundreds or thousands of images.

Flashframe should avoid decoding everything at startup. Prefer lazy loading, thumbnail generation or browser-native previews, and small caches around the current image.

The lightbox should remain responsive even when the directory itself is large.

## 5. Saving a Flashframe

Saving should produce a durable description of the workspace state.

A Flashframe snapshot should include:

```text
snapshot id
name
timestamp
workspace viewport / camera state
block list
```

Each block entry includes generic geometry and block-specific source/state data.

Saving should be cheap enough that the user never hesitates to do it.

The underlying media should not normally be duplicated into the snapshot. A snapshot describes how to return to the user's workspace; it is not automatically an archive of all source files.

## 6. Restoring a Flashframe

Restoration should be resilient rather than all-or-nothing.

The expected sequence is:

1. Load snapshot metadata.
2. Recreate the workspace.
3. Recreate each block shell and geometry.
4. Resolve each block's source.
5. Restore each block's content state.
6. Clearly mark any block that could not fully restore.

A Flashframe with five blocks should still be useful if four restore perfectly and one needs to be relinked.

## 7. Persistence

There are two different things to persist:

### Snapshot metadata

Small structured state such as geometry, timestamps, filenames, and block state.

IndexedDB is a natural browser-side store for this kind of data.

### Local file and directory access

Where browser support allows, retain file or directory handles rather than copying the source media.

Permissions may not survive forever or may need to be requested again. The data model should therefore treat a retained handle as a convenience, not as an absolute guarantee.

If access is no longer available, ask the user to relink the source and update the block reference.

## 8. Interaction details

The workspace should favor actions that are immediately visible and reversible.

### Adding content

Likely entry methods:

- drag a local video into the workspace
- choose a video through a file picker
- add a directory lightbox and choose a directory

### Moving

Dragging the block header or a dedicated grab region should move the block.

Media controls themselves should remain usable without accidentally dragging the block.

### Resizing

Resize handles should be generous enough to use easily.

The content should adapt continuously while resizing rather than waiting until the resize gesture ends.

### Maximizing

A block should be able to temporarily occupy the useful workspace area, then return exactly to its previous geometry.

This is particularly useful for videos and images.

### Deleting a block

Removing a block from Flashframe must never imply deleting the underlying local file or directory.

The distinction should be unambiguous.

## 9. Data safety

Flashframe's snapshot data is valuable because it records the user's arrangement and progress.

The application should avoid fragile storage formats and should eventually support export/import of snapshot metadata.

Schema versions should be explicit so old snapshots can be migrated instead of silently breaking when the project evolves.

## 10. Performance principles

A workspace may eventually contain many media blocks, so avoid assumptions that every block is continuously active.

Useful principles:

- lazy-load source data where possible
- do not decode entire image directories up front
- pause expensive work for offscreen or inactive blocks
- debounce persistence of high-frequency movement and resize events
- keep the final saved state exact even if intermediate updates are throttled
- avoid duplicating large media into application storage unnecessarily

## 11. Accessibility and keyboard use

Mouse-driven spatial interaction is central, but common actions should also have keyboard paths.

At minimum, the application should eventually support sensible focus behavior and keyboard access for:

- block selection
- image previous/next
- play/pause
- maximizing/restoring
- removal
- snapshot save and restore

Keyboard support should complement direct manipulation rather than create a separate interaction model.

## 12. What Flashframe is not

The first version is not intended to be:

- a complete replacement for the browser's tab system
- a general remote-web embedding platform
- a professional nonlinear video editor
- a DAM or photo catalog
- a replacement filesystem
- a giant project-management suite

Those directions would obscure the central idea before it is proven.

The first test is much simpler:

> Can someone arrange several local videos and image collections into a useful visual workspace, close it, and later return to the same useful moment?

If that works well, the architecture can grow from there.
