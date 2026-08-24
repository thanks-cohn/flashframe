# FrameChute v1.0.8 — Windows Chrome Web Store Test

Submission branch: `chrome-web-store-submission-2026-08-24`

The runtime baseline immediately before this branch was manually tested on Windows successfully. This branch changes submission metadata/documentation and must still receive a short exact-package smoke test before upload.

## Architecture checks

The Store candidate must remain a normal Manifest V3 extension with:

- no desktop companion;
- no EXE or Python runtime;
- no localhost service;
- no native messaging;
- no Chrome extension API permissions;
- no host permissions;
- no remotely hosted executable extension code.

## Build the exact candidate

On Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\package-web-store.ps1
```

On Linux/macOS:

```bash
sh scripts/package-web-store.sh
```

Expected Store ZIP:

`dist/flashframe-chrome-web-store-v1.0.8.zip`

## Load unpacked on Windows

1. Extract the exact v1.0.8 ZIP to a fresh folder.
2. Open `chrome://extensions` in current stable Chrome.
3. Enable **Developer mode**.
4. Disable/remove older FrameChute development copies to avoid testing the wrong build.
5. Click **Load unpacked** and select the folder that directly contains `manifest.json`.
6. Click the FrameChute toolbar icon.

## Required smoke test

Because the runtime was already exercised on Windows immediately before submission prep, this is the minimum exact-candidate recheck:

- FrameChute opens without errors.
- Packaged Default Grab artwork appears on normal blocks.
- Media-player Grab shows the packaged Default image with no broken-image icon.
- Create, type in, move, and resize a note.
- Open PDF once through the native picker.
- Open gallery once through the native directory picker.
- Verify only one native picker can be active at a time; other local-source buttons should not queue multiple Windows dialogs.
- Open local audio or video and exercise playback controls.
- Save a named workspace, close the FrameChute tab, reopen it, and restore the workspace.
- Add a normal HTTPS URL and confirm predictable link/embed behavior.
- Open Settings and verify UI remains readable and usable.

## Recommended broader regression test

Before a major public launch, also check:

- drag/drop image, PDF, text/code file, video, and image directory;
- reconnect behavior after Chrome restart where applicable;
- workspace appearance/background;
- media visibility/fade/hidden behavior;
- multi-media controls/sync groups;
- custom Grab artwork overrides for normal blocks;
- block layering, maximize, resize, rename, and removal;
- optional local FrameChute data directory if exposed in the candidate.

## Error check

After the smoke test:

1. Open `chrome://extensions`.
2. Confirm FrameChute has no reproducible extension error count.
3. Open the workspace DevTools console and confirm there are no reproducible uncaught exceptions in the tested flows.
4. Reload the extension once and repeat open + note + save/restore.

## Submission rule

Do not upload a different ZIP than the one tested.

If the exact v1.0.8 package fails any smoke-test item, fix the candidate and rebuild rather than submitting a known broken package.
