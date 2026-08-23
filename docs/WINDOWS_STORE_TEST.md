# Flashframe isolated Chrome edition — Windows test

Use this test before any Chrome Web Store submission from `isolated-windows-exe`.

## What this edition guarantees

The Store candidate is a normal Manifest V3 extension. It has no Windows companion, no `.exe`, no Python runtime, no localhost service, and no native messaging dependency.

The only extension permission is `declarativeNetRequestWithHostAccess`, used by the packaged YouTube embed compatibility rule. Host access is limited to:

- `https://www.youtube.com/*`
- `https://www.youtube-nocookie.com/*`

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
- Add a YouTube URL and verify the embed actually loads and the global media controls behave reasonably.
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
- YouTube permission is still genuinely required by the tested YouTube feature. If YouTube is removed, remove its permission and host access too.
- `PRIVACY.md` matches the exact candidate.
- Store listing describes only tested features.
- Screenshots come from the exact candidate.
- Dashboard permission and data-use answers match the exact candidate.

Only after that should `flashframe-chrome-web-store-v<version>.zip` from the same green artifact be uploaded to the Chrome Web Store.
