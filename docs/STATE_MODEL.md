# FrameChute State Model

## Durable storage contract (schema v3)

IndexedDB is a rebuildable browser cache. Once a FrameChute folder is
connected, that folder is the durable source of truth. It contains a versioned
`framechute.json`, named snapshots under `sessions/`, the live checkpoint at
`live/current.flashframe.json`, stable asset metadata in
`manifests/assets.json`, and bytes under `assets/files/` or
`assets/galleries/<asset-id>/`.

Schema v3 sources retain legacy `handleKey` for compatibility and add the
portable identity used by both backends:

```json
{
  "source": {
    "assetId": "asset:4ae4c38b-37c5-4ff5-bbf7-f9d788ce7d74",
    "handleKey": "asset:4ae4c38b-37c5-4ff5-bbf7-f9d788ce7d74",
    "sourceKind": "file",
    "displayName": "lecture.mp4"
  }
}
```

Files are copied once during ingest. Gallery assets contain their supported
files plus a manifest and are exposed through a directory-handle-compatible
adapter during recovery. Snapshots reference asset IDs and never own or delete
asset bytes. Recovery scans the archive, reconstructs runtime sources, and
repopulates IndexedDB without deleting existing browser or external data.

Versions 1 and 2 are upgraded in memory to version 3. Existing `handleKey`
values become their stable `assetId`; unresolved sources remain in snapshots so
the user can relink them. Migration is additive and never clears IndexedDB.

This document defines the conceptual shape of Flashframe's saved state.

The format should stay small, versioned, readable during development, and tolerant of missing local sources.

## 1. Top-level Flashframe

Conceptually:

```json
{
  "schemaVersion": 1,
  "id": "snapshot-id",
  "name": "Writing desk",
  "createdAt": "2026-08-22T21:00:00.000Z",
  "blocks": []
}
```

A later pannable/zoomable canvas may add workspace camera state, but that does not need to complicate the first version.

## 2. Generic block record

Every block uses the same shell:

```json
{
  "id": "block-id",
  "type": "text",
  "name": "Chapter 4",
  "geometry": {
    "x": 120,
    "y": 80,
    "width": 640,
    "height": 420,
    "z": 3
  },
  "source": null,
  "state": {}
}
```

The workspace owns `geometry` and `name`.

The block type owns the meaning of `source` and `state`.

This is the contract that lets Flashframe add future block types without redesigning the canvas or snapshot format.

## 3. Text block

Text is the important exception to the general "reference the source rather than copy it" rule.

A saved text state should preserve the text that existed at the saved moment.

```json
{
  "id": "text-1",
  "type": "text",
  "name": "Chapter 4",
  "geometry": {
    "x": 40,
    "y": 60,
    "width": 700,
    "height": 760,
    "z": 2
  },
  "source": {
    "displayName": "chapter-4.txt",
    "handleKey": "optional-file-handle"
  },
  "state": {
    "text": "The exact text that existed when this state was captured...",
    "scrollTop": 1140,
    "cursorOffset": 2841
  }
}
```

`source` may be null for a text block that exists only inside Flashframe.

`cursorOffset` is optional. Restoring the text and visible position is sufficient for the core behavior.

Do not reconstruct a historical text state by simply rereading the current external file. The current file may have changed or been deleted.

## 4. PDF block

The first useful PDF state is deliberately tiny:

```json
{
  "id": "pdf-1",
  "type": "pdf",
  "name": "Sources",
  "geometry": {
    "x": 780,
    "y": 60,
    "width": 620,
    "height": 760,
    "z": 3
  },
  "source": {
    "displayName": "sources.pdf",
    "handleKey": "pdf-handle"
  },
  "state": {
    "page": 83
  }
}
```

Zoom or within-page scroll position can be added later without changing the basic model.

## 5. Directory lightbox block

The directory is the source; the current image is state.

```json
{
  "id": "gallery-1",
  "type": "directory-lightbox",
  "name": "References",
  "geometry": {
    "x": 80,
    "y": 860,
    "width": 560,
    "height": 600,
    "z": 2
  },
  "source": {
    "displayName": "references",
    "handleKey": "directory-handle"
  },
  "state": {
    "currentEntry": "image_142.png"
  }
}
```

If a numeric index is also stored for UI convenience, it is secondary. The filename or another stable entry identity should be used first when restoring because directory ordering may change.

## 6. Local video block

Minimum:

```json
{
  "id": "video-1",
  "type": "local-video",
  "name": "Lecture",
  "geometry": {
    "x": 680,
    "y": 860,
    "width": 720,
    "height": 420,
    "z": 4
  },
  "source": {
    "displayName": "lecture.mp4",
    "handleKey": "video-handle"
  },
  "state": {
    "currentTime": 1878.4
  }
}
```

Optional additions:

```json
{
  "paused": true,
  "volume": 0.8,
  "muted": false,
  "playbackRate": 1
}
```

The timestamp is the defining first behavior.

## 7. File and directory handles

Snapshot JSON should contain an application-generated `handleKey`, not an attempt to serialize a browser handle directly into JSON.

Actual `FileSystemFileHandle` and `FileSystemDirectoryHandle` values can be stored separately in IndexedDB where supported.

Conceptually:

```text
snapshot/source.handleKey
        ↓
IndexedDB handles store
        ↓
FileSystemFileHandle or FileSystemDirectoryHandle
```

Handles are conveniences, not permanent filesystem identities.

A user may move/delete the source or browser permission may need to be requested again.

## 8. Missing source state

A block whose source cannot be resolved should remain reconstructable as a placeholder.

The snapshot should therefore retain at least a human-readable source name:

```json
{
  "displayName": "sources.pdf",
  "handleKey": "pdf-handle"
}
```

Optional descriptive metadata may later help relinking:

```json
{
  "lastKnownSize": 218381938,
  "lastKnownModified": 1787412345000
}
```

Do not treat these as guaranteed unique identities.

## 9. Relinking

When a local source cannot be opened:

1. recreate the block shell at its saved geometry
2. preserve the old block name
3. show the expected source name
4. offer Relink
5. let the user choose a replacement source
6. apply the compatible saved state

Relinking a live restored workspace should not silently rewrite the immutable old snapshot that was opened.

## 10. Snapshot immutability

A named Flashframe is a deliberate saved moment.

Opening it creates a live workspace derived from the snapshot.

Moving blocks, editing text, changing pages, changing gallery images, or advancing a video in the live workspace should not mutate the old snapshot unless the user explicitly saves/replaces it.

## 11. Live workspace

Crash/reload recovery is separate from named snapshots.

Conceptually:

```text
live workspace
  mutable
  autosaved

named Flashframe
  deliberate saved moment
  stable
```

The two may use the same block-record format while differing in lifecycle.

## 12. Historical moments / Memorew

A historical moment should reuse the same block records.

Conceptually:

```json
{
  "schemaVersion": 1,
  "id": "moment-id",
  "workspaceId": "workspace-id",
  "capturedAt": "2026-08-22T21:17:00.000Z",
  "blocks": []
}
```

The difference between a named Flashframe and a historical moment is not the block format.

It is why and when the record was created.

A remembered text block still contains the old text. A remembered PDF still contains its old page. A gallery still names its old current image. A video still contains its old timestamp. Names and geometry are already part of the generic block record.

This reuse is important. Do not build a separate restoration engine for historical moments.

## 13. Persistence frequency

High-frequency UI events should not produce one database write per animation frame.

Useful checkpoint moments include:

- block drag/resize ends
- block rename
- text edit after debounce
- text scroll settles
- PDF page change
- gallery image change
- video seek/play/pause and occasional coarse playback checkpoint
- block add/remove

The final state after an interaction should be persisted promptly even if intermediate writes are throttled.

## 14. Schema versioning

Every persisted top-level record should have `schemaVersion`.

Prefer explicit migrations:

```text
v1 -> v2 -> v3
```

If an individual block type eventually needs independent evolution, it may add `blockVersion`, but do not introduce it before necessary.

## 15. Export and portability

A future exported metadata file can preserve:

- block names
- geometry
- block type
- text snapshot content
- PDF page
- gallery current image name
- video timestamp

Local browser handles are generally machine/browser-profile specific and should not be represented as portable guarantees.

A portable import may need the user to relink PDFs, directories, and videos.

## 16. Rule of thumb

For every block type ask:

> What is the smallest state that makes the user feel like they returned to the same useful moment?

Store that.

Do not turn Flashframe into a general application-state capture system merely because more properties exist.
## 17. Schema v2 appearance and archive assets

Schema v2 adds workspace-specific `appearance` containing background color, fit mode, and browser-local image content. Global dock positions and default UI preferences remain outside the snapshot. Schema v1 remains valid and simply has no workspace appearance to apply.

Optional JSON disk archives replace background `Blob` content with `backgroundImageAsset` metadata and write the bytes to a sibling `assets/` directory. Import rehydrates the Blob when possible and tolerates missing/corrupt sidecars. Hidden audio remains in the document and geometry capture falls back to its explicit CSS dimensions while it has no layout box.
