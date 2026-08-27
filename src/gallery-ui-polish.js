const workspace = document.querySelector("#workspace");
const status = document.querySelector("#status");
const menu = document.querySelector(".flashframe-layer-menu");
const STORAGE_KEY = "framechute.gallery-chrome.v1";

const style = document.createElement("style");
style.textContent = `
  /* Status is feedback, not toolbar layout. Keep it readable without letting
     it consume or cover command-button space. */
  #status.status {
    position: fixed !important;
    top: 66px;
    right: 14px;
    z-index: 2147483644;
    width: max-content;
    max-width: min(430px, calc(100vw - 28px));
    margin: 0 !important;
    padding: 8px 11px;
    border: 1px solid color-mix(in srgb, CanvasText 14%, transparent);
    border-radius: 10px;
    background: color-mix(in srgb, Canvas 96%, transparent);
    color: CanvasText !important;
    box-shadow: 0 12px 30px color-mix(in srgb, CanvasText 18%, transparent);
    backdrop-filter: blur(14px);
    font-size: 12px;
    line-height: 1.35;
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: clip !important;
    opacity: .86 !important;
    pointer-events: none;
  }

  #status.status:empty {
    display: none !important;
  }

  body.toolbar-hidden #status.status {
    top: 14px;
  }

  /* A directory gallery gets the same optional per-object chrome contract as
     video/image objects. */
  body #workspace .gallery-block.hide-object-header > .block-header,
  body #workspace .gallery-block.hide-object-header > .compact-drag-handle {
    display: none !important;
  }

  body #workspace .gallery-block.show-object-header > .block-header {
    display: flex !important;
    padding-left: 91px !important;
  }

  body #workspace .gallery-block.show-object-header > .compact-drag-handle {
    display: inline-flex !important;
  }

  body #workspace .gallery-block.hide-object-footer > .gallery-toolbar {
    display: none !important;
  }

  body #workspace .gallery-block.show-object-footer > .gallery-toolbar {
    display: flex !important;
  }

  /* If a gallery/lightbox supplies a small LAYERS caption, it belongs in the
     visual center of the header rather than sitting over window controls. */
  .gallery-block.is-maximized > .block-header {
    position: relative;
  }

  .gallery-block.is-maximized .framechute-gallery-layers-title {
    position: absolute !important;
    left: 50% !important;
    top: 50% !important;
    z-index: 1;
    display: block !important;
    max-width: 40%;
    margin: 0 !important;
    padding: 0 !important;
    transform: translate(-50%, -50%) !important;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .08em;
    pointer-events: none;
  }
`;
document.head.append(style);

function isGallery(block) {
  return block instanceof HTMLElement && (
    block.dataset.blockType === "gallery"
    || block.classList.contains("gallery-block")
    || block.dataset.extensionGallery === "true"
  );
}

function readMap() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function writeMap(value) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* Current-session state still works. */ }
}

function normalize(value) {
  return value === "hide" ? "hide" : value === "show" ? "show" : "inherit";
}

function storedState(block, part) {
  const data = normalize(block.dataset[`${part}Visibility`]);
  if (data !== "inherit" || block.dataset[`${part}Visibility`] === "inherit") return data;
  const id = block.dataset.blockId;
  const saved = id ? readMap()[id]?.[part] : null;
  return normalize(saved);
}

function persistState(block, part, value) {
  const state = normalize(value);
  block.dataset[`${part}Visibility`] = state;
  const id = block.dataset.blockId;
  if (!id) return;
  const map = readMap();
  map[id] ||= {};
  map[id][part] = state;
  writeMap(map);
}

function enforceGalleryFooter(block) {
  if (!isGallery(block)) return;
  const toolbar = block.querySelector(":scope > .gallery-toolbar, :scope > .block-toolbar.gallery-toolbar");
  if (!toolbar) return;
  const state = storedState(block, "footer");
  if (state === "show") {
    toolbar.hidden = false;
    toolbar.classList.remove("is-control-hidden");
  }
}

function applyGalleryChrome(block, part, value, persist = true) {
  if (!isGallery(block) || !["header", "footer"].includes(part)) return;
  const state = normalize(value);
  block.classList.toggle(`hide-object-${part}`, state === "hide");
  block.classList.toggle(`show-object-${part}`, state === "show");
  block.dataset[`${part}Visibility`] = state;
  if (persist) persistState(block, part, state);
  if (part === "footer") enforceGalleryFooter(block);
}

function centerLayersTitle(block) {
  if (!isGallery(block) || !block.classList.contains("is-maximized")) return;
  const header = block.querySelector(":scope > .block-header");
  if (!header) return;

  const title = [...block.querySelectorAll("span, strong, div, label")].find((node) => {
    if (node === header || node.closest(".flashframe-layer-menu")) return false;
    if (node.matches("button, [role='button']") || node.closest("button")) return false;
    return node.textContent?.trim().toUpperCase() === "LAYERS";
  });

  if (!title) return;
  title.classList.add("framechute-gallery-layers-title");
  if (title.parentElement !== header) header.append(title);
}

function prepareGallery(block) {
  if (!isGallery(block)) return;
  applyGalleryChrome(block, "header", storedState(block, "header"), false);
  applyGalleryChrome(block, "footer", storedState(block, "footer"), false);
  enforceGalleryFooter(block);
  centerLayersTitle(block);
}

window.addEventListener("flashframe:set-object-chrome", (event) => {
  const block = event.detail?.block;
  if (!isGallery(block)) return;
  const part = event.detail?.part;
  if (!["header", "footer"].includes(part)) return;
  applyGalleryChrome(block, part, event.detail?.hidden ? "hide" : "show", true);
});

window.addEventListener("flashframe:restore-media-chrome", (event) => {
  if (isGallery(event.detail?.block)) requestAnimationFrame(() => prepareGallery(event.detail.block));
});

workspace?.addEventListener("contextmenu", (event) => {
  const block = event.target.closest(".block");
  if (!isGallery(block)) return;
  queueMicrotask(() => {
    const headerButton = menu?.querySelector('[data-layer-action="object-header"]');
    if (!headerButton) return;
    headerButton.hidden = false;
    const hidden = block.classList.contains("hide-object-header");
    headerButton.textContent = hidden ? "Restore object header" : "Hide object header";
  });
});

const observer = new MutationObserver((mutations) => {
  const galleries = new Set();
  for (const mutation of mutations) {
    const element = mutation.target instanceof HTMLElement ? mutation.target : mutation.target.parentElement;
    const owner = element?.closest?.(".gallery-block, [data-block-type='gallery'], [data-extension-gallery='true']");
    if (owner) galleries.add(owner);
    for (const node of mutation.addedNodes || []) {
      if (!(node instanceof HTMLElement)) continue;
      if (isGallery(node)) galleries.add(node);
      for (const block of node.querySelectorAll?.(".gallery-block, [data-block-type='gallery'], [data-extension-gallery='true']") || []) galleries.add(block);
    }
  }
  for (const block of galleries) prepareGallery(block);
});

if (workspace) {
  observer.observe(workspace, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "hidden", "data-block-type", "data-extension-gallery"]
  });
  for (const block of workspace.querySelectorAll(".gallery-block, [data-block-type='gallery'], [data-extension-gallery='true']")) prepareGallery(block);
}

if (status) status.setAttribute("aria-atomic", "true");
