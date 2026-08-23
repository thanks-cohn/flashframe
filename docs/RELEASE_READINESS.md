# Flashframe Chrome release readiness

Branch: `windows-ux-audio-restore-pass`

Target manifest version: `1.0.6`

Historical tested prerelease (unchanged): `flashframe-chrome-v1.0.5-rc1`

Candidate: v1.0.6 RC2 source; no RC2 tag is created by this preparation pass.

## Ready before hands-on Windows testing

- [x] Manifest V3.
- [x] Extension-owned workspace opens from the toolbar action.
- [x] No desktop companion architecture.
- [x] No `.exe`, Python runtime, localhost service, or native messaging requirement.
- [x] No broad host access.
- [x] Host permissions limited to `www.youtube.com` and `www.youtube-nocookie.com`.
- [x] Only one extension API permission: `declarativeNetRequestWithHostAccess`.
- [x] Packaged static YouTube rule present.
- [x] Windows Store packager rejects companion/native-messaging/broad-host dependencies and common remote executable-code patterns.
- [x] Required 16, 32, 48, and 128 pixel icons present in the manifest/package gate.
- [x] Privacy policy written for the Chrome-only architecture.
- [x] Store listing copy prepared.
- [x] Single-purpose statement prepared.
- [x] Permission justifications prepared.
- [x] Remote-code answer prepared.
- [x] Reviewer setup/test instructions prepared.
- [x] Windows exact-candidate test instructions prepared.
- [x] CI workflow builds the exact candidate on `windows-latest`.
- [x] CI artifact includes the Store ZIP and exact unpacked test copy.
- [x] Reference prerelease workflow is configured to publish the candidate package and review documentation.
- [x] Universal drag/drop routes images, PDFs, local videos, text/code files, generic files, URLs, and dropped image directories into workspace blocks.
- [x] Dropped image directories use the gallery/lightbox flow with previous/next and keyboard navigation.
- [x] Schema v2 named checkpoints and live autosave include workspace appearance and remain backward compatible with v1.
- [x] Native audio drops, visible/fade/hidden modes, mixed audio/video sync groups, and group-aware transport are implemented without new permissions.
- [x] Blocks use a standardized generous grab-hand affordance; context menus recover the toolbar and Settings.

## Must still be completed before submission

- [ ] Latest Windows CI run is green after all release-prep changes.
- [ ] Exact `test-unpacked` candidate is manually tested in current stable Chrome on Windows.
- [ ] Notes, local text, PDF, gallery, local video, drag/drop, URL blocks, direct remote video, YouTube, save/restore, reconnect behavior, appearance/background, and shrink-to-fit are tested as applicable to the exact build.
- [ ] Dropped PDF, video, text/code file, generic file, image, URL, and image-directory flows are tested on the exact Windows candidate.
- [ ] `chrome://extensions` shows no reproducible Flashframe errors after the test pass.
- [ ] Workspace DevTools shows no reproducible uncaught extension exceptions in tested flows.
- [ ] Any feature that fails the Windows test is fixed or removed from the Store listing before submission.
- [ ] Real Chrome Web Store screenshots are captured from the exact tested candidate.
- [ ] Screenshot and promotional-asset dimensions are checked against the current Developer Dashboard requirements.
- [ ] Stable public privacy-policy URL is entered in the Dashboard.
- [ ] Store Listing tab is filled from `docs/STORE_LISTING.md`.
- [ ] Privacy/Data Use answers are filled from `PRIVACY.md` and `docs/REVIEWER_NOTES.md` and checked against the exact candidate.
- [ ] Publisher contact email and all required account verification are complete.
- [ ] The exact Store ZIP from the same tested green candidate is uploaded.
- [ ] All Developer Dashboard warnings/blockers are reviewed before Submit.

## Release rule

Do not submit merely because the ZIP builds. A successful submission candidate requires both the automated release gate and the manual Windows test above.

If manual testing disproves a feature claim, prefer removing the claim or feature over adding unnecessary permissions or an external companion.
