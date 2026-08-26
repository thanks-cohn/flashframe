# Codex operating instructions: FrameChute black-box bug hunt

This diagnostics branch exists to make FileChute -> FrameChute transfer failures observable.

## Mission
For every dropped FileChute item, be able to answer exactly where the flow stopped:

`dragenter -> dragover claim -> physical drop -> ticket parse -> cross-extension request -> byte response -> reconstructed File / gallery source -> FrameChute block creation`

Use the FileChute `transferToken` as the correlation ID. Keep diagnostics local-only and capped. Do not merge this branch to main unless explicitly requested.

## Current Windows failure family
- FileChute standard text tickets can reach another Chromium renderer.
- Windows Chromium may show a red prohibited cursor after several attempts and later fail to start drags.
- Earlier receiver code could process one physical drop through multiple handlers and manufacture synthetic secondary drop events.
- Folder drops are gallery-source transfers, not native Windows directory drops.
- A one-off successful drop is not sufficient; repeated 10-15 drag tests are required.

## Rule
Do not patch a missing state transition before instrumenting it. If the trace lacks a checkpoint, add the checkpoint first.

## Required FrameChute checkpoints
- workspace `dragenter`
- workspace `dragover`
- whether FileChute custom MIME / compact text ticket is visible
- whether FrameChute called `preventDefault()` and selected `copy`
- physical `drop`
- parsed payload/token/path/name/kind
- receiver handler identity (avoid duplicate consumers)
- cross-extension `sendMessage` start/result/error
- returned bytes metadata (name/type/size only, never log bytes)
- reconstructed `File`
- any synthetic `DataTransfer` / `DragEvent` creation
- final block/gallery creation start/result
- status/error message
- `dragend` if visible in this context

## Codex loop
1. Read newest FileChute and FrameChute black-box JSON exports.
2. Group both logs by `transferToken`.
3. Order by timestamp/sequence.
4. Identify last confirmed-good and first missing/failed transition.
5. Rank hypotheses from evidence.
6. If evidence is insufficient, add the smallest missing instrumentation and stop.
7. If evidence is sufficient, make the smallest fix, retain diagnostics, and re-test repeatedly.
8. Never claim the Windows drag wedge fixed until user testing confirms repeated drags remain healthy.

Avoid synthetic drag/drop recursion unless there is no direct API path and the trace proves it is necessary.