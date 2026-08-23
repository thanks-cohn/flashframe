const REMOTE_VIDEO_MARKER = "__FLASHFRAME_REMOTE_VIDEO_V1__";
const workspace = document.querySelector("#workspace");
const openUrlButton = document.querySelector("#open-url");
const status = document.querySelector("#status");

const VIDEO_URL_RE = /\.(?:mp4|m4v|webm|ogv|ogg|mov)(?:$|[?#])/i;
let offset = 0;

function setStatus(message) {
  if (status) status.textContent = message;
}

function normalizeUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

function looksLikeDirectVideo(url) {
  return VIDEO_URL_RE.test(url.pathname + url.search + url.hash);
}

function formatTime(seconds) {
  const value = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = Math.floor(value % 60);
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}

function nextZ() {
  let max = 1;
  for (const block of workspace.querySelectorAll(".block")) {
    const z = Number.parseInt(block.style.zIndex, 10);
    if (Number.isFinite(z)) max = Math.max(max, z);
  }
  return max + 1;
}

function placement() {
  const n = offset % 220;
  offset += 28;
  return { x: 48 + n, y: 48 + n, width: 640, height: 430 };
}

function serialize(block, payload, notify = false) {
  const store = block.querySelector(".remote-video-state");
  if (!store) return;
  store.value = `${REMOTE_VIDEO_MARKER}${JSON.stringify(payload)}`;
  if (notify) {
    workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
  }
}

function readPayload(block) {
  const store = block.querySelector(".remote-video-state");
  if (!store?.value?.startsWith(REMOTE_VIDEO_MARKER)) return null;
  try {
    return JSON.parse(store.value.slice(REMOTE_VIDEO_MARKER.length));
  } catch {
    return null;
  }
}

function seekableBounds(player) {
  if (!player.seekable?.length) return null;
  const index = player.seekable.length - 1;
  try {
    return { start: player.seekable.start(index), end: player.seekable.end(index) };
  } catch {
    return null;
  }
}

function clampToSeekable(player, desired) {
  const bounds = seekableBounds(player);
  if (!bounds) return Math.max(0, desired);
  return Math.min(bounds.end, Math.max(bounds.start, desired));
}

function attachWindowInteractions(block) {
  const header = block.querySelector(".block-header");
  const remove = block.querySelector(".remove-block");
  const maximize = block.querySelector(".maximize-block");

  block.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    block.style.zIndex = String(nextZ());
  });

  remove?.addEventListener("click", () => {
    block.remove();
    setStatus("Remote video removed.");
    workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
  });

  maximize?.addEventListener("click", () => {
    const maximized = block.classList.contains("is-maximized");
    if (maximized) {
      const previous = JSON.parse(block.dataset.previousGeometry || "null");
      if (previous) {
        block.style.left = previous.left;
        block.style.top = previous.top;
        block.style.width = previous.width;
        block.style.height = previous.height;
      }
      block.classList.remove("is-maximized");
      delete block.dataset.previousGeometry;
    } else {
      block.dataset.previousGeometry = JSON.stringify({
        left: block.style.left,
        top: block.style.top,
        width: block.style.width,
        height: block.style.height
      });
      block.classList.add("is-maximized");
      const workspaceTop = workspace.getBoundingClientRect().top + window.scrollY;
      block.style.left = `${window.scrollX + 16}px`;
      block.style.top = `${Math.max(16, window.scrollY - workspaceTop + 16)}px`;
      block.style.width = `${Math.max(360, window.innerWidth - 32)}px`;
      block.style.height = `${Math.max(280, window.innerHeight - 86)}px`;
      block.style.zIndex = String(nextZ());
    }
    workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
  });

  header?.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("input, button") || block.classList.contains("is-maximized")) return;
    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = Number.parseFloat(block.style.left) || block.offsetLeft;
    const startTop = Number.parseFloat(block.style.top) || block.offsetTop;
    header.setPointerCapture(event.pointerId);

    const move = (moveEvent) => {
      block.style.left = `${startLeft + moveEvent.clientX - startX}px`;
      block.style.top = `${startTop + moveEvent.clientY - startY}px`;
    };

    const finish = () => {
      header.removeEventListener("pointermove", move);
      header.removeEventListener("pointerup", finish);
      header.removeEventListener("pointercancel", finish);
      workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
    };

    header.addEventListener("pointermove", move);
    header.addEventListener("pointerup", finish);
    header.addEventListener("pointercancel", finish);
  });
}

function createRemoteVideoBlock(payload, options = {}) {
  payload = {
    kind: "remote-video",
    name: payload.name || "Remote video",
    url: payload.url,
    currentTime: Number.isFinite(payload.currentTime) ? payload.currentTime : 0,
    paused: payload.paused !== false,
    volume: Number.isFinite(payload.volume) ? Math.min(1, Math.max(0, payload.volume)) : 1,
    muted: Boolean(payload.muted),
    playbackRate: Number.isFinite(payload.playbackRate) ? payload.playbackRate : 1,
    loop: Boolean(payload.loop)
  };

  const block = document.createElement("section");
  block.className = "block custom-flashframe-block video-block remote-video-block";
  block.dataset.blockType = "text";
  block.dataset.blockId = options.id || crypto.randomUUID();
  block.dataset.customKind = "remote-video";

  const place = placement();
  block.style.left = options.style?.left || `${place.x}px`;
  block.style.top = options.style?.top || `${place.y}px`;
  block.style.width = options.style?.width || `${place.width}px`;
  block.style.height = options.style?.height || `${place.height}px`;
  block.style.zIndex = options.style?.zIndex || String(nextZ());

  const header = document.createElement("div");
  header.className = "block-header";

  const name = document.createElement("input");
  name.className = "block-name";
  name.setAttribute("aria-label", "Block name");
  name.value = options.name || payload.name;

  const actions = document.createElement("div");
  actions.className = "block-actions";
  actions.innerHTML = '<button class="maximize-block" type="button" title="Maximize">□</button><button class="remove-block" type="button" title="Remove from workspace">×</button>';
  header.append(name, actions);

  const store = document.createElement("textarea");
  store.className = "text-editor remote-video-state";
  store.hidden = true;
  store.setAttribute("aria-hidden", "true");
  store.tabIndex = -1;

  const player = document.createElement("video");
  player.className = "video-player remote-video-player";
  player.controls = true;
  player.preload = "metadata";
  player.src = payload.url;
  player.volume = payload.volume;
  player.muted = payload.muted;
  player.playbackRate = payload.playbackRate;
  player.loop = payload.loop;

  const footer = document.createElement("div");
  footer.className = "block-toolbar source-toolbar";

  const time = document.createElement("span");
  time.className = "video-time";
  time.textContent = formatTime(payload.currentTime);

  const loopLabel = document.createElement("label");
  loopLabel.className = "video-loop-control";
  loopLabel.title = "Loop this remote video";
  const loop = document.createElement("input");
  loop.className = "video-loop";
  loop.type = "checkbox";
  loop.checked = payload.loop;
  const loopText = document.createElement("span");
  loopText.textContent = "Loop";
  loopLabel.append(loop, loopText);

  const host = document.createElement("span");
  host.className = "url-host";
  try { host.textContent = new URL(payload.url).hostname; } catch { host.textContent = "Remote"; }

  const open = document.createElement("button");
  open.type = "button";
  open.className = "open-external";
  open.textContent = "Open source";
  open.addEventListener("click", () => window.open(payload.url, "_blank", "noopener,noreferrer"));

  footer.append(time, loopLabel, host, open);
  block.append(header, store, player, footer);
  serialize(block, payload);
  attachWindowInteractions(block);

  let lastPersist = 0;
  const persistPlayback = (force = false) => {
    const state = readPayload(block) || payload;
    state.currentTime = Number.isFinite(player.currentTime) ? player.currentTime : 0;
    state.paused = player.paused;
    state.volume = player.volume;
    state.muted = player.muted;
    state.playbackRate = player.playbackRate;
    state.loop = player.loop;
    const now = Date.now();
    serialize(block, state, force || now - lastPersist > 1800);
    if (force || now - lastPersist > 1800) lastPersist = now;
  };

  player.addEventListener("loadedmetadata", () => {
    const desired = clampToSeekable(player, payload.currentTime);
    if (Number.isFinite(desired)) {
      try { player.currentTime = desired; } catch { /* stream may not expose a seekable range yet */ }
    }
    time.textContent = formatTime(player.currentTime);
    if (!payload.paused) {
      player.play().catch(() => setStatus("Remote video restored. Click play if Chrome blocks autoplay."));
    }
  }, { once: true });

  player.addEventListener("timeupdate", () => {
    time.textContent = formatTime(player.currentTime);
    persistPlayback(false);
  });

  player.addEventListener("seeking", () => {
    const bounded = clampToSeekable(player, player.currentTime);
    if (Math.abs(bounded - player.currentTime) > 0.05) {
      try { player.currentTime = bounded; } catch { /* browser owns the final stream boundary */ }
    }
  });

  for (const eventName of ["play", "pause", "volumechange", "ratechange", "ended"]) {
    player.addEventListener(eventName, () => persistPlayback(true));
  }

  loop.addEventListener("change", () => {
    player.loop = loop.checked;
    persistPlayback(true);
  });

  name.addEventListener("change", () => {
    const state = readPayload(block) || payload;
    state.name = name.value.trim() || "Remote video";
    serialize(block, state, true);
  });

  if (options.replace) options.replace.replaceWith(block);
  else workspace.append(block);

  return block;
}

function convertRestoredRemoteVideo(block) {
  if (!block?.isConnected || block.classList.contains("remote-video-block")) return false;
  const editor = block.querySelector(".text-editor");
  if (!editor?.value?.startsWith(REMOTE_VIDEO_MARKER)) return false;

  let payload;
  try {
    payload = JSON.parse(editor.value.slice(REMOTE_VIDEO_MARKER.length));
  } catch {
    return false;
  }

  createRemoteVideoBlock(payload, {
    id: block.dataset.blockId,
    name: block.querySelector(".block-name")?.value || payload.name,
    style: {
      left: block.style.left,
      top: block.style.top,
      width: block.style.width,
      height: block.style.height,
      zIndex: block.style.zIndex
    },
    replace: block
  });
  return true;
}

function scheduleRestoreCheck(block) {
  for (const delay of [0, 30, 120, 350]) {
    setTimeout(() => convertRestoredRemoteVideo(block), delay);
  }
}

function interceptOpenUrl(event) {
  if (event.button !== 0) return;
  const originalPrompt = window.prompt;
  const value = originalPrompt.call(window, "Paste a webpage, image, YouTube, or direct video URL");
  if (value == null) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }

  const url = normalizeUrl(value);
  if (url && looksLikeDirectVideo(url)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    createRemoteVideoBlock({
      name: url.pathname.split("/").pop() || "Remote video",
      url: url.href,
      paused: true,
      currentTime: 0
    });
    setStatus("Remote video added. Global play, rewind, and forward now control it too.");
    return;
  }

  // Reuse the same answer for the existing Web/YouTube/image handler without
  // showing the user a second prompt.
  window.prompt = (...args) => {
    window.prompt = originalPrompt;
    return value;
  };
  setTimeout(() => {
    if (window.prompt !== originalPrompt) window.prompt = originalPrompt;
  }, 0);
}

openUrlButton?.addEventListener("click", interceptOpenUrl, true);

workspace.addEventListener("drop", (event) => {
  const transfer = event.dataTransfer;
  if (!transfer) return;
  const candidates = [transfer.getData("text/uri-list"), transfer.getData("text/plain")]
    .flatMap((value) => String(value || "").split(/\r?\n/))
    .map((value) => value.trim())
    .filter((value) => value && !value.startsWith("#"));

  for (const candidate of candidates) {
    const url = normalizeUrl(candidate);
    if (!url || !looksLikeDirectVideo(url)) continue;
    event.preventDefault();
    event.stopImmediatePropagation();
    createRemoteVideoBlock({
      name: url.pathname.split("/").pop() || "Remote video",
      url: url.href,
      paused: true,
      currentTime: 0
    });
    setStatus("Remote video dropped into Flashframe. Global video controls include it.");
    return;
  }
}, true);

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.classList.contains("block")) scheduleRestoreCheck(node);
      for (const block of node.querySelectorAll?.(".block") ?? []) scheduleRestoreCheck(block);
    }
  }
});

observer.observe(workspace, { childList: true, subtree: false });
for (const block of workspace.querySelectorAll('.block[data-block-type="text"]')) scheduleRestoreCheck(block);
