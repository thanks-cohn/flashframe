# FrameChute

### Your browser has tabs. FrameChute gives it a desk, a stage, and a clock.

FrameChute is a **local-first spatial workspace and lightweight scene composer for Chrome and Chromium**.

It lets you place notes, PDFs, images, image directories, audio, video, local files, and webpages together on one freeform canvas. You can move them, resize them, layer them, hide their interface chrome, save the arrangement, restore it later, and coordinate media and timed actions from a shared master timeline.

That combination is the point.

Most browser tools remember **which things were open**.

FrameChute tries to remember **the useful moment**:

- where each object was
- how large it was
- what was above or below what
- which PDF page mattered
- which image in a directory you were viewing
- where media playback was
- which objects were grouped
- which actions happened when
- which parts of the interface you intentionally hid

**Space is state. Time is becoming state too.**

<p align="center">
  <img src="assets/images/default.png" alt="FrameChute mascot" width="180">
</p>

## In plain English: what is this?

Imagine taking the useful parts of a browser session, a visual board, a media controller, a storyboard, and a very lightweight animation timeline, then putting them on one persistent browser canvas.

That is FrameChute.

It is useful when your work makes more sense as an **arrangement** than as a list of tabs or files.

For example:

```text
research PDF        reference image
      \                 /
       \               /
        note / draft
             |
      video at 12:43
             |
       soundtrack
```

In an ordinary browser those are separate tabs, windows, players, and applications.

In FrameChute they can be one saved workspace.

And once timing is added, that same workspace can become a simple coordinated scene:

```text
0.0s   image begins moving
2.0s   second object begins
4.5s   first action ends
4.5s   chained action begins
8.0s   layer relationship changes
10.0s  sequence ends or loops
```

FrameChute is not trying to turn the browser into a heavyweight professional video editor. It is trying to make **spatial and temporal composition unusually immediate**.

There should be almost no perceptible distance between thinking:

> I want this here, that there, this video at this moment, and that object to move afterward.

and actually doing it.

## What makes FrameChute different

### 1. The arrangement itself is meaningful

Most applications save content and treat placement as decoration.

FrameChute treats placement as part of the state.

A PDF beside a note can mean something. A reference image above a paragraph can mean something. Three videos positioned around a diagram can mean something. You do not have to translate that relationship back into folders, tabs, page trees, or database rows.

### 2. Local files behave like workspace objects

FrameChute is designed around explicit user-selected local files rather than requiring everything to be uploaded into somebody else's cloud first.

A local image can become a spatial object. A directory can become a gallery. A local MP3 can sit beside a local MP4. A missing source can be reconnected without destroying the rest of the saved workspace.

### 3. Media is part of the composition

Audio and video are not just attachments.

FrameChute has a movable unified Media controller that can rewind, play/pause, and move eligible media forward together. Media groups allow coordinated playback while still permitting individual media to remain independent.

Individual audio/video objects can loop. The master sequence can also loop media, actions, or both.

### 4. Objects can have time

FrameChute now supports saved timed movement.

An object can begin:

- with master Play
- at an exact master time
- after another action finishes
- after another action plus an offset

That means a workspace can behave as a sequence instead of remaining a static board.

### 5. The interface can disappear without the object becoming useless

Headers, footers, controls, and frames are optional where appropriate.

Images can become nearly naked spatial objects. The resize glyph can fade or be hidden while the bottom-right resize hotspot remains functional. Directory-gallery headers and navigation arrows can independently be shown or hidden.

The goal is not minimalism for its own sake. The goal is to let the material become the interface when that is what you want.

### 6. It is browser-native and local-first

FrameChute is a Manifest V3 Chrome/Chromium extension.

The current build does not require:

- a native companion executable
- Python
- a localhost service
- native messaging
- a FrameChute account
- a developer-operated cloud backend
- broad host permissions just to function

The current manifest requests no Chrome extension API permissions and no host permissions.

## What FrameChute can hold

- **Notes and text** written directly in the workspace
- **Text files** opened into editable notes
- **PDFs** with remembered page position
- **Local images** as spatial objects
- **Image directories / galleries** with previous and next navigation
- **Local audio** including MP3 and other Chromium-playable formats
- **Local video** including MP4 and other Chromium-playable formats
- **Direct browser-playable media URLs** where supported
- **Web pages and URLs** where the destination permits embedding
- **Generic local sources** with reconnect behavior

## Spatial controls

FrameChute objects can be:

- moved
- resized
- named
- maximized
- layered
- brought to the front
- sent to the back
- saved and restored

Images can also be switched into an image-only / frameless presentation.

For frameless images, the lower-right corner remains a working resize hotspot even when the visible resize mark is faded or hidden.

## Directory lightboxes and galleries

An image directory can stay a single object instead of exploding into dozens or hundreds of tabs.

Directory galleries support:

- previous image
- next image
- remembered gallery position
- source reconnection
- optional header
- optional footer/navigation arrows
- maximized lightbox-style viewing

The controls are intentionally reversible. Someone who wants only the image can hide the chrome. Someone who likes the arrows can keep them.

## Timed movement

FrameChute currently supports timed object movement with:

- Start point
- End point
- Curve/control point
- straight or curved path
- delay
- duration
- optional visible path
- preview
- edit
- return to start
- remove action

Timed actions are saved with the workspace.

### Master scheduling

Actions can use the shared master clock.

A movement may be scheduled:

```text
With Play
At 4.0 seconds
After Action B
After Action B + 1.5 seconds
```

This is deliberately more important than the movement effect itself.

The scheduling model is the foundation for future action types.

## Layer timing

Layering can also change over time.

An object can be told to remain above or below another object during a time range. FrameChute restores the baseline stacking order when the timed relationship ends and rejects contradictory layer cycles rather than silently creating nonsense.

Layer rules can follow the master clock or, where appropriate, an object's own action clock.

## Master sequence and LOOP

FrameChute has a master transport with:

- Play / Pause
- total rewind
- step backward
- step forward
- configurable step size
- visible master clock
- sequence duration

The top LOOP control has three useful states:

- **Loop actions**
- **Loop media**
- **Loop everything**

The button summarizes the result:

- **green** means actions and media are both looping
- **yellow** means only one category is looping
- **bright red with crossed-out LOOP** means looping is off

Timed-action looping uses the coordinated action plan. The action loop can restart when the final scheduled action finishes rather than requiring every action to have the same length.

Individual audio/video objects can still have their own local loop setting from the object controls or right-click menu.

## Media groups today

FrameChute can coordinate eligible audio and video through the floating Media controller.

Media can be grouped or made independent. Rewind and forward operations move participating media by the same delta rather than arbitrarily flattening every item to the same timestamp.

This matters because synchronization often means:

```text
Video A = 0:23
Video B = 0:12
Video C = 12:23
```

representing one conceptual moment, not all three files literally reading `0:23`.

A more explicit persistent offset-based SYNC/UNSYNC system is part of the roadmap below.

## Save the useful state

A saved FrameChute can preserve details such as:

- object position and size
- stacking order
- object names
- note contents
- PDF page
- gallery position
- media timestamps and playback state
- loop choices
- media grouping state
- frameless state
- header/footer visibility
- timed movement
- timed layer rules
- workspace appearance
- background configuration

The goal is not to snapshot RAM.

The goal is to recreate the useful arrangement.

## FrameChute + Chute

FrameChute works especially well with [Chute](https://github.com/thanks-cohn/chute), the local cross-browser basket for files, images, links, and text.

**Chute catches things. FrameChute arranges them.**

```text
webpage / file / image
        ↓
      Chute
        ↓
    FrameChute
        ↓
place · resize · layer · time · save
```

The projects remain useful independently. Together they shorten the path from finding something to giving it a persistent place.

### [Get Chute](https://github.com/thanks-cohn/chute)

## What does FrameChute compete with?

FrameChute crosses several categories, so there is no single exact competitor.

It competes for **parts of workflows** that are currently spread across different tools.

| Category | Examples | What those tools are usually good at | What FrameChute offers instead |
| --- | --- | --- | --- |
| Browser tabs and session managers | browser tab groups, saved sessions | remembering pages and windows | remembers a spatial working arrangement containing local files, media, notes and pages |
| Visual boards / whiteboards | Miro, Milanote and similar tools | arranging ideas visually and collaborating | local-file-first objects, real media playback, browser-native persistence and timed behavior |
| Note/workspace tools | Notion and similar document/database workspaces | structured notes, documents and databases | free spatial placement with less obligation to fit information into a hierarchy |
| Storyboards / presentation canvases | slide and storyboard tools | ordered presentation frames | one continuous spatial canvas whose objects can also gain timed actions |
| Media players | desktop/browser media players | playing one or several media files | media exists beside the documents, images and notes it relates to, with shared transport and looping |
| Video / motion editors | NLEs and motion-graphics software | deep editing, compositing, effects and final rendering | dramatically lighter setup for arranging live browser objects and simple timed behavior |

FrameChute is **not claiming to replace all of those applications**.

A professional editor should beat FrameChute at professional editing. A database workspace should beat FrameChute at databases. A collaborative whiteboard should beat it at large-team whiteboarding.

FrameChute's advantage is the unusual overlap:

**local files + spatial arrangement + persistent browser state + live media + increasingly programmable time.**

You can get pieces of that elsewhere. FrameChute is trying to make the combination feel native.

## Why not just use tabs?

Because tabs preserve membership, not meaning.

A row of twelve tabs tells you that twelve things exist.

It does not naturally preserve:

- this PDF belongs beside this note
- this image is the visual reference for that paragraph
- these three videos form one comparison
- this soundtrack belongs to this scene
- this object should move after that one
- this layer should rise only during this interval

FrameChute makes those relationships visible.

## Why not just use a whiteboard?

A whiteboard is excellent for cards, sketches, diagrams, and collaboration.

FrameChute is intentionally closer to a **live browser work surface**. Its objects can be actual PDFs, playable media, directories, local files, and browser content rather than screenshots or references to them.

And the timing system is pushing the canvas toward something a conventional whiteboard normally is not: a spatial composition that can **run**.

## Why not just use a video editor?

A video editor is designed around creating a rendered audiovisual output.

FrameChute is designed around keeping objects live.

You should be able to move a real image, interact with a real PDF, browse a real image directory, play a real video, edit a note, and then coordinate some of those things in time without first importing an entire project into a production pipeline.

The tradeoff is deliberate. FrameChute is lighter, more immediate, and less powerful than a professional NLE.

## Roadmap: from spatial workspace to programmable scene

The current timed-movement system is only the first action type.

The longer-term direction is to let FrameChute record and reproduce more changes to an object over time while keeping them inside the same master scheduling model.

### Recorded transforms

Planned / explored action types include:

- **spin / rotation**
- **flip horizontally or vertically**
- **scale / grow / shrink**
- **recorded resizing**
- **recorded movement** beyond the current path model
- **image distortion / warping** where practical in the browser
- **opacity / fade in / fade out**
- **show / disappear**
- **replace one visual with another**

The important part is not a giant menu of effects.

The important part is that a transform can be **recorded as an action**, placed on the same time system, saved, restored, rewound and looped.

### Stop points

A future **stop point** would let the master sequence pause at a defined moment.

That creates presentation-like behavior without forcing FrameChute into a slide model.

A scene could run, reach a meaningful point, stop, wait for the user, and then continue.

### Action points

A stop point may also be an **action point**.

At a point in time, FrameChute could trigger an action such as:

```text
show object
hide object
fade object
replace image
spin object
start media
change layer
run another action
```

This keeps new capabilities modular. The timeline does not need to be rewritten every time a new action type is invented.

### Persistent offset SYNC / UNSYNC

The planned synchronization model treats different media timestamps as offsets from the same master moment.

For example:

```text
SYNC moment
A = 0:23
B = 0:12
C = 12:23
```

After synchronization, moving the master transport by `+10s` would produce:

```text
A = 0:33
B = 0:22
C = 12:33
```

The relative arrangement remains intact.

That relationship should survive save/restore. **UNSYNC** should remove the relationship without jumping any media to a different position.

### Conditional actions and greater complexity

Farther down the road, the same scheduling model could support conditions without turning FrameChute into a conventional programming environment.

Examples being explored conceptually include:

```text
IF Action A completes, start Action B
IF A and B are active, trigger C
IF this condition is true, choose an action
IF the conditions are met, run this action with a probability
```

That could eventually allow surprisingly complex synthetic scenes and systems to emerge from a relatively small set of understandable rules.

This is a direction, not a promise that every conditional feature above ships in the next release.

## The architectural idea

The model is intentionally moving toward:

```text
Workspace
  ├── Objects
  │     id
  │     type
  │     source
  │     geometry
  │     visual state
  │     media state
  │
  └── Actions
        id
        target
        type
        schedule
        duration
        payload
```

An action should be able to say:

```text
WHEN: 4.0 seconds
WHAT: move
TARGET: image-7
DURATION: 2.5 seconds
```

or:

```text
WHEN: after action-12
WHAT: fade
TARGET: image-7
DURATION: 1 second
```

Then the master clock coordinates the result.

That is how FrameChute can add new effects later without building a new timing system for every effect.

## Interface philosophy

Controls should exist when useful and get out of the way when they are not.

FrameChute therefore supports things such as:

- optional block headers
- optional footers
- frameless images/video where supported
- fadeable controls
- movable Settings
- movable unified Media controller
- optional toolbar text
- compact toolbar behavior
- customizable workspace colors and imagery
- customizable Grab artwork

You can leave the full editing interface visible or reduce a workspace until it is nearly just the material itself.

## Grab things. Literally.

FrameChute includes a dedicated **Grab** affordance so moving an object does not become a fight with the controls inside it.

Grab artwork has states such as:

- Default
- Hover
- Faded
- Expanded

Those visuals can be replaced from Settings. The mechanics remain separate from the decoration.

That same principle now applies to frameless-image resizing: hiding the visual resize mark does not remove the resize hotspot.

## Local-first on purpose

FrameChute stores normal workspace state locally and does not require uploading the workspace to a FrameChute-operated service.

All executable extension JavaScript ships with the extension package.

If Chromium can render or decode a format, FrameChute can work with it where supported. If Chromium cannot decode it, FrameChute should fail clearly rather than pretend the source never existed.

A temporarily missing local file should not erase the layout around it.

## Privacy

FrameChute does not require a FrameChute account and does not upload normal workspace contents to a FrameChute-operated cloud backend.

See [PRIVACY.md](PRIVACY.md) for the current privacy policy and Chrome Web Store data-handling disclosures.

## Download

### [Download the latest FrameChute release](https://github.com/thanks-cohn/framechute/releases/latest)

### Install it

1. Open the latest release link above.
2. Download the packaged FrameChute ZIP.
3. Extract it.
4. Open `chrome://extensions`.
5. Turn on **Developer mode**.
6. Click **Load unpacked**.
7. Select the extracted FrameChute folder.
8. Open FrameChute.

No native companion. No Python runtime. No localhost daemon.

## Repository map

- `src/` contains the extension workspace and interaction code
- `assets/images/` contains mascot artwork
- `assets/grab/` contains packaged Grab states
- `scripts/` contains packaging and validation tools
- `docs/` contains architecture and implementation notes
- `bugs/` contains regression and implementation handoff notes

Build the Chrome Web Store package on Linux/macOS with:

```bash
sh scripts/package-web-store.sh
```

The release gate validates the extension and writes the Store ZIP under `dist/`.

## Historical compatibility

Some internal compatibility identifiers still use historical `flashframe.*` names so existing saved work can continue to restore correctly.

The user-facing product is **FrameChute**.

## The idea

The browser already knows how to display documents, images, audio, video, and the web.

FrameChute asks a different question:

**What if those things did not have to live in separate little application-shaped boxes?**

Put the things you need where you need them.

Move them.

Resize them.

Layer them.

Let them act.

Save the arrangement.

Come back later.

And eventually, press Play.
