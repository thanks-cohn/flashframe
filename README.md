# FrameChute

**Put things on a browser canvas. Leave them where they make sense. Come back later.**

FrameChute is a freeform workspace that runs inside Chrome and other Chromium browsers.

You can put notes, PDFs, images, folders of images, music, videos, local files, and webpages on one large canvas. Move them around. Resize them. Put one above another. Play media. Save the whole arrangement and restore it later.

That is the basic idea.

```text
PDF          image
  \          /
   \        /
     note
      |
    video       music
```

Instead of remembering ten tabs and six files, you can remember **the arrangement itself**.

## The simple version

FrameChute can be as simple as this:

1. Open FrameChute.
2. Add a note, PDF, image folder, video, or webpage.
3. Put it where you want it.
4. Resize it if you want.
5. Save the FrameChute.
6. Restore it later.

You do not need to understand timelines, layer rules, animation, or any of the newer tools to use FrameChute.

## Classic and ƒ Advanced

The current GitHub version contains **two ways to use FrameChute**.

### Classic mode

This is the default.

The **Advanced button stays red and says OFF**. FrameChute keeps the simpler feature surface and layout of the Chrome Web Store version.

Classic is for someone who mainly wants:

- notes
- text files
- PDFs
- image folders / galleries
- videos
- webpages
- moving and resizing objects
- saved workspaces
- reconnecting local files
- simple media controls

### ƒ Advanced mode

Click the red **Advanced** button at the top to turn Advanced mode on.

The GitHub FrameChute mark is a **white ƒ on red**.

Advanced reveals the newer GitHub tools, including things such as:

- frameless images and media
- finer control over headers, footers, and resize handles
- timed movement
- a master sequence clock
- coordinated media controls
- action looping and media looping
- timed layer changes
- richer gallery controls
- better source reconnection
- Chute / FileChute handoff tools
- more advanced workspace and media behavior

Turning Advanced back off does **not** delete your workspace. It simply returns the interface to the simpler Classic view.

## What can FrameChute hold?

### Notes

Write directly on the canvas.

You can use notes for ideas, captions, instructions, drafts, labels, or anything else you would normally keep in a separate text window.

### Text files

Open a local text file and place its contents on the canvas as an editable note.

### PDFs

Open a PDF, move it wherever you want, resize it, and keep your useful page with the saved workspace.

### Images

Open local images and use them as visual objects on the canvas.

In Advanced mode, images can become nearly frameless so the picture itself is what you see rather than a large application box around it.

### Image folders and galleries

Choose a folder of images and keep it as one gallery object.

You can move through the folder with previous and next controls instead of opening dozens of separate files.

FrameChute remembers where you were in the gallery.

### Audio

FrameChute can play local audio such as MP3 files and other formats Chromium can decode.

Audio can live beside the images, notes, PDFs, or videos it belongs with instead of being kept in a completely separate player.

### Video

FrameChute can play local video such as MP4 files and other formats Chromium can decode.

Video objects remember useful playback state when a FrameChute is saved.

### Webpages and links

You can place webpages on the canvas when the website allows itself to be embedded.

Some websites block embedding. FrameChute cannot override a website that deliberately refuses to appear in an embedded frame, so those pages can instead be opened normally.

### Other local files

FrameChute can keep track of other local sources and help reconnect them when browser permissions need to be granted again.

## Move things like objects on a desk

A FrameChute is not a list of tabs.

Objects can be:

- moved
- resized
- renamed
- maximized
- put in front of other objects
- put behind other objects
- saved in place
- restored later

The position matters because the position can carry meaning.

Maybe the PDF belongs beside one note. Maybe three videos are being compared. Maybe a soundtrack belongs underneath one group of images. FrameChute lets that relationship remain visible.

## Save the useful moment

When you save a FrameChute, the goal is to bring back the useful working state rather than merely reopening a collection of files.

Depending on the object and mode, FrameChute can remember things such as:

- where an object was
- how large it was
- its name
- which object was in front
- note contents
- PDF page
- gallery position
- media position
- media volume and playback choices
- loop choices
- media grouping
- whether an image or media object was frameless
- hidden or visible controls
- timed movement
- timed layer rules
- workspace appearance

Local files may occasionally need to be reconnected because Chrome deliberately limits long-term file access. FrameChute tries to make that reconnection understandable instead of simply leaving a broken object behind.

# ƒ Advanced features

Everything below is optional. If you do not want these tools, leave Advanced off.

## Frameless objects

Sometimes you want the picture or video, not a big application window around it.

Advanced mode can hide parts of an object's frame so images and media can feel more like loose objects on the canvas.

Controls can still be restored later.

## Resize without permanent clutter

Advanced mode can keep the resize corner visible, let it fade away, or hide the visible mark while leaving the corner itself usable.

The idea is simple: controls should be available when you need them without having to stay on top of the material forever.

## One media controller

FrameChute can control participating audio and video together.

You can play, pause, rewind, or move participating media forward without opening every player separately.

This is useful when several pieces of media describe the same moment but do **not** begin at the same timestamp.

For example:

```text
Video A: 0:23
Video B: 0:12
Audio C: 1:04
```

Those three positions can still represent the same point in your project.

## Master timeline direction

The Advanced version is moving toward a true shared media timeline.

The important idea is that synchronized media should keep its relative timing even when one file reaches its beginning or end.

For example, if one video reaches `0:00` while you keep rewinding, FrameChute should be able to remember that the master timeline has continued moving backward. The video can wait at its first frame while another longer piece of media continues rewinding.

The same applies after a shorter file ends: the master timeline can keep moving while that file waits at its final frame.

This is the basis for **pre-roll, post-roll, and persistent media offsets** in the Advanced timeline.

## Timed movement

An object can have a movement that plays over time.

A movement can use:

- a start point
- an end point
- a straight or curved path
- a delay
- a duration
- an optional visible path

You can preview the movement, edit it, return the object to its start, or remove the action.

## Start actions at different times

Advanced mode has a shared master clock.

An action can begin:

- when Play is pressed
- at a specific master time
- after another action finishes
- after another action finishes plus an extra delay

For example:

```text
0.0s   first image moves
2.0s   second object starts
4.5s   first action ends
5.0s   next action begins
8.0s   layer changes
```

This lets a FrameChute behave like a simple scene rather than only a static board.

## Timed layers

Objects can also change which one is in front during a period of time.

For example, an image can move above another object for part of a sequence and then return to its normal layer afterward.

## Master sequence controls

Advanced mode has shared sequence controls for things such as:

- Play / Pause
- rewind
- step backward
- step forward
- step size
- master time
- sequence duration

## Loop what you want

Advanced mode can treat looping separately.

You can loop:

- actions
- media
- both
- neither

A single video or audio object can also have its own loop choice.

## Chute + FrameChute

FrameChute works especially well with [Chute](https://github.com/thanks-cohn/chute).

A simple way to remember the pair is:

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

The **current fixed GitHub Chute** can drag images into the Chrome Web Store version of FrameChute. The older Chute version currently on the Chrome Web Store may not have that compatibility fix yet.

Neither extension requires the other.

# What is FrameChute similar to?

There is not one exact competitor because FrameChute overlaps several kinds of software.

The closest comparisons depend on what you are doing.

| If you normally use... | Examples | FrameChute is different because... |
| --- | --- | --- |
| Browser tabs / session managers | tab groups, saved browser sessions | FrameChute remembers a visual arrangement, not just which pages were open |
| Visual boards | Miro, Milanote | FrameChute is centered on live local files, playable media, PDFs, and a persistent browser canvas rather than mainly cards and collaboration |
| Reference boards | PureRef and similar tools | FrameChute can mix references with notes, PDFs, galleries, webpages, audio, and video instead of mainly images |
| Note workspaces | Notion and similar tools | FrameChute is freeform and spatial rather than requiring everything to live in pages, blocks, tables, or a hierarchy |
| Media players | VLC and browser media players | FrameChute puts media beside the documents, images, notes, and other media it relates to and can coordinate several pieces together |
| Video / motion editors | Premiere Pro, DaVinci Resolve, After Effects | those tools are vastly more powerful for professional editing and rendering; FrameChute is much lighter and keeps objects live on a browser canvas |
| Presentation tools | PowerPoint, Google Slides | FrameChute is one open spatial workspace rather than a fixed sequence of slides, although Advanced timing can make the workspace behave like a scene |

## Does FrameChute replace those tools?

No.

A professional video editor is better at professional video editing.

A collaborative whiteboard is better at large-team whiteboarding.

A database workspace is better at databases.

A dedicated image reference program may be simpler if all you need is a wall of pictures.

FrameChute is useful when you want several of these ideas **in the same place**:

**local files + free placement + saved state + notes + PDFs + galleries + live media + webpages + optional timing.**

That combination is the point.

# Why not just use tabs?

Tabs tell you that things are open.

They do not naturally tell you:

- this PDF belongs beside this note
- these three videos are one comparison
- this image is the reference for this paragraph
- this soundtrack belongs with these visuals
- this object should appear above that object

FrameChute leaves those relationships visible.

# Why not just use a whiteboard?

A whiteboard is excellent for cards, drawings, diagrams, and collaboration.

FrameChute is closer to a **live work surface**. Its objects can be real PDFs, playable media, local image folders, text, and webpages rather than only screenshots or links to those things.

# Why not just use a video editor?

A video editor is built around importing media, editing it, and producing a finished video.

FrameChute is built around keeping the objects live.

You can still read the PDF, change the note, browse the gallery, move the picture, play the video, and rearrange the scene.

Advanced timing borrows a few useful ideas from editing and animation software without trying to become a full production suite.

# Privacy and local files

FrameChute is local-first.

The current extension does not require a FrameChute account or a FrameChute cloud service just to use your canvas.

Files you choose remain local unless **you** deliberately send or upload them somewhere else.

Browser security still applies. Chrome may ask you to reconnect a local file or folder after permissions are lost or the extension is reloaded.

# Install

## Chrome / Chromium

The public Chrome Web Store build is the simpler FrameChute experience.

For the newest GitHub features, use the current repository version and turn on **ƒ Advanced** from the top toolbar.

When Advanced is OFF, the current GitHub build intentionally returns to the simpler Store-style interface.

## Development / current GitHub build

Clone or download this repository, then load the extension directory through your Chromium browser's **Extensions → Developer mode → Load unpacked** flow.

# The idea in one sentence

**FrameChute gives the browser a place where files, pages, notes, images, and media can stay where you put them.**
