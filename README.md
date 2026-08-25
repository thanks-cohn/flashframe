# FrameChute

### Your browser has tabs. FrameChute gives it a desk.

FrameChute is a local-first spatial workspace for Chrome and Chromium.

Drop in images. Open PDFs. Keep notes beside them. Play videos and audio. Arrange references around the screen. Resize, layer, synchronize, save the whole scene, close it, come back later, and keep going.

The idea is simple:

> **There should be almost no perceptible distance between wanting something and reaching it.**

<p align="center">
  <img src="assets/images/default.png" alt="FrameChute mascot" width="180">
</p>

## The “ohhh, THAT is useful” part

A normal browser remembers pages.

FrameChute remembers **the workspace you made out of them**.

Imagine you are writing, studying, editing, researching, storyboarding, comparing references, or just collecting a beautiful mess of things that belong together.

You arrange:

```text
reference image       PDF
       \               /
        \             /
          your note
             |
          video @ 12:47
             |
         second image
```

Then you save the FrameChute.

Later, you restore it.

The blocks return to their saved positions and sizes. Notes come back. PDF position comes back. Gallery position comes back. Media timestamps come back. Sync groups come back. Appearance comes back.

And with FrameChute 1.0.14, browser-created and FileChute-dropped images can be preserved locally with the saved workspace instead of existing only as a fragile live drag object.

That means a saved workspace containing those images can come back with the images already there.

**That is the point: saving a FrameChute should feel like saving the moment, not saving a list of chores for Future You.**

---

## What you can put on the canvas

- Notes and editable text
- PDFs
- Individual images
- Image folders and galleries
- Local audio
- Local video
- Browser-playable media
- Web pages and URLs when the destination permits embedding
- Generic local files with remembered source information

Every block lives in the same freeform space, so related things can finally stay visually related.

## Save the useful state

A FrameChute can remember:

- block position
- block size
- stacking order
- names
- note contents
- note cursor/scroll state
- PDF page
- gallery image/index
- video timestamp
- playback state
- volume and mute state
- looping
- playback rate
- media sync groups
- workspace background
- appearance settings
- remembered local-source information

The goal is not to freeze RAM.

The goal is to recreate the **useful human state** of the workspace.

## Images that actually survive the save

This is one of the most important changes in FrameChute 1.0.14.

Some images arrive in FrameChute as real browser `File` objects without a durable operating-system file handle, especially images dragged in from another extension such as FileChute.

Older behavior could make those images feel temporary: the workspace remembered that an image belonged there, but after a restart the browser might no longer have the original drag object.

FrameChute now preserves supported browser-created/FileChute-dropped image bytes in its local IndexedDB storage and keeps the saved block tied to that preserved copy.

So the intended experience is:

```text
Drop image into FrameChute
        ↓
Arrange workspace
        ↓
Save FrameChute
        ↓
Close it
        ↓
Come back later
        ↓
Restore
        ↓
image is still there
```

No cloud upload. No FrameChute account. No remote storage service.

Large synthetic video/audio files are intentionally not silently duplicated into browser storage. FrameChute avoids turning one innocent save into several surprise gigabytes.

## Reconnect without playing “where was that file?”

For ordinary native local files, FrameChute remembers Chrome's filesystem handle whenever one exists.

If Chrome still grants access, FrameChute can reconnect directly.

If Chrome requires confirmation again, FrameChute uses the remembered handle/location as the picker starting point when Chromium allows it. The goal is for reconnect to feel like:

```text
Reconnect to saved location
        ↓
correct place opens
        ↓
Open
        ↓
done
```

rather than:

```text
Reconnect
        ↓
...where did I put that thing three weeks ago?
```

There is also a top-toolbar **Reconnect all to locations** command. When saved handles are still usable, one click can reconnect multiple disconnected blocks without making you relink them one by one.

Chrome can revoke filesystem permissions, so no extension can truthfully promise that the browser will never ask again. FrameChute's job is to remember as much context as Chrome permits and make the remaining confirmation as painless as possible.

## Fit to Size

Huge image? Tiny viewport? Weirdly tall reference?

Select an image or gallery and hit **Fit to Size** in the top toolbar.

FrameChute fits the whole visible image inside a maximum 1200 × 700 content area while preserving the exact aspect ratio.

Examples:

```text
1200 × 800  →  1050 × 700
2400 × 1200 →  1200 × 600
800 × 1200  →   467 × 700
```

No cropping. No stretching. No rewriting the original image file.

It only changes the FrameChute block geometry so the whole image becomes visible at once.

## FrameChute + FileChute

FrameChute works especially well with [FileChute](https://github.com/thanks-cohn/filechute).

**FileChute catches things. FrameChute arranges them.**

```text
web / image / local file
          ↓
      FileChute
          ↓ drag
      FrameChute
          ↓
 move · resize · layer
          ↓
        save
          ↓
       return
```

FileChute and FrameChute remain useful independently. Together, they shorten the path from **“I found this”** to **“this now belongs exactly here.”**

## Media that behaves like part of the workspace

FrameChute treats timed media as workspace objects, not decorative attachments.

The movable Media controller can operate eligible audio and video across the canvas with:

- rewind
- play/pause
- forward
- configurable seek steps
- looping
- synchronized media groups
- scope controls

Audio can sync with video. Video can sync with audio. Rewinding or seeking synchronized media can move the group together.

The controller itself can be moved, minimized, faded, hidden, and summoned again when needed.

## Grab things. Literally.

Moving a block should not mean accidentally selecting text, renaming something, or scrubbing a video.

FrameChute provides a dedicated **Grab** affordance for moving workspace objects.

It also supports replaceable Grab artwork states:

- Default
- Hover
- Faded
- Expanded

Packaged artwork lives under `assets/grab/`, so the interface can change personality without changing the workspace engine.

## The interface can disappear

FrameChute is designed so controls can exist when useful and get out of the way when they are not.

You can control block headers, the top toolbar, Settings visibility, Media controller visibility/fading, footer behavior, workspace colors, background imagery, fonts, accents, and other visual roles.

A busy editing surface can become almost nothing but the material itself.

## Local-first on purpose

FrameChute is a Manifest V3 Chrome/Chromium extension built around user-selected files and local workspace state.

The current extension requests **no Chrome extension API permissions and no host permissions**.

FrameChute does not require:

- a FrameChute account
- a subscription
- a native executable
- Python
- a localhost server
- native messaging
- broad browsing-history access
- remote executable code
- a developer-operated cloud backend

Normal workspace data is kept locally.

See [PRIVACY.md](PRIVACY.md) for the current privacy policy and Chrome Web Store data-handling disclosures.

---

# Install FrameChute

## Download the latest release

### [Download the latest FrameChute release](https://github.com/thanks-cohn/framechute/releases/latest)

Then:

1. Download the packaged FrameChute ZIP.
2. Extract it.
3. Open `chrome://extensions` in Chrome/Chromium.
4. Turn on **Developer mode**.
5. Click **Load unpacked**.
6. Select the extracted FrameChute folder.
7. Open FrameChute.
8. Throw something onto the canvas.

That is it.

## Installing directly from the repository

```bash
git clone https://github.com/thanks-cohn/framechute.git
cd framechute
```

Then open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the repository folder.

To update a local clone:

```bash
cd /path/to/framechute
git pull --ff-only origin main
```

Then press **Reload** on FrameChute in `chrome://extensions`.

---

## Optional durable FrameChute data folder

FrameChute can use a user-chosen local data folder for saved workspace JSON archives.

The archive layout includes live and named saved-state data, such as:

```text
FrameChute data folder/
  live/
    current.flashframe.json
  sessions/
    ...saved states....flashframe.json
```

Chrome may require the initial filesystem permission and can occasionally require confirmation again after browser/security changes.

The archive is intended to give saved workspace state a life outside the extension package itself, while IndexedDB continues to hold browser-managed state such as durable handles and preserved supported image content.

## Why JSON matters

The `.flashframe.json` state is the map of the workspace.

It records what existed, where it sat, what state it was in, and what source identity belongs to it.

Browser filesystem handles themselves are stored through browser-managed persistence rather than being faked as plain path strings inside JSON. When Chrome allows the saved handle to be reused, FrameChute can reconnect directly. When it requires confirmation, FrameChute uses remembered context to get the user as close to **Open → done** as the browser permits.

## Why this exists

Most software asks you to adapt your thinking to its hierarchy.

Tab here. Window there. Folder somewhere else. A PDF in one application, notes in another, reference images in a third, and a video buried behind six tabs.

FrameChute starts from a different assumption:

**space itself is useful state.**

Where you put something can be part of what it means.

A FrameChute can be a writing desk, research board, study surface, media station, storyboard, reference wall, presentation canvas, visual notebook, or a strange little personal computer inside your browser that makes perfect sense only to you.

That is not an edge case.

That is the point.

## Architecture

The core model stays intentionally small:

```text
Workspace
  └── Blocks
        id
        type
        name
        x / y
        width / height
        z-order
        source
        state
```

The workspace owns geometry. Each block type owns the state required to recreate itself.

Internal compatibility identifiers using the historical `flashframe` name may remain in storage and file formats so older saved work continues to restore. User-facing product branding is **FrameChute**.

## Repository map

- `src/` - extension workspace and interaction code
- `assets/images/` - mascot artwork
- `assets/grab/` - packaged Grab states
- `scripts/` - Chrome Web Store packaging and validation
- `docs/` - architecture, state model, Store notes, and implementation documentation
- `bugs/` - implementation handoff and regression notes

Build the Chrome Web Store package on Linux/macOS with:

```bash
sh scripts/package-web-store.sh
```

The release gate validates the extension and produces the Store ZIP under `dist/`.

---

## The idea

Find something.

Drop it in.

Put it where your brain says it belongs.

Resize it.

Layer it.

Sync it.

Save it.

Leave.

Come back.

And instead of reconstructing yesterday from memory...

**there it is.**
