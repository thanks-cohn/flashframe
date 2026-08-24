# FrameChute bug + asset handoff

## Purpose

This file is a handoff for either Codex or a future implementation pass. It documents the currently observed UI bugs and the desired packaged Grab-art asset contract **without changing the implementation yet**.

Repository: `thanks-cohn/flashframe`  
Branch inspected: `main`  
Baseline HEAD inspected: `439a761984df6ede122441af20f3b24ebe186ed3` (`Rename the extension to FrameChute`)  
Manifest version at inspection: `1.0.6`

## Guardrails

1. Fix the user-visible bugs below without changing the extension's permission model.
2. Preserve existing saved work and preferences.
3. **Do not casually rename internal compatibility identifiers** such as `flashframe.*` localStorage keys, `flashframe:*` custom events, `__FLASHFRAME_*` persistence markers, existing CSS classes, or persisted schema fields. These are internal compatibility names and changing them needs an explicit migration.
4. User-facing branding should say **FrameChute**.
5. Avoid duplicate drop handling: one drag/drop action must create exactly one block.
6. Keep user-selectable custom Grab artwork working. Packaged artwork should become the default/fallback, not remove customization.
7. Test both the normal source tree and the Chrome Web Store package output.

---

# 1. Dropping an image/video over the unified media-player controls fails

## User report

Dragging an image/video onto the area occupied by the unified media player, especially the Play button, does not drop it into the workspace as expected.

The desired behavior is spatially simple: **if the user is dragging something FrameChute accepts, dropping over the floating media player should still add it to FrameChute.** The floating player must not create a dead drop zone.

## Current implementation evidence

The rich web/image drop path in `src/web-drop.js` attaches `dragenter`, `dragover`, `dragleave`, and `drop` handlers directly to `#workspace`.

The local file/folder/video/audio/PDF/text path in `src/drop-local-sources.js` also attaches its drop handlers directly to `#workspace`.

`#video-dock` is an `<aside>` sibling of `<main id="workspace">`, not a child of it (`src/workspace.html`). Therefore a drop whose hit target is the Play button / media dock does not bubble through `#workspace` and the workspace-only handlers never receive it.

Relevant files:

- `src/web-drop.js`
- `src/drop-local-sources.js`
- `src/workspace.html`
- `src/media-dock-layout.js`
- `src/media-dock-layout.css`

## Required behavior

Supported drag payloads should remain droppable when the pointer is over the floating media player, including at minimum:

- local images
- local video
- local audio
- PDF
- text files / dropped text
- folders where the existing gallery path supports them
- image URLs / webpage URLs / URI-list / HTML image drags already supported by `web-drop.js`

Dropping over media controls should:

1. prevent the media control beneath the drop from accidentally activating;
2. create the same block that would have been created if dropped on bare workspace;
3. place the new block at the corresponding workspace coordinate, clamped using the existing placement rules;
4. create the block **once**, never once in `web-drop.js` and again in `drop-local-sources.js`;
5. leave normal click/pointer behavior of the media player unchanged when there is no drag payload.

## Recommended implementation direction

Do not solve this with broad `pointer-events: none` on the media dock; the controls must remain interactive.

Prefer a single top-level drag/drop routing layer (document/body capture is acceptable) that recognizes supported transfer payloads and forwards them into the existing drop processors using a normalized workspace point. Another acceptable design is to explicitly forward media-dock drag/drop events into a shared drop function.

The important architectural improvement is to extract the actual processing logic from the current `workspace.addEventListener("drop", ...)` callbacks so it can be called from more than one hit target without synthesizing fragile DOM events.

Be especially careful because **both** `web-drop.js` and `drop-local-sources.js` currently participate in file drops. Preserve the existing division of responsibility or replace it with one deterministic dispatcher.

## Acceptance checks

- Drag one image over the Play button and drop: exactly one image block appears.
- Drag one local video over the Play button and drop: exactly one video block appears.
- Drag a supported URL over the Play button and drop: the same URL/image behavior as bare workspace occurs.
- Drop over Rewind / Play / Forward / scope / Grab / Minimize-Hide zones: no dead areas.
- Clicking Play without a drag still plays/pauses media normally.
- Dropping over bare workspace still works.

---

# 2. Right-click popup text is black on a dark background

## User report

The right-click popup has black-on-black / very dark text. The text should be white.

## Root cause found

`src/layer-menu.js` correctly creates the context/layer menu with a dark background and explicitly declares white text:

- `.flashframe-layer-menu { background: rgba(20,22,24,.97); color: #fff; }`
- `.flashframe-layer-menu button { color: #fff; }`

However, `src/framechute-final-polish.css` later applies the generic menu text theme to the layer menu using `!important`:

```css
.floating-dock,
...
.flashframe-layer-menu,
.flashframe-layer-menu button {
  color: var(--ff-menu-text) !important;
}
```

`src/framechute-final-polish.js` defines `menuTextColor` with the default `#171717`, so the final-polish rule overrides the layer menu's intended white foreground while the layer menu keeps its dark background.

This is a real cascade/scope bug, not merely a missing declaration.

## Required fix

The right-click/layer menu should use a high-contrast white foreground on its current dark background.

Recommended choices, in preference order:

1. remove `.flashframe-layer-menu` and its buttons from the generic floating-panel `--ff-menu-text` rule; or
2. give the context menu its own semantic theme variable with a white default (for example `--ff-context-menu-text: #fff`) and make that rule authoritative.

Do not merely add another random selector unless necessary; fix the semantic role collision.

## Acceptance checks

- Right-click a block.
- Every visible menu item is white/readable on the dark popup.
- Hover/focus states remain readable.
- Changing normal floating-panel text color in Settings must not accidentally make the dark context menu unreadable.

Relevant files:

- `src/layer-menu.js`
- `src/framechute-final-polish.css`
- `src/framechute-final-polish.js`

---

# 3. Settings popup does not reliably fade even when Fade Settings is enabled

## User report

The Settings popup remains visible even though its settings say it should fade.

## Existing fade path

`src/dock-fade.js` already has the intended architecture:

- reads `flashframe.dock-fade.v1`;
- stores separate `settings` and `player` booleans;
- schedules `is-faded` for `#settings-dock` and `#video-dock`;
- uses the configured fade delay;
- reveals on pointer/focus interaction.

`src/floating.css` already has a generic `.floating-dock.is-faded` opacity rule, so Settings is nominally supported by CSS as well.

## Suspect interaction/state problems to investigate

There are at least two state paths that deserve direct reproduction instead of assuming the timer code is enough:

### A. Persistent focus can prevent fading

When the timer fires, `dock-fade.js` refuses to fade while the dock matches `:focus-within`. Clicking a checkbox/select/input in Settings can leave DOM focus inside the dock after the pointer has moved away. A newly scheduled timer can therefore repeatedly reach a state where focus keeps the Settings dock visible.

Preserve keyboard accessibility, but make sure ordinary mouse use does not leave Settings permanently exempt from fading merely because the last clicked control still owns focus.

### B. `flashframe:show-settings` explicitly removes the faded class without re-arming fade

`src/controls.js` handles `flashframe:show-settings` by doing:

```js
settingsDock.classList.remove("is-faded");
setDockCollapsed(..., false);
```

That event is used by the right-click menu's `Show Settings` action. The handler reveals Settings but does not explicitly call back into the fade scheduler. Depending on pointer/focus state, Settings can remain revealed until another event happens to re-arm it.

A robust solution should expose a small public/event-driven fade API such as “reveal and reschedule this dock” rather than having unrelated modules remove `is-faded` directly.

## Required behavior

When Fade Settings is enabled:

1. Settings is fully visible while actively being used.
2. After the configured delay and when it is no longer actively being used, the **entire Settings dock** fades.
3. Hovering or intentionally keyboard-focusing Settings restores it.
4. Moving away allows it to fade again.
5. Showing Settings from the context menu reveals it temporarily, then it participates in the normal fade cycle again.
6. When Fade Settings is disabled, it stays fully visible.

Keyboard users must not have the focused control become effectively invisible while they are actively navigating it. Fix pointer-vs-focus behavior deliberately rather than removing focus safeguards wholesale.

## Suggested test procedure

Set Fade Settings ON and delay to 1 second for testing.

Test all of these:

- enable fade, move pointer away, wait;
- click the fade checkbox itself, move pointer away, wait;
- click a select or number input, then move pointer away, wait;
- reveal Settings by right-clicking a block -> `Show Settings`, then leave it alone;
- hover a faded Settings dock and then leave it again;
- keyboard-tab into Settings and confirm active keyboard focus remains usable.

Relevant files:

- `src/dock-fade.js`
- `src/floating.css`
- `src/controls.js`
- `src/layer-menu.js`

---

# 4. Drop overlay still says “Drop into Flashframe”

## User report

While dragging an image/video toward FrameChute, the old product name **Flashframe** appears.

## Root cause found

This string is generated by CSS, not a normal DOM text node:

`src/web-drop.css`:

```css
.workspace.is-drop-target::after {
  content: "Drop into Flashframe";
  ...
}
```

The runtime renamer in `src/framechute-final-polish.js` walks visible DOM text nodes and attributes. It **cannot rewrite CSS pseudo-element `content`**, so this old name survives even though the rest of the visible DOM may be renamed at runtime.

## Required fix

Change the user-visible overlay to:

```text
Drop into FrameChute
```

Also perform a deliberate user-facing branding sweep for remaining literals that runtime DOM mutation cannot safely catch (CSS generated content, package filenames/messages, static error text displayed before/without the rename pass, etc.).

### Important migration boundary

Do **not** blindly global-replace internal strings such as:

- `flashframe.*` localStorage keys
- `flashframe:*` CustomEvent names
- `__FLASHFRAME_*` persistence markers
- persisted field names/classes that existing snapshots rely on

Those can remain legacy-compatible internal identifiers unless a migration is explicitly designed.

## Additional branding debt observed

`src/workspace.html`, `src/workspace.js`, `src/appearance.js`, package scripts, and other modules still contain many user-facing `Flashframe` literals. `framechute-final-polish.js` currently masks many of these at runtime by walking and replacing DOM text. That is useful as a compatibility safety net, but it should not be the only source of truth long term.

Preferred cleanup direction: new/visible copy should be FrameChute at source; keep the runtime rename pass temporarily as a defensive migration layer until a controlled branding sweep is complete.

---

# 5. Add packaged default Grab artwork by state under `/assets`

## User intent

The small Grab/hand artwork states should have real defaults that are easy to replace in the repository and easy to package. Desired states include Default, Hover, Expanded, etc.

The repo already models exactly four Grab states:

```js
const GRAB_STATES = ["default", "hover", "faded", "expanded"];
```

Current custom art is stored as data URLs in `flashframe.grab-art.v1`. If a state has no user image, the code eventually falls back to an inline SVG hand generated in JavaScript.

Relevant files:

- `src/theme-customization.js`
- `src/media-ux-polish.js`
- `src/media-dock-layout.js`
- `src/media-dock-layout.css`

## Desired repository contract

Create a small, obvious asset directory such as:

```text
assets/
  grab/
    default.svg
    hover.svg
    faded.svg
    expanded.svg
```

A single canonical extension is preferred for the shipped defaults because it makes the contract deterministic and avoids runtime 404 probing. SVG is a good default for small state artwork if the actual art is vector-friendly; PNG is also acceptable if that better matches the supplied artwork. Pick one canonical shipped format and document it.

The important contract is **state name = filename**. Replacing the built-in Default art should mean replacing `assets/grab/default.<canonical-extension>`, not editing JavaScript.

If arbitrary per-file extensions are considered a hard requirement later, use a tiny explicit asset manifest rather than guessing/probing multiple extensions at runtime.

## Resolution order

Grab-art source resolution should become:

1. user custom image for the exact state from `flashframe.grab-art.v1`;
2. user custom Default image when the exact custom state is absent (preserve current inheritance behavior);
3. packaged asset for the exact state (`assets/grab/<state>.*`);
4. packaged Default asset as an emergency state fallback;
5. inline/basic fallback only if packaged assets are unexpectedly missing.

This means `Clear` / `Reset all Grab artwork` should return the user to the **packaged FrameChute defaults**, not to an old inline Flashframe hand.

## State behavior to verify

- `default`: normal compact/hidden-header state and default media-dock Grab state.
- `hover`: pointer/focus interaction state.
- `faded`: delayed faded Grab state when applicable.
- `expanded`: block Grab state when headers/expanded controls are shown.

The media dock currently has its own state rendering path in `media-dock-layout.js`; ensure it uses the same resolver and does not become a second inconsistent asset system.

## Prefer one resolver

There is currently duplicate Grab-art source logic in multiple modules (`theme-customization.js`, `media-ux-polish.js`, `media-dock-layout.js`). As part of this asset work, prefer one small shared resolver/module rather than maintaining three slightly different fallback chains.

User customization should remain backward-compatible with existing `flashframe.grab-art.v1` stored data.

---

# 6. Packaging must include `/assets`

A new root-level `assets/` directory will **not currently ship** in the Chrome Web Store ZIP.

Both packaging scripts explicitly whitelist shipping roots.

`script/package-web-store.sh` currently includes:

```python
include_roots = [
    pathlib.Path("manifest.json"),
    pathlib.Path("LICENSE"),
    pathlib.Path("src"),
    pathlib.Path("icons"),
]
```

`script/package-web-store.ps1` currently uses:

```powershell
$ShipRoots = @("manifest.json", "LICENSE", "src", "icons")
```

(Actual paths are `scripts/package-web-store.sh` and `scripts/package-web-store.ps1`.)

## Required packaging change when assets are added

Add `assets` to both shipping-root lists and add release-gate checks that required state assets exist before creating the ZIP.

After packaging, verify the ZIP contains the expected paths, for example:

```text
assets/grab/default.svg
assets/grab/hover.svg
assets/grab/faded.svg
assets/grab/expanded.svg
```

Do not add new browser permissions to accomplish this. These are extension-bundled static assets and should be referenced through normal relative/module URLs or `chrome.runtime.getURL` where appropriate.

## Optional branding hygiene noticed during inspection

The Store packaging outputs/staging names and success banners still use `flashframe`/`FLASHFRAME`, for example `flashframe-chrome-web-store-v...zip`. This is not the cause of the UI bugs above, but when doing a deliberate user/developer-facing branding sweep it would be reasonable to rename release artifact labels to FrameChute while leaving internal compatibility keys untouched.

---

# Implementation order

Recommended order for the fixing agent:

1. Add focused regression tests/manual reproduction notes before refactoring.
2. Fix context-menu contrast (smallest, known root cause).
3. Fix the CSS drop-overlay brand string and sweep non-DOM-generated visible branding.
4. Fix Settings fade lifecycle with explicit reveal + reschedule semantics.
5. Refactor drop processing into a reusable/top-level router and eliminate media-dock dead zones without duplicate block creation.
6. Add packaged Grab assets and centralize state resolution.
7. Update both packaging scripts to ship and validate `/assets`.
8. Run release validation and manual Chrome unpacked-extension checks.

---

# Final acceptance checklist

- [ ] Drop an image directly over the unified Play button -> one image block is created.
- [ ] Drop a video directly over the unified Play button -> one video block is created.
- [ ] Drop supported content over every region of the floating media dock -> no dead drop zone.
- [ ] Normal media controls still click/drag correctly.
- [ ] Right-click block menu uses readable white text on the dark popup.
- [ ] Fade Settings ON + short delay -> Settings actually fades after inactivity.
- [ ] Clicking a Settings control does not accidentally make the dock permanently immune to fading during normal mouse use.
- [ ] Keyboard focus remains accessible/visible while actively navigating Settings.
- [ ] `Show Settings` from the context menu reveals it and then re-enters the fade lifecycle.
- [ ] Drop overlay says `Drop into FrameChute`.
- [ ] No new user-visible `Flashframe` branding remains in CSS-generated UI.
- [ ] Packaged Default / Hover / Faded / Expanded Grab assets exist under `/assets/grab/`.
- [ ] Existing user custom Grab images continue to override packaged defaults.
- [ ] Clearing custom Grab images restores packaged FrameChute defaults.
- [ ] Both `.sh` and `.ps1` packaging flows include `/assets`.
- [ ] Packaged ZIP contains all required Grab assets.
- [ ] No permissions or host permissions were added.
- [ ] Existing saved sessions/preferences remain compatible.

## Useful inspected files

- `manifest.json`
- `src/workspace.html`
- `src/workspace.js`
- `src/workspace-extras.js`
- `src/web-drop.js`
- `src/web-drop.css`
- `src/drop-local-sources.js`
- `src/controls.js`
- `src/dock-fade.js`
- `src/floating.css`
- `src/layer-menu.js`
- `src/framechute-final-polish.js`
- `src/framechute-final-polish.css`
- `src/theme-customization.js`
- `src/media-ux-polish.js`
- `src/media-dock-layout.js`
- `src/media-dock-layout.css`
- `scripts/package-web-store.sh`
- `scripts/package-web-store.ps1`
