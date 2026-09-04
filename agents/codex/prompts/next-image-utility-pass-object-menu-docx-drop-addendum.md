# ADDENDUM — Object-menu priority and DOCX image-drop routing

Read this together with:

- `agents/codex/prompts/next-image-utility-pass-draft.md`
- `agents/codex/prompts/next-image-utility-pass-rotation-chrome-addendum.md`

Do not treat this as a separate architecture. Extend the existing object menu, document editor, workspace drop routing, ingestion, Save/Save As, and FCX systems.

---

## Close Object must be one of the first reachable object-menu actions

Current usability problem: **Close Object** / remove-close behavior can be buried far enough down a long object menu that the user has to scroll to reach one of the most basic actions.

Required behavior:

- put **Close Object** near the top of the object/right-click menu, among the first immediately visible actions
- the user should not have to scroll to close an object
- keep destructive intent clear; use the existing close/remove semantics and confirmation behavior if any
- do not duplicate two competing close/remove commands in the same menu unless they genuinely mean different things
- keyboard users should reach Close Object quickly in normal menu order
- preserve menu collision/viewport rules from the main draft

A reasonable top-level order is conceptually:

```text
Open File… / object-specific primary action
Close Object
────────────
Edit / Warp / Fit / Save / Duplicate / etc.
```

Exact ordering can adapt to the existing menu model, but **Close Object must remain immediately reachable without scrolling**.

---

## Dragging an image INTO an open DOCX should edit the document, not trigger workspace ingestion

This is possible and should become an explicit drop-routing rule.

When a DOCX object is open/editable and the user drags an image over the actual DOCX editing surface, the document editor should get first refusal on that drop.

Desired interaction:

```text
open DOCX
   ↓
drag image over DOCX page/editor
   ↓
DOCX editor recognizes internal image insertion target
   ↓
insert image into document at/near the drop position
   ↓
NO FrameChute workspace “drop here” overlay
NO duplicate FrameChute image object
NO generic copy/ingestion side effect
```

Requirements:

- define explicit nested drop-zone precedence: **document editor first, workspace second**
- when the pointer is over an eligible DOCX editing/insertion surface, suppress the global workspace drop overlay for that drag
- prevent the same handled drop event from bubbling into the generic FrameChute ingestion path
- a handled DOCX image drop must not also create a separate workspace image object
- do not intercept unrelated workspace drops; dropping the same image outside the DOCX should continue to use normal FrameChute ingestion
- preserve normal text editing and DOCX selection behavior
- support local image files first; clipboard/paste image insertion can follow the same routing principle where practical
- if insertion is unsupported for a particular DOCX state, fail honestly and let the user know rather than silently swallowing the file
- dirty the DOCX object and preserve inserted-image state through the existing DOCX Save/Save As and FCX mechanisms
- preserve original DOCX package content where practical and add the image through the existing OOXML/document serialization path rather than flattening the whole document
- do not use remote processing

### Drop routing rule

Use one explicit rule throughout the app:

> **The most specific eligible drop target wins.**

Examples:

- image over editable DOCX body → DOCX insertion
- image over a future canvas/layer target → that target handles it
- file over empty workspace → normal FrameChute ingestion

Once a nested target marks the drop as handled, the global workspace ingestion/overlay must stand down.

### Overlay behavior

The global `Drop into FrameChute` / workspace drop affordance should not cover the DOCX while the user is clearly targeting the document editor.

Where practical:

- detect eligible nested target during dragover
- hide/suppress the global overlay while over that target
- restore normal workspace drop feedback immediately when the pointer leaves the nested target

### Image placement inside DOCX

Keep the first implementation practical rather than attempting a complete Word layout engine.

For v1, acceptable behavior is:

- insert the image at the nearest supported paragraph/caret/drop position
- preserve aspect ratio
- choose a sensible initial display size that fits the document body/page width
- allow the document's existing editing model to retain/save the image

Do not promise arbitrary Word-style floating wrap modes unless the current DOCX model supports them reliably.

### Acceptance workflows

1. `Open DOCX → drag PNG onto DOCX body → global FrameChute drop overlay stays out of the way → image appears in DOCX → no second workspace image object appears → Save As DOCX → reopen → inserted image remains.`

2. `Open DOCX → drag same PNG outside DOCX onto empty workspace → normal FrameChute image ingestion occurs.`

3. `Drag across workspace toward DOCX → workspace overlay may appear initially → entering eligible DOCX editor suppresses it → leaving DOCX restores workspace drop feedback.`

4. `Handled DOCX drop fires exactly one insertion path, not document insertion + generic FrameChute copy/drop handling.`

---

## Architecture requirement

Do not add ad-hoc `stopPropagation()` calls everywhere without a coherent ownership rule.

Prefer a shared drop-routing contract such as a handled flag, nested target registry, or equivalent mechanism so future editors can participate safely.

The intended long-term model is:

```text
Drag payload
   ↓
most specific eligible target?
   ├─ yes → target handles it; workspace stands down
   └─ no  → normal FrameChute ingestion
```

Add focused tests where practical for menu ordering and nested DOCX-vs-workspace drop ownership, and include manual browser acceptance for the overlay behavior.
