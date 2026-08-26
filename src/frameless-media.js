const MARKER = "__FLASHFRAME_CUSTOM_BLOCK_V1__";
const workspace = document.querySelector("#workspace");
const restoreAllButton = document.querySelector("#restore-image-frames");
const aspectRatioInput = document.querySelector("#setting-frameless-aspect-ratio");
const resizeHandleModeSelect = document.querySelector("#setting-frameless-resize-handle-mode");
const resizeHandleDelayInput = document.querySelector("#setting-frameless-resize-handle-delay");
const ASPECT_RATIO_KEY = "framechute.frameless-image-aspect-ratio.v1";
const RESIZE_HANDLE_MODE_KEY = "framechute.frameless-resize-handle-mode.v1";
const RESIZE_HANDLE_DELAY_KEY = "framechute.frameless-resize-handle-delay.v1";
const resizeHandleTimers = new WeakMap();

const stylesheet = document.createElement("link");
stylesheet.rel = "stylesheet";
stylesheet.href = new URL("./frameless-media.css", import.meta.url).href;
document.head.append(stylesheet);

function preserveAspectRatio() {
  try {
    return localStorage.getItem(ASPECT_RATIO_KEY) !== "false";
  } catch {
    return true;
  }
}

if (aspectRatioInput) {
  aspectRatioInput.checked = preserveAspectRatio();
  aspectRatioInput.addEventListener("change", () => {
    try {
      localStorage.setItem(ASPECT_RATIO_KEY, String(aspectRatioInput.checked));
    } catch (error) {
      console.warn("Could not save frameless image aspect-ratio preference:", error);
    }
  });
}

function resizeHandleMode() {
  try {
    const mode = localStorage.getItem(RESIZE_HANDLE_MODE_KEY);
    return ["always", "fade", "hide"].includes(mode) ? mode : "fade";
  } catch {
    return "fade";
  }
}

function resizeHandleDelayMs() {
  try {
    const seconds = Number.parseFloat(localStorage.getItem(RESIZE_HANDLE_DELAY_KEY) ?? "3");
    return (Number.isFinite(seconds) ? Math.min(300, Math.max(1, seconds)) : 3) * 1000;
  } catch {
    return 3000;
  }
}

function scheduleResizeHandleFade(handle, immediate = false) {
  const oldTimer = resizeHandleTimers.get(handle);
  if (oldTimer) clearTimeout(oldTimer);
  resizeHandleTimers.delete(handle);

  const mode = resizeHandleMode();
  handle.dataset.visibilityMode = mode;
  handle.classList.toggle("is-resize-handle-visible", mode === "always" || mode === "fade");
  if (mode !== "fade") return;

  const timer = setTimeout(() => {
    resizeHandleTimers.delete(handle);
    if (!handle.matches(":hover, :focus-visible") && !handle.closest(".is-frameless-resizing")) {
      handle.classList.remove("is-resize-handle-visible");
    }
  }, immediate ? 0 : resizeHandleDelayMs());
  resizeHandleTimers.set(handle, timer);
}

function applyResizeHandlePreference() {
  for (const handle of workspace.querySelectorAll(".frameless-resize-handle")) {
    scheduleResizeHandleFade(handle);
  }
}

if (resizeHandleModeSelect) {
  resizeHandleModeSelect.value = resizeHandleMode();
  resizeHandleModeSelect.addEventListener("change", () => {
    try { localStorage.setItem(RESIZE_HANDLE_MODE_KEY, resizeHandleModeSelect.value); } catch { /* best effort */ }
    applyResizeHandlePreference();
  });
}

if (resizeHandleDelayInput) {
  resizeHandleDelayInput.value = String(resizeHandleDelayMs() / 1000);
  resizeHandleDelayInput.addEventListener("change", () => {
    const parsed = Number.parseFloat(resizeHandleDelayInput.value);
    const seconds = Number.isFinite(parsed) ? Math.min(300, Math.max(1, parsed)) : 3;
    resizeHandleDelayInput.value = String(seconds);
    try { localStorage.setItem(RESIZE_HANDLE_DELAY_KEY, String(seconds)); } catch { /* best effort */ }
    applyResizeHandlePreference();
  });
}

function isImageObject(block) {
  return block instanceof HTMLElement && block.dataset.customKind === "image";
}

function isVideoObject(block) {
  return block instanceof HTMLElement && (
    block.dataset.blockType === "video"
    || block.dataset.customKind === "remote-video"
    || block.classList.contains("remote-video-block")
  );
}

function isVisualMediaObject(block) {
  return isImageObject(block) || isVideoObject(block);
}

function isGalleryObject(block) {
  return block instanceof HTMLElement && (
    block.dataset.blockType === "gallery" || block.classList.contains("gallery-block")
  );
}

function readPayload(block) {
  const store = block.querySelector(":scope > .custom-state-store, :scope > .remote-video-state");
  const jsonStart = store?.value?.indexOf("{") ?? -1;
  if (jsonStart < 0) return null;
  try {
    return JSON.parse(store.value.slice(jsonStart));
  } catch {
    return null;
  }
}

function writePayload(store, payload) {
  const jsonStart = store.value.indexOf("{");
  const marker = jsonStart >= 0 ? store.value.slice(0, jsonStart) : MARKER;
  store.value = `${marker}${JSON.stringify(payload)}`;
}

function persistFrameless(block, frameless) {
  block.dataset.frameless = String(Boolean(frameless));
  const store = block.querySelector(":scope > .custom-state-store, :scope > .remote-video-state");
  const payload = readPayload(block);
  if (!store || !payload) return;
  payload.frameless = Boolean(frameless);
  writePayload(store, payload);
}

function persistChrome(block, part, visibility) {
  block.dataset[`${part}Visibility`] = visibility;
  const store = block.querySelector(":scope > .custom-state-store, :scope > .remote-video-state");
  const payload = readPayload(block);
  if (!store || !payload || !["header", "footer"].includes(part)) return;
  const key = part === "header" ? "headerVisibility" : "footerVisibility";
  const legacyKey = part === "header" ? "hideHeader" : "hideFooter";
  payload[key] = visibility;
  payload[legacyKey] = visibility === "hide";
  writePayload(store, payload);
}

function applyObjectChrome(block, part, visibility, { persist = true, notify = true } = {}) {
  const eligible = part === "header" ? isVisualMediaObject(block) : isVisualMediaObject(block) || isGalleryObject(block);
  if (!eligible || !["header", "footer"].includes(part)) return;
  const state = visibility === "hide" ? "hide" : visibility === "show" ? "show" : "inherit";
  block.classList.toggle(`hide-object-${part}`, state === "hide");
  block.classList.toggle(`show-object-${part}`, state === "show");
  block.dataset[`${part}Visibility`] = state;
  if (persist) persistChrome(block, part, state);
  if (notify) {
    workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
  }
}

function applyFrameless(block, frameless, { persist = true, notify = true } = {}) {
  if (!isVisualMediaObject(block)) return;
  const enabled = Boolean(frameless);
  block.classList.toggle("is-frameless-media", enabled);
  block.dataset.frameless = String(enabled);
  block.setAttribute("aria-label", enabled
    ? `${block.querySelector(".block-name")?.value || (isVideoObject(block) ? "Video" : "Image")}, frameless object`
    : block.querySelector(".block-name")?.value || (isVideoObject(block) ? "Video" : "Image"));
  if (persist) persistFrameless(block, enabled);
  if (notify) {
    workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
  }
}

function imageIsDirectGrabSurface(block) {
  return block.classList.contains("is-frameless-media")
    || block.classList.contains("hide-object-header")
    || (document.body.classList.contains("hide-block-headers")
      && !block.classList.contains("show-object-header"));
}

function dragImageObject(block, event) {
  if (event.button !== 0 || !imageIsDirectGrabSurface(block)) return;
  if (!event.target.closest(".image-frame")) return;
  if (event.target.closest("button, input, textarea, a")) return;
  if (block.classList.contains("is-maximized")) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  let maxZ = 1;
  for (const candidate of workspace.querySelectorAll(".block")) {
    maxZ = Math.max(maxZ, Number.parseInt(candidate.style.zIndex, 10) || 1);
  }
  block.style.zIndex = String(maxZ + 1);

  const startX = event.clientX;
  const startY = event.clientY;
  const startLeft = Number.parseFloat(block.style.left) || block.offsetLeft;
  const startTop = Number.parseFloat(block.style.top) || block.offsetTop;
  const image = block.querySelector(".image-frame") || block;
  image.setPointerCapture(event.pointerId);
  block.classList.add("is-frameless-dragging");

  const move = (moveEvent) => {
    block.style.left = `${startLeft + moveEvent.clientX - startX}px`;
    block.style.top = `${startTop + moveEvent.clientY - startY}px`;
  };

  const finish = () => {
    block.classList.remove("is-frameless-dragging");
    image.removeEventListener("pointermove", move);
    image.removeEventListener("pointerup", finish);
    image.removeEventListener("pointercancel", finish);
    workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
  };

  image.addEventListener("pointermove", move);
  image.addEventListener("pointerup", finish);
  image.addEventListener("pointercancel", finish);
}

function attachFramelessResizeHandle(block) {
  if (!isImageObject(block) || block.querySelector(":scope > .frameless-resize-handle")) return;

  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "frameless-resize-handle";
  handle.textContent = "⅃";
  handle.title = "Drag to resize image";
  handle.setAttribute("aria-label", "Resize image");
  block.append(handle);
  handle.addEventListener("pointerenter", () => {
    if (resizeHandleMode() !== "fade") return;
    handle.classList.add("is-resize-handle-visible");
    scheduleResizeHandleFade(handle);
  });
  handle.addEventListener("focus", () => {
    if (resizeHandleMode() === "fade") handle.classList.add("is-resize-handle-visible");
  });
  handle.addEventListener("blur", () => scheduleResizeHandleFade(handle));
  scheduleResizeHandleFade(handle);

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !block.classList.contains("is-frameless-media")) return;
    event.preventDefault();
    event.stopPropagation();

    const rect = block.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = rect.width;
    const startHeight = rect.height;
    const aspect = startWidth / Math.max(1, startHeight);
    handle.setPointerCapture(event.pointerId);
    block.classList.add("is-frameless-resizing");
    if (resizeHandleMode() === "fade") handle.classList.add("is-resize-handle-visible");

    const move = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      let width = Math.max(32, startWidth + dx);
      let height = Math.max(32, startHeight + dy);
      if (preserveAspectRatio()) {
        const dyAsWidth = dy * aspect;
        const delta = Math.abs(dx) >= Math.abs(dyAsWidth) ? dx : dyAsWidth;
        width = Math.max(32, startWidth + delta);
        height = width / aspect;
      }
      block.style.width = `${width}px`;
      block.style.height = `${height}px`;
    };

    const finish = () => {
      block.classList.remove("is-frameless-resizing");
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
      scheduleResizeHandleFade(handle);
    };

    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  });
}

function prepare(block) {
  if (!isVisualMediaObject(block) && !isGalleryObject(block)) return;
  if (isVisualMediaObject(block) && block.dataset.framelessBound !== "true") {
    block.dataset.framelessBound = "true";
    block.addEventListener("pointerdown", (event) => dragImageObject(block, event), true);
  }
  attachFramelessResizeHandle(block);
  const payload = readPayload(block) || {};
  const footerVisibility = payload.footerVisibility ?? block.dataset.footerVisibility
    ?? (payload.hideFooter === true ? "hide" : payload.hideFooter === false ? "show" : "inherit");
  applyObjectChrome(block, "footer", footerVisibility, { persist: false, notify: false });
  if (isVisualMediaObject(block)) {
    const headerVisibility = payload.headerVisibility ?? block.dataset.headerVisibility
      ?? (payload.hideHeader === true ? "hide" : payload.hideHeader === false ? "show" : "inherit");
    applyObjectChrome(block, "header", headerVisibility, { persist: false, notify: false });
    applyFrameless(block, payload.frameless === true || block.dataset.frameless === "true", { persist: false, notify: false });
  }
}

window.addEventListener("flashframe:set-frameless", (event) => {
  const block = event.detail?.block;
  const frameless = Boolean(event.detail?.frameless);
  if (isVisualMediaObject(block)) {
    const visibility = frameless ? "inherit" : "show";
    applyObjectChrome(block, "header", visibility, { notify: false });
    applyObjectChrome(block, "footer", visibility, { notify: false });
  }
  applyFrameless(block, frameless);
});

window.addEventListener("flashframe:set-object-chrome", (event) => {
  const block = event.detail?.block;
  const hidden = Boolean(event.detail?.hidden);
  applyObjectChrome(block, event.detail?.part, hidden ? "hide" : "show");
});

window.addEventListener("flashframe:restore-media-chrome", (event) => {
  prepare(event.detail?.block);
});

restoreAllButton?.addEventListener("click", () => {
  const images = [...workspace.querySelectorAll('.block[data-custom-kind="image"]')];
  for (const block of images) {
    applyFrameless(block, false, { notify: false });
    applyObjectChrome(block, "header", "show", { notify: false });
    applyObjectChrome(block, "footer", "show", { notify: false });
  }
  if (images.length) {
    workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
  }
  restoreAllButton.textContent = images.length ? `Restored ${images.length}` : "All restored";
  setTimeout(() => { restoreAllButton.textContent = "Restore all"; }, 1400);
});

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.classList.contains("block")) prepare(node);
      for (const block of node.querySelectorAll?.('.block[data-custom-kind="image"], .video-block, .block[data-custom-kind="remote-video"], .gallery-block') ?? []) prepare(block);
    }
  }
});

observer.observe(workspace, { childList: true, subtree: false });
for (const block of workspace.querySelectorAll('.block[data-custom-kind="image"], .video-block, .block[data-custom-kind="remote-video"], .gallery-block')) prepare(block);
