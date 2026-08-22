import { connectArchiveDirectory, getArchiveStatus } from "./archive.js";

const SETTINGS_KEY = "flashframe.settings.v1";
const VIDEO_LOOP_OVERRIDES_KEY = "flashframe.video-loop-overrides.v1";
const VIDEO_STEP_KEY = "flashframe.video-step-seconds.v1";
const TOOLBAR_BUTTON_KEY = "flashframe.toolbar-summon-position.v1";

const defaults = {
  showBlockHeaders: true,
  showToolbar: true,
  loopVideosByDefault: false
};

const workspace = document.querySelector("#workspace");
const status = document.querySelector("#status");
const settingsToggle = document.querySelector("#settings-toggle");
const settingsPanel = document.querySelector("#settings-panel");
const settingsClose = document.querySelector("#settings-close");
const showBlockHeadersInput = document.querySelector("#setting-block-headers");
const showToolbarInput = document.querySelector("#setting-toolbar");
const loopVideosInput = document.querySelector("#setting-loop-videos");
const stepInput = document.querySelector("#video-rewind-seconds");
const rewindButton = document.querySelector("#video-rewind-all");
const playButton = document.querySelector("#video-play-all");
const forwardButton = document.querySelector("#video-forward-all");
const archiveStatus = document.querySelector("#archive-status");
const archiveConnect = document.querySelector("#archive-connect");
const toolbarSummon = document.querySelector("#toolbar-summon");

let settings = { ...defaults, ...readJson(SETTINGS_KEY, {}) };
let videoLoopOverrides = readJson(VIDEO_LOOP_OVERRIDES_KEY, {});
let toolbarTemporaryVisible = null;
let suppressToolbarClick = false;

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

function setStatus(message) {
  if (status) status.textContent = message;
}

function openSettings() {
  settingsPanel.hidden = false;
  settingsToggle.setAttribute("aria-expanded", "true");
}

function closeSettings() {
  settingsPanel.hidden = true;
  settingsToggle.setAttribute("aria-expanded", "false");
}

function effectiveToolbarVisible() {
  return toolbarTemporaryVisible ?? settings.showToolbar;
}

function applyToolbarVisibility() {
  const visible = effectiveToolbarVisible();
  document.body.classList.toggle("toolbar-hidden", !visible);
  if (!visible) closeSettings();
}

function bringBlockForward(block) {
  let maxZ = 1;
  for (const candidate of workspace.querySelectorAll(".block")) {
    const z = Number.parseInt(candidate.style.zIndex, 10);
    if (Number.isFinite(z)) maxZ = Math.max(maxZ, z);
  }
  block.style.zIndex = String(maxZ + 1);
}

function attachCompactBlockDrag(block) {
  if (block.querySelector(":scope > .compact-drag-handle")) return;

  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "compact-drag-handle";
  handle.textContent = "✣";
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
      workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
    };

    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  });
}

function effectiveLoop(block) {
  const id = block.dataset.blockId;
  if (id && Object.prototype.hasOwnProperty.call(videoLoopOverrides, id)) {
    return Boolean(videoLoopOverrides[id]);
  }
  return Boolean(settings.loopVideosByDefault);
}

function prepareVideoBlock(block) {
  const player = block.querySelector(".video-player");
  const checkbox = block.querySelector(".video-loop");
  if (!player || !checkbox) return;

  const loop = effectiveLoop(block);
  player.loop = loop;
  checkbox.checked = loop;

  if (checkbox.dataset.flashframeBound === "true") return;
  checkbox.dataset.flashframeBound = "true";

  checkbox.addEventListener("change", () => {
    const id = block.dataset.blockId;
    if (!id) return;
    videoLoopOverrides[id] = checkbox.checked;
    player.loop = checkbox.checked;
    writeJson(VIDEO_LOOP_OVERRIDES_KEY, videoLoopOverrides);
  });

  checkbox.closest(".video-loop-control")?.addEventListener("dblclick", (event) => {
    event.preventDefault();
    const id = block.dataset.blockId;
    if (!id) return;
    delete videoLoopOverrides[id];
    writeJson(VIDEO_LOOP_OVERRIDES_KEY, videoLoopOverrides);
    player.loop = settings.loopVideosByDefault;
    checkbox.checked = settings.loopVideosByDefault;
  });
}

function prepareBlock(block) {
  if (!(block instanceof HTMLElement) || !block.classList.contains("block")) return;
  attachCompactBlockDrag(block);
  if (block.dataset.blockType === "video") prepareVideoBlock(block);
}

function applySettings() {
  showBlockHeadersInput.checked = Boolean(settings.showBlockHeaders);
  showToolbarInput.checked = Boolean(settings.showToolbar);
  loopVideosInput.checked = Boolean(settings.loopVideosByDefault);
  document.body.classList.toggle("hide-block-headers", !settings.showBlockHeaders);
  applyToolbarVisibility();
  for (const block of workspace.querySelectorAll(".block")) prepareBlock(block);
}

function players() {
  return [...workspace.querySelectorAll(".video-player")];
}

function anyPlaying() {
  return players().some((player) => !player.paused && !player.ended);
}

function updatePlayButton() {
  const playing = anyPlaying();
  playButton.textContent = playing ? "❚❚" : "▶";
  playButton.title = playing ? "Pause all videos" : "Play all videos";
  playButton.setAttribute("aria-label", playButton.title);
}

async function toggleAllPlayback() {
  const all = players();
  if (!all.length) {
    setStatus("No connected videos to control.");
    return;
  }

  if (anyPlaying()) {
    for (const player of all) player.pause();
  } else {
    for (const player of all) {
      if (!player.src) continue;
      try {
        await player.play();
      } catch {
        // One unavailable source should not stop the others.
      }
    }
  }

  updatePlayButton();
}

function videoStepSeconds() {
  const parsed = Number.parseFloat(stepInput.value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(3600, Math.max(0.1, parsed));
}

function updateStepSetting() {
  const seconds = videoStepSeconds();
  stepInput.value = String(seconds);
  writeJson(VIDEO_STEP_KEY, seconds);
  rewindButton.title = `Rewind all videos ${seconds} seconds`;
  forwardButton.title = `Forward all videos ${seconds} seconds`;
  rewindButton.setAttribute("aria-label", rewindButton.title);
  forwardButton.setAttribute("aria-label", forwardButton.title);
}

function stepAll(direction) {
  const delta = videoStepSeconds() * direction;

  for (const player of players()) {
    if (!Number.isFinite(player.currentTime)) continue;
    const upper = Number.isFinite(player.duration) ? player.duration : Number.POSITIVE_INFINITY;
    player.currentTime = Math.min(upper, Math.max(0, player.currentTime + delta));
  }
}

function bindStepButton(button, direction) {
  let holdDelay = null;
  let holdInterval = null;
  let suppressClick = false;

  const stop = () => {
    if (holdDelay != null) clearTimeout(holdDelay);
    if (holdInterval != null) clearInterval(holdInterval);
    holdDelay = null;
    holdInterval = null;
  };

  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    suppressClick = true;
    stepAll(direction);
    button.setPointerCapture(event.pointerId);

    holdDelay = setTimeout(() => {
      holdInterval = setInterval(() => stepAll(direction), 160);
    }, 420);
  });

  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(eventName, () => {
      stop();
      setTimeout(() => {
        suppressClick = false;
      }, 0);
    });
  }

  button.addEventListener("click", () => {
    if (suppressClick) return;
    stepAll(direction);
  });
}

async function refreshArchiveStatus() {
  const state = await getArchiveStatus();

  if (!state.configured) {
    archiveStatus.textContent = "Not connected. Create/select ~/flashframe once.";
    archiveConnect.textContent = "Choose ~/flashframe";
    return;
  }

  if (state.permission === "granted") {
    archiveStatus.textContent = `Connected: ${state.name} · live/ + sessions/`;
    archiveConnect.textContent = "Change folder";
    return;
  }

  archiveStatus.textContent = `${state.name} remembered. Chrome needs permission again.`;
  archiveConnect.textContent = "Reconnect folder";
}

settingsToggle.addEventListener("click", () => {
  if (settingsPanel.hidden) openSettings();
  else closeSettings();
});

settingsClose.addEventListener("click", closeSettings);

document.addEventListener("pointerdown", (event) => {
  if (settingsPanel.hidden) return;
  if (settingsPanel.contains(event.target) || settingsToggle.contains(event.target)) return;
  closeSettings();
});

showBlockHeadersInput.addEventListener("change", () => {
  settings.showBlockHeaders = showBlockHeadersInput.checked;
  saveSettings();
  applySettings();
});

showToolbarInput.addEventListener("change", () => {
  settings.showToolbar = showToolbarInput.checked;
  toolbarTemporaryVisible = null;
  saveSettings();
  applyToolbarVisibility();
});

loopVideosInput.addEventListener("change", () => {
  settings.loopVideosByDefault = loopVideosInput.checked;
  saveSettings();

  for (const block of workspace.querySelectorAll('.block[data-block-type="video"]')) {
    const id = block.dataset.blockId;
    if (id && Object.prototype.hasOwnProperty.call(videoLoopOverrides, id)) continue;
    const player = block.querySelector(".video-player");
    const checkbox = block.querySelector(".video-loop");
    if (player) player.loop = settings.loopVideosByDefault;
    if (checkbox) checkbox.checked = settings.loopVideosByDefault;
  }
});

stepInput.value = String(readJson(VIDEO_STEP_KEY, 10));
updateStepSetting();
stepInput.addEventListener("change", updateStepSetting);

playButton.addEventListener("click", () => void toggleAllPlayback());
bindStepButton(rewindButton, -1);
bindStepButton(forwardButton, 1);

archiveConnect.addEventListener("click", async () => {
  archiveConnect.disabled = true;
  archiveStatus.textContent = "Waiting for Chrome folder permission…";

  try {
    const previous = await getArchiveStatus();
    const handle = await connectArchiveDirectory({
      chooseNew: previous.configured && previous.permission === "granted"
    });
    archiveStatus.textContent = `Connected: ${handle.name} · live/ + sessions/`;
    window.dispatchEvent(new CustomEvent("flashframe:archive-ready"));
  } catch (error) {
    if (error?.name === "AbortError") {
      archiveStatus.textContent = "Folder choice cancelled.";
    } else if (error?.name === "SecurityError") {
      archiveStatus.textContent = "Chrome blocked that location. Select the ~/flashframe child folder itself.";
    } else {
      console.error(error);
      archiveStatus.textContent = "Could not connect that folder.";
    }
  } finally {
    archiveConnect.disabled = false;
    await refreshArchiveStatus();
  }
});

function placeToolbarSummon(x, y, persist = false) {
  const margin = 8;
  const width = toolbarSummon.offsetWidth || 36;
  const height = toolbarSummon.offsetHeight || 36;
  const point = {
    x: Math.min(Math.max(margin, x), Math.max(margin, window.innerWidth - width - margin)),
    y: Math.min(Math.max(margin, y), Math.max(margin, window.innerHeight - height - margin))
  };

  toolbarSummon.style.left = `${point.x}px`;
  toolbarSummon.style.top = `${point.y}px`;
  if (persist) writeJson(TOOLBAR_BUTTON_KEY, point);
}

const savedToolbarButton = readJson(TOOLBAR_BUTTON_KEY, null);
requestAnimationFrame(() => {
  placeToolbarSummon(
    Number.isFinite(savedToolbarButton?.x) ? savedToolbarButton.x : window.innerWidth - 52,
    Number.isFinite(savedToolbarButton?.y) ? savedToolbarButton.y : window.innerHeight - 52
  );
});

toolbarSummon.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;

  const rect = toolbarSummon.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  let moved = false;

  toolbarSummon.setPointerCapture(event.pointerId);

  const move = (moveEvent) => {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    placeToolbarSummon(rect.left + dx, rect.top + dy);
  };

  const finish = () => {
    toolbarSummon.removeEventListener("pointermove", move);
    toolbarSummon.removeEventListener("pointerup", finish);
    toolbarSummon.removeEventListener("pointercancel", finish);
    const finalRect = toolbarSummon.getBoundingClientRect();
    placeToolbarSummon(finalRect.left, finalRect.top, true);

    if (moved) {
      suppressToolbarClick = true;
      setTimeout(() => {
        suppressToolbarClick = false;
      }, 0);
    }
  };

  toolbarSummon.addEventListener("pointermove", move);
  toolbarSummon.addEventListener("pointerup", finish);
  toolbarSummon.addEventListener("pointercancel", finish);
});

toolbarSummon.addEventListener("click", () => {
  if (suppressToolbarClick) return;
  toolbarTemporaryVisible = true;
  applyToolbarVisibility();
});

workspace.addEventListener("click", (event) => {
  if (!event.target.closest(".remove-block")) return;
  setTimeout(() => setStatus("Block removed. Local source unchanged."), 0);
});

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.classList.contains("block")) prepareBlock(node);
      for (const block of node.querySelectorAll?.(".block") ?? []) prepareBlock(block);
    }
  }
  updatePlayButton();
});

observer.observe(workspace, { childList: true, subtree: true });

for (const eventName of ["play", "pause", "ended"]) {
  workspace.addEventListener(eventName, updatePlayButton, true);
}

window.addEventListener("resize", () => {
  const rect = toolbarSummon.getBoundingClientRect();
  placeToolbarSummon(rect.left, rect.top, true);
});

applySettings();
updatePlayButton();
void refreshArchiveStatus();
