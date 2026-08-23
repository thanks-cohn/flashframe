# Chrome Web Store Submission Checklist

This is the release checklist for publishing the Chrome-only Flashframe candidate from `isolated-windows-exe`.

The repository prepares the exact extension package, privacy policy, permission justifications, listing copy, reviewer notes, Dashboard answers, reproducibility release, and test instructions. The publisher must still complete account-level requirements and the final manual Windows test before submission.

## Source-of-truth documents

- `PRIVACY.md` — privacy policy.
- `docs/STORE_LISTING.md` — Store Listing copy.
- `docs/DASHBOARD_ANSWERS.md` — exact Dashboard field answers and permission justifications.
- `docs/REVIEWER_NOTES.md` — reviewer setup and test path.
- `docs/WINDOWS_STORE_TEST.md` — required hands-on Windows test of the exact candidate.
- `docs/RELEASE_READINESS.md` — go/no-go status.

## Candidate architecture

Flashframe uses Manifest V3 and is self-contained inside Chrome.

It requires no:

- desktop companion;
- Windows executable;
- Python installation;
- localhost service;
- native messaging host;
- Flashframe account; or
- developer-operated cloud backend for normal operation.

Current extension permissions are deliberately narrow:

- `declarativeNetRequestWithHostAccess`
- `https://www.youtube.com/*`
- `https://www.youtube-nocookie.com/*`

Flashframe does not request broad access to all websites.

## Single purpose

Use:

> Flashframe is a spatial browser workspace that lets users arrange, save, restore, and directly manipulate notes, local files, local media, web content, and supported web media in one visual canvas.

All shipped features must remain part of this workspace purpose.

## Permission justifications

Use the exact copy in `docs/DASHBOARD_ANSWERS.md`.

The short form is:

- `declarativeNetRequestWithHostAccess`: one static packaged rule for user-initiated YouTube embed compatibility.
- `www.youtube.com`: only the user-initiated YouTube block and packaged compatibility behavior.
- `www.youtube-nocookie.com`: only the privacy-enhanced YouTube embed and packaged compatibility behavior.

Local sources are selected through browser-native file/directory pickers after explicit user action, rather than broad filesystem permission.

## Remote code

Dashboard answer: **No remotely hosted executable code.**

All executable extension JavaScript ships inside the extension ZIP. User-selected remote webpages, images, direct videos, and YouTube embeds are displayed content; they are not downloaded and executed as extension JavaScript or WebAssembly.

Both Store package scripts reject common remote-code patterns plus localhost, native messaging, companion/EXE dependencies, and broad host access.

## Privacy and data use

Use `PRIVACY.md` and `docs/DASHBOARD_ANSWERS.md` together.

The current candidate:

- stores workspace state locally;
- opens local files/folders only after explicit user selection;
- connects to a remote host only when the user deliberately places remote content in a workspace;
- has no developer analytics, ads, telemetry, account system, or cloud sync;
- does not sell user data; and
- does not collect browsing history.

## Reviewer path

No setup outside Chrome is required. The reviewer can install Flashframe, click the toolbar icon, create/move/resize a note, optionally open a local PDF/video/gallery through Chrome's picker, save a Flashframe, close/reopen the workspace, restore it, and optionally test a YouTube URL.

Use `docs/REVIEWER_NOTES.md` for the exact reviewer text.

## Reference prerelease

The Windows release workflow publishes/updates the candidate reference prerelease:

`https://github.com/thanks-cohn/flashframe/releases/tag/flashframe-chrome-v1.0.4-rc1`

The prerelease is for reproducibility, reviewer/support reference, and our own audit trail. It is not a substitute for Chrome Web Store review and must remain labeled prerelease until the candidate has passed manual Windows testing.

Expected release assets include:

- `flashframe-chrome-web-store-v1.0.4.zip`
- its SHA-256 checksum
- `PRIVACY.md`
- `CHROME_WEB_STORE.md`
- `STORE_LISTING.md`
- `DASHBOARD_ANSWERS.md`
- `REVIEWER_NOTES.md`
- `RELEASE_READINESS.md`
- `WINDOWS_STORE_TEST.md`

## Build the exact upload ZIP

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\package-web-store.ps1
```

### Linux/macOS build environment

```bash
sh scripts/package-web-store.sh
```

Both paths enforce the isolated Chrome release contract. The Windows CI workflow is the preferred source for the exact candidate that will be manually tested and later uploaded.

## Graphic assets

The package contains manifest icons at 16, 32, 48, and 128 pixels.

Real Store screenshots must be captured from the exact manually tested candidate. Do not use mock screenshots or screenshots from a different branch/build.

Recommended screenshot sequence:

1. clean Flashframe workspace with several arranged blocks;
2. local PDF/image/video content;
3. URL or YouTube block beside local content;
4. global video controls;
5. block layer ordering or save/restore workflow.

## Pre-submission gate

Everything below must be true before pressing Submit:

- [ ] Latest Windows candidate workflow is green.
- [ ] Exact `test-unpacked` candidate passes `docs/WINDOWS_STORE_TEST.md` on current stable Chrome for Windows.
- [ ] `chrome://extensions` shows no reproducible Flashframe errors.
- [ ] No reproducible uncaught extension exceptions remain in the workspace console.
- [ ] Every feature advertised in `docs/STORE_LISTING.md` passed the exact-candidate test or was removed from the listing.
- [ ] Real screenshots come from that candidate.
- [ ] Privacy policy URL is public and stable.
- [ ] Dashboard fields are filled from `docs/DASHBOARD_ANSWERS.md` and still match the build.
- [ ] Reviewer notes are filled from `docs/REVIEWER_NOTES.md`.
- [ ] Publisher contact email, 2-Step Verification, and any identity/trader requirements shown by the Dashboard are complete.
- [ ] Exact Store ZIP from the same tested green candidate is uploaded.
- [ ] All Dashboard blockers are cleared and any warnings have been understood.

## If Google rejects the item

Use the exact rejection reason as debugging input. Fix the implementation, permission, listing, privacy disclosure, or reviewer path that caused it. Do not attempt to route around Store enforcement.

Official references:

- Chrome Web Store Program Policies: https://developer.chrome.com/docs/webstore/program-policies/
- Quality guidelines: https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines
- Minimum functionality: https://developer.chrome.com/docs/webstore/program-policies/minimum-functionality
- Manifest V3 remote hosted code guidance: https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code
