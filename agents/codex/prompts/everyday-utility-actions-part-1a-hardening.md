# Codex Request: Framechute Everyday Utility Layer — Part 1-A Hardening

## Mission

Part 1 is now merged. Do **not** start Part 2 yet.

This is a focused **Part 1-A hardening pass** over the merged Quick Actions foundation and utility workflows.

The goal is not to redesign Framechute or add another feature family. The goal is to make the Part 1 substrate trustworthy enough that Part 2 can build on it without inheriting persistence holes, unsafe archive behavior, temporary result objects, or misleading utility semantics.

The product rule remains:

> **Select the thing. Do the obvious thing. Save the result.**

And the architectural rule remains:

> **Extracted/generated results should become real Framechute objects, not temporary previews.**

Read before coding:

- `agents/codex/prompts/everyday-utility-actions-part-1-foundation.md`
- `agents/codex/prompts/everyday-utility-actions-part-2-completion.md`
- `docs/QUICK_ACTIONS.md`
- the merged Part 1 implementation under `src/actions/`
- `src/workspace.js`
- `src/web-drop.js`
- `src/documents/pdf-document.js`
- FCX capture/restore implementation
- relevant tests and packaging scripts

Do not implement Part 2 media backends/OCR/collaboration/etc. in this run unless a tiny shared helper is strictly required to fix Part 1 durability.

---

# Priority 1 — make generated and edited objects durable

## 1. Preserve unsaved structural PDF edits through FCX

There is an important persistence hole to fix.

Part 1 can mutate a PDF runtime through operations such as:

- rotate page
- delete page
- duplicate page
- reorder/move page
- extract/merge/insert pages
- crop page margins
- conservative structural rewrite/compression

For an originally opened PDF, the block still has its original source record. If FCX capture only embeds current PDF bytes when no source record exists, then a dirty structurally edited PDF may reopen from the original source and lose the unsaved structural changes.

Fix this correctly.

Requirements:

- A dirty PDF with structural changes must survive `Export Snapshot → reopen .fcx` with those changes intact.
- Do not require the user to native-Save the PDF before FCX can preserve the workspace state.
- Preserve the distinction:
  - native Save / Save As = writes the PDF file itself
  - Export Snapshot = preserves the workspace moment
- Avoid embedding a second full PDF unnecessarily when no structural state changed.
- Choose a coherent representation:
  - embed current runtime bytes when structurally dirty, or
  - serialize a replayable structural-operation state if that is genuinely safer and simpler.
- Existing text-edit state must continue to survive too.
- Reconnecting the original source after FCX restore must not silently discard the snapshot's unsaved PDF state.

Add regression coverage for this exact scenario.

## 2. Make extracted/generated audio and video first-class durable result objects

Part 1 can produce or open synthetic media from archives/result bridges. Those objects must not exist only for the current session.

Example that must work:

`Open ZIP → open contained MP4 → media block appears → Export Snapshot → reopen FCX → media is still there and playable without the original ZIP being required`

Likewise for supported extracted audio.

Requirements:

- Synthetic/result media bytes need a durable representation in block state / FCX assets.
- Do not pretend a synthetic `File` handle is a persistent OS handle.
- Preserve filename, MIME type, playback position, loop, volume/mute state, and other existing media state.
- Reuse FCX binary asset mechanisms where practical rather than base64-in-JSON for large media.
- If an object came from a real reconnectable source handle, preserve the current reconnect behavior.
- If it came from extraction/generation, restore from embedded bytes.
- Do not upload files remotely.

Add tests around result-media state metadata where practical and a browser/integration smoke path if the repository has suitable infrastructure.

## 3. Make all result-object routing honest

Audit the `framechute:add-result-object` / `framechute:open-result-file` bridge.

Supported result types should become normal Framechute objects whenever Framechute has an editor/viewer for them.

At minimum route honestly:

- image → image object
- text / markdown → text object
- CSV → CSV table object
- PDF → PDF object
- DOCX → DOCX object
- video → media block
- audio → media block / existing supported audio representation

For an unsupported file type:

- do **not** dispatch it into a dead code path that only says “Use Save As” without actually offering a save.
- provide a real Save As/download fallback, or an honest generic file-result object if one already exists.

The extracted bytes must never be lost merely because Framechute lacks an editor for that extension.

---

# Priority 2 — archive safety and correctness

## 4. Harden ZIP / CBZ against decompression bombs and memory blowups

The current archive implementation has a per-entry limit, but that is not sufficient.

A ZIP can contain hundreds/thousands of entries that are individually below the limit while having an enormous cumulative expanded size.

Requirements:

- enforce a cumulative uncompressed-byte ceiling
- enforce a sensible entry-count ceiling
- reject or stop processing suspicious archives cleanly
- do not freeze the UI on pathological input
- report a succinct human-readable error
- do not partially present an archive as safe if limits were exceeded without clearly indicating that it was truncated
- preserve local-only behavior

Prefer a design that does not eagerly inflate every archive entry when browsing if the packaged archive library permits a safer/lazier approach.

If true lazy decompression would require a disproportionate rewrite, at minimum:

- inspect central-directory/header metadata first where practical
- calculate/validate cumulative advertised expanded size before inflation
- cap total inflated output
- move expensive work off the critical UI path where feasible

The docs must not claim “lazy” if the implementation remains eager.

## 5. Improve archive type routing

Add/verify MIME/extension recognition for common Framechute-supported entries, especially:

- DOCX
- PDF
- CSV
- TXT / Markdown
- PNG/JPEG/WebP/GIF where already supported
- MP4/WebM
- MP3/WAV

Opening an archive entry should route through the same object creation/result system used elsewhere.

Unknown entries must remain extractable through a real Save As/download action.

## 6. Clean up CBZ object URL lifecycle

Audit CBZ preview object URLs.

When moving between images or removing/restoring a CBZ block, revoke old object URLs where appropriate so long browsing sessions do not leak memory.

---

# Priority 3 — finish the small Part 1 UX omissions

These are deliberately small. Do not turn this into a new image-editor project.

## 7. Add Flip Vertical

Part 1 exposes horizontal flip. Add the vertical counterpart using the same nondestructive transform state and Save As pipeline.

Expected Quick Actions for an image should include both:

- Flip Horizontal
- Flip Vertical

## 8. Make crop genuinely rectangular and directly resizable

The crop workflow should not force a square crop.

Keep the existing visible crop mode, but improve it so the user can:

- drag the crop rectangle
- resize width and height independently
- preferably drag edges/corners
- Apply
- Cancel
- press Enter to apply when focus/UX permits
- never leave the image in an ambiguous half-applied state

The crop must remain nondestructive until native export/save of the transformed image.

Do not revert to numeric x/y/width/height as the primary UI.

## 9. Add minimal line/arrow annotation

The Part 1 request called for a minimal annotation layer.

Keep this modest, but ensure annotation can create at least:

- text
- rectangle
- line or arrow

If an arrowhead is inexpensive, use an arrow; otherwise line is acceptable with a clear label.

Annotation state should survive FCX and bake only when exporting the image.

## 10. Make “Compress PDF” semantically honest

The current PDF operation is a conservative structural rewrite and explicitly does not recompress embedded images.

Do not replace the current PDF runtime with a larger result while labeling the operation “Compress”.

Use one of these acceptable approaches:

### Preferred

- generate conservative rewritten bytes
- compare before/after byte counts
- only adopt the new bytes if smaller
- otherwise keep the original runtime and report that no smaller safe result was produced

### Alternative

Rename the action to something honest such as `Optimize PDF` / `Rebuild PDF`, while still reporting before/after bytes.

Do not claim compression if output did not shrink.

---

# Priority 4 — make the shared substrate safer for Part 2

## 11. Audit serialization of Quick Action transform state

Part 1 added capture/restore hooks for nondestructive image state.

Verify all current transform state that materially changes export is serialized/restored, including where present:

- crop
- requested resize/output dimensions
- rotation
- flip X / flip Y
- straighten
- background fill
- transparent-color/tolerance
- blur/pixelate regions
- annotations
- perspective state

Requirements:

- `Export Snapshot → reopen` preserves the editable state
- Save As after restore produces the same output the user would have produced before snapshotting
- state does not get double-applied on repeated restore/capture cycles

## 12. Audit semantic duplication after Part 1

Part 1 replaced DOM cloning with semantic duplication. Verify representative supported objects:

- image/result image
- text
- PDF
- DOCX
- CSV
- ZIP/CBZ where sensible
- video/audio where sensible

A duplicate should:

- receive a new block ID
- preserve serializable state
- have working controls/listeners
- not alias mutable runtime state in a way that causes edits to one copy to mutate the other
- remain independently movable/removable/saveable

If a type cannot safely duplicate, hide/disable Duplicate for that type instead of producing a broken copy.

## 13. Keep Part 2 extension points clean

Do not add another parallel selection system, result bridge, Save As helper, or action dispatcher.

Part 2 should still be able to add a feature by roughly doing:

1. implement operation/backend
2. register action
3. optionally add object-specific UI

Part 2 should **not** need to redesign:

- selection
- Quick Actions
- result-object creation
- native Save As
- batch orchestration
- progress/error plumbing
- object lifecycle
- FCX capture/restore

---

# Required acceptance workflows

Do not call Part 1-A complete until these pass.

## A. Dirty PDF survives FCX

`Open PDF → rotate/delete/merge/crop without native Save → Export Snapshot → reopen .fcx`

Expected:

- the structurally edited PDF is still in the edited state
- original source is not silently substituted for the snapshot state

## B. Extracted media survives FCX

`Open ZIP → open contained supported video/audio → Export Snapshot → reopen .fcx`

Expected:

- media object restores from embedded/result bytes
- playback state is sane
- original ZIP is not required merely to restore the already-extracted result

## C. Unknown archive entry is never lost

`Open ZIP → select unsupported entry`

Expected:

- user can actually Save As/download the real bytes
- no fake success/status-only dead end

## D. Archive limits

Test at least synthetic archives representing:

- many entries
- high cumulative expanded size
- entry count over limit
- ordinary normal ZIP

Expected:

- ordinary ZIP works
- suspicious/oversized archives fail cleanly before catastrophic memory use

## E. Crop

`Open image → Crop → independently resize crop rectangle → Apply → Export Snapshot → reopen → Save As`

Expected:

- crop state survives
- output dimensions/region are correct

## F. Flip Vertical

`Open image → Flip Vertical → Export Snapshot → reopen → Save As`

Expected output remains vertically flipped exactly once.

## G. Annotation

`Open image → add text + rectangle + line/arrow → Export Snapshot → reopen → Save As`

Expected annotation state survives and renders once.

## H. PDF optimize/compress honesty

Run against a PDF where structural rewrite becomes larger.

Expected:

- Framechute does not replace the current PDF with a larger file while claiming successful compression.

---

# Testing requirements

Add focused regression tests where pure/helper-level tests are possible.

At minimum cover:

- PDF dirty structural state representation/capture logic
- archive cumulative-size and entry-count limits
- unsupported archive entry fallback selection/routing helper
- transform-state round trip including flipY/crop/annotations
- duplicate record independence
- PDF optimize/compress choose-smaller behavior

Then run the repository's relevant checks, including:

- `node --test tests/*.test.mjs`
- `node --check` for modified JS modules
- `git diff --check`
- Chrome Web Store packaging/release validation

If the repository has a browser smoke test path, use it for the FCX result-object persistence scenarios.

---

# Scope discipline

This is **Part 1-A**, not Part 2.

Do not spend this run implementing:

- arbitrary media transcoding
- Extract Audio backend
- permanent video trim/mute/speed
- OCR
- transcription
- full spreadsheet/XLSX support
- collaboration/cloud services
- game/video/web-builder modes
- broad UI redesigns

Those belong elsewhere.

Preserve the merged Part 1 architecture and harden it.

The final benchmark is simple:

> **If Framechute says an object exists in the workspace, Export Snapshot must be able to preserve that object and its editable state honestly.**

When complete, open a focused PR against `main` for Part 1-A hardening.