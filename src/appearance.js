import { getContent, putContent } from "./storage.js";

const PREFS_KEY = "flashframe.appearance.v1";
const BACKGROUND_CONTENT_ID = "flashframe:background-image";

const workspace = document.querySelector("#workspace");
const settingsBody = document.querySelector("#settings-dock .settings-body");
const storageSetting = settingsBody?.querySelector(".storage-setting");

const defaults = {
  backgroundColor: null,
  backgroundMode: "cover",
  shrinkToFit: false
};

let preferences = { ...defaults, ...readPreferences() };
let backgroundBlob = null;
let backgroundObjectUrl = null;

function readPreferences() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePreferences() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn("Could not save Flashframe appearance settings:", error);
  }
}

function defaultColor() {
  return matchMedia("(prefers-color-scheme: dark)").matches ? "#1f1f1f" : "#ffffff";
}

function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .appearance-setting-group {
      display: grid;
      gap: 2px;
      margin-top: 4px;
      padding-top: 8px;
      border-top: 1px solid color-mix(in srgb, CanvasText 11%, transparent);
    }

    .background-color-controls,
    .background-image-controls {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    #setting-background-color {
      width: 42px;
      height: 32px;
      min-width: 42px;
      padding: 2px;
      border: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
      border-radius: 8px;
      background: Canvas;
      cursor: pointer;
    }

    .appearance-small-button {
      min-height: 32px;
      padding: 0 8px;
      font-size: 11px;
    }

    #setting-background-status {
      min-width: 0;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 11px;
      opacity: .62;
    }
  `;
  document.head.append(style);
}

function injectControls() {
  if (!settingsBody || document.querySelector("#setting-shrink-to-fit")) return;

  const group = document.createElement("div");
  group.className = "appearance-setting-group";
  group.innerHTML = `
    <label class="setting-row">
      <input id="setting-shrink-to-fit" type="checkbox">
      <span><strong>Shrink to fit</strong><small>New image, gallery, and local-video blocks shrink to their content once, then stay under your control.</small></span>
    </label>

    <div class="setting-choice-row">
      <span><strong>Background color</strong><small>Color underneath the whole Flashframe canvas.</small></span>
      <span class="background-color-controls">
        <input id="setting-background-color" type="color" aria-label="Flashframe background color">
        <button id="setting-background-color-reset" class="appearance-small-button" type="button">Default</button>
      </span>
    </div>

    <div class="setting-choice-row">
      <span><strong>Background image</strong><small>Choose any local image for the canvas.</small></span>
      <span class="background-image-controls">
        <button id="setting-background-image" class="appearance-small-button" type="button">Choose image</button>
        <button id="setting-background-clear" class="appearance-small-button" type="button">Clear</button>
        <span id="setting-background-status">None</span>
      </span>
    </div>

    <label class="setting-choice-row">
      <span><strong>Background image fit</strong><small>How the chosen image fills the canvas.</small></span>
      <select id="setting-background-mode" aria-label="Background image fit">
        <option value="cover">Cover</option>
        <option value="contain">Contain</option>
        <option value="tile">Tile</option>
      </select>
    </label>
  `;

  if (storageSetting) storageSetting.before(group);
  else settingsBody.append(group);
}

function revokeBackgroundUrl() {
  if (backgroundObjectUrl) URL.revokeObjectURL(backgroundObjectUrl);
  backgroundObjectUrl = null;
}

function applyBackground() {
  if (!workspace) return;

  const color = preferences.backgroundColor || "";
  workspace.style.backgroundColor = color;
  document.body.style.backgroundColor = color;

  revokeBackgroundUrl();

  if (!(backgroundBlob instanceof Blob)) {
    workspace.style.backgroundImage = "";
    workspace.style.backgroundSize = "";
    workspace.style.backgroundRepeat = "";
    workspace.style.backgroundPosition = "";
    return;
  }

  backgroundObjectUrl = URL.createObjectURL(backgroundBlob);
  workspace.style.backgroundImage = `url("${backgroundObjectUrl}")`;

  if (preferences.backgroundMode === "tile") {
    workspace.style.backgroundSize = "auto";
    workspace.style.backgroundRepeat = "repeat";
    workspace.style.backgroundPosition = "left top";
  } else if (preferences.backgroundMode === "contain") {
    workspace.style.backgroundSize = "contain";
    workspace.style.backgroundRepeat = "no-repeat";
    workspace.style.backgroundPosition = "center top";
  } else {
    workspace.style.backgroundSize = "cover";
    workspace.style.backgroundRepeat = "no-repeat";
    workspace.style.backgroundPosition = "center center";
  }
}

// Workspace appearance is checkpoint state, while shrink-to-fit remains a
// global preference. These events keep that boundary explicit without making
// the workspace module own appearance storage.
window.addEventListener("flashframe:capture-appearance", (event) => {
  event.detail.appearance = {
    backgroundColor: preferences.backgroundColor,
    backgroundMode: preferences.backgroundMode,
    backgroundImage: backgroundBlob instanceof Blob ? backgroundBlob : null
  };
});

window.addEventListener("flashframe:restore-appearance", (event) => {
  const appearance = event.detail?.appearance;
  if (!appearance) return; // schema v1: retain the user's current appearance.
  preferences.backgroundColor = appearance.backgroundColor ?? null;
  preferences.backgroundMode = ["cover", "contain", "tile"].includes(appearance.backgroundMode)
    ? appearance.backgroundMode
    : "cover";
  backgroundBlob = appearance.backgroundImage instanceof Blob ? appearance.backgroundImage : null;
  savePreferences();
  applyBackground();
  const color = document.querySelector("#setting-background-color");
  const mode = document.querySelector("#setting-background-mode");
  const status = document.querySelector("#setting-background-status");
  if (color) color.value = preferences.backgroundColor || defaultColor();
  if (mode) mode.value = preferences.backgroundMode;
  if (status) status.textContent = backgroundBlob?.name || (backgroundBlob ? "Saved image" : "None");
  event.detail.tasks?.push(putContent(BACKGROUND_CONTENT_ID, backgroundBlob));
});

function intrinsicSize(media) {
  if (media instanceof HTMLImageElement) {
    return { width: media.naturalWidth, height: media.naturalHeight };
  }
  if (media instanceof HTMLVideoElement) {
    return { width: media.videoWidth, height: media.videoHeight };
  }
  return { width: 0, height: 0 };
}

function fitBlockOnce(block, media) {
  if (!preferences.shrinkToFit || !block?.isConnected || !media?.isConnected) return;
  if (block.dataset.flashframeShrinkFitDone === "true") return;
  if (block.classList.contains("is-maximized")) return;

  const natural = intrinsicSize(media);
  if (!(natural.width > 0 && natural.height > 0)) return;

  const blockRect = block.getBoundingClientRect();
  const mediaRect = media.getBoundingClientRect();
  if (!(blockRect.width > 0 && blockRect.height > 0)) return;

  const chromeHeight = Math.max(0, blockRect.height - mediaRect.height);
  const availableWidth = Math.max(220, blockRect.width);
  const availableMediaHeight = Math.max(100, blockRect.height - chromeHeight);
  const scale = Math.min(1, availableWidth / natural.width, availableMediaHeight / natural.height);
  const mediaWidth = natural.width * scale;
  const mediaHeight = natural.height * scale;
  const targetWidth = Math.max(220, Math.ceil(mediaWidth));
  const targetHeight = Math.max(150, Math.ceil(mediaHeight + chromeHeight));

  block.style.minWidth = "220px";
  block.style.minHeight = "150px";
  block.style.width = `${Math.min(blockRect.width, targetWidth)}px`;
  block.style.height = `${Math.min(blockRect.height, targetHeight)}px`;
  block.dataset.flashframeShrinkFitDone = "true";

  workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
}

function mediaForBlock(block) {
  return block.querySelector(".image-frame, .gallery-image, .video-player");
}

function bindShrinkFit(block) {
  if (!(block instanceof HTMLElement) || !block.classList.contains("block")) return;
  const media = mediaForBlock(block);
  if (!media) return;

  if (media.dataset.flashframeShrinkFitBound !== "true") {
    media.dataset.flashframeShrinkFitBound = "true";
    const eventName = media instanceof HTMLVideoElement ? "loadedmetadata" : "load";
    media.addEventListener(eventName, () => fitBlockOnce(block, media));
  }

  if (media instanceof HTMLImageElement && media.complete && media.naturalWidth > 0) {
    requestAnimationFrame(() => fitBlockOnce(block, media));
  } else if (media instanceof HTMLVideoElement && media.readyState >= 1 && media.videoWidth > 0) {
    requestAnimationFrame(() => fitBlockOnce(block, media));
  }
}

function bindAllShrinkFit() {
  for (const block of workspace?.querySelectorAll(".block") ?? []) bindShrinkFit(block);
}

function refitCurrentBlocks() {
  for (const block of workspace?.querySelectorAll(".block") ?? []) {
    delete block.dataset.flashframeShrinkFitDone;
    bindShrinkFit(block);
    const media = mediaForBlock(block);
    if (media) requestAnimationFrame(() => fitBlockOnce(block, media));
  }
}

async function chooseBackgroundImage() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  const file = await new Promise((resolve) => {
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null), { once: true });
    input.click();
  });

  if (!(file instanceof File)) return;
  backgroundBlob = file;
  await putContent(BACKGROUND_CONTENT_ID, file);
  const status = document.querySelector("#setting-background-status");
  if (status) status.textContent = file.name;
  applyBackground();
  workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
}

async function clearBackgroundImage() {
  backgroundBlob = null;
  await putContent(BACKGROUND_CONTENT_ID, null);
  const status = document.querySelector("#setting-background-status");
  if (status) status.textContent = "None";
  applyBackground();
  workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
}

function bindControls() {
  const shrink = document.querySelector("#setting-shrink-to-fit");
  const color = document.querySelector("#setting-background-color");
  const resetColor = document.querySelector("#setting-background-color-reset");
  const image = document.querySelector("#setting-background-image");
  const clear = document.querySelector("#setting-background-clear");
  const mode = document.querySelector("#setting-background-mode");

  if (shrink) shrink.checked = Boolean(preferences.shrinkToFit);
  if (color) color.value = preferences.backgroundColor || defaultColor();
  if (mode) mode.value = ["cover", "contain", "tile"].includes(preferences.backgroundMode) ? preferences.backgroundMode : "cover";

  shrink?.addEventListener("change", () => {
    preferences.shrinkToFit = shrink.checked;
    savePreferences();
    if (preferences.shrinkToFit) refitCurrentBlocks();
  });

  color?.addEventListener("input", () => {
    preferences.backgroundColor = color.value;
    savePreferences();
    applyBackground();
    workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
  });

  resetColor?.addEventListener("click", () => {
    preferences.backgroundColor = null;
    if (color) color.value = defaultColor();
    savePreferences();
    applyBackground();
    workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
  });

  image?.addEventListener("click", () => void chooseBackgroundImage());
  clear?.addEventListener("click", () => void clearBackgroundImage());

  mode?.addEventListener("change", () => {
    preferences.backgroundMode = mode.value;
    savePreferences();
    applyBackground();
    workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
  });
}

injectStyles();
injectControls();
bindControls();

try {
  const stored = await getContent(BACKGROUND_CONTENT_ID);
  backgroundBlob = stored instanceof Blob ? stored : null;
  const status = document.querySelector("#setting-background-status");
  if (status && backgroundBlob) status.textContent = backgroundBlob.name || "Saved image";
} catch (error) {
  console.warn("Could not restore Flashframe background image:", error);
}

applyBackground();
bindAllShrinkFit();

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.classList.contains("block")) bindShrinkFit(node);
      for (const block of node.querySelectorAll?.(".block") ?? []) bindShrinkFit(block);
    }
  }
});

if (workspace) observer.observe(workspace, { childList: true, subtree: true });
window.addEventListener("pagehide", revokeBackgroundUrl);
