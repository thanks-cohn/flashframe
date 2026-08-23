# Flashframe Privacy Policy

**Last updated: August 22, 2026**

Flashframe is designed as a local-first spatial workspace for Chrome and Chromium. This policy explains what the extension handles, what it stores, and when it uses the network.

## Single purpose

Flashframe lets users build, arrange, save, and restore spatial workspaces made from notes, local files, local media, images, web pages, and supported web media.

Flashframe does not use workspace information for advertising, profiling, data brokerage, or unrelated analytics.

## Local files and folders

Flashframe only opens a local file or folder after the user explicitly chooses it through a browser file or directory picker.

Selected content is used only to provide the visible Flashframe feature the user requested, such as displaying text, a PDF, an image directory, or a local video.

Flashframe does not silently crawl the user's filesystem.

## Saved Flashframes

Named Flashframes and related local state are stored in extension-local browser storage and, when the user chooses a Flashframe data directory, in that user-selected local directory.

A saved workspace can contain lightweight restoration state such as block geometry, names, text content, current PDF page, gallery position, video timestamp, playback settings, URLs, and browser-managed references to local sources selected by the user.

Flashframe does not upload saved Flashframes to a Flashframe-operated cloud service.

## Web pages, images, and remote video

When the user explicitly pastes or drops an HTTP or HTTPS URL into Flashframe, the browser may connect directly to that URL's host to display the requested webpage, image, or direct video stream.

Remote video is loaded in the browser's native media element. Playback, pause, forward, and rewind operate locally in the workspace when the remote source itself exposes seekable media. A truly live stream with no DVR or seekable history cannot be rewound beyond the range exposed by that stream.

The destination website or media host receives the network information normally sent by the browser when loading that resource, such as the user's IP address and standard request metadata. Flashframe does not proxy that request through a Flashframe server.

## YouTube

When the user explicitly adds a YouTube URL, Flashframe uses a YouTube embed and the YouTube player messaging interface so the workspace can restore and control supported playback state.

The extension requests narrowly scoped host access to `www.youtube.com` and `www.youtube-nocookie.com` for its YouTube embed compatibility behavior. It does not request broad access to all websites.

YouTube receives information according to its own service and privacy practices when a YouTube player is loaded.

## Analytics, ads, accounts, and remote code

The current build does not include Flashframe analytics, advertising, telemetry, account login, Flashframe cloud sync, or remotely hosted executable extension code.

Flashframe does not sell user data or use user data for personalized, retargeted, or interest-based advertising.

## Permissions

Flashframe follows a narrow-permission model.

The current manifest uses:

- `declarativeNetRequestWithHostAccess`, solely for the packaged YouTube embed compatibility rule; and
- host access limited to `https://www.youtube.com/*` and `https://www.youtube-nocookie.com/*`.

Local file and directory access is granted through explicit user interaction with browser-native pickers rather than broad filesystem permission.

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
