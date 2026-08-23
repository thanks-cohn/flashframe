const href = new URL("./web-drop.css", import.meta.url).href;
if (![...document.styleSheets].some((sheet) => sheet.href === href)) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
}

await import("./web-drop.js");
await import("./remote-video.js");
await import("./layer-menu.js");
await import("./appearance.js");
