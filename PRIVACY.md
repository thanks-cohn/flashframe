# Flashframe Privacy

Flashframe is designed to work locally.

## Current build

The current extension does not send workspace contents, local files, filenames, saved Flashframes, or usage history to a Flashframe server or to any third party.

Flashframe does not currently include analytics, advertising, telemetry, account login, cloud sync, or remote code.

## Local files and folders

Flashframe only opens a local file or folder after the user explicitly chooses it through a browser file or directory picker.

The selected content is used only to provide the visible Flashframe feature the user requested, such as displaying text, a PDF, an image directory, or a local video.

Flashframe does not silently crawl the user's filesystem.

## Saved Flashframes

Named Flashframes and related local state are stored in the extension's local browser storage, currently IndexedDB in the user's Chrome/Chromium profile.

A text block snapshot stores the text needed to restore that saved Flashframe. Source-backed blocks such as PDFs, galleries, and videos store lightweight state and a browser-managed reference to the source selected by the user.

## Network use

The current build does not transmit Flashframe workspace data over the network.

If a future release adds an online feature, this document and the Chrome Web Store disclosures must be updated before that feature is released.

## Permissions

The initial Flashframe manifest intentionally requests no broad website or browsing permissions.

Local file and directory access is granted through explicit user interaction with browser file pickers.

## Deleting local data

Removing the extension removes its extension-local browser storage as part of normal browser extension removal behavior. A dedicated in-product data-management screen may be added before public release so users can remove individual saved Flashframes without uninstalling the extension.

## Principle

Flashframe should request the narrowest access necessary for the feature the user is actively using.
