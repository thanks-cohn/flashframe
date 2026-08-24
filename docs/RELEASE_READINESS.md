# FrameChute Chrome Web Store Release Readiness

Branch: `chrome-web-store-submission-2026-08-24`

Target version: **1.0.8**

Runtime baseline: August 24, 2026 Windows-tested FrameChute `main`, including the packaged Default Grab fixes, media-player Default Grab fix, serialized Windows file pickers, and lower-memory observer cleanup.

## Already satisfied in source

- [x] Manifest V3.
- [x] Visible product name is FrameChute.
- [x] Toolbar action opens the extension-owned workspace.
- [x] One narrow disclosed purpose: spatial workspace.
- [x] No Chrome extension API permissions.
- [x] No host permissions.
- [x] No content-script access to arbitrary browsing tabs.
- [x] No native messaging.
- [x] No desktop companion / EXE / Python / localhost requirement.
- [x] No developer account/login required.
- [x] No developer cloud backend required for core operation.
- [x] No analytics/ad network/behavioral telemetry in the submitted build.
- [x] No remotely hosted executable extension code.
- [x] Local file/folder access is explicit through native picker or drag/drop.
- [x] Required 16, 32, 48, and 128 pixel manifest icons are present.
- [x] Current privacy policy prepared for FrameChute.
- [x] Current Store listing copy prepared.
- [x] Current single-purpose wording prepared.
- [x] Current Privacy practices / Dashboard answers prepared.
- [x] Reviewer notes prepared.
- [x] Windows exact-package smoke test prepared.
- [x] Runtime was manually tested successfully on Windows immediately before submission prep.

## Automated gate still required for this branch

- [ ] JavaScript syntax check passes.
- [ ] Chrome package script passes.
- [ ] v1.0.8 ZIP has manifest at archive root.
- [ ] Packaged ZIP contains critical current runtime files and packaged Grab assets.
- [ ] CI for this branch is green.

## Manual exact-candidate gate

- [ ] Extract/load the exact v1.0.8 ZIP on stable Chrome for Windows.
- [ ] Workspace opens normally.
- [ ] Normal Default Grab artwork works.
- [ ] Media-player Default Grab has no broken-image icon.
- [ ] PDF/gallery native pickers behave one-at-a-time.
- [ ] Note create/move/resize works.
- [ ] Local media works.
- [ ] Save/reopen/restore works.
- [ ] Settings/context UI is readable.
- [ ] `chrome://extensions` shows no reproducible extension errors.
- [ ] Workspace console shows no reproducible uncaught exceptions in the smoke path.

## Store/Dashboard gate

- [ ] Submission branch is merged so the stable main-branch privacy URL shows the current policy.
- [ ] Privacy URL verified in an incognito/private window.
- [ ] Store listing copied from `docs/STORE_LISTING.md`.
- [ ] Privacy practices copied/mapped from `docs/DASHBOARD_ANSWERS.md` and checked against current Dashboard wording.
- [ ] Reviewer instructions copied from `docs/REVIEWER_NOTES.md`.
- [ ] At least one real screenshot from the exact candidate is uploaded; preferably five.
- [ ] Screenshots are 1280x800 preferred (or 640x400), square-corner/full-bleed.
- [ ] 440x280 small promo tile is uploaded.
- [ ] Optional 1400x560 marquee image is accurate if provided.
- [ ] Publisher contact email is verified.
- [ ] Publishing Google Account has 2-Step Verification enabled.
- [ ] Developer/publisher identity requirements shown by the Dashboard are complete.
- [ ] Any trader/non-trader disclosure shown by the Dashboard is answered accurately.
- [ ] Google's draft pre-submission installation checks pass after ZIP upload.
- [ ] No unresolved Dashboard warnings/blockers remain.

## Go / no-go rule

**GO** only when every automated, manual exact-candidate, and Dashboard gate above is complete.

A passing build by itself is not enough. If a feature claim does not survive the exact-candidate test, fix it or remove the claim before submission rather than adding unnecessary permissions.
