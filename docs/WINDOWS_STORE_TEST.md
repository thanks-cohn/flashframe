# Flashframe isolated Chrome edition — Windows test

Use this test before any Chrome Web Store submission from `isolated-windows-exe`.

## What this edition guarantees

The Store candidate is a normal Manifest V3 extension. It has no Windows companion, no `.exe`, no Python runtime, no localhost service, and no native messaging dependency.

The candidate requests no extension API permissions and no host permissions.

The release gate fails if broad host access, localhost/native messaging, a desktop companion dependency, remote executable JavaScript, `eval`, or a Function constructor is introduced into shipped files.

## Get the exact Windows test candidate

1. Open the Flashframe repository on GitHub.
2. Open **Actions**.
3. Open **Build isolated Chrome candidate on Windows**.
4. Open the newest green run for branch `isolated-windows-exe`.
5. Download the artifact **Flashframe-Isolated-Windows-Test**.
6. Extract that artifact once.

The artifact contains:

- `flashframe-chrome-web-store-v<version>.zip` — the exact file intended for the Chrome Web Store.
- `test-unpacked/` — the exact same Store ZIP expanded for local testing.

Do not test a different branch or an older ZIP and then submit this one.

## Load it in Chrome on Windows

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Remove or disable any other Flashframe development copy so there is no confusion.
4. Click **Load unpacked**.
5. Choose the artifact's `test-unpacked` folder. `manifest.json` must be directly inside that folder.
6. Pin Flashframe if useful and click its toolbar icon.
7. Confirm a Flashframe workspace tab opens without installing anything else.

At this point, if Chrome asks you to install Python, an EXE, a local service, or a companion, STOP: the candidate is not acceptable.

## Required functional test

Test all of these in current stable Chrome on Windows:

- Create a note and type into it.
- Drag, resize, maximize, rename, and remove blocks.
- Open a local text file through the picker.
- Open a local PDF through the picker.
- Open a local video through the picker and play/seek it.
- Open an image directory/gallery through the picker.
- Drop a local image directly into the workspace.
- Drop a local PDF and verify a PDF block opens.
- Drop a local video and verify playback and seeking work.
- Drop a local text or code file and verify its text is readable/editable in a text block.
- Drop a generic unsupported local file and verify Flashframe creates a usable file block rather than silently ignoring it.
- Drop an image directory and verify it becomes the gallery/lightbox flow.
- In the dropped directory gallery, test previous/next buttons and left/right keyboard navigation.
- Paste or drop a normal HTTPS URL.
- Add a direct remote video URL if you have one available.
- Paste or drop a YouTube URL and verify it remains an exact ordinary URL/web block with **Open page**, no special player, and no sync action.
- Save a named Flashframe.
- Close the Flashframe tab completely.
- Open Flashframe again and restore the saved Flashframe.
- Verify dropped PDF/video/directory sources either restore directly or present a clear reconnect path if Chrome requires renewed permission.
- If local-file permission must be renewed after restart, verify the reconnect UI explains that clearly and works after a user gesture.
- Choose a Flashframe data folder, save again, close/reopen, and verify the archive behavior that ships in this build.
- Test appearance/background controls and shrink-to-fit if visible in the candidate.

## Required error test

After the functional test:

1. Open `chrome://extensions`.
2. Find Flashframe.
3. Confirm there is no **Errors** button/count. If there is one, open it and treat every reproducible extension error as a release blocker.
4. Open the Flashframe workspace DevTools console and check for uncaught exceptions during the tested flows.
5. Reload the extension once and repeat the core open/save/restore test.

## Store release gate

Do not submit until all of the following are true:

- Windows workflow is green.
- Exact `test-unpacked` artifact passes the test above.
- No companion/EXE/Python/local-service step is required.
- No reproducible extension errors remain.
- The final manifest has no API permissions or host permissions.
- `PRIVACY.md` matches the exact candidate.
- Store listing describes only tested features.
- Screenshots come from the exact candidate.
- Dashboard permission and data-use answers match the exact candidate.

Only after that should `flashframe-chrome-web-store-v<version>.zip` from the same green artifact be uploaded to the Chrome Web Store.


## v1.0.6 RC2 exact acceptance additions

### General
- Start without an archive directory; confirm the blank workspace and obvious Settings gear.
- Move blocks with the Grab hand with headers both shown and hidden; edit titles independently.
- Verify the generous lower-right resize target is easy to use and persists geometry.

### Images
Where available, drop JPG, JPEG, PNG, GIF, WebP, AVIF, SVG, BMP, ICO, and APNG. For each, verify render, move, resize, named save/restore, live restore, and reconnect. TIFF/TIF has no bundled decoder in RC2: verify it remains represented with honest unsupported-rendering feedback.

### Audio and video
- Test MP3, WAV, and one of OGG/OGA/Opus/FLAC/AAC/M4A/WebM/WEBA. Verify native controls, time, volume, mute, rate, loop, Visible/Fade/Hidden, Show hidden audio, and hidden geometry restoration.
- Test MP4, WebM, and another recognized container where available. Verify time restoration/reconnect and that an unsupported codec leaves its block intact with an honest error.

### Sync
- Create Group A with one MP3 and one MP4; link a second MP3, then a fourth timed-media block. Verify 2-, 3-, and 4-member play/pause/rewind/forward, individual controls, and restored membership.
- Make one member independent; verify only it leaves group/global control and the remaining members stay linked.

### Background and live state
- Save red plus an optional background image, blocks, hidden audio, and groups; change to blue/delete content, then restore and verify all workspace state returns.
- Without manually saving, modify, close Chrome fully, reopen, and verify appearance, hidden geometry, groups, and reconnect placeholders return without an archive directory.

### Optional archive
- Configure a directory separately. Verify named/live JSON and background binary sidecars are written and restore correctly. Rename or corrupt a sidecar and verify the rest of the snapshot still imports.

### Video-site URL behavior
- Paste/drop a YouTube watch URL containing query timestamp parameters and a fragment. Verify the exact URL survives, **Open page** works, no special player appears, and no sync action is offered.
