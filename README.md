# FrameChute

**Your browser has tabs. FrameChute gives it a desk.**

FrameChute is a freeform spatial workspace for Chrome and other Chromium browsers.

Put notes, PDFs, images, image folders, video, local files, and webpages on one large canvas. Move them. Resize them. Put one in front of another. Play media. Save the arrangement. Come back later and restore it.

Instead of remembering ten tabs and six files, you can remember **where everything was**.

## The 30-second version

1. Open FrameChute.
2. Add a note, PDF, image, gallery, video, or webpage.
3. Put it where it makes sense.
4. Resize and arrange it.
5. Save the FrameChute.
6. Restore it later.

That is enough to use FrameChute. Everything else is optional.

# Classic vs Advanced

FrameChute has two interface modes:

| | Classic / Advanced OFF | Advanced ON |
| --- | --- | --- |
| Best for | Everyday use | More visible power tools |
| Top bar | Simple | Expanded |
| Open notes, text, PDFs, images, galleries, video, URLs | Yes | Yes |
| Move and resize objects | Yes | Yes |
| Save / restore workspaces | Yes | Yes |
| Right-click object tools | Yes | Yes |
| Frameless / Show image only | Yes | Yes |
| Timed movement and layer tools | Available from right-click | More controls exposed |
| Shared sequence / timeline tools | Mostly hidden | Visible |
| Advanced source, gallery, handoff and media tools | Mostly hidden | Visible |

## Classic / Advanced OFF

Classic is the default.

The **Advanced** button is red and says **OFF**.

Classic is intentionally simple on the surface, but it is **not a crippled mode**. The top toolbar keeps the common actions easy to find:

- New note
- Open text
- Open PDF
- Open image
- Open gallery
- Open video
- Open URL
- Save FrameChute
- Restore
- Reconnect all

For most people, this is enough for normal daily use.

## Advanced ON

Click the **Advanced** button and it turns green and says **ON**.

Advanced keeps the same workspace, but exposes more of FrameChute's newer controls directly in the interface. This includes things such as:

- master sequence and timing controls
- richer media coordination
- source-location and reconnection tools
- expanded gallery behavior
- extra workspace and media controls
- Chute / FileChute handoff tools
- more direct access to experimental or power-user features

Turning Advanced back OFF does **not** delete or reset the workspace. It simply returns to the cleaner Classic interface.

## The right-click menu is the bridge

This is the easiest way to understand the two modes:

**Classic hides clutter. Right-click keeps the power nearby. Advanced puts more of that power on screen.**

Right-click an object and you can access object-level commands without switching modes just to do one thing.

Depending on the object, the menu can include commands such as:

- Bring to front
- Send to back
- Grab object
- Sync with another media object
- Make independent
- Show or hide the top bar
- Show or hide the footer / player controls
- Show image only / Show video only
- Restore the full frame
- Create or edit timed movement
- Preview or remove movement
- Set timed layer behavior
- Set media looping
- Close the object

So Advanced OFF means **simple interface**, not **no advanced actions**.

# Frameless images and media

Sometimes you want the image, not a miniature application window around it.

Choose **Show image only** from the right-click menu and FrameChute removes the visible frame so the picture can sit directly on the canvas.

The frameless behavior is designed to feel like a real loose object:

- the visible image itself can be dragged
- invisible letterboxed space around the image is not grabbable
- transparent leftover frame edges behave like empty workspace
- the resize corner follows the actual visible image edge
- the resize mark sits inside the image's bottom-right corner instead of floating outside it
- the large invisible resize hit target remains easy to grab

### The little resize corner

A small reverse-L style corner appears at the bottom-right of a frameless image.

In **Classic**, it stays visible so you never remove the frame and accidentally remove the obvious way to resize the picture.

In **Advanced**, its visibility can be configured to stay visible, fade, or hide while keeping the resize hotspot usable.

# Grab an object without holding the mouse button

FrameChute also has **Grab object**.

Right-click an object and choose **Grab object**, or press **G** while the object menu is open.

Then:

- move the mouse to move the object
- click, Enter, or Space to drop it
- press Escape to cancel and put it back

This is useful for awkwardly positioned objects or when click-and-hold dragging is inconvenient.

# What can FrameChute hold?

## Notes

Write directly on the canvas. Notes are useful for ideas, captions, instructions, drafts, labels, reminders, or anything that belongs beside the material you are working with.

## Text files

Open a local text file and use its contents as an editable note.

## PDFs

Open a PDF, move it, resize it, keep it beside related material, and return to the useful page later.

## Images

Open individual local images and arrange them like objects on a desk.

You can keep the normal frame or switch to **Show image only** for a cleaner visual workspace.

## Image folders / galleries

Open a folder of images as one gallery object instead of creating dozens of separate objects.

Move through the folder with previous and next controls. FrameChute can remember your gallery position as part of the saved workspace.

## Video and media

Play local media beside the notes, PDFs, images, or other media it belongs with.

FrameChute can remember useful playback state and can coordinate participating media when you need several pieces to represent the same moment.

## Webpages

Place webpages on the canvas when the website allows embedding.

Some sites deliberately block being shown inside another page. FrameChute cannot override that browser security rule, so those sites can instead be opened normally.

# Move things like objects on a desk

A FrameChute is not a list of tabs.

Objects can be:

- moved
- resized
- renamed
- maximized
- placed in front of other objects
- placed behind other objects
- shown with or without parts of their frame
- saved in place
- restored later

The position itself can carry meaning.

A PDF can live beside the note about it. Three videos can sit together for comparison. A picture can remain beside the paragraph it inspired. A soundtrack can stay with the visual group it belongs to.

FrameChute keeps those relationships visible.

# Save the useful moment

A saved FrameChute is more than a list of files.

Depending on the object and feature, FrameChute can remember things such as:

- position
- size
- object name
- front/back order
- note contents
- PDF page
- gallery position
- media position
- volume and playback choices
- loop choices
- media grouping
- frameless state
- visible or hidden controls
- timed movement
- timed layer rules
- workspace appearance

Chrome may occasionally require a local file or folder to be reconnected because browser permissions are intentionally restrictive. FrameChute provides reconnection controls instead of silently leaving a dead object behind.

# Advanced timing and sequence tools

You do **not** need these features to use FrameChute.

Advanced mode makes them easier to see and manage.

## Timed movement

Objects can move over time using a start point, end point, duration, delay, and optional path behavior.

Movement can be previewed, edited, returned to its starting position, or removed.

## Shared master time

Advanced mode includes shared sequence controls so several actions can relate to one master clock.

An action can begin immediately, at a particular master time, or relative to another action.

That allows a FrameChute to behave like a lightweight scene as well as a static workspace.

## Timed layers

An object can temporarily move above or below another object during part of a sequence and later return to its normal layer.

## Coordinated media

Participating media can be controlled together while keeping different individual timestamps.

For example, these can all represent the same project moment:

```text
Video A: 0:23
Video B: 0:12
Audio C: 1:04
```

The point is coordination, not forcing every file to have the same timestamp.

## Looping

FrameChute can handle looping at more than one level, including per-media choices and sequence/action behavior where supported.

# Chute + FrameChute

FrameChute works especially well with [Chute](https://github.com/thanks-cohn/chute).

A simple way to remember the pair:

**Chute catches things. FrameChute arranges them.**

```text
webpage / file / image
        ↓
      Chute
        ↓
    FrameChute
        ↓
 move · resize · compare · play · save
```

Neither extension requires the other.

# Why not just use tabs?

Tabs tell you what is open.

They do not naturally tell you:

- this PDF belongs beside this note
- these three videos are one comparison
- this image is the reference for this paragraph
- this soundtrack belongs with these visuals
- this object should sit above that one

FrameChute leaves those relationships visible.

# What FrameChute is not

FrameChute is not trying to replace every specialized application.

A professional video editor is better for professional video editing. A collaborative whiteboard is better for large-team whiteboarding. A database tool is better for databases.

FrameChute is useful when you want several kinds of material together in one live spatial workspace:

**local files + free placement + saved state + notes + PDFs + galleries + images + live media + webpages + optional timing.**

# Privacy and local files

FrameChute is local-first.

The extension does not require a FrameChute account or FrameChute cloud service simply to use the canvas.

Files you choose remain local unless **you** deliberately send or upload them somewhere else.

Normal browser security still applies, including permission prompts and occasional local-file reconnection.

# Install

## Chrome / Chromium

The Chrome Web Store build provides the straightforward FrameChute experience.

The current GitHub build includes the Classic / Advanced switch and the newest features described above.

## Development / current GitHub build

Clone or download this repository, then open your Chromium browser's extension page:

1. Turn on **Developer mode**.
2. Choose **Load unpacked**.
3. Select the FrameChute extension directory.

# The idea in one sentence

**FrameChute gives the browser a place where files, pages, notes, images, and media can stay where you put them.**
