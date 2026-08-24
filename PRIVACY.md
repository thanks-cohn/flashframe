# FrameChute Privacy Policy

**Last updated: August 24, 2026**

FrameChute is a local-first spatial workspace for Chrome and Chromium. This policy explains what information the extension handles, where it is stored, and when the browser may contact another service.

## Single purpose

FrameChute lets users arrange, save, restore, and directly manipulate notes, local files, local media, images, PDFs, URLs, and user-selected web content in one visual workspace.

FrameChute does not use workspace information for advertising, behavioral profiling, data brokerage, credit decisions, or unrelated analytics.

## No account or developer cloud required

The Chrome Web Store build is self-contained in the browser. Normal operation does not require a FrameChute account, desktop companion, native messaging host, Windows executable, Python runtime, localhost service, or developer-operated cloud backend.

## Local files and folders

FrameChute accesses a local file or folder only after the user explicitly selects or drops it. The user may choose a source with Chrome's browser-native file or directory picker, or deliberately drag a local source into the workspace.

Selected content is used only for the visible feature the user requested, such as displaying a text file, PDF, image directory, local image, audio file, video, or generic local-file block.

FrameChute does not silently crawl the user's filesystem.

When Chrome provides a browser-managed file or directory handle, FrameChute may store that handle in extension-local browser storage so a saved workspace can reconnect to the source later. Chrome may require the user to renew permission after a browser restart or other permission change.

## Workspace and saved-state data

FrameChute stores workspace state locally in browser storage. Depending on the feature used, this can include block positions and sizes, names, user-entered note text, selected URLs, PDF page number, gallery position, media playback state, appearance settings, and browser-managed references to local sources the user selected.

If a user explicitly chooses a FrameChute data directory, FrameChute may also write session-related files to that user-selected local directory.

FrameChute does not upload workspace contents to a FrameChute-operated cloud service.

## User-selected web content

When the user explicitly adds an HTTP or HTTPS URL, the browser may connect directly to that URL's host to display the requested webpage, image, or browser-playable media.

The destination host receives the network information ordinarily sent by the browser when loading that resource, such as the user's IP address and standard request metadata. FrameChute does not proxy the request through a FrameChute server.

Some websites prevent embedding. In those cases FrameChute may preserve the URL as a normal link that the user can open directly.

## Audio and video

Local audio and video remain local to the user's browser. Direct remote media URLs are requested from the user-selected remote host by the browser. Playback controls operate on the media element in the FrameChute workspace.

## Support / donation link

FrameChute can show an optional support link that opens an external Stripe-hosted checkout page after the user clicks it. FrameChute itself does not receive, process, or store payment-card or financial-account details. Any information entered on Stripe's site is handled by Stripe under Stripe's own terms and privacy practices.

## Analytics, advertising, telemetry, and remote executable code

The submitted build contains no FrameChute analytics, advertising network, behavioral telemetry, account login, or developer-operated cloud sync.

All executable extension JavaScript is packaged with the extension. FrameChute does not download JavaScript or WebAssembly from a remote server and execute it as extension code. User-selected webpages, images, and media are content, not extension code.

FrameChute does not sell user data.

## Permissions

The submitted manifest requests **no extension API permissions and no host permissions**.

Local file and directory access occurs through explicit user interaction with Chrome's native pickers or drag-and-drop rather than broad filesystem access.

FrameChute does not request permission to read or change all websites the user visits and does not collect browser history.

## Human access to user data

Normal operation does not send workspace contents to the developer. FrameChute personnel therefore do not receive or read users' local workspace contents as part of normal product operation.

## Deleting local data

Users can remove workspace blocks and saved workspace state through product controls where provided. Users can also remove files they placed in a user-selected FrameChute data folder or uninstall the extension to remove extension-local browser storage according to Chrome's normal extension-removal behavior.

Removing a block from FrameChute does not delete the user's original source file.

## Chrome Web Store Limited Use

FrameChute uses information only to provide or improve the disclosed spatial-workspace functionality. Any information received through Chrome extension APIs is handled in accordance with the Chrome Web Store User Data Policy and Limited Use requirements.

## Changes

If FrameChute's data handling materially changes, this policy and the Chrome Web Store privacy disclosures will be updated before the changed behavior is released.
