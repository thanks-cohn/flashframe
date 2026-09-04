# Codex Request: Portable `.fcx` Snapshot Export / Import

## Mission

Implement the first version of Framechute's **portable workspace snapshot** format, using the extension:

```text
.fcx
```

This is **not** merely another copy of the current saved-state system.

The goal of `.fcx` is:

> A user should be able to capture the current Framechute workspace, download it, close Framechute, later reopen/import that `.fcx`, and recover the workspace as nearly as possible exactly as it was when they left.

The experience should feel less like "open these files again" and more like:

> "Return me to the moment I captured."

This is the foundation for future Framechute support for richer PDFs, DOCX, PPTX, HTML/CSS/JS workspaces, presentations, 3D scenes, logic state, and other object types. Design the format and serializer so it can grow without needing to be thrown away.

---

## Existing code to study first

Before implementing, inspect the repository carefully and understand the existing state, persistence, archive, media, gallery, synchronization, and workspace behavior.

At minimum inspect:

- `src/persistence.js`
- `src/archive.js`
- `src/file-access.js`
- `src/filechute-export.js`
- the code that currently creates/restores Framechute snapshots
- media playback/synchronization code
- gallery/current-item state
- workspace block creation and ordering
- appearance/background state
- any existing saved-state / archive UI

Do **not** create an unrelated second persistence architecture if the current state serializers can be extended cleanly.

The current system already stores browser-side snapshots and optional archive files. Preserve that behavior unless a change is needed for compatibility. `.fcx` is a new portable/exportable layer on top of the workspace model.

There are still some historical `flashframe` names/constants in the persistence/archive code. Do not perform a broad unrelated rename as part of this task unless a rename is required for the feature. Keep scope disciplined.

---

# Product distinction

Framechute should have two different concepts.

## Existing saved state

The existing saved state is primarily local/browser recovery and may depend on handles, prior permissions, URLs, or files still existing in their previous locations.

That is useful and should remain useful.

## `.fcx` portable snapshot

An `.fcx` file is intended to be **carried elsewhere** and reopened.

It should contain enough state to reconstruct the workspace and, when the user requests it, enough source assets that local media does not need to be reconnected manually.

The guiding principle is:

> If Framechute knows something material about the current workspace, and that state can reasonably be serialized, `.fcx` should preserve it.

---

# Core user experience

Add an obvious export action for a portable Framechute state. Naming may follow the existing UI conventions, but the user-facing concept should be approximately:

```text
Download State
```

or

```text
Export Snapshot
```

The downloaded filename should end in:

```text
.fcx
```

Example:

```text
my-workspace.fcx
```

When exporting, Framechute should ask whether the user wants to **include local media/files in the snapshot**.

The wording can be polished to fit the existing UI, but the decision must be clear. Conceptually:

```text
Include local media and files?

Recommended if you want this snapshot to reopen without reconnecting the original files.

[ Include Files ] [ State Only ]
```

The point is not merely file size. The user needs to understand the consequence:

- **Include Files** = larger `.fcx`, but substantially more portable and reliable.
- **State Only** = smaller `.fcx`, but local files may have to be reconnected if their previous source is unavailable.

Do not silently embed potentially huge local media without asking.

Do not silently discard local media dependencies without warning either.

---

# `.fcx` container

For v1, `.fcx` may be a ZIP-compatible archive with a custom extension.

Keep the internal layout simple, explicit, versioned, and extensible.

Recommended conceptual layout:

```text
workspace.fcx
├── manifest.json
├── state.json
├── assets/
│   ├── ...embedded local images/media/files...
├── previews/
│   └── ...optional future/precomputed previews...
└── metadata/
    └── ...reserved for future use if needed...
```

Do not create empty directories purely for aesthetics if the chosen archive library does not require them.

At minimum, `manifest.json` should identify the file unmistakably and version it.

Example shape:

```json
{
  "format": "framechute-fcx",
  "version": 1,
  "createdAt": "...",
  "app": "Framechute",
  "assetMode": "embedded"
}
```

Exact field names may change if the repository already has conventions worth following.

The important properties are:

- explicit format marker
- explicit schema/version number
- timestamp
- enough metadata to reject corrupt/unsupported files gracefully
- ability to evolve to v2+ later

`state.json` contains the serialized Framechute workspace state.

Do not encode large binary assets as giant base64 strings inside the JSON when the archive can store them as binary entries.

---

# Snapshot fidelity goal

The target is **deterministic best-effort restoration**.

We cannot promise impossible things such as restoring a deleted remote resource, a live stream's historical content, browser-owned permission state, or a website that has changed on the network.

But for state Framechute controls, restoration should be intentionally thorough.

The user should perceive:

> "Everything is where I left it."

Do not implement only block positions and call the task complete.

---

# State to preserve

First inspect what the application currently represents. Reuse existing snapshot fields wherever possible.

At minimum preserve every currently supported state that materially affects the user's workspace.

## Workspace / blocks

Preserve, where applicable:

- block identity
- block type
- block name/title
- block order / z-order
- geometry
- width / height
- x/y position
- transforms
- visibility
- active/selected item if the application currently tracks this safely
- workspace scroll/pan position when meaningful
- workspace zoom when meaningful
- current layout mode
- relevant per-block UI state

If some of these do not exist in the current application, do not invent a giant unrelated UI system. The requirement is to preserve what Framechute already knows and design the schema so richer state can be added later.

## Appearance

Preserve existing appearance/background settings, including background image behavior already handled by the archive code.

If a background image is local and the user selected **Include Files**, embed it in `.fcx` just like other required local assets rather than creating a one-off special case.

## Images

Preserve the source plus any state Framechute already maintains, such as:

- dimensions
- fit mode
- crop/position state
- transforms
- current gallery relationship if applicable
- display state

## Video

For each video preserve, where the application supports it:

- source identity/reference
- `currentTime`
- paused/playing intention
- playback rate
- volume
- mute state
- loop state
- loop boundaries if Framechute supports custom loop ranges
- transforms/layout
- synchronization membership
- synchronization offsets/relationships

## Audio

Likewise preserve:

- source
- `currentTime`
- paused/playing intention
- playback rate
- volume
- mute
- loop state/range if supported
- synchronization membership and offsets

## Gallery/navigation state

Preserve meaningful navigation state such as:

- currently selected/current gallery item
- gallery ordering
- current index
- whatever existing state is needed so a restored gallery does not arbitrarily return to item zero

## Future-compatible state

Do not hard-code the architecture such that only `image`, `video`, and `audio` can ever be serialized.

A future Framechute object should be able to provide its own serializable state.

The long-term conceptual contract is approximately:

```text
serialize()
restore(state)
```

Media may also have richer state contracts, but do not over-engineer a formal plugin framework if a clean v1 registry/serializer structure is sufficient.

---

# Media synchronization is critical

This is one of the most important requirements.

If several media elements are synchronized together, `.fcx` must preserve **the relationship**, not merely save independent timestamps.

Example conceptual state:

```json
{
  "syncGroups": [
    {
      "id": "sync-1",
      "masterTime": 83.426,
      "playing": true,
      "playbackRate": 1,
      "members": [
        { "id": "video-a", "offset": 0 },
        { "id": "video-b", "offset": -4.231 },
        { "id": "audio-a", "offset": 12.44 }
      ]
    }
  ]
}
```

This is illustrative, not a mandatory schema. Use the actual synchronization model in the repo if one already exists.

If media are **not** synchronized, preserve their independent states independently.

The importer must therefore know the difference between:

```text
video A + video B + audio A = one synchronized group
```

and

```text
video C = independent
video D = independent
```

Do not infer synchronization from similar timestamps during restore. Save explicit membership/relationships.

---

# Restore sequencing

Restoration order matters.

Do not reconstruct the DOM and immediately call `play()` on each media element as it is created.

Prefer a staged restore approximately like:

```text
1. Validate .fcx manifest/version
2. Read state
3. Recreate workspace structure/objects
4. Resolve embedded and external asset sources
5. Load media metadata/resources
6. Restore geometry and non-time state
7. Recreate synchronization groups
8. Pause all media while seeking
9. Seek each media item to its required time
10. Wait until media are sufficiently ready/seeked
11. Restore loops/rates/volume/mute
12. Restore selected/current/gallery/workspace UI state
13. Mark restoration ready
14. Resume media that were previously playing when browser policy allows
```

Browser autoplay policy may prevent automatic playback of audible media after import.

Handle this gracefully.

If playback was active in the snapshot but the browser requires a gesture, fully restore the workspace and show a clear one-click action such as:

```text
Resume Snapshot
```

That one user gesture should resume the appropriate media groups/independent media as coherently as possible.

Do not report restoration as failed merely because autoplay was blocked.

---

# Embedded asset handling

When the user chooses **Include Files**, embed local resources required for the workspace whenever Framechute can access their bytes.

Examples include:

- images
- video
- audio
- PDFs or other local files already represented by Framechute now or later
- background images

The exported state should reference assets by stable IDs or relative archive paths, not the user's absolute filesystem path.

Example concept:

```json
{
  "assetId": "asset-123",
  "path": "assets/asset-123.mp4",
  "originalName": "movie.mp4",
  "mimeType": "video/mp4"
}
```

Avoid filename collisions. Two different source files may both be named `image.png`.

Use generated IDs, hashes, safe unique names, or another collision-safe strategy.

If the same underlying local asset is used in multiple blocks, avoid embedding needless duplicate copies when practical. A simple asset table/deduplication map is preferred.

Do not make deduplication so complicated that it blocks v1.

---

# State-only asset handling

When the user chooses **State Only**, preserve the best available source reference.

Possible source categories may include:

- HTTP(S) URL
- extension/object URL that cannot survive a restart
- browser `File`/Blob-backed resource
- File System Access handle/reference
- other current Framechute source types

Be honest about portability.

For references that are known not to survive the browser session, record enough metadata to detect the missing asset and ask for reconnection rather than silently rendering a broken block.

A missing-asset record should retain useful identity information such as original filename, MIME type, size if known, and a stable Framechute asset ID.

A future reconnect flow should be able to relink one source to every block that uses the same asset ID.

For v1, implement the cleanest reconnect behavior reasonable within scope, but at minimum fail visibly and recoverably rather than deleting affected blocks.

---

# Import / opening `.fcx`

Users must be able to restore an exported `.fcx`.

Support the most natural integration with current Framechute file handling. Ideally `.fcx` can be opened through the existing file picker and/or dropped into Framechute.

On import:

- recognize `.fcx`
- validate `manifest.json`
- reject malformed archives safely
- reject unsupported future major versions with a clear message
- do not execute arbitrary JavaScript found inside the archive
- do not trust archive paths blindly
- protect against archive path traversal (`../` etc.)
- reconstruct embedded files as safe Blob/File/object URLs as appropriate
- track/revoke object URLs when the restored workspace is disposed/replaced

An `.fcx` file is data, not executable code.

This becomes especially important later when `.fcx` may contain HTML/CSS/JS source files for editing. Opening a project must not mean automatically executing untrusted code with extension privileges.

---

# Security / robustness

Treat `.fcx` as an untrusted archive.

At minimum:

- validate JSON shape before trusting it
- cap or sanity-check unreasonable sizes/counts where appropriate
- do not allow archive filenames to escape their logical root
- do not dynamically execute strings from the archive
- gracefully handle corrupt/missing entries
- make partial restoration understandable instead of crashing the whole app
- keep local file permissions explicit

If a ZIP library is needed, prefer a small, browser-compatible, actively maintained solution suitable for the extension's architecture. First check whether an archive/ZIP dependency already exists in the repo before adding another one.

Do not introduce a server dependency. `.fcx` export/import should work locally in the browser/extension.

---

# Performance

Media can be large.

Do not unnecessarily convert hundreds of megabytes of media to base64 strings.

Prefer binary Blob/ArrayBuffer/archive APIs.

Avoid holding multiple redundant full copies of large assets in memory when the chosen implementation can stream or reuse buffers.

If the browser/selected archive library makes true streaming impractical in v1, keep the implementation simple but add clear size handling and do not freeze/crash silently on oversized exports.

A future streaming implementation should remain possible.

---

# User-visible progress and errors

Large exports/imports may take noticeable time.

Use the project's existing UI patterns to communicate:

- preparing state
- collecting assets
- packaging `.fcx`
- opening `.fcx`
- restoring assets/media
- missing resources
- corrupt/unsupported state

Do not add a giant new modal framework solely for this task.

The normal small-workspace case should still feel almost instantaneous.

---

# Filename behavior

Default exported name should be human-friendly and collision-safe.

Examples:

```text
framechute-2026-09-04-0107.fcx
```

or, when a workspace name exists:

```text
my-project.fcx
```

Use existing filename sanitization helpers where possible.

---

# Backward and forward compatibility

Version the `.fcx` format from day one.

For v1:

```text
format = framechute-fcx
version = 1
```

or an equivalent clean schema.

Keep import logic isolated enough that migrations can later support:

```text
v1 -> current
v2 -> current
```

Do not bind the format directly to incidental DOM structure such as arbitrary CSS selectors if a semantic representation is available.

DOM can change. Saved projects should survive UI refactors whenever practical.

---

# Architectural direction

The serializer should evolve toward a model in which every meaningful Framechute object can describe the state necessary to reconstruct itself.

Do not force all future state into one enormous monolithic function full of type-specific conditionals if the code can reasonably be structured around serializers/adapters.

A modest v1 registry is enough. For example, conceptually:

```text
serializers = {
  image,
  video,
  audio,
  ...future object types
}
```

But use whatever style best matches the repository.

The requirement is extensibility, not a specific design pattern.

Future `.fcx` state may need to preserve:

- PDF page/edit state
- DOCX document state
- PPTX slide state
- text/font state
- HTML/CSS/JS source files
- presentation state
- web components
- 3D objects
- visual logic
- runtime/game variables

Do not implement those features now.

Simply avoid designing v1 so narrowly that adding them requires replacing the format.

---

# Scope for this request

Focus on **portable `.fcx` snapshot export/import**.

Do not use this request as permission to rewrite all of Framechute.

Do not implement DOCX/PPTX support in this change.

Do not implement the proposed PDF editor in this change.

Do not implement website export, Three.js, or game logic in this change.

They are future consumers of the project/snapshot format.

---

# Minimum acceptance criteria

The implementation is not complete until the following scenario works:

1. Open Framechute.
2. Add multiple media items.
3. Arrange them in clearly different positions/sizes.
4. Put at least two media elements at different timestamps.
5. Create/use a synchronization relationship if the current app supports sync grouping.
6. Leave at least one other media element independent.
7. Change playback state, volume/rate/loop settings where supported.
8. Navigate a gallery away from its first item if applicable.
9. Export `.fcx` with **Include Files**.
10. Close/reset the workspace enough that the original in-memory state is gone.
11. Import the `.fcx`.
12. Confirm the workspace layout returns.
13. Confirm media sources return without manually reconnecting embedded files.
14. Confirm individual timestamps return.
15. Confirm synchronization group membership/offsets return rather than merely similar timestamps.
16. Confirm independent media remain independent.
17. Confirm gallery/current-item state returns.
18. Confirm playback intention is restored, with a one-click resume path if autoplay policy blocks actual playback.

Also test **State Only** export:

- export should be substantially smaller when local media are omitted
- reopening should restore all state it can
- unavailable local sources should produce a clear reconnect/missing-asset state instead of disappearing or crashing

---

# Tests

Add automated tests where the repository's current test setup makes that reasonable.

At minimum, separate pure functions for manifest/schema validation, serialization normalization, asset mapping, or archive path validation should be testable without a full browser UI.

If the repository lacks appropriate automated infrastructure for a behavior, provide a concise manual test checklist in the implementation notes rather than introducing an enormous test framework solely for this feature.

Important cases:

- valid v1 `.fcx`
- malformed manifest
- unsupported future version
- corrupt `state.json`
- duplicate original filenames
- embedded asset missing from archive
- state-only missing local asset
- synchronized vs independent media
- paused vs playing media
- object URL cleanup
- empty workspace
- workspace with no local assets
- moderately large local media

---

# Preserve existing behavior

Do not break:

- current local snapshot persistence
- current archive folder functionality
- drag/drop media behavior
- existing FileChute bridge behavior
- current appearance/background handling
- existing synchronization behavior
- existing extension startup/session recovery

Where `.fcx` functionality can reuse those systems, reuse them.

If current serialization is insufficient for exact restoration, extend it in a backward-compatible way when practical.

---

# Implementation quality

Please implement the feature, not merely write a proposal.

Before editing:

1. inspect the current architecture
2. identify the actual snapshot creation/restoration paths
3. identify current media sync representation
4. identify existing file picker/drop routing
5. identify current dependencies/build constraints

Then make the smallest coherent architectural changes that provide a robust v1 foundation.

Keep functions reasonably focused.

Comment non-obvious format/security/restore-order decisions, not every line.

Avoid speculative abstraction that has no current consumer.

---

# Final report

When finished, report:

1. files changed
2. the `.fcx` internal format actually implemented
3. how **Include Files** vs **State Only** works
4. exactly which workspace/media state is currently preserved
5. how synchronized media is represented/restored
6. how autoplay blocking is handled
7. known restoration limitations
8. manual/automated tests performed
9. any dependencies added and why
10. sensible next follow-up work

The north star is simple:

> Download the state. Open it later. Framechute should feel as though the user never left.
