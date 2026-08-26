# FrameChute bug-hunt ledger

Keep old failure signatures even after fixes. Correlate with FileChute logs using `transferToken`.

## FCDROP-001: FileChute drag visually reaches FrameChute but workspace will not accept drop
Normal FrameChute local-file `dragover` historically required a native `kind === "file"` item. Windows FileChute token-only/text-ticket drags therefore could fail to call `preventDefault()`, making the workspace an illegal drop target.

## FCDROP-002: FileChute receiver modules existed but were not loaded by workspace
Receiver/gallery source files existed but were not originally included in `workspace.html`. Test branch loads them explicitly.

## FCDROP-003: text-ticket compatibility shim synthesizes a second drop
`filechute-text-envelope.js` converts `FILECHUTE1|...` or legacy text into custom MIME by creating a new `DataTransfer` and synthetic `DragEvent("drop")`. This is a high-priority suspect for Windows drag-state wedging when combined with other receiver handlers. Diagnostics must prove whether one physical drop is consumed more than once.

## FCDROP-004: file bytes returned but block creation fails
Trace separately:
- cross-extension request sent
- response returned
- File reconstructed
- synthetic/local drop dispatched
- generic local-file pipeline saw the File
- image/video/audio/PDF/text block created

Do not report this as one generic receiver failure.

## FCGALLERY-001: directory drop does not open gallery
A FileChute folder is not a native directory. It should become an extension-backed gallery source using FileChute extension ID + transfer token + relative path. Trace source-list request and per-image read request separately.

## WEDGE-001: repeated Windows drags eventually show red prohibited cursor / subsequent drag does not start
Cross-reference FileChute black-box events. Determine whether FrameChute's synthetic redispatch or duplicate receiver handling occurs immediately before the first wedged attempt.

A fix is not considered confirmed until 10-15 repeated drags remain healthy.