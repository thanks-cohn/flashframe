# Flashframe Chrome Web Store Dashboard answers

Use these answers for the exact tested v1.0.6 candidate from `codex/prepare-flashframe-v1.0.6-rc2-for-review`. If the implementation changes, re-audit before copying them into the Dashboard.

## Store listing

**Name**

Flashframe

**Summary / short description**

A spatial workspace for Chrome and Chromium.

**Category**

Use the closest current Chrome Web Store category to **Productivity / Workflow & Planning**.

**Homepage**

`https://github.com/thanks-cohn/flashframe`

**Support**

`https://github.com/thanks-cohn/flashframe/issues`

**Privacy policy**

For this isolated branch candidate:

`https://github.com/thanks-cohn/flashframe/blob/isolated-windows-exe/PRIVACY.md`

Keep that URL public and do not delete the branch while it is the submitted policy URL. Prefer moving the same policy to a stable default-branch or project-site URL before long-term production use.

**Mature content**

No.

## Single purpose

Paste:

> Flashframe is a spatial browser workspace that lets users arrange, save, restore, and directly manipulate notes, local files, local media, web content, and supported web media in one visual canvas.

## Permissions

The candidate requests no extension API permissions and no host permissions.

## Remote code

Select:

**No, Flashframe does not use remotely hosted executable code.**

Explanation if the Dashboard provides a text box:

> All executable extension JavaScript is packaged in the submitted extension. Flashframe can display user-selected remote webpages, images, videos, but it does not download JavaScript or WebAssembly from a remote server and execute it as extension code.

## Data usage

Conservative disclosure for the current candidate:

- **Website content:** Yes, because Flashframe can display and locally save state related to webpages, images, URLs, text, and other content the user explicitly places in a workspace.
- **Web history:** No. Flashframe does not collect a list of sites the user visits or monitor browsing history.
- **User activity:** No for passive browsing/activity tracking. Flashframe handles only actions the user performs inside the workspace to provide the requested feature.
- **Personally identifiable information:** No as a product data category; Flashframe has no account/profile system and does not request identity data. User-selected notes/files may of course contain arbitrary content, but Flashframe does not extract or transmit identity data to the developer.
- **Health information:** No.
- **Financial/payment information:** No.
- **Authentication information:** No.
- **Personal communications:** No as a product data category; Flashframe does not integrate with email/chat services or transmit communications to the developer.
- **Location:** No.

If Google changes the Dashboard's category wording, map the answers by behavior rather than blindly copying labels.

## Data-use certifications

Based on the current candidate, certify the applicable statements that:

- user data is not sold or transferred outside approved use cases;
- user data is not used or transferred for purposes unrelated to Flashframe's disclosed single purpose; and
- user data is not used or transferred to determine creditworthiness or for lending purposes.

## Reviewer setup

Paste or adapt:

> No external setup is required. Flashframe is self-contained in Chrome and requires no desktop companion, EXE, Python runtime, localhost service, native messaging host, Flashframe account, or developer-operated cloud backend. Install the extension and click its toolbar icon to open the workspace. Create a note, move/resize it, optionally open a local PDF/video/gallery through Chrome's native picker, or deliberately drag a local PDF, video, text/code file, image, or image directory into the workspace. Dropped image directories use the gallery/lightbox flow. Save a named Flashframe, close/reopen the workspace, and restore it. YouTube URLs can be added as ordinary web/link blocks and opened externally without special permissions.

## Release reference

Reference prerelease tag:

`flashframe-chrome-v1.0.5-rc1`

The prerelease is for reproducibility and reviewer/support reference. The Chrome Web Store upload must still be the exact tested `flashframe-chrome-web-store-v1.0.5.zip` candidate produced by the green Windows release workflow.

## Do not submit until

- the exact Windows candidate passes `docs/WINDOWS_STORE_TEST.md`;
- `chrome://extensions` has no reproducible Flashframe errors;
- screenshots come from that exact candidate; and
- the Developer Dashboard shows no unresolved blocking requirements.
