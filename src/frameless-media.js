const MARKER = "__FLASHFRAME_CUSTOM_BLOCK_V1__";
const workspace = document.querySelector("#workspace");
const restoreAllButton = document.querySelector("#restore-image-frames");

const stylesheet = document.createElement("link");
stylesheet.rel = "stylesheet";
stylesheet.href = new URL("./frameless-media.css", import.meta.url).href;
document.head.append(stylesheet);

function isImageObject(block) {
  return block instanceof HTMLElement && block.dataset.customKind === "image";
}

function readPayload(block) {
  const store = block.querySelector(":scope > .custom-state-store");
  if (!store?.value?.startsWith(MARKER)) return null;
  try {
    return JSON.parse(store.value.slice(MARKER.length));
  } catch {
    return null;
  }
}

function persistFrameless(block, frameless) {
  const store = block.querySelector(":scope > .custom-state-store");
  const payload = readPayload(block);
  if (!store || !payload) return;
  payload.frameless = Boolean(frameless);
  store.value = `${MARKER}${JSON.stringify(payload)}`;
}

function persistChrome(block, part, hidden) {
  const store = block.querySelector(":scope > .custom-state-store");
  const payload = readPayload(block);
  if (!store || !payload || !["header", "footer"].includes(part)) return;
  payload[part === "header" ? "hideHeader" : "hideFooter"] = Boolean(hidden);
  store.value = `${MARKER}${JSON.stringify(payload)}`;
}

function applyObjectChrome(block, part, hidden, { persist = true, notify = true } = {}) {
  if (!isImageObject(block) || !["header", "footer"].includes(part)) return;
  block.classList.toggle(`hide-object-${part}`, Boolean(hidden));
  if (persist) persistChrome(block, part, hidden);
  if (notify) {
    workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
  }
}

function applyFrameless(block, frameless, { persist = true, notify = true } = {}) {
  if (!isImageObject(block)) return;
  const enabled = Boolean(frameless);
  block.classList.toggle("is-frameless-media", enabled);
  block.dataset.frameless = String(enabled);
  block.setAttribute("aria-label", enabled
    ? `${block.querySelector(".block-name")?.value || "Image"}, frameless object`
    : block.querySelector(".block-name")?.value || "Image");
  if (persist) persistFrameless(block, enabled);
  if (notify) {
    workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
  }
}

function imageIsDirectGrabSurface(block) {
  return block.classList.contains("is-frameless-media")
    || block.classList.contains("hide-object-header")
    || document.body.classList.contains("hide-block-headers");
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

function prepare(block) {
  if (!isImageObject(block)) return;
  if (block.dataset.framelessBound !== "true") {
    block.dataset.framelessBound = "true";
    block.addEventListener("pointerdown", (event) => dragImageObject(block, event), true);
  }
  const payload = readPayload(block) || {};
  applyObjectChrome(block, "header", Boolean(payload.hideHeader), { persist: false, notify: false });
  applyObjectChrome(block, "footer", Boolean(payload.hideFooter), { persist: false, notify: false });
  applyFrameless(block, Boolean(payload.frameless), { persist: false, notify: false });
}

window.addEventListener("flashframe:set-frameless", (event) => {
  applyFrameless(event.detail?.block, event.detail?.frameless);
});

window.addEventListener("flashframe:set-object-chrome", (event) => {
  applyObjectChrome(event.detail?.block, event.detail?.part, event.detail?.hidden);
});

restoreAllButton?.addEventListener("click", () => {
  const images = [...workspace.querySelectorAll('.block[data-custom-kind="image"]')];
  for (const block of images) {
    applyFrameless(block, false, { notify: false });
    applyObjectChrome(block, "header", false, { notify: false });
    applyObjectChrome(block, "footer", false, { notify: false });
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
      for (const block of node.querySelectorAll?.('.block[data-custom-kind="image"]') ?? []) prepare(block);
    }
  }
});

observer.observe(workspace, { childList: true, subtree: false });
for (const block of workspace.querySelectorAll('.block[data-custom-kind="image"]')) prepare(block);
