# Flashframe Chrome release readiness

Branch: `isolated-windows-exe`

Target manifest version: `1.0.4`

Reference prerelease tag: `flashframe-chrome-v1.0.4-rc1`

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

## Must still be completed before submission

- [ ] Latest Windows CI run is green after all release-prep changes.
- [ ] Exact `test-unpacked` candidate is manually tested in current stable Chrome on Windows.
- [ ] Notes, local text, PDF, gallery, local video, drag/drop, URL blocks, direct remote video, YouTube, save/restore, reconnect behavior, appearance/background, and shrink-to-fit are tested as applicable to the exact build.
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
