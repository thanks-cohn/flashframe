import { makeHandleKey, storeHandle } from "./file-access.js";

const SETTINGS_KEY = "flashframe.settings.v1";
const LOOP_INPUT_ID = "setting-loop-videos";
const WORKSPACE_CHANGED = "flashframe:workspace-changed";
const GRAB_ART_KEY = "flashframe.grab-art.v1";
const FADE_DELAY_KEY = "flashframe.fade-delay-seconds.v1";
const LOCAL_DROP_MARKER = "__FLASHFRAME_LOCAL_DROP_V1__";
const MAX_GRAB_ART_BYTES = 750 * 1024;

const workspace = document.querySelector("#workspace");
const loopInput = document.querySelector(`#${LOOP_INPUT_ID}`);
const addTextButton = document.querySelector("#add-text");
const status = document.querySelector("#status");

function setStatus(message) {
  if (status) status.textContent = message;
}

function readJson(key, fallback = {}) {
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

function readSettings() {
  return readJson(SETTINGS_KEY, {});
}

function globalLoopEnabled() {
  if (loopInput) return Boolean(loopInput.checked);
  const settings = readSettings();
  return Boolean(settings.loopMediaByDefault ?? settings.loopVideosByDefault);
}

function notifyWorkspaceChanged() {
  workspace?.dispatchEvent(new CustomEvent(WORKSPACE_CHANGED, { bubbles: true }));
}

function updateMarkerLoop(block, loop) {
  const store = block.querySelector(".custom-state-store");
  const value = store?.value;
  if (!value) return;

  const jsonStart = value.indexOf("{");
  if (jsonStart < 0) return;

  try {
    const payload = JSON.parse(value.slice(jsonStart));
    payload.loop = Boolean(loop);
    store.value = `${value.slice(0, jsonStart)}${JSON.stringify(payload)}`;
  } catch {
    // Leave malformed legacy state untouched.
  }
}

function makeAudioLoopControl(block, player) {
  let checkbox = block.querySelector(".audio-loop");
  if (checkbox) return checkbox;

  const toolbar = block.querySelector(".source-toolbar");
  const visibility = block.querySelector(".audio-visibility");
  const reconnect = block.querySelector(".reconnect-source");
  if (!toolbar || !visibility) return null;

  for (const node of [...toolbar.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) node.remove();
  }

  let visibilityLabel = visibility.closest(".audio-option");
  if (!visibilityLabel) {
    visibilityLabel = document.createElement("label");
    visibilityLabel.className = "audio-option audio-visibility-option";
    const caption = document.createElement("span");
    caption.textContent = "Display";
    visibility.before(visibilityLabel);
    visibilityLabel.append(caption, visibility);
  }

  const loopLabel = document.createElement("label");
  loopLabel.className = "audio-option audio-loop-control";
  loopLabel.title = "Loop this audio";
  checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "audio-loop";
  checkbox.checked = Boolean(player.loop);
  const caption = document.createElement("span");
  caption.textContent = "Loop";
  loopLabel.append(checkbox, caption);

  toolbar.classList.add("audio-toolbar");
  if (reconnect) toolbar.insertBefore(loopLabel, reconnect);
  else toolbar.append(loopLabel);

  checkbox.addEventListener("change", () => {
    player.loop = checkbox.checked;
    updateMarkerLoop(block, checkbox.checked);
    notifyWorkspaceChanged();
  });

  return checkbox;
}

function enhanceAudioBlock(block) {
  if (!(block instanceof HTMLElement) || !block.classList.contains("audio-block")) return;
  block.classList.add("audio-polished");

  const player = block.querySelector(".audio-player");
  if (!player) return;

  const checkbox = makeAudioLoopControl(block, player);
  const desired = globalLoopEnabled();

  if (player.loop !== desired) player.loop = desired;
  if (checkbox && checkbox.checked !== desired) {
    checkbox.checked = desired;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function loopControlFor(block) {
  return block.querySelector(".audio-loop, .video-loop");
}

function setBlockLoop(block, loop) {
  const player = block.querySelector(".audio-player, .video-player");
  if (!player) return;

  const desired = Boolean(loop);
  const checkbox = loopControlFor(block);

  if (checkbox) {
    const changed = checkbox.checked !== desired || player.loop !== desired;
    checkbox.checked = desired;
    player.loop = desired;
    if (changed) checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  if (player.loop !== desired) {
    player.loop = desired;
    updateMarkerLoop(block, desired);
    notifyWorkspaceChanged();
  }
}

function setAllMediaLoop(loop) {
  for (const block of workspace?.querySelectorAll(".block") ?? []) {
    if (block.querySelector(".audio-player, .video-player")) setBlockLoop(block, loop);
  }
}

function updateLoopSettingCopy() {
  if (!loopInput) return;
  const row = loopInput.closest("label");
  const strong = row?.querySelector("strong");
  const small = row?.querySelector("small");
  if (strong) strong.textContent = "Loop all media";
  if (small) small.textContent = "Turns looping on or off for every audio and video block, including direct media.";
  loopInput.setAttribute("aria-label", "Loop all media");
}

updateLoopSettingCopy();
loopInput?.addEventListener("change", () => setAllMediaLoop(loopInput.checked));

function readFadeDelayMs() {
  try {
    const seconds = Number.parseFloat(localStorage.getItem(FADE_DELAY_KEY) ?? "10");
    return (Number.isFinite(seconds) ? Math.min(300, Math.max(1, seconds)) : 10) * 1000;
  } catch {
    return 10000;
  }
}

function readGrabArt() {
  return readJson(GRAB_ART_KEY, {});
}

function sourceForGrabState(state) {
  const art = readGrabArt();
  return art[state] || art.default || "";
}

function fallbackHandSvg() {
  return '<svg class="grab-fallback-art" viewBox="0 0 48 32" aria-hidden="true"><path d="M9 24c-3-3-5-8-2-10 2-1 4 2 5 3V5c0-4 5-4 5 0v8-9c0-4 5-4 5 0v9-8c0-4 5-4 5 0v9-6c0-4 5-4 5 0v10c3-4 8-3 9 0-4 9-10 13-20 13-5 0-9-2-12-7Z"/><path d="M13 24c7 3 14 3 22 0"/></svg>';
}

function renderGrabArt(handle) {
  if (!handle) return;
  const state = handle.dataset.grabState || "default";
  const source = sourceForGrabState(state);
  const image = handle.querySelector(".grab-art-image");
  const fallback = handle.querySelector(".grab-fallback-art");
  if (image) {
    image.src = source;
    image.hidden = !source;
  }
  if (fallback) fallback.hidden = Boolean(source);
}

function setGrabState(handle, state) {
  handle.dataset.grabState = state;
  renderGrabArt(handle);
}

const grabFadeTimers = new WeakMap();
function clearGrabFade(handle) {
  const timer = grabFadeTimers.get(handle);
  if (timer != null) clearTimeout(timer);
  grabFadeTimers.delete(handle);
  handle.classList.remove("is-fully-faded");
}

function scheduleGrabFade(handle) {
  clearGrabFade(handle);
  if (!document.body.classList.contains("hide-block-headers") || handle.closest("#video-dock")) return;
  const timer = setTimeout(() => {
    grabFadeTimers.delete(handle);
    if (handle.matches(":hover") || handle.matches(":focus") || handle.classList.contains("is-dragging")) return;
    setGrabState(handle, "faded");
    handle.classList.add("is-fully-faded");
  }, readFadeDelayMs());
  grabFadeTimers.set(handle, timer);
}

function revealGrab(handle, state = "hover") {
  clearGrabFade(handle);
  setGrabState(handle, state);
}

function ensureGrabSlot(handle, { dock = false } = {}) {
  if (!(handle instanceof HTMLElement)) return;
  if (handle.dataset.grabSlotReady === "true") {
    renderGrabArt(handle);
    return;
  }
  handle.dataset.grabSlotReady = "true";
  handle.classList.add("grab-image-slot");

  const label = handle.querySelector(":scope > span:not(.spinner-mark)");
  const existingSvg = handle.querySelector("svg");
  if (existingSvg) existingSvg.classList.add("grab-fallback-art");
  else handle.insertAdjacentHTML("afterbegin", fallbackHandSvg());

  const image = document.createElement("img");
  image.className = "grab-art-image";
  image.alt = "";
  image.hidden = true;
  handle.querySelector(".grab-fallback-art")?.after(image);

  if (dock) {
    handle.querySelector(".spinner-mark")?.remove();
    handle.classList.add("media-dock-grab");
    setGrabState(handle, "default");
  } else {
    setGrabState(handle, document.body.classList.contains("hide-block-headers") ? "default" : "expanded");
    handle.addEventListener("pointerenter", () => revealGrab(handle, "hover"));
    handle.addEventListener("pointerleave", () => {
      setGrabState(handle, document.body.classList.contains("hide-block-headers") ? "default" : "expanded");
      scheduleGrabFade(handle);
    });
    handle.addEventListener("focus", () => revealGrab(handle, "hover"));
    handle.addEventListener("blur", () => scheduleGrabFade(handle));
    handle.addEventListener("pointerdown", () => revealGrab(handle, "hover"));
    handle.addEventListener("pointerup", () => scheduleGrabFade(handle));
    scheduleGrabFade(handle);
  }

  if (label) label.classList.add("grab-text-label");
}

function refreshGrabSlots() {
  for (const handle of document.querySelectorAll(".compact-drag-handle")) {
    ensureGrabSlot(handle);
    const expanded = !document.body.classList.contains("hide-block-headers");
    if (!handle.matches(":hover") && !handle.matches(":focus")) setGrabState(handle, expanded ? "expanded" : "default");
    if (expanded) clearGrabFade(handle);
    else scheduleGrabFade(handle);
  }
  ensureGrabSlot(document.querySelector("#video-dock-grip"), { dock: true });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

function addGrabArtworkSettings() {
  const settingsBody = document.querySelector("#settings-dock .settings-body");
  if (!settingsBody || settingsBody.querySelector(".grab-art-setting")) return;

  const wrap = document.createElement("div");
  wrap.className = "storage-setting grab-art-setting";
  const copy = document.createElement("div");
  copy.innerHTML = "<strong>Grab artwork</strong><small>Use your own image for Default, Hover, Faded, or Expanded states. PNG, WebP, GIF, SVG, or JPEG under 750 KB.</small>";
  const controls = document.createElement("div");
  controls.className = "grab-art-controls";

  for (const state of ["default", "hover", "faded", "expanded"]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = state[0].toUpperCase() + state.slice(1);
    button.title = `Choose ${state} Grab image`;
    button.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png,image/webp,image/gif,image/svg+xml,image/jpeg";
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > MAX_GRAB_ART_BYTES) {
          setStatus("Grab artwork must be smaller than 750 KB.");
          return;
        }
        try {
          const art = readGrabArt();
          art[state] = await fileToDataUrl(file);
          writeJson(GRAB_ART_KEY, art);
          refreshGrabSlots();
          setStatus(`${state[0].toUpperCase() + state.slice(1)} Grab artwork updated.`);
        } catch (error) {
          console.error(error);
          setStatus("Could not load that Grab artwork.");
        }
      }, { once: true });
      input.click();
    });
    controls.append(button);
  }

  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "Reset";
  reset.addEventListener("click", () => {
    localStorage.removeItem(GRAB_ART_KEY);
    refreshGrabSlots();
    setStatus("Grab artwork reset to the Flashframe hand.");
  });
  controls.append(reset);
  wrap.append(copy, controls);
  settingsBody.append(wrap);
}

function polishUnifiedPlayer() {
  const dock = document.querySelector("#video-dock");
  if (!dock) return;
  dock.classList.add("media-dock-polished");
  dock.setAttribute("aria-label", "Unified media controls");
  const middle = dock.querySelector(".player-middle");
  middle?.setAttribute("aria-label", "Unified media controls");
  if (middle && !middle.querySelector(".media-dock-title")) {
    const title = document.createElement("strong");
    title.className = "media-dock-title";
    title.textContent = "Media";
    middle.prepend(title);
  }
  ensureGrabSlot(dock.querySelector("#video-dock-grip"), { dock: true });
}

function waitForNewTextBlock(before) {
  return new Promise((resolve) => {
    const find = () => [...workspace.querySelectorAll('.block[data-block-type="text"]')]
      .find((block) => !before.has(block) && !block.classList.contains("custom-local-drop-block"));
    const immediate = find();
    if (immediate) return resolve(immediate);
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

async function openSoundFile() {
  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [{
        description: "Sound files",
        accept: {
          "audio/*": [".mp3", ".wav", ".ogg", ".oga", ".opus", ".flac", ".aac", ".m4a", ".weba", ".webm"]
        }
      }]
    });
    if (!handle) return;
    const file = await handle.getFile();
    const handleKey = makeHandleKey("audio");
    await storeHandle(handleKey, handle);

    const before = new Set(workspace.querySelectorAll(".block"));
    const waiting = waitForNewTextBlock(before);
    addTextButton?.click();
    const block = await waiting;
    if (!block) throw new Error("Could not create audio placeholder block");

    const payload = {
      kind: "audio",
      name: file.name || "Sound",
      displayName: file.name || "Sound",
      handleKey,
      mimeType: file.type || "",
      currentTime: 0,
      paused: true,
      volume: 1,
      muted: false,
      playbackRate: 1,
      loop: globalLoopEnabled(),
      syncGroup: "all",
      visibility: "visible"
    };
    const editor = block.querySelector(".text-editor");
    const name = block.querySelector(".block-name");
    if (name) name.value = payload.name;
    if (editor) editor.value = `${LOCAL_DROP_MARKER}${JSON.stringify(payload)}`;
    setStatus(`${payload.name} opened as audio.`);
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error(error);
      setStatus("Could not open that sound file.");
    }
  }
}

function addOpenSoundButton() {
  if (document.querySelector("#open-audio")) return;
  const openVideo = document.querySelector("#open-video");
  const parent = openVideo?.parentElement;
  if (!parent) return;
  const button = document.createElement("button");
  button.id = "open-audio";
  button.type = "button";
  button.textContent = "Open Sound File";
  button.addEventListener("click", () => void openSoundFile());
  openVideo.insertAdjacentElement("afterend", button);
}

function enhanceExisting() {
  for (const block of workspace?.querySelectorAll(".audio-block") ?? []) enhanceAudioBlock(block);
  setAllMediaLoop(globalLoopEnabled());
  refreshGrabSlots();
  addGrabArtworkSettings();
  polishUnifiedPlayer();
  addOpenSoundButton();
}

const observer = new MutationObserver((mutations) => {
  let sawMedia = false;
  let sawBlock = false;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.classList.contains("block")) sawBlock = true;
      if (node.classList.contains("audio-block")) {
        enhanceAudioBlock(node);
        sawMedia = true;
      }
      for (const block of node.querySelectorAll?.(".audio-block") ?? []) {
        enhanceAudioBlock(block);
        sawMedia = true;
      }
      if (node.matches?.(".block") && node.querySelector(".video-player")) sawMedia = true;
      if (node.querySelector?.(".video-player")) sawMedia = true;
    }
  }

  if (sawMedia) queueMicrotask(() => setAllMediaLoop(globalLoopEnabled()));
  if (sawBlock) queueMicrotask(refreshGrabSlots);
});

if (workspace) {
  observer.observe(workspace, { childList: true, subtree: true });
  workspace.addEventListener("loadedmetadata", (event) => {
    const player = event.target;
    if (!(player instanceof HTMLMediaElement) || !player.matches(".audio-player, .video-player")) return;
    const block = player.closest(".block");
    if (block) setBlockLoop(block, globalLoopEnabled());
  }, true);
}

new MutationObserver(refreshGrabSlots).observe(document.body, { attributes: true, attributeFilter: ["class"] });
window.addEventListener("flashframe:fade-delay-changed", refreshGrabSlots);

enhanceExisting();
