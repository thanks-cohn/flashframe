import { connectArchiveDirectory, getArchiveStatus } from "./archive.js";

const SETTINGS_KEY = "flashframe.settings.v1";
const VIDEO_LOOP_OVERRIDES_KEY = "flashframe.video-loop-overrides.v1";
const SUMMON_POSITION_KEY = "flashframe.toolbar-summon-position.v1";
const SETTINGS_DOCK_KEY = "flashframe.settings-dock.v1";
const VIDEO_DOCK_KEY = "flashframe.video-dock.v1";
const REWIND_SECONDS_KEY = "flashframe.video-rewind-seconds.v1";

const defaults = {
  showBlockHeaders: true,
  showToolbar: true,
  loopVideosByDefault: false
};

const toolbar = document.querySelector(".toolbar");
const workspace = document.querySelector("#workspace");
const showBlockHeadersInput = document.querySelector("#setting-block-headers");
const showToolbarInput = document.querySelector("#setting-toolbar");
const loopVideosInput = document.querySelector("#setting-loop-videos");
const toolbarSummon = document.querySelector("#toolbar-summon");
const settingsDock = document.querySelector("#settings-dock");
const settingsDockGrip = document.querySelector("#settings-dock-grip");
const settingsMini = document.querySelector("#settings-mini");
const videoDock = document.querySelector("#video-dock");
const videoDockGrip = document.querySelector("#video-dock-grip");
const videoMiniPlay = document.querySelector("#video-mini-play");
const videoPlayAll = document.querySelector("#video-play-all");
const rewindSecondsInput = document.querySelector("#video-rewind-seconds");
const rewindAllButton = document.querySelector("#video-rewind-all");
const archiveStatus = document.querySelector("#archive-status");
const archiveConnect = document.querySelector("#archive-connect");

let toolbarOverride = null;
let suppressSummonClick = false;
let settings = { ...defaults, ...readJson(SETTINGS_KEY, {}) };
let videoLoopOverrides = readJson(VIDEO_LOOP_OVERRIDES_KEY, {});
let rewindHoldTimeout = null;
let rewindHoldInterval = null;
let suppressRewindClick = false;

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

function applyToolbarVisibility() {
  document.body.classList.toggle("toolbar-hidden", !effectiveToolbarVisible());
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
      workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
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

function clampFloatingPosition(element, x, y) {
  const width = element.offsetWidth || 48;
  const height = element.offsetHeight || 48;
  const margin = 8;

  return {
    x: Math.min(Math.max(margin, x), Math.max(margin, window.innerWidth - width - margin)),
    y: Math.min(Math.max(margin, y), Math.max(margin, window.innerHeight - height - margin))
  };
}

function setFloatingPosition(element, x, y, key, persist = false) {
  const point = clampFloatingPosition(element, x, y);
  element.style.right = "auto";
  element.style.left = `${point.x}px`;
  element.style.top = `${point.y}px`;

  if (persist) {
    const old = readJson(key, {});
    writeJson(key, { ...old, x: point.x, y: point.y });
  }
}

function setDockCollapsed(dock, key, collapsed) {
  dock.classList.toggle("is-collapsed", collapsed);
  const old = readJson(key, {});
  writeJson(key, { ...old, collapsed });

  requestAnimationFrame(() => {
    const rect = dock.getBoundingClientRect();
    setFloatingPosition(dock, rect.left, rect.top, key, true);
  });
}

function initializeDock(dock, grip, key) {
  const saved = readJson(key, {});
  dock.classList.toggle("is-collapsed", Boolean(saved.collapsed));

  requestAnimationFrame(() => {
    const rect = dock.getBoundingClientRect();
    const x = Number.isFinite(saved.x) ? saved.x : rect.left;
    const y = Number.isFinite(saved.y) ? saved.y : rect.top;
    setFloatingPosition(dock, x, y, key);
  });

  const toggle = () => setDockCollapsed(dock, key, !dock.classList.contains("is-collapsed"));

  grip.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggle();
  });

  grip.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;

    event.preventDefault();
    const rect = dock.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = rect.left;
    const startTop = rect.top;
    let moved = false;

    dock.classList.add("is-dragging");
    grip.setPointerCapture(event.pointerId);

    const move = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      setFloatingPosition(dock, startLeft + dx, startTop + dy, key);
    };

    const finish = () => {
      dock.classList.remove("is-dragging");
      grip.removeEventListener("pointermove", move);
      grip.removeEventListener("pointerup", finish);
      grip.removeEventListener("pointercancel", finish);

      const finalRect = dock.getBoundingClientRect();
      setFloatingPosition(dock, finalRect.left, finalRect.top, key, true);
      if (!moved) toggle();
    };

    grip.addEventListener("pointermove", move);
    grip.addEventListener("pointerup", finish);
    grip.addEventListener("pointercancel", finish);
  });
}

function getPlayers() {
  return [...workspace.querySelectorAll(".video-player")];
}

function anyVideoPlaying() {
  return getPlayers().some((player) => !player.paused && !player.ended);
}

function updateGlobalPlayButtons() {
  const playing = anyVideoPlaying();
  videoPlayAll.textContent = playing ? "Pause all" : "Play all";
  videoMiniPlay.textContent = playing ? "❚❚" : "▶";
  videoMiniPlay.title = playing ? "Pause all videos" : "Play all videos";
}

async function toggleAllVideos() {
  const players = getPlayers();
  if (!players.length) return;

  if (anyVideoPlaying()) {
    for (const player of players) player.pause();
  } else {
    for (const player of players) {
      if (!player.src) continue;
      try {
        await player.play();
      } catch {
        // A missing/reconnected source or autoplay rule should not stop the other videos.
      }
    }
  }

  updateGlobalPlayButtons();
}

function rewindSeconds() {
  const parsed = Number.parseFloat(rewindSecondsInput.value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(3600, Math.max(0.1, parsed));
}

function updateRewindControl() {
  const seconds = rewindSeconds();
  rewindSecondsInput.value = String(seconds);
  rewindAllButton.textContent = `↶ ${seconds}s all`;
  writeJson(REWIND_SECONDS_KEY, seconds);
}

function rewindAllVideos() {
  const seconds = rewindSeconds();
  for (const player of getPlayers()) {
    if (!Number.isFinite(player.currentTime)) continue;
    player.currentTime = Math.max(0, player.currentTime - seconds);
  }
}

function stopRewindHold() {
  if (rewindHoldTimeout != null) clearTimeout(rewindHoldTimeout);
  if (rewindHoldInterval != null) clearInterval(rewindHoldInterval);
  rewindHoldTimeout = null;
  rewindHoldInterval = null;
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

  archiveStatus.textContent = `${state.name} remembered, but Chrome needs permission again.`;
  archiveConnect.textContent = "Reconnect folder";
}

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

settingsMini.addEventListener("click", () => setDockCollapsed(settingsDock, SETTINGS_DOCK_KEY, false));
videoPlayAll.addEventListener("click", () => void toggleAllVideos());
videoMiniPlay.addEventListener("click", () => void toggleAllVideos());

rewindSecondsInput.value = String(readJson(REWIND_SECONDS_KEY, 10));
updateRewindControl();
rewindSecondsInput.addEventListener("change", updateRewindControl);

rewindAllButton.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;

  event.preventDefault();
  suppressRewindClick = true;
  rewindAllVideos();
  rewindAllButton.setPointerCapture(event.pointerId);

  rewindHoldTimeout = setTimeout(() => {
    rewindHoldInterval = setInterval(rewindAllVideos, 170);
  }, 420);
});

for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
  rewindAllButton.addEventListener(eventName, () => {
    stopRewindHold();
    queueMicrotask(() => {
      suppressRewindClick = false;
    });
  });
}

rewindAllButton.addEventListener("click", () => {
  if (suppressRewindClick) return;
  rewindAllVideos();
});

archiveConnect.addEventListener("click", async () => {
  archiveConnect.disabled = true;
  archiveStatus.textContent = "Waiting for Chrome folder permission…";

  try {
    const handle = await connectArchiveDirectory();
    archiveStatus.textContent = `Connected: ${handle.name} · Flashframe will keep live/ and sessions/ here.`;
    archiveConnect.textContent = "Change folder";
    window.dispatchEvent(new CustomEvent("flashframe:archive-ready"));
  } catch (error) {
    if (error?.name === "AbortError") {
      archiveStatus.textContent = "Folder choice cancelled.";
    } else if (error?.name === "SecurityError") {
      archiveStatus.textContent = "Chrome blocked that location. Create/select the ~/flashframe child folder instead.";
    } else {
      console.error(error);
      archiveStatus.textContent = "Could not connect that folder.";
    }
  } finally {
    archiveConnect.disabled = false;
    await refreshArchiveStatus();
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
    setFloatingPosition(toolbarSummon, startLeft + dx, startTop + dy, SUMMON_POSITION_KEY);
  };

  const finish = () => {
    toolbarSummon.classList.remove("is-dragging");
    toolbarSummon.removeEventListener("pointermove", move);
    toolbarSummon.removeEventListener("pointerup", finish);
    toolbarSummon.removeEventListener("pointercancel", finish);

    const finalRect = toolbarSummon.getBoundingClientRect();
    setFloatingPosition(toolbarSummon, finalRect.left, finalRect.top, SUMMON_POSITION_KEY, true);

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

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.classList.contains("block")) prepareBlock(node);
      for (const block of node.querySelectorAll?.(".block") ?? []) prepareBlock(block);
    }
  }

  updateGlobalPlayButtons();
});

observer.observe(workspace, { childList: true, subtree: true });

for (const eventName of ["play", "pause", "ended"]) {
  workspace.addEventListener(eventName, updateGlobalPlayButtons, true);
}

window.addEventListener("resize", () => {
  for (const [element, key] of [
    [toolbarSummon, SUMMON_POSITION_KEY],
    [settingsDock, SETTINGS_DOCK_KEY],
    [videoDock, VIDEO_DOCK_KEY]
  ]) {
    const rect = element.getBoundingClientRect();
    setFloatingPosition(element, rect.left, rect.top, key, true);
  }
});

const summonSaved = readJson(SUMMON_POSITION_KEY, null);
requestAnimationFrame(() => {
  const rect = toolbarSummon.getBoundingClientRect();
  setFloatingPosition(
    toolbarSummon,
    Number.isFinite(summonSaved?.x) ? summonSaved.x : rect.left,
    Number.isFinite(summonSaved?.y) ? summonSaved.y : rect.top,
    SUMMON_POSITION_KEY
  );
});

initializeDock(settingsDock, settingsDockGrip, SETTINGS_DOCK_KEY);
initializeDock(videoDock, videoDockGrip, VIDEO_DOCK_KEY);
applySettings();
updateGlobalPlayButtons();
void refreshArchiveStatus();
