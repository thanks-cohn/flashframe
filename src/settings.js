const SETTINGS_KEY = "flashframe.settings.v1";
const VIDEO_LOOP_OVERRIDES_KEY = "flashframe.video-loop-overrides.v1";
const SUMMON_POSITION_KEY = "flashframe.toolbar-summon-position.v1";

const defaults = {
  showBlockHeaders: true,
  showToolbar: true,
  loopVideosByDefault: false
};

const toolbar = document.querySelector(".toolbar");
const workspace = document.querySelector("#workspace");
const settingsToggle = document.querySelector("#settings-toggle");
const settingsPanel = document.querySelector("#settings-panel");
const settingsClose = document.querySelector("#settings-close");
const showBlockHeadersInput = document.querySelector("#setting-block-headers");
const showToolbarInput = document.querySelector("#setting-toolbar");
const loopVideosInput = document.querySelector("#setting-loop-videos");
const toolbarSummon = document.querySelector("#toolbar-summon");

let toolbarOverride = null;
let suppressSummonClick = false;
let settings = readJson(SETTINGS_KEY, defaults);
let videoLoopOverrides = readJson(VIDEO_LOOP_OVERRIDES_KEY, {});

settings = { ...defaults, ...settings };

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Could not persist ${key}:`, error);
  }
}

function saveSettings() {
  writeJson(SETTINGS_KEY, settings);
}

function saveVideoLoopOverrides() {
  writeJson(VIDEO_LOOP_OVERRIDES_KEY, videoLoopOverrides);
}

function effectiveToolbarVisible() {
  return toolbarOverride ?? settings.showToolbar;
}

function closeSettings() {
  settingsPanel.hidden = true;
  settingsToggle.setAttribute("aria-expanded", "false");
}

function openSettings() {
  toolbarOverride = true;
  applyToolbarVisibility();
  settingsPanel.hidden = false;
  settingsToggle.setAttribute("aria-expanded", "true");
}

function toggleSettings() {
  if (settingsPanel.hidden) openSettings();
  else closeSettings();
}

function applyToolbarVisibility() {
  const visible = effectiveToolbarVisible();
  document.body.classList.toggle("toolbar-hidden", !visible);

  if (!visible) closeSettings();
}

function getVideoLoopValue(block) {
  const blockId = block.dataset.blockId;
  if (blockId && Object.prototype.hasOwnProperty.call(videoLoopOverrides, blockId)) {
    return Boolean(videoLoopOverrides[blockId]);
  }

  return Boolean(settings.loopVideosByDefault);
}

function applyVideoLoop(block) {
  const player = block.querySelector(".video-player");
  const checkbox = block.querySelector(".video-loop");
  if (!player || !checkbox) return;

  const shouldLoop = getVideoLoopValue(block);
  player.loop = shouldLoop;
  checkbox.checked = shouldLoop;

  if (!checkbox.dataset.flashframeLoopBound) {
    checkbox.dataset.flashframeLoopBound = "true";

    checkbox.addEventListener("change", () => {
      const blockId = block.dataset.blockId;
      if (!blockId) return;

      videoLoopOverrides[blockId] = checkbox.checked;
      player.loop = checkbox.checked;
      saveVideoLoopOverrides();
    });

    const control = checkbox.closest(".video-loop-control");
    control?.addEventListener("dblclick", (event) => {
      event.preventDefault();
      const blockId = block.dataset.blockId;
      if (!blockId) return;

      delete videoLoopOverrides[blockId];
      saveVideoLoopOverrides();
      applyVideoLoop(block);
    });

    if (control) {
      control.title = "Loop this video. Double-click to follow the global default again.";
    }
  }
}

function bringBlockForward(block) {
  let maxZ = 1;
  for (const candidate of workspace.querySelectorAll(".block")) {
    const z = Number.parseInt(candidate.style.zIndex, 10);
    if (Number.isFinite(z)) maxZ = Math.max(maxZ, z);
  }
  block.style.zIndex = String(maxZ + 1);
}

function attachCompactDragHandle(block) {
  if (block.querySelector(":scope > .compact-drag-handle")) return;

  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "compact-drag-handle";
  handle.textContent = "⋮";
  handle.title = "Drag block";
  handle.setAttribute("aria-label", "Drag block");
  block.append(handle);

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();
    bringBlockForward(block);

    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = Number.parseFloat(block.style.left) || block.offsetLeft;
    const startTop = Number.parseFloat(block.style.top) || block.offsetTop;

    handle.classList.add("is-dragging");
    handle.setPointerCapture(event.pointerId);

    const move = (moveEvent) => {
      block.style.left = `${startLeft + moveEvent.clientX - startX}px`;
      block.style.top = `${startTop + moveEvent.clientY - startY}px`;
    };

    const finish = () => {
      handle.classList.remove("is-dragging");
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
    };

    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  });
}

function prepareBlock(block) {
  if (!(block instanceof HTMLElement) || !block.classList.contains("block")) return;

  attachCompactDragHandle(block);
  if (block.dataset.blockType === "video") applyVideoLoop(block);
}

function prepareExistingBlocks() {
  for (const block of workspace.querySelectorAll(".block")) prepareBlock(block);
}

function applySettings() {
  showBlockHeadersInput.checked = Boolean(settings.showBlockHeaders);
  showToolbarInput.checked = Boolean(settings.showToolbar);
  loopVideosInput.checked = Boolean(settings.loopVideosByDefault);

  document.body.classList.toggle("hide-block-headers", !settings.showBlockHeaders);
  applyToolbarVisibility();
  prepareExistingBlocks();
}

function clampSummonPosition(x, y) {
  const width = toolbarSummon.offsetWidth || 36;
  const height = toolbarSummon.offsetHeight || 36;
  const margin = 8;

  return {
    x: Math.min(Math.max(margin, x), Math.max(margin, window.innerWidth - width - margin)),
    y: Math.min(Math.max(margin, y), Math.max(margin, window.innerHeight - height - margin))
  };
}

function setSummonPosition(x, y, persist = false) {
  const point = clampSummonPosition(x, y);
  toolbarSummon.style.left = `${point.x}px`;
  toolbarSummon.style.top = `${point.y}px`;

  if (persist) writeJson(SUMMON_POSITION_KEY, point);
}

function restoreSummonPosition() {
  const saved = readJson(SUMMON_POSITION_KEY, null);
  if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
    setSummonPosition(saved.x, saved.y);
    return;
  }

  setSummonPosition(window.innerWidth - 52, window.innerHeight - 52);
}

settingsToggle.addEventListener("click", toggleSettings);
settingsClose.addEventListener("click", closeSettings);

showBlockHeadersInput.addEventListener("change", () => {
  settings.showBlockHeaders = showBlockHeadersInput.checked;
  saveSettings();
  applySettings();
});

showToolbarInput.addEventListener("change", () => {
  settings.showToolbar = showToolbarInput.checked;
  toolbarOverride = null;
  saveSettings();
  applyToolbarVisibility();
});

loopVideosInput.addEventListener("change", () => {
  settings.loopVideosByDefault = loopVideosInput.checked;
  saveSettings();

  for (const block of workspace.querySelectorAll('.block[data-block-type="video"]')) {
    applyVideoLoop(block);
  }
});

toolbarSummon.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;

  const rect = toolbarSummon.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  const startLeft = rect.left;
  const startTop = rect.top;
  let moved = false;

  toolbarSummon.classList.add("is-dragging");
  toolbarSummon.setPointerCapture(event.pointerId);

  const move = (moveEvent) => {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    setSummonPosition(startLeft + dx, startTop + dy);
  };

  const finish = () => {
    toolbarSummon.classList.remove("is-dragging");
    toolbarSummon.removeEventListener("pointermove", move);
    toolbarSummon.removeEventListener("pointerup", finish);
    toolbarSummon.removeEventListener("pointercancel", finish);

    const finalRect = toolbarSummon.getBoundingClientRect();
    setSummonPosition(finalRect.left, finalRect.top, true);

    if (moved) {
      suppressSummonClick = true;
      queueMicrotask(() => {
        suppressSummonClick = false;
      });
    }
  };

  toolbarSummon.addEventListener("pointermove", move);
  toolbarSummon.addEventListener("pointerup", finish);
  toolbarSummon.addEventListener("pointercancel", finish);
});

toolbarSummon.addEventListener("click", () => {
  if (suppressSummonClick) return;

  toolbarOverride = !effectiveToolbarVisible();
  applyToolbarVisibility();
});

document.addEventListener("pointerdown", (event) => {
  if (settingsPanel.hidden) return;
  if (settingsPanel.contains(event.target) || settingsToggle.contains(event.target)) return;
  closeSettings();
});

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.classList.contains("block")) prepareBlock(node);
      for (const block of node.querySelectorAll?.(".block") ?? []) prepareBlock(block);
    }
  }
});

observer.observe(workspace, { childList: true, subtree: true });

window.addEventListener("resize", () => {
  const rect = toolbarSummon.getBoundingClientRect();
  setSummonPosition(rect.left, rect.top, true);
});

restoreSummonPosition();
applySettings();
