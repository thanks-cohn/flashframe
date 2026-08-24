# FrameChute

### Your browser has tabs. FrameChute gives it a desk.

FrameChute is a spatial workspace for Chrome and Chromium.

Open notes, PDFs, image galleries, audio, video, local files, and webpages on one freeform canvas. Move them where you want. Resize them. Layer them. Save the whole arrangement. Come back later and pick up where you left off.

**There should be almost no perceptible distance between wanting something and reaching it.**

<p align="center">
  <img src="assets/images/default.png" alt="FrameChute mascot" width="180">
</p>

## Download

### [Download THE BIG RELEASE](https://github.com/thanks-cohn/framechute/releases/latest)

Current release: **FrameChute v1.0.6**

The downloadable ZIP works as an unpacked Chrome/Chromium extension on Windows, Linux, and other desktop Chromium systems.

### Install it

1. Download **THE BIG RELEASE.zip** from Releases.
2. Extract the ZIP.
3. Open `chrome://extensions`.
4. Turn on **Developer mode**.
5. Click **Load unpacked**.
6. Select the extracted FrameChute folder.
7. Open FrameChute and start throwing things onto the canvas.

No native companion. No Python runtime. No localhost service. No giant permission grab.

---

## Stop organizing your work around tabs

Tabs are great until the thing you are doing needs five documents, three reference images, a video, a soundtrack, a note to yourself, and one webpage you absolutely cannot lose.

Then the browser becomes a hallway full of identical doors.

FrameChute gives you a room instead.

Put the PDF beside the note it explains. Keep the reference image above the paragraph it inspired. Leave the video at the exact moment you care about. Put the soundtrack in the corner. Move everything until the arrangement makes sense **to you**.

Then save the arrangement itself.

Not merely the files.

The moment.

## What FrameChute can hold

- **Notes and text** you can write directly in the workspace
- **PDFs** kept beside the work they belong to
- **Local images** as independent spatial objects
- **Image folders / galleries** without exploding a directory into tabs
- **Local audio** with playback state
- **Local video** with remembered timestamps and playback state
- **Web pages and URLs** when the site permits embedding
- **Direct browser-playable media**
- **Generic local files** with graceful reconnect behavior

Every block can live beside the thing it relates to instead of being trapped in a separate application-shaped silo.

## Save the whole useful state

A FrameChute workspace remembers the details that make returning feel correct:

- block position
- block size
- stacking order
- names
- text
- PDF position
- gallery position
- media timestamps
- playback state
- looping choices
- media sync groups
- workspace appearance
- background configuration

The goal is not to snapshot RAM.

The goal is to recreate the useful moment.

## Media that behaves like part of the workspace

FrameChute treats audio and video as first-class timed objects rather than decorative attachments.

The movable unified Media controller can operate eligible media across the workspace with:

- rewind
- play / pause
- forward
- configurable seek steps
- all-media scope
- synchronized media groups
- global looping behavior

Audio can sync with video. Video can sync with audio. Groups can grow as the workspace grows.

The Media controller itself can be moved, minimized, faded, hidden, and brought back when needed.

## Grab things. Literally.

Moving an object should feel obvious.

FrameChute gives blocks a dedicated **Grab** affordance so dragging does not turn into accidentally renaming something or interacting with the content inside it.

And because a drag handle apparently does not have to be boring, FrameChute ships with stateful Grab artwork:

- Default
- Hover
- Faded
- Expanded

Users can replace those images from Settings. Packaged artwork is also just four predictable files under `assets/grab/`, so custom builds can change the personality of the interface without rewriting JavaScript.

## The interface gets out of the way

FrameChute is built around controls being there when you need them and disappearing when you do not.

You can:

- hide block headers
- fade Settings when idle
- fade or hide the Media controller
- keep the top toolbar visible
- reveal the toolbar only when approached
- hide the toolbar entirely
- customize Grab artwork

The result can go from a full editing interface to almost nothing but the actual material you are working with.

## Make it yours

FrameChute exposes visual roles independently instead of giving you one giant “theme color” that poisons the whole interface.

You can customize things such as:

- top toolbar color
- toolbar text color
- accent / small-button color
- block header color
- block header text color
- Media header color
- floating-panel text color
- toolbar font family
- block-header font family
- workspace background color
- workspace background image

So yes, you can make it tasteful.

Or deeply questionable.

Both are supported.

## Tiny hand included

FrameChute has a small top-right mascot because software is allowed to have a pulse.

It can be:

- **Reveal on hover**
- **Always visible**
- **Hidden**

Hovering it reveals the optional donation prompt. It never needs broad website permissions to do that, because of course it does not.

## Local-first on purpose

FrameChute is a Manifest V3 Chrome/Chromium extension designed around explicit user-selected files and extension-owned workspace state.

It does **not** require:

- broad host permissions just to function
- a native executable
- a Python service
- a localhost daemon
- native messaging
- a remote code loader
- a bundled universe of codecs

If Chromium can play or render a format, FrameChute can work with it where supported. If Chromium cannot decode something, FrameChute should tell you rather than pretending the source never existed.

A missing file should not destroy the workspace around it. Sources are designed to be reconnectable while the rest of the saved arrangement remains useful.

## Why this exists

Most software asks you to adapt your thinking to its hierarchy.

Window here. Tab there. Folder over there. One document occupying the whole screen because apparently rectangles are scarce.

FrameChute starts with a different assumption:

**space itself is useful state.**

Where you put something can be part of what it means.

A workspace can be a writing desk, reference board, study surface, presentation canvas, research pile, media station, storyboard, or some strange personal computer inside your browser that makes perfect sense only to you.

That is fine.

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

The workspace owns geometry. Each block type owns the small amount of state required to recreate itself.

That boundary lets new block types participate in save/restore without turning the canvas into a pile of format-specific special cases.

Internal compatibility identifiers such as historical `flashframe.*` storage keys may remain under the old name so existing saved work continues to restore correctly. User-facing product branding is **FrameChute**.

## Repository map

- `src/` — extension workspace and interaction code
- `assets/images/` — mascot states
- `assets/grab/` — packaged Grab states
- `scripts/` — Chrome Web Store packaging and validation
- `docs/` — architecture, state model, design notes, and implementation documentation
- `bugs/` — implementation handoff / regression notes

Build the Chrome Web Store package on Linux/macOS with:

```bash
sh scripts/package-web-store.sh
```

The release gate validates the extension and produces the Store ZIP under `dist/`.

## FrameChute v1.0.6

**THE BIG RELEASE** includes the mascot interaction, four-state packaged Grab artwork, user Grab overrides, unified Media controls, media-dock drag/drop fixes, theme customization, improved Settings fading, high-contrast context menus, FrameChute branding cleanup, and Chrome Web Store-safe packaging.

### [Get THE BIG RELEASE](https://github.com/thanks-cohn/framechute/releases/latest)

---

## The idea

Put the things you need where you need them.

Move them.

Resize them.

Make the workspace yours.

Save it.

Come back.

And if somebody opens it later and sees the tiny hand, the disappearing controls, the oddly careful spacing, the colors you chose, the media sitting exactly where you left it, and all the little decisions that technically did not have to be made but somebody cared enough to make anyway...

yeah.

**Somebody was here.**
