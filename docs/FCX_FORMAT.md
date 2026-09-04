# Portable FrameChute snapshots (`.fcx`)

## Version 1 layout

An `.fcx` is a ZIP-compatible, store-mode archive. Its required entries are:

- `manifest.json`: format marker `framechute-fcx`, integer version `1`, creation time, application name, asset mode, and the asset table.
- `state.json`: the same semantic, versioned workspace record used by local FrameChute snapshots.
- `assets/<asset-id>/<unique-name>`: optional binary files. Asset IDs, rather than original filenames, prevent collisions and let multiple blocks share one source.

The importer rejects unsupported versions, malformed JSON, duplicate or unsafe paths, non-store ZIP encodings, failed CRC integrity checks, excessive entry counts, and archives declaring more than the v1 uncompressed-size limit. Archive contents are treated only as data.

## Asset modes

**Include Files** reads accessible file handles and stores their binary bytes. A gallery source is represented by one directory asset containing its image files. The canvas background uses the same asset table. Imported assets become synthetic browser handles, so existing block restoration and reconnect behavior remains in use.

**State Only** keeps the original source identity, handle key, display name, and portable asset ID, but writes no bytes. The handle may continue to work in the originating browser profile. Elsewhere the normal visible reconnect placeholder is retained rather than dropping the block. Canvas backgrounds likewise retain their browser-content identity and descriptive metadata, allowing the originating profile to restore its preserved background while showing a named missing state when those local bytes are unavailable.

## Restored state

V1 preserves the existing workspace snapshot contract: block IDs/types/names, geometry and z-order, type-owned state, timed motion and layer rules, appearance/background, and window scroll position. Existing adapters preserve text selection/scroll, PDF page, gallery entry/index, and media time, volume, mute, rate, loop, visibility/chrome options, master-timeline offset, and explicit sync-group membership. Custom dropped image/audio/video/PDF/file/gallery records remain extensible marker payloads rather than being flattened into an FCX-only type switch.

Media is restored paused at its captured time. If anything was playing, **Resume Snapshot** provides the browser gesture used to restart those items after structural/source restoration. A browser may still reject an individual codec or playback request; that item remains independently controllable.

## V1 limitations

- ZIP entries are intentionally uncompressed to keep the implementation dependency-free and binary-safe. Included-media snapshots can therefore be large and are capped at 1.5 GB during export.
- Gallery export includes direct files in the selected directory, not recursive subdirectories or extension-provider galleries whose provider does not expose a browser file handle.
- Remote resources remain references and can change or disappear.
- Chromium owns file permission and autoplay decisions; these cannot be transported.
- Playback resumes the intended items in one gesture, but hardware/codec latency can prevent sample-accurate simultaneous start.

## Manual acceptance checklist

1. Arrange differently sized and positioned image, video, audio, gallery, and independent media blocks; link at least two timed blocks and change their times, rates, volumes, mute, and loop values.
2. Navigate the gallery, choose a canvas background, and export once with **Include Files** and once with **State Only**.
3. Remove/reset the live blocks, drop/open the embedded `.fcx`, and verify geometry, z-order, appearance, gallery item, timestamps, explicit link/independent badges, and media settings.
4. Use **Resume Snapshot** and verify previously paused items remain paused.
5. Open the state-only snapshot in a profile without the original handles and verify affected blocks remain visible with reconnect controls.
6. Try a renamed non-archive, a truncated archive, and a manifest with version `2`; verify each produces a status error without replacing the workspace.
