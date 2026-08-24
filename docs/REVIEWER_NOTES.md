# FrameChute Chrome Web Store Reviewer Notes

These notes are for the exact v1.0.8 submission candidate from `chrome-web-store-submission-2026-08-24`.

## Product / single purpose

FrameChute is a spatial browser workspace for arranging, saving, restoring, and directly manipulating user-selected notes, files, media, links, and web content in one visual canvas.

All major features are part of that same workspace purpose.

## Setup

No external setup is required.

FrameChute requires no:

- account or login;
- desktop companion;
- Windows executable;
- Python installation;
- localhost service;
- native messaging host; or
- developer-operated cloud backend.

The manifest requests no Chrome extension API permissions and no host permissions.

Install the extension and click the FrameChute toolbar icon. The workspace opens in an extension-owned tab.

## Fast reviewer test

1. Click the FrameChute toolbar icon.
2. Create a text note, enter text, then move and resize the block.
3. Click **Open PDF** and choose a local PDF with Chrome's file picker.
4. Click **Open gallery** and choose a local image directory.
5. Optionally open local audio/video or drag a supported local source into the workspace.
6. Save a named workspace.
7. Close the workspace tab, reopen FrameChute, and restore the saved workspace.
8. Add an HTTPS URL. If the destination allows embedding it can appear in the workspace; otherwise it remains usable as a normal external link.

Local file and folder access occurs only after explicit user action through Chrome's native picker or deliberate drag-and-drop.

## What the extension stores

FrameChute stores workspace state locally so it can restore the user's arrangement. Depending on the features used, local state may include note text, block geometry, URLs explicitly added by the user, PDF/gallery position, media playback state, appearance settings, and browser-managed handles for sources the user explicitly selected.

Normal workspace contents are not sent to the developer.

## Network behavior

FrameChute has no analytics, advertising network, behavioral telemetry, account service, or developer-operated cloud sync.

When the user deliberately adds remote content, Chrome connects directly to the user-selected destination. FrameChute does not request host permissions and does not monitor unrelated browsing.

The optional support/donation control opens an external Stripe-hosted checkout page only after the user clicks it. FrameChute does not receive or store payment-card data.

## Remote code

Dashboard answer: **No remotely hosted executable code.**

All executable extension JavaScript is inside the submitted package. User-selected webpages, images, and media are content and are not downloaded and executed as extension JavaScript or WebAssembly.

## Compatibility note

Some source files and local-storage/database keys retain the historical internal prefix `flashframe` for backward compatibility with existing local data. The visible product name and submitted manifest name are **FrameChute**. Those compatibility identifiers do not represent a second product or remotely loaded component.

## Privacy policy

Use the stable public policy after this branch is merged:

`https://github.com/thanks-cohn/framechute/blob/main/PRIVACY.md`
