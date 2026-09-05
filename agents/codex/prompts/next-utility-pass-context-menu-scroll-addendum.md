# ADDENDUM — Context menu must remain open while scrolling

Read this together with:

`agents/codex/prompts/next-utility-pass-after-pr39.md`

This is part of the remaining current-priority UX work. Extend the existing context-menu placement/dismissal system; do not create a second menu architecture.

---

## Bug

The right-click/object context menu can be taller than the available viewport. When the user tries to scroll down inside the menu to reach lower commands, the menu disappears.

This makes any command below the initially visible area effectively unreachable and defeats the purpose of making the menu scrollable.

## Required behavior

- a context menu may be vertically scrollable when its contents exceed the available viewport height
- mouse-wheel scrolling while the pointer is over the menu scrolls the menu and **does not dismiss it**
- trackpad scrolling over the menu behaves the same way
- dragging the menu's scrollbar must not dismiss the menu
- keyboard navigation that scrolls the menu (Arrow keys, Page Up/Page Down where supported, Tab/focus movement where appropriate) must not dismiss it
- scrolling a nested menu surface must not be interpreted as an outside interaction
- keep the menu within viewport bounds and give it a sensible `max-height` with `overflow-y: auto`
- no horizontal scrollbar unless a genuinely unavoidable content case requires one
- retain the existing rule that Escape dismisses the active menu
- retain predictable dismissal on an actual outside click/pointer interaction
- if the underlying workspace/page itself scrolls while a menu is open, either keep the menu correctly anchored/repositioned or dismiss it intentionally; **do not confuse scrolling inside the menu with scrolling the underlying page**
- preserve the existing context-menu collision rule: menu surfaces must not obscure one another
- preserve `Close Object` near the top even though lower commands are now reachable

## Event ownership

Audit the current dismissal listeners carefully. Do not use a broad `scroll`, `wheel`, pointer, or focus listener that treats legitimate interaction inside the menu as an outside dismissal.

Use one clear ownership rule:

> **Interaction inside the active menu belongs to the menu. Outside interaction may dismiss it.**

If there are multiple coordinated context-menu surfaces, the active menu family should share the same containment/dismissal logic.

## Acceptance workflows

1. `Right-click object → long menu opens → wheel downward while pointer is inside menu → menu remains open → lower commands become reachable.`

2. `Right-click object → drag menu scrollbar thumb → menu remains open throughout the drag.`

3. `Right-click object → use keyboard navigation to move focus to a command below the initial visible area → menu scrolls that command into view and remains open.`

4. `Right-click object → click outside menu → menu dismisses predictably.`

5. `Right-click object → press Escape → menu dismisses predictably.`

6. `Open competing context-menu surface → placement/collision rules still prevent one menu from hiding another.`

Add focused tests for event ownership/dismissal where practical and include a manual Chromium acceptance check for wheel, trackpad-equivalent wheel events, scrollbar dragging, and keyboard reachability.
