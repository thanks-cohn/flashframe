# Implementation Plan

This is the shortest path from the current repository to a Chrome Web Store-ready Flashframe extension.

The order matters. Each phase should leave a runnable extension rather than a pile of disconnected subsystems.

## Current status

Implemented in the repository now:

- Manifest V3 extension shell
- extension toolbar action that opens the Flashframe workspace
- full extension-owned workspace page
- generic block registry and serializable block shell
- movable/resizable/named blocks
- z-order and temporary maximize/restore
- IndexedDB snapshot persistence
- retained browser file/directory handle storage where Chromium permits it
- text blocks and open-from-local-text
- PDF blocks with Flashframe page controls
- directory-backed image lightboxes
- local video blocks
- named Flashframe save/restore
- missing-source reconnect affordances
- syntax-validation GitHub Action
- local-first privacy documentation

Still requires hands-on Chrome smoke testing before this should be called release-ready.

See `CURRENT_BUILD.md` for exact behavior and known limitations.

## Phase 0: extension shell — implemented

Goal: clicking the extension opens a Flashframe workspace tab.

Current design intentionally opens a workspace tab without requesting broad tab or website permissions. Supporting several independent Flashframe tabs is acceptable and keeps the first manifest narrow.

## Phase 1: generic block shell — implemented

Current block shell contains:

- stable id
- block type
- editable name
- x/y
- width/height
- z-order
- source record
- block-owned serialized state

The canvas does not need to understand the private meaning of every block's state.

## Phase 2: durable persistence — partially implemented

Implemented:

- named snapshots in IndexedDB
- file/directory handle store
- content store reserved for future use
- immutable named-snapshot behavior

Next:

- autosaved live workspace separate from named snapshots
- snapshot rename/delete UI
- optional export/import later

## Phase 3: text block — implemented for snapshots

Implemented:

- new text block
- editable block name
- text editing
- open-from-file
- serialized text itself
- serialized scroll position
- optional cursor offset

Important property:

The saved Flashframe contains its historical text. Restore does not simply reread the present-day external file.

Not implemented yet:

- explicit write-back/save-to-original-file

Do not add write-back casually. It should be an obvious user action and must not undermine historical snapshot behavior.

## Phase 4: PDF block — prototype implemented

Implemented:

- choose local PDF
- display inside block using Chromium's native PDF handling
- Flashframe page input and previous/next controls
- serialized page
- restore to serialized page
- reconnect placeholder

Known issue before polished release:

Native embedded PDF UI can have internal navigation that Flashframe cannot reliably observe. The durable block contract remains `source + page`. If exact page tracking cannot be made reliable with the native viewer, bundle a local PDF.js-style renderer later. Do not load executable viewer code from a CDN in the extension.

## Phase 5: directory lightbox — prototype implemented

Implemented:

- user-selected directory
- direct image enumeration
- filename-natural sorting
- previous/next
- left/right keyboard navigation
- current filename + fallback index
- restore by filename first

Later polish:

- thumbnails
- user-selectable sorting
- fit/fill controls
- slideshow
- optional recursive subdirectory browsing

## Phase 6: local video block — prototype implemented

Implemented:

- choose local video
- HTML video controls
- timestamp serialization
- paused state
- volume/mute
- playback rate
- timestamp restoration

Autoplay refusal is not a restoration failure. Correct timestamp restoration is the required behavior.

## Phase 7: missing-source recovery — prototype implemented

Source-backed blocks retain their shell and state when a source cannot be reopened.

The current Reconnect action first tries the stored browser-managed handle and may ask Chromium for permission again. If that cannot be recovered, the user can choose a source again through the normal picker flow.

This needs real restart/permission testing in Chrome before release.

## Phase 8: release correctness

Do this before broadening the product.

1. Load the repository unpacked in current stable Chrome.
2. Exercise every block type.
3. Save mixed workspaces.
4. close/reopen Chrome.
5. Restore mixed workspaces.
6. Test expired file/directory permissions.
7. Test moved/deleted source files.
8. Test large image directories.
9. Verify PDF page behavior.
10. Verify video timestamp behavior.
11. Add snapshot rename/delete controls.
12. Add live-workspace crash/reload autosave.
13. Add proper extension icons and store graphics.
14. Package the exact repository release contents and inspect them for remote code or accidental development files.

## Phase 9: Chrome Web Store release

Keep Flashframe's single purpose easy to explain:

> Arrange local files in a spatial workspace and return to the saved arrangement later.

Store posture:

- Manifest V3
- no remote executable code
- no broad website access for the Flashframe product
- no unrelated feature bundle
- explicit user action before local file/directory access
- local workspace state by default
- privacy disclosures match actual behavior

If a later feature needs a new permission, add it only when the shipping feature requires it.

## Phase 10: later platform work

Only after ordinary Flashframe restoration is reliable:

- improved PDF renderer if needed
- pan/zoom canvas
- block grouping
- richer lightbox
- Block SDK / stable external block contract
- optional integrations with other first-party extensions

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

If four simple local block types can close and reopen in the same useful state, the platform idea works.
