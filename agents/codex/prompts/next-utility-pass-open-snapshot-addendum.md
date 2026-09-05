# ADDENDUM — One-click Open Snapshot (.fcx)

Read this together with:

- `agents/codex/prompts/next-utility-pass-after-pr39.md`
- `agents/codex/prompts/next-utility-pass-context-menu-scroll-addendum.md`

The underlying `.fcx` import/restore machinery already exists. Do not rebuild the snapshot format or create a second importer. This is primarily a **discoverability + one-click workflow** requirement around the existing `importFcx()` / restore path.

---

## Product rule

A user who exported a FrameChute snapshot should be able to come back later and simply **open that snapshot**.

The normal user-facing mental model is:

```text
Open Snapshot
    ↓
choose .fcx
    ↓
FrameChute validates it
    ↓
workspace is restored
```

No separate import step, no second restore command, and no technical knowledge about `.fcx` internals should be required.

> **Export Snapshot creates it. Open Snapshot brings it back.**

---

## Required UI behavior

- rename the visible toolbar action from technical **Open .fcx** wording to plain **Open Snapshot**
- keep `.fcx` as the underlying file extension and file-picker filter
- clicking **Open Snapshot** opens a single-file picker for `.fcx`
- after the user chooses a valid snapshot, restore the workspace immediately through the existing `importFcx()` / `framechute:restore-workspace` path
- do not require the user to click the separate historical `Restore` workspace/session control afterward
- show concise progress/status while validating and restoring
- on success, the workspace should appear as it was captured: objects, positions, dimensions, document state, supported generated assets, appearance, timing, etc. according to the existing FCX contract
- if previously playing media is intentionally staged paused for browser autoplay safety, the existing **Resume Snapshot** behavior may remain; that is distinct from restoring the workspace itself

---

## General Open File routing

The ordinary FrameChute **Open File…** path should also recognize `.fcx` as a FrameChute snapshot.

When a user chooses a `.fcx` file through the general file picker:

```text
Open File… → choose project.fcx → Open Snapshot path
```

Do **not** create a generic file object for the `.fcx`.

Route it into the existing snapshot importer/restorer exactly once.

This should follow the shared ingestion principle already used elsewhere:

> detect the file type → send it to the correct existing handler

---

## Drag/drop behavior

The current FCX code already intercepts dropped `.fcx` files before generic ingestion. Preserve and polish that behavior.

Desired behavior:

```text
drag project.fcx into FrameChute
        ↓
recognize snapshot
        ↓
restore workspace
```

- no generic `.fcx` file block
- no duplicate ingestion
- no unnecessary intermediate dialog
- if the global drop overlay has format-specific copy, it should say something understandable such as **Open FrameChute Snapshot** rather than implying the file will merely be added as an object

---

## Current workspace safety without workflow clutter

Do not introduce a long wizard before opening.

If replacing the current workspace needs protection, prefer the least intrusive safe mechanism already available, such as a lightweight local recovery checkpoint before restore. If the current architecture requires a warning for genuinely unsaved work, keep it to one concise confirmation rather than multiple steps.

The intended ordinary experience remains:

`Open Snapshot → choose file → restored`

---

## Error handling

- invalid/corrupt `.fcx` → clear error, current workspace remains intact where technically possible
- unsupported future FCX version → explain that the snapshot version is unsupported rather than importing partial garbage
- state-only snapshot with missing local sources → restore everything possible and use the existing reconnect placeholders/status; do not fail the entire snapshot merely because some original local files are unavailable
- embedded portable snapshot → restore embedded assets through the existing materialization path

---

## Naming consistency

Prefer these visible labels:

- **Export Snapshot**
- **Open Snapshot**
- **Resume Snapshot** (only when relevant)

Avoid making the user reason about “export/import” terminology for the basic round-trip.

---

## Acceptance workflows

1. `Export Snapshot → close/reload FrameChute → Open Snapshot → choose exported .fcx → workspace restores without any second Restore action.`

2. `Open File… → choose .fcx → same snapshot restore path → no generic file object appears.`

3. `Drag .fcx onto workspace → snapshot restores → no duplicate generic file block.`

4. `Open state-only .fcx with unavailable source file → workspace restores with honest reconnect placeholder rather than failing wholesale.`

5. `Open corrupt/non-FCX file renamed .fcx → clear error → existing workspace is not silently destroyed.`

---

## Architecture requirement

Reuse the existing FCX implementation in `src/fcx-portable.js`, including the existing validation, asset materialization, source rewriting, staged playback, and `framechute:restore-workspace` event.

This task is not a new snapshot system. It is making the existing system feel like the obvious reversible pair it should be:

```text
Export Snapshot ↔ Open Snapshot
```

Add focused tests where practical for `.fcx` routing through Open File and for ensuring a selected/dropped snapshot takes the importer path exactly once.
