# Chrome Web Store Submission Checklist

This document is the release checklist for publishing Flashframe in the Chrome Web Store.

The repository can prepare the extension package, privacy disclosures, permission justifications, listing copy, and assets. The publisher must still complete account-level steps in the Chrome Web Store Developer Dashboard.

## Current submission shape

Flashframe uses Manifest V3.

Current required extension permissions are deliberately narrow:

- `declarativeNetRequestWithHostAccess`
- `https://www.youtube.com/*`
- `https://www.youtube-nocookie.com/*`

Flashframe does **not** request access to all websites.

The manifest includes 16, 32, 48, and 128 pixel extension icons.

## Single purpose

Use this as the single-purpose statement:

> Flashframe is a spatial browser workspace that lets users arrange, save, restore, and directly manipulate notes, local files, local media, web content, and supported web media in one visual canvas.

The features belong to one workspace purpose. Avoid describing Flashframe as a bundle of unrelated browser utilities.

## Permission justifications

### `declarativeNetRequestWithHostAccess`

Flashframe uses one packaged declarative network rule for YouTube embed compatibility. The rule is static, ships with the extension, and is not downloaded as remote code.

### `https://www.youtube.com/*`

Required only for the packaged YouTube embed compatibility behavior when a user explicitly adds a YouTube URL to a Flashframe workspace.

### `https://www.youtube-nocookie.com/*`

Required only for the YouTube privacy-enhanced embed used by Flashframe's supported YouTube block.

### Local files and folders

Flashframe does not request broad filesystem access. Local sources are selected through browser-native file and directory pickers after explicit user interaction.

### Remote direct video

Direct HTTP/HTTPS video URLs are loaded by the browser's normal media element. Flashframe does not require broad host permissions merely to play those user-selected media URLs.

## Privacy

Use the root [`PRIVACY.md`](../PRIVACY.md) as the privacy-policy source of truth.

The Developer Dashboard privacy disclosures must match the submitted build. In particular:

- workspace contents remain local unless the user deliberately loads remote web content;
- local files are selected explicitly;
- saved workspace state is stored locally;
- pasted/dropped remote URLs cause the browser to connect to the selected remote host;
- YouTube blocks load YouTube content;
- Flashframe currently has no developer-operated cloud sync, analytics, advertising, account system, or telemetry; and
- Flashframe does not sell user data or use it for personalized advertising.

If implementation behavior changes, update the privacy policy and Dashboard disclosures before releasing that version.

## Store listing

Use [`STORE_LISTING.md`](STORE_LISTING.md) as the starting point for the Store Listing tab.

The listing must describe only features present in the exact uploaded build.

## Graphic assets

The package contains the required extension icon sizes, including 128x128.

Before submission, capture real screenshots from the exact release build. Recommended screenshot sequence:

1. A clean Flashframe workspace with several arranged blocks.
2. A local image/PDF/video workspace.
3. A URL or YouTube block beside local content.
4. The global video controls controlling multiple video blocks.
5. Right-clicking a block and showing **Bring to front** / **Send to back**.
6. Appearance/settings controls, if useful to the listing.

Do not use mock screenshots that show capabilities absent from the uploaded build.

Chrome's current Store listing guidance should be checked before final submission for exact promotional-asset dimensions.

## Publisher account

Before publishing, complete the publisher requirements shown in the Chrome Web Store Developer Dashboard, including 2-Step Verification for the publishing Google Account.

Account verification and identity/trader disclosures, when requested, are account-level actions and cannot be completed by source code in this repository.

## Build the upload ZIP

Run:

```bash
sh scripts/package-web-store.sh
```

The script validates the manifest and required icons, then creates a versioned ZIP under `dist/` with `manifest.json` at the ZIP root.

## Pre-submission checklist

- [ ] Test the exact release build in current stable Chrome.
- [ ] Confirm `manifest_version` is `3`.
- [ ] Confirm the manifest description is 132 characters or fewer.
- [ ] Confirm all requested permissions are still required by a shipped feature.
- [ ] Confirm no broad host permission has been added unnecessarily.
- [ ] Confirm no remote executable code is loaded.
- [ ] Confirm all four extension icon files exist and render correctly.
- [ ] Test notes, PDFs, galleries, local video, URL blocks, and save/restore.
- [ ] Test direct remote video playback and global play/rewind/forward.
- [ ] For a live stream, confirm rewind is limited to the stream's actual seekable/DVR window.
- [ ] Test YouTube playback controls and restoration.
- [ ] Test right-click layer ordering on local and web blocks.
- [ ] Test the appearance/background and shrink-to-fit settings that ship in the release.
- [ ] Confirm `PRIVACY.md` matches the build.
- [ ] Host the privacy policy at a stable public URL and enter it in the Dashboard.
- [ ] Capture current screenshots from the release build.
- [ ] Fill the Store Listing using `docs/STORE_LISTING.md`.
- [ ] Complete the Dashboard privacy questionnaire truthfully.
- [ ] Confirm the publisher account satisfies 2-Step Verification and any verification requirements.
- [ ] Run `sh scripts/package-web-store.sh`.
- [ ] Load/test the resulting packaged contents once more.
- [ ] Upload the ZIP and review all permission warnings.
- [ ] Submit for review.

## If Google rejects the item

Use the exact rejection reason as the next debugging input. Fix the underlying implementation, listing, permission, or disclosure mismatch rather than trying to route around the review.

Useful official references:

- Chrome Web Store Program Policies: https://developer.chrome.com/docs/webstore/program-policies/
- Quality guidelines: https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines
- Limited Use: https://developer.chrome.com/docs/webstore/program-policies/limited-use/
- User data / minimum permission guidance: https://developer.chrome.com/docs/webstore/user_data
