# FrameChute Chrome Web Store Dashboard Answers

Use these answers for the exact v1.0.8 candidate from `chrome-web-store-submission-2026-08-24`. Re-audit them if runtime behavior changes.

## Store listing

**Name**

FrameChute

**Summary**

Arrange notes, PDFs, images, audio, video, and links in a persistent spatial workspace.

**Category**

Productivity, or the closest current Productivity / Workflow category shown by the Dashboard.

**Homepage**

`https://github.com/thanks-cohn/framechute`

**Support**

`https://github.com/thanks-cohn/framechute/issues`

**Privacy policy**

After this branch is merged, use:

`https://github.com/thanks-cohn/framechute/blob/main/PRIVACY.md`

Before pressing Submit, open that URL in a private/incognito window and confirm it displays the August 24, 2026 FrameChute policy.

**Mature content**

No.

## Single purpose

Paste:

> FrameChute is a spatial browser workspace for arranging, saving, restoring, and directly manipulating user-selected notes, files, media, links, and web content in one visual canvas.

## Permissions

The submitted manifest requests no Chrome extension API permissions and no host permissions. There are therefore no permission justifications to provide beyond explaining that local sources are chosen explicitly with browser-native pickers or drag-and-drop.

## Remote code

Select **No** for remotely hosted executable code.

If a text explanation is requested, use:

> All executable FrameChute JavaScript is packaged in the submitted extension ZIP. FrameChute can display user-selected remote webpages, images, and browser-playable media, but it does not download remote JavaScript or WebAssembly and execute it as extension code.

## Data handling / Privacy practices

Google's policy uses "handle" broadly, including local collection/use. FrameChute therefore should disclose the categories it actually handles even though normal workspace contents are not sent to the developer.

Use the current Dashboard wording, but map it conservatively as follows:

- **User-generated content:** Yes, if this category is presented. FrameChute stores user-entered notes and workspace state locally to provide the workspace feature.
- **Website content / resources:** Yes, if this category is presented. FrameChute handles URLs and user-selected remote content in order to display or preserve it in the workspace.
- **Web browsing history/activity:** No. FrameChute does not monitor the user's browsing history or collect a list of sites visited outside content the user deliberately adds to FrameChute.
- **Personally identifiable information:** No as a product data category. There is no FrameChute account/profile system and the extension does not request identity information. User-created notes/files can contain arbitrary content, but FrameChute does not extract identity data or send it to the developer.
- **Financial/payment information:** No. The extension does not receive or store payment-card/account data. If the user clicks the optional support link, payment information is entered on Stripe's external site and handled by Stripe.
- **Authentication information:** No.
- **Health information:** No.
- **Personal communications:** No as a dedicated product data category; FrameChute does not integrate with mail or messaging services. User-entered notes are disclosed as user-generated content.
- **Location:** No.

If Google changes category labels, answer according to actual behavior rather than copying obsolete labels.

## Data use certifications

For the current candidate, certify the applicable Limited Use statements:

- data is used only to provide or improve FrameChute's disclosed spatial-workspace purpose;
- user data is not sold;
- user data is not used or transferred for personalized, retargeted, or interest-based advertising;
- user data is not used for creditworthiness or lending decisions;
- normal workspace contents are not transmitted to the developer for human review.

## Reviewer setup

Paste or adapt:

> No external setup is required. FrameChute is self-contained in Chrome and requests no extension API permissions or host permissions. Install it and click the toolbar icon to open the workspace. Create a note, move and resize it, then optionally choose a local PDF, video, audio file, or image folder through Chrome's native picker. Save a named workspace, close/reopen FrameChute, and restore it. URLs may also be added deliberately by the user; sites that disallow embedding remain usable as normal links. No account, desktop companion, EXE, Python runtime, localhost service, native messaging host, or developer cloud service is required.

## Distribution

For the initial public launch, use **Public** only when the listing, privacy fields, screenshots, promo tile, and exact candidate are ready. Private or unlisted visibility does not avoid policy review.

## Account-level requirements

Before submission confirm:

- publisher identity/verification steps shown in the Dashboard are complete;
- 2-Step Verification is enabled on the publishing Google Account;
- publisher contact email is current and verified;
- any trader/non-trader disclosure requested by the Dashboard is answered accurately.

## Do not submit until

- the exact v1.0.8 package passes automated validation;
- the Windows-tested runtime matches this branch except for submission metadata/docs;
- `chrome://extensions` shows no reproducible FrameChute errors;
- real screenshots show the exact current FrameChute UI;
- the 440x280 small promo tile is ready;
- the stable privacy-policy URL displays the current FrameChute policy; and
- the Dashboard shows no unresolved blockers.
