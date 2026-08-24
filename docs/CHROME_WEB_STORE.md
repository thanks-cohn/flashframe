# FrameChute Chrome Web Store Submission Checklist

Submission branch: `chrome-web-store-submission-2026-08-24`

Target manifest version: **1.0.8**

This branch starts from the August 24 Windows-tested FrameChute runtime and prepares the exact package, listing copy, privacy disclosures, reviewer notes, and pre-submit checks for Chrome Web Store review.

## Why this candidate is reviewer-friendly

- Manifest V3.
- One clear purpose: a spatial browser workspace.
- No Chrome extension API permissions.
- No host permissions.
- No content scripts injected into arbitrary browsing tabs.
- No native messaging.
- No desktop companion, EXE, Python, or localhost dependency.
- No developer account/login required.
- No developer-operated cloud backend required for core use.
- No analytics, ad network, or behavioral telemetry.
- No remotely hosted executable extension code.
- Local files/folders are accessed only after explicit picker or drag/drop action.

## Source-of-truth submission documents

- `PRIVACY.md` — privacy policy.
- `docs/STORE_LISTING.md` — exact listing copy and graphic-asset plan.
- `docs/DASHBOARD_ANSWERS.md` — Privacy practices / Dashboard answers.
- `docs/REVIEWER_NOTES.md` — reviewer setup and quick test.
- `docs/RELEASE_READINESS.md` — go/no-go checklist.
- `docs/WINDOWS_STORE_TEST.md` — hands-on Windows verification.
- `docs/CHROME_WEB_STORE_SUBMISSION_2026-08-24.md` — final handoff packet for this candidate.

## Single purpose

Use this wording consistently:

> FrameChute is a spatial browser workspace for arranging, saving, restoring, and directly manipulating user-selected notes, files, media, links, and web content in one visual canvas.

Every advertised feature should be obviously related to that purpose.

## Permissions

Current permissions: **none**.

Current host permissions: **none**.

Do not add a permission merely to make a reviewer flow easier. If a feature cannot work without a broad permission, remove or redesign the feature before submission unless that permission is genuinely necessary to the disclosed single purpose.

## Remote executable code

Dashboard answer: **No.**

All executable JavaScript is packaged in the submitted ZIP. User-selected remote pages, images, and media are content and are not executed as extension code.

The package gate rejects common remote-code patterns, broad host access, native messaging, localhost, companion-runtime dependencies, and desktop binaries.

## Privacy

FrameChute handles user-selected content locally, so the Privacy practices answers and public privacy policy must accurately disclose that behavior even though the developer does not receive normal workspace contents.

Before submission, open the privacy-policy URL in a private browser window and confirm it shows the current FrameChute policy:

`https://github.com/thanks-cohn/framechute/blob/main/PRIVACY.md`

Do not submit while that URL still shows an older Flashframe policy.

## Build the exact upload ZIP

Linux/macOS:

```bash
sh scripts/package-web-store.sh
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\package-web-store.ps1
```

Expected upload file after the v1.0.8 manifest bump:

`dist/flashframe-chrome-web-store-v1.0.8.zip`

The historical filename prefix remains internal packaging compatibility; the manifest and Store product name are FrameChute.

## Graphic assets

Prepare these from the exact v1.0.8 UI:

- 128x128 store icon in the extension package.
- At least one screenshot, preferably five, at 1280x800 (640x400 is also accepted).
- Required small promo tile: 440x280 PNG or JPEG.
- Optional marquee promo image: 1400x560 PNG or JPEG.

Use actual current UI. Avoid fake Store badges, rankings, unsupported performance claims, excessive text, or mock functionality.

## Dashboard sequence

1. Upload the exact v1.0.8 ZIP as a draft.
2. Let Google's pre-submission installation checks complete and fix any package/install errors before submitting.
3. Fill Store listing from `docs/STORE_LISTING.md`.
4. Fill Privacy practices from `docs/DASHBOARD_ANSWERS.md` and `PRIVACY.md`.
5. Add reviewer instructions from `docs/REVIEWER_NOTES.md`.
6. Add real screenshots and the 440x280 promo tile.
7. Confirm distribution/regions.
8. Review every Dashboard warning.
9. Submit only when `docs/RELEASE_READINESS.md` is green.

## Account-level requirements

Before publishing:

- enable 2-Step Verification on the publishing Google Account;
- complete publisher/developer identity verification requested by the Dashboard;
- verify publisher contact email;
- answer any trader/non-trader or regional disclosure fields accurately.

## Final pre-submit gate

- [ ] Exact v1.0.8 package builds successfully.
- [ ] JavaScript syntax validation passes.
- [ ] Manifest is MV3, name is FrameChute, and permissions/host_permissions are empty.
- [ ] Critical packaged assets and fixes are present.
- [ ] Windows-tested runtime remains unchanged except submission metadata/docs.
- [ ] `chrome://extensions` shows no reproducible extension errors.
- [ ] Core reviewer path works on current stable Chrome.
- [ ] Store listing matches actual shipped behavior.
- [ ] Privacy practices match `PRIVACY.md` and actual behavior.
- [ ] Stable privacy URL displays the current policy.
- [ ] Screenshots come from the submitted candidate.
- [ ] Required promo tile is ready.
- [ ] 2-Step Verification and publisher verification are complete.
- [ ] Google's draft installation checks pass.
- [ ] No unresolved Dashboard blocker remains.

## If Google rejects the item

Use the exact policy/review reason as debugging input. Fix the implementation, disclosure, permission, listing, or reviewer path that caused it. Do not attempt to bypass Store enforcement.

Official references:

- https://developer.chrome.com/docs/webstore/program-policies/
- https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines
- https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- https://developer.chrome.com/docs/webstore/best-listing
