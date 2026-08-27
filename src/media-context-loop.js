const workspace = document.querySelector("#workspace");
const menu = document.querySelector(".flashframe-layer-menu");
const STORAGE_KEY = "framechute.local-media-loop.v1";

if (!menu) {
  console.warn("FrameChute media loop menu could not find the layer menu.");
} else {
  const style = document.createElement("style");
  style.textContent = `
    .flashframe-layer-menu [data-layer-action="media-loop"].is-active {
      color: #5be58b;
      font-weight: 760;
    }
  `;
  document.head.append(style);

  const loopButton = document.createElement("button");
  loopButton.type = "button";
  loopButton.dataset.layerAction = "media-loop";
  loopButton.setAttribute("role", "menuitemcheckbox");
  loopButton.hidden = true;

  const independent = menu.querySelector('[data-layer-action="independent"]');
  if (independent) independent.insertAdjacentElement("afterend", loopButton);
  else menu.prepend(loopButton);

  let currentBlock = null;

  function readMap() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function writeMap(map) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch { /* Current session still works. */ }
  }

  function mediaFor(block) {
    return block?.querySelector("video, audio") || null;
  }

  function stateStore(block) {
    return block?.querySelector(":scope > .custom-state-store, :scope > .remote-video-state") || null;
  }

  function readPayloadLoop(block) {
    const store = stateStore(block);
    const start = store?.value?.indexOf("{") ?? -1;
    if (start < 0) return null;
    try {
      const payload = JSON.parse(store.value.slice(start));
      return typeof payload.mediaLoop === "boolean" ? payload.mediaLoop : null;
    } catch {
      return null;
    }
  }

  function writePayloadLoop(block, enabled) {
    const store = stateStore(block);
    const start = store?.value?.indexOf("{") ?? -1;
    if (!store || start < 0) return;
    try {
      const payload = JSON.parse(store.value.slice(start));
      payload.mediaLoop = Boolean(enabled);
      store.value = `${store.value.slice(0, start)}${JSON.stringify(payload)}`;
    } catch { /* Keep malformed legacy state untouched. */ }
  }

  function savedLoop(block) {
    const payload = readPayloadLoop(block);
    if (payload != null) return payload;
    const id = block?.dataset.blockId;
    if (!id) return null;
    const map = readMap();
    return Object.prototype.hasOwnProperty.call(map, id) ? Boolean(map[id]) : null;
  }

  function effectiveLoop(block) {
    const player = mediaFor(block);
    if (!player) return false;
    const checkbox = block.querySelector(".video-loop");
    if (checkbox) return Boolean(checkbox.checked);
    const saved = savedLoop(block);
    return saved == null ? Boolean(player.loop) : saved;
  }

  function persistLoop(block, enabled) {
    const id = block?.dataset.blockId;
    if (id) {
      const map = readMap();
      map[id] = Boolean(enabled);
      writeMap(map);
    }
    block.dataset.localMediaLoop = enabled ? "true" : "false";
    writePayloadLoop(block, enabled);
    workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
  }

  function applyLoop(block, enabled, persist = true) {
    const player = mediaFor(block);
    if (!player) return;

    const checkbox = block.querySelector(".video-loop");
    if (checkbox) {
      checkbox.checked = Boolean(enabled);
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      player.loop = Boolean(enabled);
    }

    player.loop = Boolean(enabled);
    if (persist) persistLoop(block, enabled);
    window.dispatchEvent(new CustomEvent("flashframe:local-media-loop-changed", {
      detail: { block, player, enabled: Boolean(enabled) }
    }));
  }

  function hydrateBlock(block) {
    const player = mediaFor(block);
    if (!player) return;
    const saved = savedLoop(block);
    if (saved == null) return;
    applyLoop(block, saved, false);
  }

  function syncMenuItem(block) {
    currentBlock = block;
    const player = mediaFor(block);
    loopButton.hidden = !player;
    if (!player) return;

    const enabled = effectiveLoop(block);
    loopButton.classList.toggle("is-active", enabled);
    loopButton.setAttribute("aria-checked", String(enabled));
    loopButton.textContent = enabled ? "✓ Loop this media" : "Loop this media";
  }

  workspace.addEventListener("contextmenu", (event) => {
    const block = event.target.closest(".block");
    queueMicrotask(() => syncMenuItem(block));
  });

  loopButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!currentBlock) return;
    applyLoop(currentBlock, !effectiveLoop(currentBlock), true);
    syncMenuItem(currentBlock);
  });

  const hydrate = () => {
    for (const block of workspace.querySelectorAll(".block")) hydrateBlock(block);
  };

  new MutationObserver(hydrate).observe(workspace, { childList: true, subtree: false });
  window.addEventListener("flashframe:restore-appearance", () => requestAnimationFrame(hydrate));
  hydrate();
}
