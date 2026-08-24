# FrameChute Chrome Web Store Submission Handoff — 2026-08-24

## Candidate

Branch: `chrome-web-store-submission-2026-08-24`

Manifest version: **1.0.8**

Base runtime: the August 24 Windows-tested FrameChute build from `main`.

This branch intentionally changes submission metadata, documentation, and release validation rather than redesigning the Windows-tested runtime.

## Exact package

Preferred source: GitHub Actions workflow **Build Chrome Web Store submission candidate**.

Artifact name:

`FrameChute-Chrome-Web-Store-v1.0.8`

Store upload file inside the artifact:

`dist/flashframe-chrome-web-store-v1.0.8.zip`

The historical `flashframe` ZIP filename prefix is packaging compatibility only. The manifest product name is **FrameChute**.

## Approval-oriented properties

The candidate is deliberately conservative:

- Manifest V3.
- One narrow, easy-to-explain purpose.
- Zero Chrome extension API permissions.
- Zero host permissions.
- No content script on arbitrary user browsing tabs.
- No account/login requirement.
- No remote executable extension code.
- No native messaging.
- No desktop companion, EXE, Python, or localhost dependency.
- No analytics, ad network, or behavioral telemetry.
- Local files/folders require explicit user selection or drag/drop.
- User-selected remote content is requested only when the user deliberately adds it.
- Privacy policy explicitly explains local storage, user-selected remote hosts, and the optional Stripe support link.

## Exact single-purpose statement

> FrameChute is a spatial browser workspace for arranging, saving, restoring, and directly manipulating user-selected notes, files, media, links, and web content in one visual canvas.

Use essentially the same wording in the Dashboard, listing, and reviewer notes.

## Dashboard sources

- Store listing: `docs/STORE_LISTING.md`
- Privacy practices: `docs/DASHBOARD_ANSWERS.md`
- Privacy policy: `PRIVACY.md`
- Reviewer instructions: `docs/REVIEWER_NOTES.md`
- Go/no-go checklist: `docs/RELEASE_READINESS.md`
- Exact Windows smoke test: `docs/WINDOWS_STORE_TEST.md`

## Privacy policy URL

For production submission, use:

`https://github.com/thanks-cohn/framechute/blob/main/PRIVACY.md`

**Important:** merge this branch before submission and verify that URL in an incognito/private window. Do not submit while the main-branch URL still displays an older Flashframe policy.

## Store graphics

Prepare from the exact v1.0.8 UI:

- 128x128 store icon: already packaged.
- Screenshots: at least 1, preferably 5, at 1280x800 (or 640x400), full bleed.
- Small promo tile: 440x280 PNG/JPEG.
- Optional marquee: 1400x560 PNG/JPEG.

Recommended five screenshots are listed in `docs/STORE_LISTING.md`.

## Upload/review sequence

1. Wait for both Ubuntu validation and Windows submission-candidate CI to pass.
2. Download `FrameChute-Chrome-Web-Store-v1.0.8` from the green Windows run.
3. Run the short smoke test in `docs/WINDOWS_STORE_TEST.md` against the exact unpacked candidate.
4. Merge this branch so the stable privacy URL is current.
5. In the Chrome Web Store Developer Dashboard, upload the exact v1.0.8 ZIP as a draft.
6. Let Google's pre-submission installation checks finish.
7. Fill the listing and Privacy practices tabs from the source documents above.
8. Upload real screenshots and the 440x280 promo tile.
9. Add reviewer notes.
10. Confirm distribution, regions, publisher contact, verification, and account requirements.
11. Review every warning/blocker.
12. Submit only when `docs/RELEASE_READINESS.md` is fully green.

## Current external requirements to remember

Chrome Web Store currently requires Manifest V3 for new submissions. Accurate Store listing and Privacy practices information are review inputs, and Google recommends minimum permissions, a narrow single purpose, real current screenshots, and clear reviewer usability. Publishing/updating also requires 2-Step Verification on the publishing Google Account.

## Do not do before submission

- Do not add broad host permissions “just in case.”
- Do not add analytics immediately before review.
- Do not add remote script loading.
- Do not advertise planned features.
- Do not use screenshots from a different build.
- Do not use an old Flashframe privacy/listing document.
- Do not claim every website embeds successfully.
- Do not claim Store badges, rankings, or performance superlatives.

## Final expected result

A reviewer should be able to install FrameChute, click its toolbar icon, immediately understand the spatial-workspace purpose, create and manipulate a note, select local content through a user gesture, save/restore a workspace, and verify the product without any external setup or privileged browser access.
