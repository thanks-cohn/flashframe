# Flashframe Design Notes

Flashframe is a spatial workspace that runs inside Chrome/Chromium as a Manifest V3 extension.

The purpose of this document is to preserve the interaction model. Implementation details can change; the few concepts the user sees should remain stable.

## 1. The workspace

Opening Flashframe opens one extension-owned browser tab containing a large spatial workspace.

The workspace behaves more like a desk than a conventional document. Independent blocks can sit beside each other, overlap, be resized, and be returned to later in the same arrangement.

The workspace owns:

- block position
- block size
- z-order
- selection/focus behavior
- temporary maximize/restore
- save and restore of whole workspace snapshots
- eventual pan/zoom if the canvas needs to grow beyond the viewport

Coordinates belong to the workspace, not to an arbitrary current browser window position.

## 2. Blocks

A block is the basic object in Flashframe.

Every block has:

```text
id
type
name
geometry
source
state
```

`geometry` is generic:

```text
x
y
width
height
z
```

The workspace owns geometry.

The block implementation owns `source` and `state`.

A new block type should be addable without teaching the canvas special cases about that block's internal behavior.

Conceptually, a block implementation needs only to be able to:

```text
create
render/mount
serialize
restore
destroy
```

The exact JavaScript interface is allowed to evolve.

## 3. Direct manipulation

A block should feel physical and obvious.

The user should be able to:

- drag its header to move it
- resize it directly
- click it to bring it forward
- edit its name
- maximize it temporarily
- restore it to its old geometry
- remove it from the workspace without deleting its source file

Content controls inside a block must remain usable without accidentally moving the whole block.

## 4. Text block

Text is one of the first-class early block types because writing and research are central uses of Flashframe.

The first editor does not need to be sophisticated. A plain text control is acceptable if restoration is reliable.

Minimum state:

```text
text
visible position / scrollTop
cursor offset?  // optional
```

The generic block shell already saves the block name and geometry.

If the text came from an external file, a saved Flashframe still needs the actual text that existed at the saved moment. Re-reading the current external file is not sufficient because the file may have changed or disappeared.

Later improvements may include richer editing, but they are not prerequisites for proving Flashframe.

## 5. PDF block

The first PDF block should remain intentionally small.

Minimum state:

```text
source
page
```

The important experience is:

1. open a PDF
2. read to page 83
3. save a Flashframe
4. reopen it later
5. return to page 83

Zoom, annotations, selections, and other viewer state can be added if users miss them. They should not delay the core restoration path.

If the browser's built-in PDF embedding does not expose reliable page control, the implementation may later bundle a viewer such as PDF.js while keeping the same block contract.

## 6. Directory lightbox block

A lightbox block points to a user-chosen local image directory.

The user can browse that directory from inside the block rather than repeatedly opening a file manager.

Minimum state:

```text
directory source
current image
```

The exact image identity or filename matters more than a numeric index. If new files change the sort order, Flashframe should still try to return to the image the user was actually viewing.

Early interactions:

- previous / next
- left/right keyboard navigation while focused
- fit image to block
- direct drag/resize of the outer block

Later additions can include thumbnails, sorting, fill/original-size modes, and slideshow behavior.

Large directories should be enumerated without decoding every image at once. Load the current image and a small nearby cache.

## 7. Local video block

The local video block demonstrates temporal state.

Minimum state:

```text
source
currentTime
```

Useful additional state:

```text
paused
volume
muted
playbackRate
```

Returning to the correct timestamp is the defining behavior. Browser autoplay policy may require a click before playback resumes, and that is acceptable.

## 8. Adding local content

The first version is local-first.

Expected browser-native entry points:

- text/PDF/video: file picker
- gallery: directory picker
- drag-and-drop where it naturally fits

The user explicitly grants access to the selected file or directory. Flashframe should not try to crawl the filesystem.

Where supported, retained file/directory handles can make restoration smoother. Those handles are conveniences, not guarantees; permission may need to be granted again.

## 9. Saving a Flashframe

A Flashframe is a deliberate saved moment of the workspace.

A snapshot contains:

```text
snapshot id
name
created time
block records
```

Each block record contains:

```text
id
type
name
geometry
source
state
```

Saving should be cheap enough that the user does not hesitate to use it.

A saved Flashframe is conceptually immutable. Opening it creates a live workspace derived from that snapshot. Ordinary use of the restored workspace should not silently rewrite the historical snapshot.

## 10. Restoration

Restoration should be resilient rather than all-or-nothing.

Sequence:

1. load snapshot metadata
2. recreate block shells and geometry
3. resolve each block's source if it has one
4. apply each block's small saved state
5. leave unresolved sources as relinkable placeholders

If a workspace has five blocks and one local source vanished, the other four should still restore normally.

## 11. Missing sources

A missing local source should not make a block disappear.

The placeholder should preserve:

- block name
- block type
- old geometry
- expected source name
- saved state

It should offer a clear Relink action.

Removing a block from Flashframe must never delete the underlying file.

## 12. Persistence

IndexedDB is the natural first persistence layer because Flashframe needs both ordinary structured records and browser file/directory handles.

Conceptual stores:

```text
snapshots
handles
content
```

Text content can live directly in snapshot state initially. More elaborate content-addressing is unnecessary until measurements justify it.

Schema versions should be explicit from the beginning.

## 13. Memorew

Memorew is a separate layer on top of the same block-state contract.

Flashframe owns space and explicit snapshots.

Memorew records those states over time.

It should not create a second kind of block or a second restoration system. If a block can serialize and restore correctly for Flashframe, the same record should be sufficient for Memorew.

The state remains intentionally small:

```text
text -> text + position (+ optional cursor)
pdf -> page
gallery -> current image
video -> timestamp
```

Names and geometry already come from Flashframe.

## 14. Performance

Avoid doing work merely because a block exists.

Useful rules:

- debounce high-frequency persistence during movement/resizing
- write exact final geometry when interaction ends
- lazy-load large local sources
- do not decode an entire image directory at startup
- do not duplicate large videos into ordinary snapshots
- keep text snapshots simple until storage size proves otherwise

## 15. What Flashframe is not

The first product is not:

- a replacement Chromium build
- an arbitrary website tiling system
- a professional video editor
- a full document-management system
- a replacement filesystem
- a VM/RAM snapshot system

It is a Chrome/Chromium extension that gives supported local content a spatial workspace and a tiny restorable state.

## 16. Product test

The project is proving the right thing when a user can arrange a text draft, PDFs, a reference gallery, and a local video, save the workspace, close it, and later return to the same useful points without manually reconstructing their desk.

The interaction should feel surprisingly small compared with the result.