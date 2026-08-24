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

await import("./web-drop.js");
await import("./drop-local-sources.js");
await import("./remote-video.js");
await import("./layer-menu.js");
await import("./appearance.js");
await import("./media-ux-polish.js");
await import("./theme-customization.js");
