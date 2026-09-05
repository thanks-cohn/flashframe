# ADDENDUM — Image Edit mode must be an explicit ON / OFF toggle

Read this together with the current FrameChute utility/image-editing prompts.

## Problem

Once an image enters editing mode, the user currently has no obvious way to leave that editing state for that image. That makes a temporary editing action feel permanent and traps the object in the wrong interaction mode.

## Product rule

> **Editing is a mode, not a one-way transition.**

Every image must have an obvious, reversible edit-state control.

## Required Quick Actions behavior

In the Quick Actions panel, expose an explicit per-image switch near the top, conceptually:

`Image Editing   [ ON / OFF ]`

or equivalent clear wording.

When switched **ON** for the selected image:

- enter the existing image-editing / paint-edit state
- show the editing controls that already belong to that mode
- preserve current image content and nondestructive editing state
- do not create a duplicate image object just to edit it

When switched **OFF**:

- exit image-editing interaction mode immediately for that image
- hide/deactivate edit-only controls and handles for that object
- return the image to normal FrameChute direct manipulation: select, move, resize, right-click, etc.
- preserve all edits already made; OFF means leave editing mode, not undo or discard work
- do not require Save As, reload, deselection, or reopening the object just to leave edit mode

## Per-image state

This is a per-object editing state, not a global application preference.

Example:

- Image A editing ON
- Image B editing OFF

Selecting Image B should not force it into edit mode merely because Image A is being edited.

If multiple selected images are supported later, use a clear mixed-state model rather than silently enabling editing for all of them.

## State transition rules

- clicking the existing Edit command should map into the same edit-mode state machine rather than opening a second parallel editing path
- entering edit mode twice must not stack duplicate toolbars/listeners/overlays
- leaving edit mode must reliably tear down temporary edit interaction state/listeners while preserving the underlying edit data
- switching selection away from an editing image must not corrupt its data
- reopening that image should accurately reflect whether edit mode is currently ON or OFF according to the intended session behavior
- FCX should preserve the actual image edits; whether transient UI edit mode itself is persisted should follow existing workspace/session conventions, but reopening a snapshot must never trap an image in an impossible-to-exit edit state

## Right-click/object menu

If the normal object menu currently exposes `Edit`, make its meaning consistent with the toggle. Prefer one of these patterns:

- `Edit Image` when OFF / `Finish Editing` when ON
- or `Image Editing [ ON / OFF ]`

Do not expose one command in the object menu and a separate unrelated edit lifecycle in Quick Actions.

## Acceptance workflows

1. `Select image → Quick Actions → Image Editing ON → edit controls appear.`

2. `Image Editing OFF → edit controls disappear → same image can immediately be moved/resized normally → edits remain visible.`

3. `Turn editing ON → make paint/fill/etc. change → turn editing OFF → turn editing ON again → prior edit state remains intact.`

4. `Image A editing ON → select Image B → Image B remains normal unless explicitly switched ON.`

5. Repeated ON/OFF cycles do not duplicate toolbars, listeners, overlays, or mutate the image unexpectedly.

Reuse the existing image editing/paint system and Quick Actions architecture. Do not create a second image editor solely to implement the toggle.
