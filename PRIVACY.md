# Flashframe Privacy Policy

**Last updated: August 23, 2026**

Flashframe is designed as a local-first spatial workspace for Chrome and Chromium. This policy explains what the extension handles, what it stores, and when it uses the network.

## Single purpose

Flashframe lets users build, arrange, save, and restore spatial workspaces made from notes, local files, local media, images, web pages, and supported web media.

Flashframe does not use workspace information for advertising, profiling, data brokerage, or unrelated analytics.

## Chrome-only architecture

The current Chrome Web Store candidate is self-contained in the browser. It does not require a desktop companion, Windows executable, Python runtime, localhost service, native messaging host, Flashframe account, or developer-operated cloud backend for normal operation.

## Local files and folders

Flashframe only opens a local file or folder after explicit user action. The user may choose a source through a browser-native file or directory picker, or deliberately drag a local file or directory into the Flashframe workspace.

Selected or dropped content is used only to provide the visible Flashframe feature the user requested, such as displaying text, a PDF, an image directory, a local video, an image, or a generic local-file block.

Flashframe does not silently crawl the user's filesystem.

When Chrome provides a browser-managed file or directory handle, Flashframe may store that handle locally so a saved workspace can reconnect to the user-selected source. Browser permission may need to be renewed later.

## Saved Flashframes

Named Flashframes and related local state are stored in extension-local browser storage and, when the user explicitly chooses a Flashframe data directory, in that user-selected local directory.

A saved workspace can contain lightweight restoration state such as block geometry, names, text content, current PDF page, gallery position, video timestamp, playback settings, URLs, and browser-managed references to local sources selected or dropped by the user.

Flashframe does not upload saved Flashframes to a Flashframe-operated cloud service.

## Web pages, images, and remote video

When the user explicitly pastes or drops an HTTP or HTTPS URL into Flashframe, the browser may connect directly to that URL's host to display the requested webpage, image, or direct video stream.

Remote video is loaded in the browser's native media element. Playback, pause, forward, and rewind operate locally in the workspace when the remote source exposes seekable media. A truly live stream with no DVR or seekable history cannot be rewound beyond the range exposed by that stream.

The destination website or media host receives the network information normally sent by the browser when loading that resource, such as the user's IP address and standard request metadata. Flashframe does not proxy that request through a Flashframe server.

## External links

Video-site URLs, including YouTube URLs, are ordinary web/link blocks. Flashframe preserves the exact URL and offers **Open page**; it does not create a special player or request host access for those sites.

## Analytics, ads, accounts, and remote code

The current build does not include Flashframe analytics, advertising, telemetry, account login, Flashframe cloud sync, or remotely hosted executable extension code.

All executable extension JavaScript is packaged with the extension. Remote webpages, images, and videos are user-selected content, not remotely hosted extension code.

Flashframe does not sell user data or use user data for personalized, retargeted, or interest-based advertising.

## Permissions

Flashframe follows a narrow-permission model.

The current manifest requests no extension API permissions and no host permissions.

Local file and directory access occurs through explicit user interaction with browser-native pickers or drag-and-drop, rather than broad filesystem permission.

Flashframe does not request permission to read or change all websites the user visits.

## Human access to user data

Flashframe's normal operation does not send workspace contents to the developer, so Flashframe personnel do not receive or read the user's local workspace contents as part of normal operation.

## Deleting local data

Users can delete individual saved Flashframes through available product controls, remove data from a user-selected Flashframe data folder, or uninstall the extension to remove extension-local browser storage according to Chrome's normal extension-removal behavior.

Deleting a source file from the user's computer is outside Flashframe's control. Removing a block from a workspace does not delete the user's source file.

## Chrome Web Store Limited Use

Flashframe's use of information received from Chrome extension APIs is limited to providing or improving Flashframe's disclosed single purpose and user-facing features.

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Changes

If Flashframe's data handling materially changes, this policy and the Chrome Web Store privacy disclosures must be updated before the changed behavior is released.
