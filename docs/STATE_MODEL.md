# Flashframe State Model

This document defines the conceptual shape of Flashframe's saved state.

It is not a binding implementation format yet. The purpose is to make the project's persistence model obvious before code grows around accidental assumptions.

## Goals

The saved state should be:

- small compared with the media it references
- readable enough to inspect during development
- versioned
- tolerant of missing files
- extensible to new block types
- precise enough to restore useful block state

A Flashframe should normally reference local media rather than copy the media itself.

## Top-level snapshot

Conceptually:

```json
{
  "schemaVersion": 1,
  "id": "snapshot-id",
  "name": "Reference desk",
  "createdAt": "2026-08-22T21:00:00.000Z",
  "workspace": {
    "camera": {
      "x": 0,
      "y": 0,
      "zoom": 1
    }
  },
  "blocks": []
}
```

`camera` matters only if the workspace becomes pannable or zoomable. Keeping it in the model early avoids confusing canvas coordinates with browser viewport coordinates later.

## Generic block record

Every block should have a generic shell:

```json
{
  "id": "block-id",
  "type": "local-video",
  "geometry": {
    "x": 120,
    "y": 80,
    "width": 640,
    "height": 360,
    "z": 3
  },
  "source": {},
  "state": {}
}
```

The workspace owns `geometry`.

The block implementation owns the meaning of `source` and `state`.

This separation is intentional.

## Local video example

```json
{
  "id": "video-1",
  "type": "local-video",
  "geometry": {
    "x": 120,
    "y": 80,
    "width": 640,
    "height": 360,
    "z": 3
  },
  "source": {
    "displayName": "lecture.mp4",
    "handleKey": "local-handle-reference"
  },
  "state": {
    "currentTime": 2591.42,
    "paused": true,
    "volume": 0.8,
    "muted": false,
    "playbackRate": 1
  }
}
```

`handleKey` represents an implementation-defined reference to a separately stored file handle or permission record. It should not be assumed to be portable between machines.

The human-readable `displayName` is still useful if the handle can no longer be resolved.

## Directory lightbox example

```json
{
  "id": "lightbox-1",
  "type": "directory-lightbox",
  "geometry": {
    "x": 820,
    "y": 80,
    "width": 520,
    "height": 620,
    "z": 4
  },
  "source": {
    "displayName": "poses",
    "handleKey": "directory-handle-reference"
  },
  "state": {
    "currentEntry": "pose_054.png",
    "currentIndex": 53,
    "sortMode": "name",
    "sortDirection": "ascending",
    "viewMode": "fit",
    "zoom": 1,
    "slideshowEnabled": false,
    "slideshowInterval": 5
  }
}
```

`currentEntry` is the primary identity for the selected image.

`currentIndex` is useful as a fallback and for UI display, but it should not be the only saved identity because directory contents may change between sessions.

## Stable identity versus current ordering

Directories are mutable.

Suppose a saved lightbox contains:

```text
currentEntry = pose_054.png
currentIndex = 53
```

Later, ten files are added earlier in the sort order.

On restore, Flashframe should first look for `pose_054.png`. If it exists, show it even though its numeric index has changed.

If it no longer exists, sensible fallback behavior would be:

1. use the old index if there is still an entry there
2. otherwise clamp to the nearest valid entry
3. visibly note that the exact saved image could not be restored

The workspace itself should still open.

## Missing sources

Source resolution has to be treated as fallible.

A file may have been:

- renamed
- moved
- deleted
- placed on an unavailable drive
- made inaccessible because browser permission expired

The saved block should therefore retain enough descriptive metadata to explain what it expected.

A future source record may contain fields such as:

```json
{
  "displayName": "lecture.mp4",
  "lastKnownKind": "file",
  "handleKey": "...",
  "lastKnownSize": 218381938,
  "lastKnownModified": 1787412345000
}
```

These fields can assist relinking without pretending that they provide permanent filesystem identity.

## Relinking

When a source cannot be opened, the block should enter a recoverable state rather than disappear.

A relink flow should allow the user to select the missing file or directory again.

After successful relinking:

- update the stored source reference
- retain the block id
- retain geometry
- retain compatible block state
- save the repaired snapshot only when the user chooses to update or resave it

Restoring an old snapshot should not silently mutate the historical snapshot merely because a source had to be relinked.

## Snapshot immutability

A saved Flashframe should conceptually be immutable.

Opening and using a snapshot creates a live workspace derived from it. Moving blocks or advancing videos in that live workspace should not rewrite the original snapshot automatically.

The user may:

- save a new Flashframe
- explicitly replace/update an existing snapshot if that feature is later offered

This prevents a useful saved moment from drifting merely because it was opened.

## Live workspace state

The application will also need autosaved live state so a browser crash or accidental reload does not destroy current work.

That is different from a named Flashframe snapshot.

Conceptually:

```text
Named Flashframe
  deliberate saved moment
  stable until explicitly changed

Live workspace
  current mutable state
  updated automatically for crash recovery
```

Keeping these concepts separate avoids turning every small movement into a destructive edit of a saved snapshot.

## Persistence frequency

Dragging and resizing may emit many events per second.

Persistence should be throttled or debounced during interaction, but the final state at the end of an operation should always be written promptly.

For media state, useful persistence points include:

- play/pause
- seek completion
- playback-rate change
- volume/mute change
- periodic low-frequency checkpoint while playing

For lightboxes:

- image change
- sort change
- view-mode change
- slideshow-state change

The design goal is crash resilience without making storage writes part of every animation frame.

## Schema versioning

Every stored snapshot should include `schemaVersion`.

When the model changes, prefer explicit migrations:

```text
v1 -> v2 -> v3
```

Do not make old snapshots depend on undocumented guesses about which fields happened to exist.

Block-specific state may eventually have its own version if individual block types evolve independently.

For example:

```json
{
  "type": "directory-lightbox",
  "blockVersion": 2,
  "state": {}
}
```

This is optional initially but worth keeping in mind.

## Export and portability

A future exported Flashframe metadata file can describe the workspace, but local file handles themselves may not be portable.

An exported snapshot should therefore be honest about what it contains:

- layout: portable
- names and descriptive source metadata: portable
- playback/lightbox state: portable
- local browser file handles: generally not portable
- underlying media: not included unless an explicit archive/export feature is created later

Importing on another machine may recreate the layout and then ask the user to relink local sources.

## Rule of thumb

If a user could reasonably say, "I expected to come back to exactly that," the relevant state should probably be serializable.

If the information is merely an implementation detail that can be reconstructed safely, it probably should not be stored.
