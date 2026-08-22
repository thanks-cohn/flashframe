import {
  fileFromHandle,
  hasReadPermission,
  makeHandleKey,
  requestReadPermission,
  resolveHandle,
  storeHandle
} from "./file-access.js";

const MARKER = "__FLASHFRAME_CUSTOM_BLOCK_V1__";
const workspace = document.querySelector("#workspace");
const status = document.querySelector("#status");
const addTextButton = document.querySelector("#add-text");
const openUrlButton = document.querySelector("#open-url");
const rewindButton = document.querySelector("#video-rewind-all");
const playButton = document.querySelector("#video-play-all");
const forwardButton = document.querySelector("#video-forward-all");
const stepInput = document.querySelector("#video-rewind-seconds");

const customObjectUrls = new WeakMap();
const youtubeBlocks = new Set();
let customOffset = 0;
let dragDepth = 0;

function setStatus(message) {
  if (status) status.textContent = message;
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

function normalizeUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

function parseTimeValue(value) {
  if (value == null || value === "") return 0;
  const text = String(value).trim().toLowerCase();
  if (/^\d+(?:\.\d+)?$/.test(text)) return Number(text);
  if (/^\d+(?:\.\d+)?s$/.test(text)) return Number.parseFloat(text);

  const hms = text.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?$/);
  if (hms && (hms[1] || hms[2] || hms[3])) {
    return Number(hms[1] || 0) * 3600 + Number(hms[2] || 0) * 60 + Number(hms[3] || 0);
  }

  const colon = text.split(":").map(Number);
  if (colon.length >= 2 && colon.every(Number.isFinite)) {
    return colon.reduce((total, part) => total * 60 + part, 0);
  }

  return 0;
}

function parseYouTube(url) {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  let videoId = null;

  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else {
      const parts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0])) videoId = parts[1] ?? null;
    }
  }

  if (!videoId || !/^[A-Za-z0-9_-]{6,}$/.test(videoId)) return null;

  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const currentTime = Math.max(
    0,
    parseTimeValue(url.searchParams.get("t") || url.searchParams.get("start") || hash.get("t"))
  );

  return { videoId, currentTime };
}

function youtubePageUrl(videoId, seconds = 0) {
  const url = new URL("https://www.youtube.com/watch");
  url.searchParams.set("v", videoId);
  if (seconds > 0) url.searchParams.set("t", `${Math.floor(seconds)}s`);
  return url.href;
}

function youtubeEmbedUrl(videoId, seconds = 0) {
  const url = new URL(`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`);
  url.searchParams.set("enablejsapi", "1");
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("rel", "0");
  if (seconds > 0) url.searchParams.set("start", String(Math.floor(seconds)));
  return url.href;
}

function looksLikeImageUrl(url) {
  return /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)(?:$|[?#])/i.test(url.pathname + url.search + url.hash);
}

function defaultPlacement(kind, point = null) {
  const offset = customOffset % 220;
  customOffset += 28;
  const sizes = {
    image: { width: 520, height: 440 },
    youtube: { width: 640, height: 430 },
    web: { width: 720, height: 560 }
  };
  const size = sizes[kind] ?? sizes.web;
  return {
    x: point ? Math.max(8, point.x - 80) : 48 + offset,
    y: point ? Math.max(8, point.y - 40) : 48 + offset,
    ...size
  };
}

function canvasPoint(event) {
  const rect = workspace.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function markerPayload(block) {
  const store = block.querySelector(".custom-state-store");
  if (!store?.value?.startsWith(MARKER)) return null;
  try {
    return JSON.parse(store.value.slice(MARKER.length));
  } catch {
    return null;
  }
}

function writeMarker(block, payload, notify = false) {
  const store = block.querySelector(".custom-state-store");
  if (!store) return;
  store.value = `${MARKER}${JSON.stringify(payload)}`;
  block.dataset.customKind = payload.kind;
  if (notify) {
    workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
  }
}

function nextZ() {
  let max = 1;
  for (const block of workspace.querySelectorAll(".block")) {
    const z = Number.parseInt(block.style.zIndex, 10);
    if (Number.isFinite(z)) max = Math.max(max, z);
  }
  return max + 1;
}

function bringForward(block) {
  block.style.zIndex = String(nextZ());
}

function cleanupCustomBlock(block) {
  const url = customObjectUrls.get(block);
  if (url) URL.revokeObjectURL(url);
  customObjectUrls.delete(block);
  youtubeBlocks.delete(block);
}

function setObjectUrl(block, url) {
  const old = customObjectUrls.get(block);
  if (old) URL.revokeObjectURL(old);
  customObjectUrls.set(block, url);
}

function attachCustomInteractions(block) {
  const header = block.querySelector(".block-header");
  const remove = block.querySelector(".remove-block");
  const maximize = block.querySelector(".maximize-block");

  block.addEventListener("pointerdown", () => bringForward(block));

  remove?.addEventListener("click", () => {
    cleanupCustomBlock(block);
    block.remove();
    setStatus("Block removed. Local source unchanged.");
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
      bringForward(block);
    }
    workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
  });

  header?.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("input, button") || block.classList.contains("is-maximized")) return;
    event.preventDefault();
    bringForward(block);

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

function buildShell(payload, options = {}) {
  const block = document.createElement("section");
  block.className = `block custom-flashframe-block ${payload.kind}-block`;
  // Existing Flashframe persistence treats custom blocks as text containers.
  // The hidden textarea carries a versioned custom payload and is converted
  // back into the rich block immediately after restore.
  block.dataset.blockType = "text";
  block.dataset.blockId = options.id ?? crypto.randomUUID();
  block.dataset.customKind = payload.kind;

  const placement = options.placement ?? defaultPlacement(payload.kind, options.point);
  block.style.left = options.style?.left ?? `${placement.x}px`;
  block.style.top = options.style?.top ?? `${placement.y}px`;
  block.style.width = options.style?.width ?? `${placement.width}px`;
  block.style.height = options.style?.height ?? `${placement.height}px`;
  block.style.zIndex = options.style?.zIndex ?? String(nextZ());

  const header = document.createElement("div");
  header.className = "block-header";

  const name = document.createElement("input");
  name.className = "block-name";
  name.setAttribute("aria-label", "Block name");
  name.value = options.name || payload.name || (payload.kind === "youtube" ? "YouTube" : payload.kind === "web" ? "Web page" : "Image");

  const actions = document.createElement("div");
  actions.className = "block-actions";
  actions.innerHTML = '<button class="maximize-block" type="button" title="Maximize">□</button><button class="remove-block" type="button" title="Remove from workspace">×</button>';
  header.append(name, actions);

  const store = document.createElement("textarea");
  store.className = "text-editor custom-state-store";
  store.setAttribute("aria-hidden", "true");
  store.tabIndex = -1;

  block.append(header, store);
  writeMarker(block, payload);
  attachCustomInteractions(block);
  return block;
}

function customFooter(...children) {
  const footer = document.createElement("div");
  footer.className = "block-toolbar custom-block-toolbar";
  footer.append(...children);
  return footer;
}

function button(label, className, title = label) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  element.title = title;
  return element;
}

function hostLabel(url) {
  const span = document.createElement("span");
  span.className = "url-host";
  try {
    span.textContent = new URL(url).hostname;
  } catch {
    span.textContent = url;
  }
  return span;
}

function openPage(url) {
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    // A blocked popup should not affect the workspace block.
  }
}

async function renderImage(block, payload) {
  let image = block.querySelector(".image-frame");
  if (!image) {
    image = document.createElement("img");
    image.className = "image-frame";
    image.alt = payload.displayName || payload.name || "Image";
    block.querySelector(".custom-state-store").after(image);
  }

  const existingMessage = block.querySelector(".custom-source-message");
  existingMessage?.remove();

  if (payload.dataUrl) {
    image.src = payload.dataUrl;
    return;
  }

  if (payload.url) {
    image.src = payload.url;
    return;
  }

  if (!payload.handleKey) return;
  const handle = await resolveHandle(payload.handleKey);
  if (handle && (await hasReadPermission(handle))) {
    const file = await fileFromHandle(handle);
    const url = URL.createObjectURL(file);
    setObjectUrl(block, url);
    image.src = url;
    return;
  }

  image.removeAttribute("src");
  const message = document.createElement("div");
  message.className = "custom-source-message";
  const reconnect = button("Reconnect image", "reconnect-custom-image");
  const text = document.createElement("div");
  text.textContent = `Reconnect ${payload.displayName || "this image"} to display it.`;
  message.append(text, reconnect);
  image.after(message);

  reconnect.addEventListener("click", async () => {
    let candidate = await resolveHandle(payload.handleKey);
    if (candidate && (await requestReadPermission(candidate))) {
      await renderImage(block, payload);
      return;
    }

    try {
      const [picked] = await showOpenFilePicker({
        multiple: false,
        types: [{ description: "Images", accept: { "image/*": [".avif", ".bmp", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"] } }]
      });
      if (!picked) return;
      const handleKey = payload.handleKey || makeHandleKey("image");
      await storeHandle(handleKey, picked);
      payload.handleKey = handleKey;
      payload.displayName = picked.name;
      writeMarker(block, payload, true);
      await renderImage(block, payload);
    } catch (error) {
      if (error?.name !== "AbortError") console.error(error);
    }
  });
}

function renderImageBlock(payload, options = {}) {
  const block = buildShell(payload, options);
  const detail = document.createElement("span");
  detail.className = "custom-detail";
  detail.textContent = payload.displayName || "Image";
  const sourceUrl = payload.url || null;
  const open = button("Open image", "open-external");
  open.hidden = !sourceUrl;
  if (sourceUrl) open.addEventListener("click", () => openPage(sourceUrl));
  block.append(customFooter(detail, open));
  void renderImage(block, payload);
  return block;
}

function renderWebBlock(payload, options = {}) {
  const block = buildShell(payload, options);
  const frame = document.createElement("iframe");
  frame.className = "web-frame";
  frame.title = payload.name || "Web page";
  frame.src = payload.url;

  const note = document.createElement("span");
  note.className = "custom-detail";
  note.textContent = "Some sites block embedding";
  const reload = button("Reload", "reload-web");
  const open = button("Open page", "open-external");
  reload.addEventListener("click", () => {
    frame.src = payload.url;
  });
  open.addEventListener("click", () => openPage(payload.url));

  block.append(frame, customFooter(hostLabel(payload.url), note, reload, open));
  return block;
}

function youtubeCommand(block, func, args = []) {
  const frame = block.querySelector(".youtube-frame");
  if (!frame?.contentWindow) return;
  frame.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
}

function startYoutubeListening(block) {
  const frame = block.querySelector(".youtube-frame");
  if (!frame?.contentWindow) return;
  const listen = () => {
    frame.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: block.dataset.blockId, channel: "widget" }), "*");
  };
  listen();
  setTimeout(listen, 450);
  setTimeout(listen, 1300);
}

function renderYouTubeBlock(payload, options = {}) {
  payload.currentTime = Number.isFinite(payload.currentTime) ? payload.currentTime : 0;
  payload.paused = payload.paused !== false;
  const block = buildShell(payload, options);
  youtubeBlocks.add(block);

  const frame = document.createElement("iframe");
  frame.className = "youtube-frame";
  frame.title = payload.name || "YouTube player";
  frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  frame.allowFullscreen = true;
  frame.src = youtubeEmbedUrl(payload.videoId, payload.currentTime);
  frame.addEventListener("load", () => startYoutubeListening(block));

  const time = document.createElement("span");
  time.className = "custom-detail youtube-time";
  time.textContent = formatTime(payload.currentTime);
  const open = button("Open page", "open-external");
  open.addEventListener("click", () => openPage(youtubePageUrl(payload.videoId, payload.currentTime)));

  block.append(frame, customFooter(time, hostLabel("https://youtube.com"), open));
  return block;
}

function createCustomBlock(payload, options = {}) {
  let block = null;
  if (payload.kind === "image") block = renderImageBlock(payload, options);
  if (payload.kind === "web") block = renderWebBlock(payload, options);
  if (payload.kind === "youtube") block = renderYouTubeBlock(payload, options);
  if (!block) return null;

  if (options.replace) options.replace.replaceWith(block);
  else workspace.append(block);
  return block;
}

function convertRestoredMarker(block) {
  if (!block?.isConnected || block.classList.contains("custom-flashframe-block")) return false;
  const editor = block.querySelector(".text-editor");
  if (!editor?.value?.startsWith(MARKER)) return false;

  let payload;
  try {
    payload = JSON.parse(editor.value.slice(MARKER.length));
  } catch {
    return false;
  }

  const name = block.querySelector(".block-name")?.value || payload.name;
  const style = {
    left: block.style.left,
    top: block.style.top,
    width: block.style.width,
    height: block.style.height,
    zIndex: block.style.zIndex
  };
  createCustomBlock(payload, {
    id: block.dataset.blockId,
    name,
    style,
    replace: block
  });
  return true;
}

function scheduleMarkerCheck(block) {
  for (const delay of [0, 30, 120, 350]) {
    setTimeout(() => convertRestoredMarker(block), delay);
  }
}

async function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

async function createImageFromDrop(item, point, offset = 0) {
  const file = item.getAsFile?.();
  if (!file || !file.type.startsWith("image/")) return false;

  const payload = {
    kind: "image",
    name: file.name || "Dropped image",
    displayName: file.name || "Dropped image"
  };

  try {
    const handle = typeof item.getAsFileSystemHandle === "function" ? await item.getAsFileSystemHandle() : null;
    if (handle?.kind === "file") {
      const handleKey = makeHandleKey("image");
      await storeHandle(handleKey, handle);
      payload.handleKey = handleKey;
    } else {
      payload.dataUrl = await fileAsDataUrl(file);
    }
  } catch {
    payload.dataUrl = await fileAsDataUrl(file);
  }

  createCustomBlock(payload, { point: { x: point.x + offset, y: point.y + offset } });
  return true;
}

async function waitForNewTextBlock(before) {
  return new Promise((resolve) => {
    const find = () => [...workspace.querySelectorAll('.block[data-block-type="text"]')]
      .find((block) => !before.has(block) && !block.classList.contains("custom-flashframe-block"));

    const immediate = find();
    if (immediate) {
      resolve(immediate);
      return;
    }

    const observer = new MutationObserver(() => {
      const block = find();
      if (!block) return;
      observer.disconnect();
      resolve(block);
    });
    observer.observe(workspace, { childList: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(find() ?? null);
    }, 1000);
  });
}

async function createDroppedText(text, point) {
  const before = new Set(workspace.querySelectorAll(".block"));
  const waiting = waitForNewTextBlock(before);
  addTextButton?.click();
  const block = await waiting;
  if (!block) return;
  const editor = block.querySelector(".text-editor");
  const name = block.querySelector(".block-name");
  if (editor) editor.value = text;
  if (name) name.value = "Dropped text";
  block.style.left = `${Math.max(8, point.x - 80)}px`;
  block.style.top = `${Math.max(8, point.y - 40)}px`;
  workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
}

function imageUrlFromHtml(html) {
  if (!html) return null;
  try {
    const document = new DOMParser().parseFromString(html, "text/html");
    return document.querySelector("img[src]")?.src ?? null;
  } catch {
    return null;
  }
}

function firstUri(data) {
  return String(data || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#")) || null;
}

function createUrlBlock(value, point = null, forceImage = false) {
  const url = normalizeUrl(value);
  if (!url) {
    setStatus("That does not look like an HTTP or HTTPS URL.");
    return null;
  }

  const youtube = parseYouTube(url);
  if (youtube) {
    const block = createCustomBlock({
      kind: "youtube",
      name: "YouTube",
      videoId: youtube.videoId,
      currentTime: youtube.currentTime,
      paused: true,
      url: youtubePageUrl(youtube.videoId, youtube.currentTime)
    }, { point });
    setStatus(`YouTube added at ${formatTime(youtube.currentTime)}.`);
    return block;
  }

  if (forceImage || looksLikeImageUrl(url)) {
    const block = createCustomBlock({ kind: "image", name: "Image", url: url.href, displayName: url.pathname.split("/").pop() || url.hostname }, { point });
    setStatus("Image added from the web.");
    return block;
  }

  const block = createCustomBlock({ kind: "web", name: url.hostname, url: url.href }, { point });
  setStatus("Web page added. If the site blocks embedding, use Open page in the block footer.");
  return block;
}

openUrlButton?.addEventListener("click", () => {
  const value = window.prompt("Paste a webpage, image, or YouTube URL");
  if (value == null) return;
  createUrlBlock(value);
});

workspace.addEventListener("dragenter", (event) => {
  event.preventDefault();
  dragDepth += 1;
  workspace.classList.add("is-drop-target");
});

workspace.addEventListener("dragover", (event) => {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  workspace.classList.add("is-drop-target");
});

workspace.addEventListener("dragleave", () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) workspace.classList.remove("is-drop-target");
});

workspace.addEventListener("drop", async (event) => {
  event.preventDefault();
  dragDepth = 0;
  workspace.classList.remove("is-drop-target");
  const point = canvasPoint(event);
  const transfer = event.dataTransfer;
  if (!transfer) return;

  const fileItems = [...transfer.items].filter((item) => item.kind === "file");
  let imagesAdded = 0;
  for (const item of fileItems) {
    if (!item.type.startsWith("image/")) continue;
    if (await createImageFromDrop(item, point, imagesAdded * 28)) imagesAdded += 1;
  }
  if (imagesAdded) {
    setStatus(`${imagesAdded} image${imagesAdded === 1 ? "" : "s"} dropped into Flashframe.`);
    return;
  }

  const htmlImage = imageUrlFromHtml(transfer.getData("text/html"));
  if (htmlImage) {
    createUrlBlock(htmlImage, point, true);
    return;
  }

  const uri = firstUri(transfer.getData("text/uri-list"));
  if (uri) {
    createUrlBlock(uri, point);
    return;
  }

  const plain = transfer.getData("text/plain").trim();
  if (!plain) return;
  if (normalizeUrl(plain)) createUrlBlock(plain, point);
  else await createDroppedText(plain, point);
});

window.addEventListener("message", (event) => {
  let data = event.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return;
    }
  }
  if (!data || data.event !== "infoDelivery" || !data.info) return;

  for (const block of youtubeBlocks) {
    const frame = block.querySelector(".youtube-frame");
    if (!frame || event.source !== frame.contentWindow) continue;
    const payload = markerPayload(block);
    if (!payload) return;

    let changed = false;
    if (Number.isFinite(data.info.currentTime)) {
      payload.currentTime = data.info.currentTime;
      block.querySelector(".youtube-time").textContent = formatTime(payload.currentTime);
      changed = true;
    }
    if (Number.isFinite(data.info.playerState)) {
      payload.playerState = data.info.playerState;
      payload.paused = data.info.playerState !== 1;
      changed = true;
      updateGlobalPlayButton();
    }
    if (changed) {
      const now = Date.now();
      const last = Number(block.dataset.lastYoutubePersist || 0);
      writeMarker(block, payload, now - last > 1800);
      if (now - last > 1800) block.dataset.lastYoutubePersist = String(now);
    }
    return;
  }
});

function localPlayers() {
  return [...workspace.querySelectorAll(".video-player")];
}

function anyYoutubePlaying() {
  for (const block of youtubeBlocks) {
    if (!block.isConnected) continue;
    const payload = markerPayload(block);
    if (payload?.playerState === 1 || payload?.paused === false) return true;
  }
  return false;
}

function anyMediaPlaying() {
  return localPlayers().some((player) => !player.paused && !player.ended) || anyYoutubePlaying();
}

function updateGlobalPlayButton() {
  if (!playButton) return;
  const playing = anyMediaPlaying();
  playButton.textContent = playing ? "❚❚" : "▶";
  playButton.title = playing ? "Pause all videos" : "Play all videos";
}

function mediaStepSeconds() {
  const value = Number.parseFloat(stepInput?.value ?? "10");
  return Number.isFinite(value) ? Math.min(3600, Math.max(0.1, value)) : 10;
}

function stepAllMedia(direction) {
  const delta = mediaStepSeconds() * direction;
  for (const player of localPlayers()) {
    if (!Number.isFinite(player.currentTime)) continue;
    const upper = Number.isFinite(player.duration) ? player.duration : Number.POSITIVE_INFINITY;
    player.currentTime = Math.min(upper, Math.max(0, player.currentTime + delta));
  }

  for (const block of youtubeBlocks) {
    if (!block.isConnected) continue;
    const payload = markerPayload(block);
    if (!payload) continue;
    payload.currentTime = Math.max(0, Number(payload.currentTime || 0) + delta);
    youtubeCommand(block, "seekTo", [payload.currentTime, true]);
    block.querySelector(".youtube-time").textContent = formatTime(payload.currentTime);
    writeMarker(block, payload, true);
  }
}

async function toggleAllMedia() {
  const shouldPause = anyMediaPlaying();
  for (const player of localPlayers()) {
    if (shouldPause) player.pause();
    else if (player.src) {
      try { await player.play(); } catch { /* browser autoplay rules may require another click */ }
    }
  }

  for (const block of youtubeBlocks) {
    if (!block.isConnected) continue;
    youtubeCommand(block, shouldPause ? "pauseVideo" : "playVideo");
    const payload = markerPayload(block);
    if (payload) {
      payload.paused = shouldPause;
      payload.playerState = shouldPause ? 2 : 1;
      writeMarker(block, payload, true);
    }
  }
  updateGlobalPlayButton();
}

function ownStepControl(control, direction) {
  if (!control) return;
  let delay = null;
  let interval = null;

  const stop = () => {
    if (delay != null) clearTimeout(delay);
    if (interval != null) clearInterval(interval);
    delay = null;
    interval = null;
  };

  control.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    stepAllMedia(direction);
    control.setPointerCapture(event.pointerId);
    delay = setTimeout(() => {
      interval = setInterval(() => stepAllMedia(direction), 160);
    }, 420);
  }, true);

  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
    control.addEventListener(name, (event) => {
      event.stopImmediatePropagation();
      stop();
    }, true);
  }

  control.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}

ownStepControl(rewindButton, -1);
ownStepControl(forwardButton, 1);
playButton?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
  void toggleAllMedia();
}, true);

for (const name of ["play", "pause", "ended"]) {
  workspace.addEventListener(name, updateGlobalPlayButton, true);
}

workspace.addEventListener("click", (event) => {
  if (event.target.closest(".remove-block")) {
    queueMicrotask(() => setStatus("Block removed. Local source unchanged."));
  }
});

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.classList.contains("block")) scheduleMarkerCheck(node);
      for (const block of node.querySelectorAll?.(".block") ?? []) scheduleMarkerCheck(block);
    }
    for (const node of mutation.removedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.classList.contains("custom-flashframe-block")) cleanupCustomBlock(node);
      for (const block of node.querySelectorAll?.(".custom-flashframe-block") ?? []) cleanupCustomBlock(block);
    }
  }
  updateGlobalPlayButton();
});

observer.observe(workspace, { childList: true, subtree: false });
for (const block of workspace.querySelectorAll('.block[data-block-type="text"]')) scheduleMarkerCheck(block);
updateGlobalPlayButton();
