# Flashframe Extension Architecture

Flashframe is designed to run as a Chrome/Chromium extension, not as a separate desktop application.

The browser is the host platform. Flashframe adds a full-page spatial workspace inside that host.

## Extension shape

Use Manifest V3.

The first implementation should be deliberately small:

```text
manifest.json
src/
  service-worker.js
  workspace.html
  workspace.css
  workspace.js
```

As the project grows, `workspace.js` can be split into canvas, persistence, block registry, and individual block modules. Do not introduce a build system until the code size justifies it.

## Browser entry point

The toolbar action should open or focus one full extension-owned workspace page:

```text
chrome-extension://<extension-id>/src/workspace.html
```

That page is Flashframe.

The service worker should not own workspace state. Its first responsibility is simply browser integration: opening/focusing the workspace and later handling extension-level shortcuts or messages.

## Why an extension-owned page

The workspace needs to be larger and more persistent than a popup or side panel.

A full extension page gives Flashframe:

- normal HTML/CSS/JavaScript
- browser storage
- extension APIs
- a stable origin
- a full tab for the canvas
- direct access to user-initiated web platform file pickers where supported

A side panel may later provide a small companion UI, but it is not the main workspace.

## Local files and directories

Flashframe should use the File System Access API for user-selected local content where available.

Expected flows:

- text file: `showOpenFilePicker()`
- PDF: `showOpenFilePicker()`
- local video: `showOpenFilePicker()`
- image lightbox: `showDirectoryPicker()`

These pickers must be triggered by user gestures. The extension should never attempt to silently crawl the user's filesystem.

Selected file and directory handles can be stored separately from JSON snapshot metadata using IndexedDB, because handles are structured-cloneable values while ordinary extension JSON storage is better suited to simple serialized state.

Permissions are not permanent assumptions. On restore, a handle may need permission again or may no longer resolve. Every block must have a recoverable missing-source state.

## Storage responsibilities

Use two storage classes conceptually.

### Structured workspace data

Contains things such as:

- workspace ids
- snapshot ids
- names
- timestamps
- block geometry
- block type
- block state
- references to stored handles/content

IndexedDB is suitable for the first implementation and avoids creating multiple persistence systems prematurely.

### Source handles / preserved content

Local file and directory handles should be stored in IndexedDB under stable application-generated keys.

Text snapshots are different from large media references. When a Flashframe or historical layer needs the exact old text, preserve the text itself. Text is small and is part of the state being restored.

Large videos and image directories should normally remain referenced sources rather than copied into extension storage.

## Block registry

The canvas should know blocks through a registry rather than switches scattered throughout the code.

Conceptually:

```js
registerBlockType("text", TextBlock)
registerBlockType("pdf", PdfBlock)
registerBlockType("directory-lightbox", DirectoryLightboxBlock)
registerBlockType("local-video", LocalVideoBlock)
```

Each block implementation should expose a very small lifecycle:

```text
create(source?)
mount(container)
serialize()
restore(record)
destroy()
```

The exact JavaScript shape can change. The architectural rule is what matters: the workspace owns the shell and geometry; the block owns its content behavior and serializable state.

## Generic block shell

Every block has:

```text
id
type
name
geometry
source
state
```

Geometry should include:

```text
x
y
width
height
z
```

The canvas is responsible for:

- moving
- resizing
- selection
- z-order
- temporary maximize/restore
- removal from the workspace

The block content is responsible for:

- rendering its own content
- user interaction inside the block
- serializing its minimal restorable state
- applying restored state

## Text block

Text is the most important early block for the intended writing/research audience.

Minimum useful state:

```text
name
text
scrollTop (or equivalent visible-position value)
cursorOffset?  // optional
```

The `text` value is preserved in the snapshot itself or through a content reference owned by the snapshot. Do not depend solely on the current contents of an external text file.

The first editor can be a plain textarea or similarly boring control. Rich editing can come later. Restoration correctness matters more than editor sophistication.

## PDF block

The first PDF contract should remain tiny:

```text
source handle
page number
```

The implementation may use the browser's PDF capabilities or a bundled viewer later. The architectural promise is only that Flashframe can reopen the same PDF block on the remembered page.

Do not make zoom, annotations, selections, and every viewer preference mandatory before page restoration works.

## Directory lightbox block

The source is a user-selected directory handle.

The block enumerates supported image entries and displays one at a time.

Minimum state:

```text
current image identity/name
```

The block should navigate previous/next without leaving the workspace.

Do not eagerly decode an entire large directory. Enumerate names/handles and load the current image plus a small nearby cache.

## Local video block

The source is a user-selected local video handle.

Minimum state:

```text
currentTime
```

The first implementation may also preserve paused/playing state, volume, muted state, and playback rate, but timestamp restoration is the defining behavior.

## Save/restore flow

Saving a Flashframe:

1. Ask the workspace for its block list.
2. Ask each block for its serializable record.
3. Combine each record with current geometry and name.
4. Save one immutable snapshot record.

Restoring:

1. Load the snapshot.
2. Recreate the workspace shell.
3. Recreate every block shell at its saved geometry.
4. Resolve each block source.
5. Ask the block implementation to restore its saved state.
6. Leave unresolved blocks visible as relinkable placeholders.

A failure in one block must not abort the whole restore.

## Memorew boundary

Memorew should consume the same serialization contract rather than adding special hooks to every block.

If Flashframe can serialize and restore a block correctly, Memorew can record that state at a time and later hand it back to Flashframe.

This is the desired dependency direction:

```text
Chrome / Chromium
      ↓
Flashframe extension
      ↓
Block contract + workspace persistence
      ↓
Memorew time/history layer
```

Memorew depends on Flashframe. Flashframe does not need Memorew in order to function.

## Permissions philosophy

Start with the narrowest permissions possible.

The local-first MVP should not require broad host permissions across the web. User-selected local files/directories plus extension storage are enough to prove the core product.

If future block types integrate arbitrary websites, request those permissions only when that feature exists and preferably as optional permissions.

## Non-goals for the extension foundation

Do not begin by trying to:

- embed arbitrary websites
- replace Chrome tabs
- inspect all local files automatically
- create a native filesystem daemon
- capture RAM/application process state
- preserve enormous video files inside every snapshot
- build a general desktop environment

The first job is much smaller: make a Chrome/Chromium workspace whose few supported block types return to the same useful state.