const SETTINGS_KEY = "flashframe.settings.v1";
const VIDEO_LOOP_OVERRIDES_KEY = "flashframe.video-loop-overrides.v1";

const workspace = document.querySelector("#workspace");
const globalLoopInput = document.querySelector("#setting-loop-videos");

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

function isRemoteVideoBlock(block) {
  return block instanceof HTMLElement
    && block.classList.contains("block")
    && (block.dataset.customKind === "remote-video" || block.classList.contains("remote-video-block"));
}

function effectiveLoop(block) {
  const id = block.dataset.blockId;
  const overrides = readJson(VIDEO_LOOP_OVERRIDES_KEY, {});
  if (id && Object.prototype.hasOwnProperty.call(overrides, id)) {
    return Boolean(overrides[id]);
  }

  const settings = readJson(SETTINGS_KEY, {});
  return Boolean(settings.loopVideosByDefault);
}

function saveOverride(block, value) {
  const id = block.dataset.blockId;
  if (!id) return;

  const overrides = readJson(VIDEO_LOOP_OVERRIDES_KEY, {});
  overrides[id] = Boolean(value);
  writeJson(VIDEO_LOOP_OVERRIDES_KEY, overrides);
}

function clearOverride(block) {
  const id = block.dataset.blockId;
  if (!id) return;

  const overrides = readJson(VIDEO_LOOP_OVERRIDES_KEY, {});
  delete overrides[id];
  writeJson(VIDEO_LOOP_OVERRIDES_KEY, overrides);
}

function applyRemoteVideoLoop(block) {
  if (!isRemoteVideoBlock(block)) return;

  const player = block.querySelector(".video-player");
  const checkbox = block.querySelector(".video-loop");
  if (!player || !checkbox) return;

  const loop = effectiveLoop(block);
  player.loop = loop;
  checkbox.checked = loop;

  if (checkbox.dataset.flashframeRemoteLoopBound === "true") return;
  checkbox.dataset.flashframeRemoteLoopBound = "true";

  checkbox.addEventListener("change", () => {
    player.loop = checkbox.checked;
    saveOverride(block, checkbox.checked);
  });

  checkbox.closest(".video-loop-control")?.addEventListener("dblclick", (event) => {
    event.preventDefault();
    clearOverride(block);
    applyRemoteVideoLoop(block);
  });

  // Native HTML video looping handles normal MP4/WebM URLs. This is a fallback
  // for remote servers/streams that still emit `ended` while loop is enabled.
  player.addEventListener("ended", () => {
    if (!effectiveLoop(block)) return;
    try {
      player.currentTime = 0;
      void player.play().catch(() => {});
    } catch {
      // Some live/streaming sources do not expose a seekable zero point.
    }
  });
}

function applyAllRemoteVideoLoops() {
  for (const block of workspace.querySelectorAll(".remote-video-block, .block[data-custom-kind=\"remote-video\"]")) {
    applyRemoteVideoLoop(block);
  }
}

globalLoopInput?.addEventListener("change", () => {
  // controls.js persists the global setting from the same change event first.
  queueMicrotask(applyAllRemoteVideoLoops);
});

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (isRemoteVideoBlock(node)) applyRemoteVideoLoop(node);
      for (const block of node.querySelectorAll?.(".remote-video-block, .block[data-custom-kind=\"remote-video\"]") ?? []) {
        applyRemoteVideoLoop(block);
      }
    }
  }
});

observer.observe(workspace, { childList: true, subtree: true });
applyAllRemoteVideoLoops();
