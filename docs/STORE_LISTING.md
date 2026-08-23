# Flashframe Chrome Web Store Listing Draft

Use this as the source text for the Chrome Web Store listing. Keep it synchronized with the exact uploaded build.

## Name

Flashframe

## Short description

A spatial workspace for Chrome and Chromium.

## Detailed description

Flashframe turns a browser tab into a persistent visual workspace.

Arrange notes, PDFs, image folders, local videos, webpages, images, YouTube videos, and direct video URLs as movable, resizable blocks. Save the workspace as a Flashframe, close it, and restore it later with positions and supported viewing/playback state intact.

Flashframe is designed around direct manipulation. Put the things you are working with in one place, move them where you want them, resize them, layer them, and return to the same arrangement later.

Current features include:

- Free-positioned, resizable workspace blocks.
- Editable text notes.
- Local text and PDF sources chosen explicitly by the user.
- Image-folder galleries.
- Local video blocks with restorable playback position.
- Direct HTTP/HTTPS video URLs using the browser's native video player.
- Global play, pause, rewind, and forward controls for native video blocks.
- YouTube URL blocks with supported playback control and timestamp restoration.
- Webpage and web-image blocks.
- Drag-and-drop support for images, text, and URLs.
- Custom workspace background color or image.
- Shrink-to-fit behavior where supported.
- Right-click block controls for **Bring to front** and **Send to back**.
- Named Flashframes that save and restore workspace state.
- Optional user-selected local Flashframe data folder for durable session files.

### Works inside Chrome

The Chrome edition is self-contained. It does not require a desktop companion, Windows executable, Python installation, localhost service, native messaging host, Flashframe account, or developer-operated cloud backend.

Local files and folders are opened only after the user chooses them through Chrome's browser-native file or directory picker.

### Local-first by design

Flashframe stores workspace state locally. It does not require a Flashframe account or developer-operated cloud service.

When you explicitly add remote web content, your browser connects directly to the selected website or media host in order to display it. See the Flashframe privacy policy for full details.

### Remote video and live streams

Direct video URLs use the browser's native media player and participate in Flashframe's global video controls. Rewind and forward work when the source exposes seekable media. A genuinely live stream can only rewind within the DVR/seekable history made available by that stream.

### YouTube

YouTube links are displayed through a YouTube embed with narrowly scoped extension permissions for the supported embed behavior. Flashframe does not request access to every website you visit.

## Single-purpose statement

Flashframe is a spatial browser workspace that lets users arrange, save, restore, and directly manipulate notes, local files, local media, web content, and supported web media in one visual canvas.

## Suggested category

Productivity

## Screenshot sequence

Use screenshots from the exact tested submitted build.

1. **Your browser, spatial** - several blocks arranged cleanly in one workspace.
2. **Mix local and web content** - PDF/image/local video beside a webpage or web image.
3. **Control video together** - multiple native video blocks with the global player sticky visible.
4. **Layer it your way** - right-click menu showing Bring to front / Send to back.
5. **Come back exactly where you left off** - saved Flashframe selection and restore workflow.

## Privacy policy

Use a stable public rendering of the repository's root `PRIVACY.md`.

Do not submit until the privacy-policy URL is publicly reachable and accurately describes the exact build being uploaded.

## Listing integrity

- Do not advertise planned features as shipped features.
- Do not claim arbitrary websites will always embed; some sites block iframe embedding.
- Do not claim every live stream can rewind. Rewind depends on the source exposing seekable/DVR history.
- Do not claim YouTube behaves identically to local/native video; it uses its supported embed control path.
- Do not add unrelated keywords or competitor names solely for search ranking.
- Keep listing text, screenshots, permissions, reviewer notes, and privacy disclosures consistent.
