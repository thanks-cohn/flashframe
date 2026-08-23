# Current Build

This file is the quickest handoff for someone opening the repository and asking what already works, what is architectural, and what still needs to be proven in Chrome.

## What exists now

Flashframe is a Manifest V3 Chrome/Chromium extension.

Clicking the extension action opens a full extension-owned workspace tab.

The workspace currently has first-class core block types:

- text
- PDF
- image-directory gallery
- local video
- dropped local audio

Every block has the common Flashframe shell:

- stable block id
- editable display name
- x/y position
- width/height
- z-order
- a standardized Grab hand for drag-to-move
- browser-native resize
- temporary maximize/restore
- removal without deleting the underlying local source

Named Flashframes are stored locally in IndexedDB and can be selected and restored later. Schema v2 includes workspace background color/image/mode while global UI preferences remain separate. A distinct local live checkpoint restores the last working workspace without requiring an archive directory.

## Text block

Current behavior:

- create an internal note
- open a user-selected local text file
- edit text inside the block
- save the actual text inside a Flashframe snapshot
- save scroll position
- save optional cursor offset
- restore the historical text contained in that snapshot rather than re-reading the current external file

Important current limitation:

Editing a text block does not yet write changes back to the original local file. Flashframe is currently treating the block state as the source of truth for snapshots.

## PDF block

Current behavior:

- choose a local PDF
- display it in a block using Chromium's built-in PDF handling
- use Flashframe previous/next/page controls
- save the selected page
- restore that page when the source can be reopened
- show a reconnect path when the browser no longer grants access to the source

Important current limitation:

The first PDF implementation uses Chromium's native embedded PDF viewer. Flashframe knows the page selected through its own controls, but cannot reliably observe every internal scroll/page change made directly inside the native viewer.

Before a polished public release, either constrain PDF navigation to the Flashframe page control or bundle a local PDF.js-style viewer. Do not load PDF viewer code remotely; Chrome Web Store Manifest V3 extensions must ship executable code with the extension package.

The block state contract should remain `source + page` either way.

## Gallery block

Current behavior:

- choose a local directory through the browser directory picker
- enumerate supported image files directly in that directory
- sort by filename with natural numeric ordering
- display one image at a time
- previous/next buttons
- left/right keyboard navigation while the block is focused
- save the current image name and fallback index
- restore by image name first, not merely by old index

Important current limitations:

- no recursive subdirectory browsing yet
- no thumbnail strip yet
- no sort UI yet
- no slideshow UI yet

The intended first product only needs the directory lightbox to be quick and reliable.

## Video block

Current behavior:

- choose a local video
- use normal HTML video controls
- save playback timestamp
- save paused state
- save volume, muted state, and playback rate
- restore the timestamp when the source is available

If Chrome blocks automatic playback, returning to the correct timestamp still counts as a successful restore. The user can press play.

## Audio and timed-media groups

Dropped MP3, WAV, Ogg/OGA, M4A/AAC, FLAC, and WebM audio use native Chromium playback. Audio state includes time, pause, volume, mute, rate, loop, visual visibility, and sync-group membership. Visible, fade, and hidden modes are supported; Settings can reveal hidden audio. Local audio and video can be linked through **Sync with…** into automatically generated generic timed-media groups, or made independent. The floating transport targets all non-independent media or a selected discovered group.

## Local source handles

File and directory handles are stored in IndexedDB when Chromium permits structured cloning of the browser-managed handle.

Permissions are not treated as permanent. After a browser restart or permission change, a source-backed block may need the user to press Reconnect.

A missing source must never destroy the rest of a Flashframe.

## Chrome Web Store posture

The current manifest intentionally requests no broad website or browsing permissions.

The extension contains no remote script imports and no framework CDN dependencies.

Local files and directories are selected explicitly by the user.

Workspace state stays local in the current build.

Keep those properties unless a later feature genuinely requires something broader.

## Validation

`.github/workflows/validate.yml` checks:

- `manifest.json` parses as JSON
- shipped JavaScript passes `node --check`

This is only a syntax gate. A person still needs to run the browser smoke tests below.

## Manual smoke test before calling this release-ready

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load this repository as an unpacked extension.
4. Click Flashframe's toolbar icon.
5. Confirm an extension-owned workspace tab opens.
6. Create and move several text blocks.
7. Open a local text file, edit the block, save a Flashframe, change the text, then restore the saved Flashframe and confirm the historical text returns.
8. Open a PDF, select a page using Flashframe's page control, save, restore, and confirm that page returns.
9. Choose an image directory, navigate to a recognizable image, save, restore, and confirm Flashframe selects the same filename.
10. Open a local video, seek to a recognizable timestamp, save, restore, and confirm the timestamp returns.
11. Reload the extension/workspace and test source reconnect behavior.
12. Confirm no extension install warning asks for unrelated website access.

## Next work in priority order

1. Run and repair the full Chrome smoke test.
2. Add live-workspace crash/reload autosave separate from named Flashframes.
3. Add snapshot rename/delete controls.
4. Decide the final PDF viewer approach and make page restoration exact.
5. Improve missing-source/relink UX.
6. Add icons and Chrome Web Store listing assets.
7. Package a release candidate ZIP from the repository root.

Do not expand the feature set until the four core block types restore reliably.

## Product rule

Flashframe owns spatial state.

Each block owns the smallest useful content state needed to return to where the user was.

That simplicity is intentional.
