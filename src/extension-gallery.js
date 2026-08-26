const MARKER = "__FRAMECHUTE_EXTENSION_GALLERY_V1__";
const EVENT_NAME = "framechute:add-extension-gallery";

const workspace = document.querySelector("#workspace");
const addTextButton = document.querySelector("#add-text");
const status = document.querySelector("#status");

const runtimes = new WeakMap();
const objectUrls = new WeakMap();

function setStatus(message) {
  if (status) status.textContent = message;
}

function writeMarker(block, payload, notify = false) {
  const editor = block.querySelector(".text-editor");
  if (!editor) return;
  editor.value = `${MARKER}${JSON.stringify(payload)}`;
  if (notify) workspace?.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
}

function readMarker(block) {
  const editor = block?.querySelector(".text-editor");
  if (!editor?.value?.startsWith(MARKER)) return null;
  try {
    return JSON.parse(editor.value.slice(MARKER.length));
  } catch {
    return null;
  }
}

function replaceObjectUrl(block, url) {
  const previous = objectUrls.get(block);
  if (previous) URL.revokeObjectURL(previous);
  objectUrls.set(block, url);
}

function releaseBlock(block) {
  const url = objectUrls.get(block);
  if (url) URL.revokeObjectURL(url);
  objectUrls.delete(block);
  runtimes.delete(block);
}

function sourceMessage(block, message) {
  const node = block.querySelector(".source-message");
  if (!node) return;
  node.textContent = message || "";
  node.hidden = !message;
}

function setUnavailable(block, message) {
  const retry = block.querySelector(".reconnect-source");
  const node = block.querySelector(".source-message");
  if (node && retry) {
    const text = document.createElement("span");
    text.textContent = message;
    const centerRetry = document.createElement("button");
    centerRetry.type = "button";
    centerRetry.className = "gallery-reconnect-center";
    centerRetry.textContent = "Reconnect gallery";
    centerRetry.addEventListener("click", () => retry.click());
    node.replaceChildren(text, centerRetry);
    node.hidden = false;
  } else sourceMessage(block, message);
  if (retry) retry.hidden = false;
}

function clearUnavailable(block) {
  sourceMessage(block, "");
  const retry = block.querySelector(".reconnect-source");
  if (retry) retry.hidden = true;
}

function base64File(response) {
  const binary = atob(String(response?.base64 || ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], response?.name || "Gallery image", {
    type: response?.type || "application/octet-stream",
    lastModified: Number(response?.lastModified) || Date.now()
  });
}

async function sourceCall(source, type, extra = {}) {
  if (!source?.extensionId || !source?.token || !source?.path) {
    throw new Error("This gallery source is incomplete. Drag the folder into FrameChute again.");
  }

  let response;
  try {
    response = await chrome.runtime.sendMessage(source.extensionId, {
      type,
      sourceToken: source.token,
      directoryPath: source.path,
      ...extra
    });
  } catch (error) {
    throw new Error(`Could not reach ${source.providerName || "the gallery source"}. Reload or reconnect it and try again. ${error?.message || ""}`.trim());
  }

  if (!response?.ok) throw new Error(response?.error || `${source.providerName || "Gallery source"} could not provide this folder.`);
  return response;
}

async function listSourceImages(payload) {
  const response = await sourceCall(payload.source, "chute-gallery-list-v1");
  return Array.isArray(response.entries) ? response.entries : [];
}

async function readSourceImage(payload, entry) {
  const response = await sourceCall(payload.source, "chute-gallery-read-v1", {
    entryPath: entry.relativePath
  });
  return base64File(response);
}

async function showIndex(block, payload, requestedIndex) {
  const runtime = runtimes.get(block);
  if (!runtime?.entries?.length) return;

  const count = runtime.entries.length;
  const index = ((Number(requestedIndex) % count) + count) % count;
  const entry = runtime.entries[index];

  sourceMessage(block, `Loading ${entry.displayPath || entry.name}…`);
  const file = await readSourceImage(payload, entry);
  const url = URL.createObjectURL(file);
  replaceObjectUrl(block, url);

  runtime.index = index;
  runtimes.set(block, runtime);

  const image = block.querySelector(".gallery-image");
  image.src = url;
  image.alt = entry.displayPath || entry.name || "Gallery image";
  block.querySelector(".gallery-position").textContent = `${index + 1} / ${count}`;
  block.querySelector(".gallery-filename").textContent = entry.displayPath || entry.name || "";

  payload.currentIndex = index;
  payload.currentEntry = entry.relativePath || entry.name || null;
  clearUnavailable(block);
  writeMarker(block, payload, true);
}

async function loadGallery(block, payload) {
  sourceMessage(block, `Reading ${payload.name || "image folder"}…`);
  const entries = await listSourceImages(payload);

  if (!entries.length) {
    runtimes.set(block, { entries: [], index: 0 });
    block.querySelector(".gallery-position").textContent = "0 / 0";
    block.querySelector(".gallery-filename").textContent = "";
    block.querySelector(".gallery-image").removeAttribute("src");
    setUnavailable(block, "This folder and its subfolders do not contain supported images.");
    return;
  }

  let index = Number.isFinite(payload.currentIndex) ? payload.currentIndex : 0;
  if (payload.currentEntry) {
    const exact = entries.findIndex((entry) => entry.relativePath === payload.currentEntry);
    if (exact >= 0) index = exact;
  }
  index = Math.min(Math.max(0, index), entries.length - 1);

  runtimes.set(block, { entries, index });
  clearUnavailable(block);
  await showIndex(block, payload, index);
}

function makeGalleryUi(block, payload) {
  const stage = document.createElement("div");
  stage.className = "gallery-stage";

  const image = document.createElement("img");
  image.className = "gallery-image";
  image.alt = "";

  const message = document.createElement("div");
  message.className = "source-message";
  message.hidden = true;
  stage.append(image, message);

  const toolbar = document.createElement("div");
  toolbar.className = "block-toolbar gallery-toolbar";

  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = "gallery-prev";
  previous.title = "Previous image";
  previous.textContent = "‹";

  const position = document.createElement("span");
  position.className = "gallery-position";
  position.textContent = "0 / 0";

  const filename = document.createElement("span");
  filename.className = "gallery-filename";

  const next = document.createElement("button");
  next.type = "button";
  next.className = "gallery-next";
  next.title = "Next image";
  next.textContent = "›";

  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "reconnect-source";
  retry.textContent = "Retry";
  retry.hidden = true;

  toolbar.append(previous, position, filename, next, retry);
  block.append(stage, toolbar);

  const move = (amount) => {
    const runtime = runtimes.get(block);
    if (!runtime?.entries?.length) return;
    void showIndex(block, payload, runtime.index + amount).catch((error) => {
      console.error("Extension gallery navigation failed", error);
      setUnavailable(block, error?.message || "Could not load that gallery image.");
    });
  };

  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  retry.addEventListener("click", () => {
    void loadGallery(block, payload).catch((error) => {
      console.error("Extension gallery reload failed", error);
      setUnavailable(block, error?.message || "Could not reconnect this gallery source.");
    });
  });

  block.addEventListener("keydown", (event) => {
    if (event.target.closest("input, button, textarea")) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    }
  });

  // The existing maximize button is FrameChute's lightbox-like view. Double
  // clicking the image is a convenient shortcut into and out of that view.
  image.addEventListener("dblclick", () => block.querySelector(".maximize-block")?.click());
}

function convertGalleryBlock(block) {
  if (!block?.isConnected || block.dataset.extensionGallery === "true") return false;
  const payload = readMarker(block);
  if (!payload?.source) return false;

  block.dataset.extensionGallery = "true";
  block.classList.remove("text-block");
  block.classList.add("gallery-block", "extension-gallery-block");
  block.tabIndex = 0;

  const editor = block.querySelector(".text-editor");
  if (editor) {
    editor.classList.add("custom-state-store");
    editor.hidden = true;
    editor.tabIndex = -1;
    editor.setAttribute("aria-hidden", "true");
  }

  const name = block.querySelector(".block-name");
  if (name && (!name.value.trim() || name.value === "Untitled")) name.value = payload.name || "Gallery";

  makeGalleryUi(block, payload);
  block.querySelector(".remove-block")?.addEventListener("click", () => releaseBlock(block), { once: true });

  void loadGallery(block, payload).catch((error) => {
    console.error("Extension gallery failed to load", error);
    setUnavailable(block, error?.message || "Could not load this gallery source.");
  });
  return true;
}

function scheduleConversion(block) {
  for (const delay of [0, 25, 100, 300]) setTimeout(() => convertGalleryBlock(block), delay);
}

async function waitForNewTextBlock(before) {
  return new Promise((resolve) => {
    const find = () => [...workspace.querySelectorAll('.block[data-block-type="text"]')]
      .find((block) => !before.has(block) && block.dataset.extensionGallery !== "true");
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
      resolve(find() || null);
    }, 1000);
  });
}

async function createExtensionGallery(detail = {}) {
  const source = detail.source;
  if (!source?.extensionId || !source?.token || !source?.path) {
    throw new Error("The dropped folder did not contain a usable gallery source.");
  }

  const before = new Set(workspace.querySelectorAll(".block"));
  const waiting = waitForNewTextBlock(before);
  addTextButton?.click();
  const block = await waiting;
  if (!block) throw new Error("FrameChute could not create the gallery block.");

  const rect = workspace.getBoundingClientRect();
  const point = detail.point || { x: 120, y: 100 };
  block.style.left = `${Math.max(8, Number(point.x) || 120)}px`;
  block.style.top = `${Math.max(8, Number(point.y) || 100)}px`;
  block.style.width = "560px";
  block.style.height = "560px";

  const payload = {
    version: 1,
    name: detail.name || "Image folder",
    source,
    currentIndex: 0,
    currentEntry: null
  };
  const name = block.querySelector(".block-name");
  if (name) name.value = payload.name;
  writeMarker(block, payload, true);
  convertGalleryBlock(block);
  setStatus(`${payload.name} opened as a gallery.`);
}

workspace?.addEventListener(EVENT_NAME, (event) => {
  void createExtensionGallery(event.detail || {}).catch((error) => {
    console.error("Could not create extension gallery", error);
    setStatus(error?.message || "Could not create that gallery.");
  });
});

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.classList.contains("block")) scheduleConversion(node);
      for (const block of node.querySelectorAll?.(".block") || []) scheduleConversion(block);
    }
    for (const node of mutation.removedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.dataset.extensionGallery === "true") releaseBlock(node);
      for (const block of node.querySelectorAll?.('[data-extension-gallery="true"]') || []) releaseBlock(block);
    }
  }
});

if (workspace) {
  observer.observe(workspace, { childList: true, subtree: false });
  for (const block of workspace.querySelectorAll('.block[data-block-type="text"]')) scheduleConversion(block);
}
