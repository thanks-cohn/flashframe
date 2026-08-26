const href = new URL("./web-drop.css", import.meta.url).href;
if (![...document.styleSheets].some((sheet) => sheet.href === href)) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
}

const polishHref = new URL("./media-ux-polish.css", import.meta.url).href;
if (![...document.styleSheets].some((sheet) => sheet.href === polishHref)) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = polishHref;
  document.head.append(link);
}

const themeHref = new URL("./theme-customization.css", import.meta.url).href;
if (![...document.styleSheets].some((sheet) => sheet.href === themeHref)) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = themeHref;
  document.head.append(link);
}

const mediaDockHref = new URL("./media-dock-layout.css", import.meta.url).href;
if (![...document.styleSheets].some((sheet) => sheet.href === mediaDockHref)) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = mediaDockHref;
  document.head.append(link);
}

const donationHref = new URL("./donation-card.css", import.meta.url).href;
if (![...document.styleSheets].some((sheet) => sheet.href === donationHref)) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = donationHref;
  document.head.append(link);
}

const frameChuteFinalHref = new URL("./framechute-final-polish.css", import.meta.url).href;
if (![...document.styleSheets].some((sheet) => sheet.href === frameChuteFinalHref)) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = frameChuteFinalHref;
  document.head.append(link);
}

const handoffFixesHref = new URL("./handoff-fixes.css", import.meta.url).href;
if (![...document.styleSheets].some((sheet) => sheet.href === handoffFixesHref)) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = handoffFixesHref;
  document.head.append(link);
}

// Install source-location memory before the handoff bridges so it can capture
// the exact FileChute relative path while the original drag payload still
// exists. The location remains copyable even if the live media source later
// loses permission.
await import("./source-locations.js");
// Reconnect pickers use the persisted block id + handle key as a durable hint.
// If Chrome cannot silently reuse the handle, its picker opens at that saved
// location instead of forcing the user to remember where the file lived.
await import("./reconnect-location-picker.js");
await import("./picker-guard.js");
await import("./extension-gallery.js");
await import("./synthetic-file-handle.js");
await import("./filechute-bridge.js");
await import("./filechute-export.js");
await import("./web-drop.js");
await import("./frameless-media.js");
await import("./drop-local-sources.js");
await import("./fit-to-size.js");
await import("./remote-video.js");
await import("./offscreen-rescue.js");
await import("./layer-menu.js");
await import("./appearance.js");
await import("./media-ux-polish.js");
await import("./theme-customization.js");
await import("./media-dock-layout.js");
await import("./media-header-theme.js");
await import("./donation-card.js");
await import("./framechute-final-polish.js");
await import("./media-dock-drop-router.js");
await import("./grab-art-runtime.js");
await import("./framechute-visible-branding.js");
await import("./mascot.js");
await import("./media-dock-grab-pin.js");
