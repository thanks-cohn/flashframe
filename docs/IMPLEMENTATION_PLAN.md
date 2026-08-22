# Implementation Plan

This is the shortest path from the current repository to a useful Flashframe extension.

The order matters. Each phase should leave a runnable extension rather than a pile of disconnected subsystems.

## Phase 0: extension shell

Goal: clicking the extension opens one Flashframe workspace tab.

Deliverables:

- Manifest V3 `manifest.json`
- service worker
- extension toolbar action
- full-page `workspace.html`
- minimal workspace styling
- no framework or build step

Acceptance:

1. Load the repository as an unpacked extension in Chrome/Chromium.
2. Click the extension icon.
3. A Flashframe workspace tab opens.
4. Clicking the icon again focuses the existing workspace instead of spawning copies when practical.

## Phase 1: generic block shell

Goal: prove the spatial platform before adding real content.

Implement:

- block registry
- block id/name/type
- draggable block header
- resize handles
- z-order / bring-to-front
- remove block
- temporary maximize and restore
- generic `serialize()` and `restore()` path

Use a dummy block first if necessary.

Acceptance:

- create several blocks
- move and resize each independently
- serialize the workspace to JSON
- reload the workspace from that JSON with matching names and geometry

## Phase 2: durable persistence

Goal: survive browser reload and closure.

Implement an IndexedDB wrapper with stores conceptually similar to:

```text
workspaces
snapshots
handles
content
```

Do not over-design the schema. The first goal is a small versioned record that can migrate later.

Acceptance:

- live workspace survives reload/crash-level refresh
- a named Flashframe can be saved
- a named Flashframe can be restored repeatedly without being mutated by ordinary use

## Phase 3: text block

Goal: make Flashframe useful for writing immediately.

Start with a plain textarea or equally simple editor.

Implement:

- new text block
- editable block name
- text editing
- optional open-from-file
- optional save-to-file
- serialized text content
- serialized scroll position
- optional serialized cursor offset

Acceptance:

- write several paragraphs
- scroll halfway down
- save Flashframe
- alter or clear the live text
- restore the Flashframe
- earlier text and visible position return

The saved snapshot must contain the old text rather than simply re-reading the current external text file.

## Phase 4: PDF block

Goal: restore reading position with the smallest useful state.

Implement:

- choose local PDF
- display PDF inside block
- page navigation
- current page state
- source relink placeholder

Acceptance:

- open PDF
- go to page N
- save Flashframe
- restore
- PDF returns to page N

Do not block this phase on annotation support, perfect zoom state, or sophisticated PDF editing.

If native browser PDF embedding does not offer reliable page control inside the extension, use a bundled PDF.js-style viewer later. Keep the block contract unchanged: source + page.

## Phase 5: directory lightbox

Goal: browse a selected image directory without leaving the workspace.

Implement:

- choose directory from a user gesture
- enumerate supported image files
- previous / next
- keyboard left/right while the block is focused
- current image identity/name
- lazy loading around the current item

Acceptance:

- choose directory
- navigate to a particular image
- save
- add/remove unrelated files from the directory if desired
- restore
- Flashframe tries to reopen the same named image rather than blindly trusting the old numeric index

## Phase 6: local video block

Goal: restore media position.

Implement:

- choose local video
- normal browser video controls
- current timestamp serialization
- optional paused/playing state, volume, muted, playback rate

Acceptance:

- seek to a recognizable timestamp
- save
- close/reopen
- restore to that timestamp

Autoplay policy should not be treated as a restoration failure. Returning to the correct timestamp is the required behavior.

## Phase 7: missing-source recovery

Goal: one unavailable file never destroys the workspace.

For every source-backed block:

- keep block name and geometry visible
- show expected source name
- offer Relink
- when relinked, apply compatible saved state

Acceptance:

- save a workspace
- move/delete one source
- restore
- all other blocks work
- missing block remains in place and can be repaired

## Phase 8: Memorew foundation

Only begin this after ordinary Flashframe serialization/restoration is reliable.

Memorew should reuse the same block records.

First version:

- create time-stamped workspace moments
- record on meaningful state changes with debounce/coalescing
- display a simple chronological list/timeline
- open a historical moment as a live workspace

Do not create a second block model.

Acceptance:

At an earlier selected moment:

- historical text returns
- text visible position returns
- PDF page returns
- gallery image returns
- video timestamp returns
- names and geometry return

## Phase 9: polish only after correctness

Then improve:

- pan/zoom canvas
- thumbnail strip for galleries
- keyboard shortcuts
- nicer resize behavior
- block grouping
- export/import metadata
- retention policy for historical moments
- side panel companion
- future remote block types

## Things to avoid early

Do not spend the first implementation on:

- React migration
- arbitrary website embedding
- cloud accounts
- remote sync
- AI integration
- collaboration
- a custom native daemon
- perfect PDF editing
- video transcoding
- complex text formatting
- giant settings system

The proof is restoration.

If four simple block types can close and reopen in the same useful state, the platform idea works.