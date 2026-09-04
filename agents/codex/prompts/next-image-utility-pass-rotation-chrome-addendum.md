# ADDENDUM — Rotated image chrome and object-menu placement

This addendum is part of the next FrameChute utility pass. Read it together with:

`agents/codex/prompts/next-image-utility-pass-draft.md`

Do not treat this as a separate architecture. Extend the existing object transform, selection, resize, frameless, menu, and persistence systems.

---

## Rotated image selection outline must follow the transformed image

Current bug: after an image is rotated, the visible blue selection outline can remain in the old axis-aligned orientation, making it look as if the image rotated inside an unrotated box.

Required behavior:

- when an image rotates, the visible selection/focus outline must rotate with the image and visually match the transformed image bounds
- for a simple rotated rectangle, the outline should be the same rotated rectangle, not an axis-aligned bounding box pretending to be the object
- selection chrome, resize affordances, and hit targets should correspond to the transformed object geometry so the user is never shown one shape while interacting with another
- preserve the image's actual aspect ratio and transformed shape
- do not solve this by drawing a larger rectangular outline around the rotated result
- the fix should be compatible with the upcoming Warp model: once an image becomes a quadrilateral or warped surface, selection chrome should be architected so it can follow transformed corners/bounds rather than reverting to stale pre-transform geometry

The mental model is simple:

> **The blue outline belongs to the image as it exists now, not to the rectangle it used to occupy.**

Acceptance example:

`open image → select it → rotate 30° → blue outline rotates 30° with the image → resize/selection affordances remain coherent with the rotated object`

---

## Object menu control belongs at the visual top-left, but stays upright

The object-menu control should look intentionally placed rather than appearing to have been transformed accidentally with the image.

Required behavior:

- keep the menu control aesthetically anchored at the **visual top-left of the transformed object**
- after rotation, recompute/track the transformed object's visual top-left so the button remains attached to the object in a deliberate-looking position
- preserve a small, consistent screen-space inset from the object boundary so it does not sit awkwardly on top of the image content
- the menu control itself must remain upright and readable in screen space
- rotating the image must not rotate the menu icon/button
- flipping or mirroring the image must not mirror/flip the menu icon/button
- later warp/perspective transforms must likewise move the menu anchor with the visible object while leaving the control itself upright
- keep its hit target reliable and accessible
- do not let the menu button drift to the old unrotated top-left corner

In other words:

```text
image rotates / flips / warps
        ↓
menu anchor follows the transformed object
        ↓
menu button itself stays upright and unflipped
```

The result should look as though the top-left menu placement was designed for transformed objects from the start.

Acceptance examples:

`rotate image → menu moves to the transformed visual top-left → icon stays upright`

`flip image horizontally → image flips → menu icon does NOT mirror`

`rotate + flip → outline follows transformed image → menu remains upright at the visual top-left`

---

## Relationship to frameless / shrink-to-fit behavior

Keep the existing current-pass rule that removing the frame should recompute visible image bounds, remove stale empty framing space, and shrink-to-fit when needed.

After frame removal, rotation, or later warp, object chrome should be positioned from the **current visible/transformed geometry**, not stale pre-transform box dimensions.

---

## Architecture requirement

Do not create a second transform system just for selection chrome.

Prefer one shared source of truth for:

- object transform geometry
- transformed corners/bounds
- selection outline
- resize affordance placement
- object-menu anchor placement
- later warp control-point geometry

Object content may rotate/flip/warp. UI chrome can remain screen-upright while its anchor points follow the transformed object.

Add focused tests where practical for rotated outline geometry and screen-upright menu placement, and include these cases in the normal browser/manual acceptance pass.
