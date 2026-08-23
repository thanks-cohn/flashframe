# Flashframe Chrome Web Store reviewer notes

These notes are written for the exact Chrome-only candidate produced from the `isolated-windows-exe` branch.

## Product and single purpose

Flashframe is a spatial browser workspace. It lets a user arrange notes, local files, local media, images, webpages, and supported web media as movable blocks in one extension-owned Chrome tab, then save and restore that workspace later.

Single-purpose statement for the Developer Dashboard:

> Flashframe is a spatial browser workspace that lets users arrange, save, restore, and directly manipulate notes, local files, local media, web content, and supported web media in one visual canvas.

## Reviewer setup

No external setup is required.

- No desktop companion.
- No Windows executable.
- No Python installation.
- No localhost service.
- No native messaging host.
- No Flashframe account.
- No developer-operated cloud service is required for the core product.

Install the extension, click the Flashframe toolbar icon, and the workspace opens in an extension-owned tab.

## Suggested reviewer test

1. Install Flashframe and click its toolbar icon.
2. Create a note and type text into it.
3. Move and resize the note.
4. Use **Open PDF**, **Open video**, or **Open gallery** and choose a local source through Chrome's browser-native picker.
5. Drag a local PDF, video, text/code file, image, and image directory into the workspace. A dropped image directory should open in the gallery/lightbox flow with previous/next and keyboard navigation.
6. Save a named Flashframe.
7. Close the workspace tab, reopen Flashframe, and restore the saved Flashframe.
8. Use **Open URL** with a normal HTTPS URL or a video-site URL.
9. Verify video-site URLs remain exact ordinary links and open externally.

Local file/folder access occurs only after explicit user action through a browser picker or deliberate drag-and-drop into the workspace. Chrome may require the user to renew access to a previously selected local source after a browser restart; Flashframe exposes reconnect controls for that case.

## Permissions

The candidate requests no extension API permissions and no host permissions. Local sources use explicit browser pickers or deliberate drag-and-drop. Ordinary remote URLs are user-selected content and require no host permission.

## Remote code

Dashboard answer: **No, Flashframe does not use remotely hosted executable code.**

All extension JavaScript is packaged with the extension. Flashframe can display user-selected remote webpages, images, videos, and ordinary video-site links, but it does not fetch JavaScript or WebAssembly from a remote server and execute it as extension code.

## Data handling summary

Flashframe is local-first. Workspace state is stored in the browser and, only if the user chooses one, in a user-selected Flashframe data directory. The developer does not receive normal workspace contents.

When a user explicitly adds remote content, Chrome connects directly to that remote host to display the requested resource. Flashframe has no analytics, advertising, telemetry, account login, developer-operated cloud sync, or data brokerage in this candidate.

Use the repository root `PRIVACY.md` as the privacy-policy source of truth.

## Public reference release

The candidate reference release is intended to be published as a GitHub prerelease with tag:

`flashframe-chrome-v1.0.5-rc1`

The prerelease should contain the exact Store ZIP, SHA-256 checksum, privacy policy, listing copy, these reviewer notes, the Windows test sheet, and the release-readiness report. It is a reference/testing release, not a claim of Chrome Web Store approval.
