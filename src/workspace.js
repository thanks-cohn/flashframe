import { getSnapshot, listSnapshots, saveSnapshot } from "./persistence.js";
import {
  fileFromHandle,
  hasReadPermission,
  listImages,
  makeHandleKey,
  pickImageDirectory,
  pickPdfFile,
  pickTextFile,
  pickVideoFile,
  requestReadPermission,
  resolveHandle,
  storeHandle
} from "./file-access.js";

const workspace = document.querySelector("#workspace");
const toolbar = document.querySelector(".toolbar");
const addTextButton = document.querySelector("#add-text");
const openTextButton = document.querySelector("#open-text");
const openPdfButton = document.querySelector("#open-pdf");
const openGalleryButton = document.querySelector("#open-gallery");
const openVideoButton = document.querySelector("#open-video");
const saveFrameButton = document.querySelector("#save-frame");
const restoreFrameButton = document.querySelector("#restore-frame");
const savedFramesSelect = document.querySelector("#saved-frames");
const status = document.querySelector("#status");

const templates = {
  text: document.querySelector("#text-block-template"),
  pdf: document.querySelector("#pdf-block-template"),
  gallery: document.querySelector("#gallery-block-template"),
  video: document.querySelector("#video-block-template")
};

const blockTypes = new Map();
const sourceRecords = new WeakMap();
const runtimeSources = new WeakMap();
const objectUrls = new WeakMap();

let zCounter = 1;
let newBlockOffset = 0;

function setStatus(message) {
  status.textContent = message;
}

function isPickerCancel(error) {
  return error?.name === "AbortError";
}

function numberFromStyle(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampInteger(value, min = 1) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(min, parsed) : min;
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

function registerBlockType(type, definition) {
  blockTypes.set(type, definition);
}

function setSourceRecord(block, source) {
  if (source) sourceRecords.set(block, { ...source });
  else sourceRecords.delete(block);
}

function getSourceRecord(block) {
  return sourceRecords.get(block) ?? null;
}

function replaceObjectUrl(block, url) {
  const previous = objectUrls.get(block);
  if (previous) URL.revokeObjectURL(previous);
  objectUrls.set(block, url);
}

function releaseBlockResources(block) {
  const url = objectUrls.get(block);
  if (url) URL.revokeObjectURL(url);
  objectUrls.delete(block);

  const video = block.querySelector("video");
  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}

function setSourceUnavailable(block, message) {
  const sourceMessage = block.querySelector(".source-message");
  const reconnect = block.querySelector(".reconnect-source");

  if (sourceMessage) {
    sourceMessage.textContent = message;
    sourceMessage.hidden = false;
  }

  if (reconnect) reconnect.hidden = false;
}

function clearSourceUnavailable(block) {
  const sourceMessage = block.querySelector(".source-message");
  const reconnect = block.querySelector(".reconnect-source");

  if (sourceMessage) {
    sourceMessage.textContent = "";
    sourceMessage.hidden = true;
  }

  if (reconnect) reconnect.hidden = true;
}

async function storedReadableHandle(source) {
  if (!source?.handleKey) return null;
  const handle = await resolveHandle(source.handleKey);
  if (!handle) return null;
  return (await hasReadPermission(handle)) ? handle : null;
}

async function reconnectSource(block, picker, loader) {
  const source = getSourceRecord(block);
  let handle = source?.handleKey ? await resolveHandle(source.handleKey) : null;

  if (handle && (await requestReadPermission(handle))) {
    await loader(handle);
    return;
  }

  try {
    const picked = await picker();
    handle = picked.handle;
    const handleKey = source?.handleKey || makeHandleKey(block.dataset.blockType);
    await storeHandle(handleKey, handle);

    setSourceRecord(block, {
      kind: handle.kind,
      handleKey,
      displayName: handle.name
    });

    const nameInput = block.querySelector(".block-name");
    if (nameInput && (!nameInput.value.trim() || nameInput.value === "Untitled")) {
      nameInput.value = handle.name;
    }

    await loader(handle, picked);
  } catch (error) {
    if (!isPickerCancel(error)) throw error;
  }
}

function bringToFront(block) {
  zCounter += 1;
  block.style.zIndex = String(zCounter);
}

function defaultGeometry(type = "text") {
  const offset = newBlockOffset % 240;
  newBlockOffset += 30;

  const defaults = {
    text: { width: 540, height: 390 },
    pdf: { width: 620, height: 680 },
    gallery: { width: 560, height: 560 },
    video: { width: 640, height: 430 }
  };

  return {
    x: 36 + offset,
    y: 36 + offset,
    ...(defaults[type] ?? defaults.text),
    z: ++zCounter
  };
}

function applyGeometry(block, geometry) {
  block.style.left = `${geometry.x}px`;
  block.style.top = `${geometry.y}px`;
  block.style.width = `${geometry.width}px`;
  block.style.height = `${geometry.height}px`;
  block.style.zIndex = String(geometry.z ?? ++zCounter);
  zCounter = Math.max(zCounter, geometry.z ?? 0);
}

function readGeometry(block) {
  return {
    x: numberFromStyle(block.style.left, block.offsetLeft),
    y: numberFromStyle(block.style.top, block.offsetTop),
    width: block.offsetWidth || numberFromStyle(block.style.width, 480),
    height: block.offsetHeight || numberFromStyle(block.style.height, 180),
    z: Number.parseInt(block.style.zIndex, 10) || 1
  };
}

function toggleMaximize(block) {
  const isMaximized = block.classList.contains("is-maximized");

  if (isMaximized) {
    const previous = JSON.parse(block.dataset.previousGeometry || "null");
    if (previous) applyGeometry(block, previous);
    block.classList.remove("is-maximized");
    delete block.dataset.previousGeometry;
    return;
  }

  block.dataset.previousGeometry = JSON.stringify(readGeometry(block));
  block.classList.add("is-maximized");

  const workspaceTop = workspace.getBoundingClientRect().top + window.scrollY;
  block.style.left = `${window.scrollX + 16}px`;
  block.style.top = `${Math.max(16, window.scrollY - workspaceTop + 16)}px`;
  block.style.width = `${Math.max(360, window.innerWidth - 32)}px`;
  block.style.height = `${Math.max(280, window.innerHeight - toolbar.offsetHeight - 32)}px`;
  bringToFront(block);
}

function attachBlockInteractions(block) {
  const header = block.querySelector(".block-header");
  const removeButton = block.querySelector(".remove-block");
  const maximizeButton = block.querySelector(".maximize-block");

  block.addEventListener("pointerdown", () => bringToFront(block));

  removeButton?.addEventListener("click", () => {
    releaseBlockResources(block);
    block.remove();
    setStatus("Block removed. The local source was not deleted.");
  });

  maximizeButton?.addEventListener("click", () => toggleMaximize(block));

  header?.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (event.target.closest("input, button")) return;
    if (block.classList.contains("is-maximized")) return;

    event.preventDefault();
    bringToFront(block);

    const startPointerX = event.clientX;
    const startPointerY = event.clientY;
    const startLeft = numberFromStyle(block.style.left, block.offsetLeft);
    const startTop = numberFromStyle(block.style.top, block.offsetTop);

    header.setPointerCapture(event.pointerId);

    const move = (moveEvent) => {
      block.style.left = `${startLeft + moveEvent.clientX - startPointerX}px`;
      block.style.top = `${startTop + moveEvent.clientY - startPointerY}px`;
    };

    const finish = () => {
      header.removeEventListener("pointermove", move);
      header.removeEventListener("pointerup", finish);
      header.removeEventListener("pointercancel", finish);
    };

    header.addEventListener("pointermove", move);
    header.addEventListener("pointerup", finish);
    header.addEventListener("pointercancel", finish);
  });
}

function updateTextSourceBadge(block) {
  const badge = block.querySelector(".source-badge");
  const source = getSourceRecord(block);
  if (!badge) return;

  if (source?.displayName) {
    badge.textContent = source.displayName;
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

function setPdfPage(block, page) {
  const input = block.querySelector(".pdf-page");
  const viewer = block.querySelector(".pdf-viewer");
  const runtime = runtimeSources.get(block);
  const nextPage = clampInteger(page, 1);

  input.value = String(nextPage);
  block.dataset.currentPage = String(nextPage);

  if (runtime?.url) {
    viewer.src = `${runtime.url}#page=${nextPage}&toolbar=1&navpanes=0`;
  }
}

async function loadPdfHandle(block, handle, state = {}) {
  const file = await fileFromHandle(handle);
  if (!file) throw new Error("PDF could not be read");

  const url = URL.createObjectURL(file);
  replaceObjectUrl(block, url);
  runtimeSources.set(block, { handle, url });
  clearSourceUnavailable(block);
  setPdfPage(block, state.page ?? block.dataset.currentPage ?? 1);
}

async function showGalleryIndex(block, index) {
  const runtime = runtimeSources.get(block);
  if (!runtime?.entries?.length) return;

  const count = runtime.entries.length;
  const nextIndex = ((index % count) + count) % count;
  const entry = runtime.entries[nextIndex];
  const file = await entry.handle.getFile();
  const url = URL.createObjectURL(file);

  replaceObjectUrl(block, url);
  runtime.url = url;
  runtime.index = nextIndex;
  runtimeSources.set(block, runtime);

  const image = block.querySelector(".gallery-image");
  image.src = url;
  image.alt = entry.name;
  block.querySelector(".gallery-position").textContent = `${nextIndex + 1} / ${count}`;
  block.querySelector(".gallery-filename").textContent = entry.name;
}

async function loadGalleryHandle(block, handle, state = {}) {
  const entries = await listImages(handle);
  if (!entries.length) {
    runtimeSources.set(block, { handle, entries: [], index: 0 });
    setSourceUnavailable(block, "This folder does not contain supported images.");
    block.querySelector(".gallery-position").textContent = "0 / 0";
    block.querySelector(".gallery-filename").textContent = "";
    return;
  }

  let index = Number.isFinite(state.currentIndex) ? state.currentIndex : 0;
  if (state.currentEntry) {
    const exact = entries.findIndex((entry) => entry.name === state.currentEntry);
    if (exact >= 0) index = exact;
  }

  index = Math.min(Math.max(0, index), entries.length - 1);
  runtimeSources.set(block, { handle, entries, index });
  clearSourceUnavailable(block);
  await showGalleryIndex(block, index);
}

async function loadVideoHandle(block, handle, state = {}) {
  const file = await fileFromHandle(handle);
  if (!file) throw new Error("Video could not be read");

  const player = block.querySelector(".video-player");
  const url = URL.createObjectURL(file);
  replaceObjectUrl(block, url);
  runtimeSources.set(block, { handle, url });
  clearSourceUnavailable(block);

  player.src = url;
  player.volume = Number.isFinite(state.volume) ? Math.min(1, Math.max(0, state.volume)) : 1;
  player.muted = Boolean(state.muted);
  player.playbackRate = Number.isFinite(state.playbackRate) ? state.playbackRate : 1;

  const seekTime = Number.isFinite(state.currentTime) ? Math.max(0, state.currentTime) : 0;

  const applyPlaybackState = async () => {
    player.currentTime = Math.min(seekTime, Number.isFinite(player.duration) ? player.duration : seekTime);
    block.querySelector(".video-time").textContent = formatTime(player.currentTime);

    if (state.paused === false) {
      try {
        await player.play();
      } catch {
        setStatus("Video position restored. Chrome requires a click before playback can resume.");
      }
    }
  };

  if (player.readyState >= 1) await applyPlaybackState();
  else player.addEventListener("loadedmetadata", applyPlaybackState, { once: true });
}

registerBlockType("text", {
  createElement() {
    return templates.text.content.firstElementChild.cloneNode(true);
  },

  initialize(block) {
    updateTextSourceBadge(block);
  },

  capture(block) {
    const editor = block.querySelector(".text-editor");
    return {
      text: editor.value,
      scrollTop: editor.scrollTop,
      cursorOffset: editor.selectionStart
    };
  },

  async restore(block, state = {}) {
    const editor = block.querySelector(".text-editor");
    editor.value = state.text ?? "";
    updateTextSourceBadge(block);

    requestAnimationFrame(() => {
      editor.scrollTop = Number.isFinite(state.scrollTop) ? state.scrollTop : 0;
      if (Number.isFinite(state.cursorOffset)) {
        const cursor = Math.min(state.cursorOffset, editor.value.length);
        editor.setSelectionRange(cursor, cursor);
      }
    });
  }
});

registerBlockType("pdf", {
  createElement() {
    return templates.pdf.content.firstElementChild.cloneNode(true);
  },

  initialize(block) {
    block.querySelector(".pdf-prev").addEventListener("click", () => {
      setPdfPage(block, clampInteger(block.querySelector(".pdf-page").value, 1) - 1);
    });

    block.querySelector(".pdf-next").addEventListener("click", () => {
      setPdfPage(block, clampInteger(block.querySelector(".pdf-page").value, 1) + 1);
    });

    block.querySelector(".pdf-page").addEventListener("change", (event) => {
      setPdfPage(block, event.currentTarget.value);
    });

    block.querySelector(".reconnect-source").addEventListener("click", async () => {
      try {
        await reconnectSource(block, pickPdfFile, async (handle) => loadPdfHandle(block, handle, this.capture(block)));
      } catch (error) {
        console.error(error);
        setStatus("Could not reconnect that PDF.");
      }
    });
  },

  capture(block) {
    return { page: clampInteger(block.querySelector(".pdf-page").value, 1) };
  },

  async restore(block, state = {}, source = null) {
    setPdfPage(block, state.page ?? 1);
    const handle = await storedReadableHandle(source);

    if (handle) await loadPdfHandle(block, handle, state);
    else setSourceUnavailable(block, `Reconnect ${source?.displayName ?? "this PDF"} to display it.`);
  }
});

registerBlockType("gallery", {
  createElement() {
    return templates.gallery.content.firstElementChild.cloneNode(true);
  },

  initialize(block) {
    block.tabIndex = 0;

    block.querySelector(".gallery-prev").addEventListener("click", () => {
      const runtime = runtimeSources.get(block);
      if (runtime?.entries?.length) void showGalleryIndex(block, runtime.index - 1);
    });

    block.querySelector(".gallery-next").addEventListener("click", () => {
      const runtime = runtimeSources.get(block);
      if (runtime?.entries?.length) void showGalleryIndex(block, runtime.index + 1);
    });

    block.addEventListener("keydown", (event) => {
      if (event.target.closest("input, button, textarea")) return;
      const runtime = runtimeSources.get(block);
      if (!runtime?.entries?.length) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void showGalleryIndex(block, runtime.index - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        void showGalleryIndex(block, runtime.index + 1);
      }
    });

    block.querySelector(".reconnect-source").addEventListener("click", async () => {
      try {
        await reconnectSource(block, pickImageDirectory, async (handle) => loadGalleryHandle(block, handle, this.capture(block)));
      } catch (error) {
        console.error(error);
        setStatus("Could not reconnect that image folder.");
      }
    });
  },

  capture(block) {
    const runtime = runtimeSources.get(block);
    const entry = runtime?.entries?.[runtime.index];
    return {
      currentEntry: entry?.name ?? block.dataset.currentEntry ?? null,
      currentIndex: Number.isFinite(runtime?.index) ? runtime.index : 0
    };
  },

  async restore(block, state = {}, source = null) {
    block.dataset.currentEntry = state.currentEntry ?? "";
    const handle = await storedReadableHandle(source);

    if (handle) await loadGalleryHandle(block, handle, state);
    else setSourceUnavailable(block, `Reconnect ${source?.displayName ?? "this image folder"} to browse it.`);
  }
});

registerBlockType("video", {
  createElement() {
    return templates.video.content.firstElementChild.cloneNode(true);
  },

  initialize(block) {
    const player = block.querySelector(".video-player");
    player.addEventListener("timeupdate", () => {
      block.querySelector(".video-time").textContent = formatTime(player.currentTime);
    });

    block.querySelector(".reconnect-source").addEventListener("click", async () => {
      try {
        await reconnectSource(block, pickVideoFile, async (handle) => loadVideoHandle(block, handle, this.capture(block)));
      } catch (error) {
        console.error(error);
        setStatus("Could not reconnect that video.");
      }
    });
  },

  capture(block) {
    const player = block.querySelector(".video-player");
    return {
      currentTime: Number.isFinite(player.currentTime) ? player.currentTime : 0,
      paused: player.paused,
      volume: player.volume,
      muted: player.muted,
      playbackRate: player.playbackRate,
      loop: player.loop,
      syncGroup: block.dataset.syncGroup || "all",
      frameless: block.dataset.frameless === "true",
      headerVisibility: block.dataset.headerVisibility || "inherit",
      footerVisibility: block.dataset.footerVisibility || "inherit"
    };
  },

  async restore(block, state = {}, source = null) {
    block.dataset.timedMedia = "true";
    block.dataset.syncGroup = state.syncGroup ?? "all";
    block.dataset.frameless = String(Boolean(state.frameless));
    block.dataset.headerVisibility = state.headerVisibility ?? "inherit";
    block.dataset.footerVisibility = state.footerVisibility ?? "inherit";
    window.dispatchEvent(new CustomEvent("flashframe:restore-media-chrome", { detail: { block } }));
    block.querySelector(".video-player").loop = Boolean(state.loop);
    block.querySelector(".video-time").textContent = formatTime(state.currentTime ?? 0);
    const handle = await storedReadableHandle(source);

    if (handle) await loadVideoHandle(block, handle, state);
    else setSourceUnavailable(block, `Reconnect ${source?.displayName ?? "this video"} to play it.`);
  }
});

async function createBlock(record = {}) {
  const type = record.type ?? "text";
  const definition = blockTypes.get(type);

  if (!definition) {
    console.warn(`Unknown Flashframe block type: ${type}`);
    return null;
  }

  const block = definition.createElement();
  block.dataset.blockId = record.id ?? crypto.randomUUID();
  block.dataset.blockType = type;
  setSourceRecord(block, record.source ?? null);

  const nameInput = block.querySelector(".block-name");
  if (nameInput) nameInput.value = record.name ?? "Untitled";

  applyGeometry(block, record.geometry ?? defaultGeometry(type));
  attachBlockInteractions(block);
  definition.initialize?.(block);
  workspace.append(block);

  try {
    await definition.restore(block, record.state ?? {}, record.source ?? null);
  } catch (error) {
    console.error(`Could not restore ${type} block`, error);
    setSourceUnavailable(block, `Flashframe could not restore ${record.source?.displayName ?? "this source"}.`);
  }

  return block;
}

function captureBlock(block) {
  const type = block.dataset.blockType;
  const definition = blockTypes.get(type);

  if (!definition) throw new Error(`Cannot serialize unknown block type: ${type}`);

  return {
    id: block.dataset.blockId,
    type,
    name: block.querySelector(".block-name")?.value?.trim() || "Untitled",
    geometry: readGeometry(block),
    source: getSourceRecord(block),
    state: definition.capture(block)
  };
}

function captureWorkspace(name) {
  const detail = {};
  window.dispatchEvent(new CustomEvent("flashframe:capture-appearance", { detail }));
  return {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    appearance: detail.appearance ?? null,
    blocks: [...workspace.querySelectorAll(".block")].map(captureBlock)
  };
}

async function restoreWorkspace(snapshot) {
  for (const block of workspace.querySelectorAll(".block")) releaseBlockResources(block);
  workspace.replaceChildren();
  zCounter = 1;
  newBlockOffset = 0;

  if ((snapshot.schemaVersion ?? 1) >= 2 && snapshot.appearance) {
    const detail = { appearance: snapshot.appearance, tasks: [] };
    window.dispatchEvent(new CustomEvent("flashframe:restore-appearance", { detail }));
    await Promise.all(detail.tasks);
  }

  for (const record of snapshot.blocks ?? []) {
    await createBlock(record);
  }

  setStatus(`Restored “${snapshot.name}”.`);
}

async function refreshSnapshotList(selectedId = "") {
  const snapshots = await listSnapshots();
  savedFramesSelect.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = snapshots.length ? "Saved Flashframes" : "No saved Flashframes";
  savedFramesSelect.append(placeholder);

  for (const snapshot of snapshots) {
    const option = document.createElement("option");
    option.value = snapshot.id;
    option.textContent = `${snapshot.name} — ${new Date(snapshot.createdAt).toLocaleString()}`;
    savedFramesSelect.append(option);
  }

  if (selectedId) savedFramesSelect.value = selectedId;
}

async function addPickedBlock({ type, picker, initialState }) {
  try {
    const picked = await picker();
    const handleKey = makeHandleKey(type);
    await storeHandle(handleKey, picked.handle);

    const source = {
      kind: picked.handle.kind,
      handleKey,
      displayName: picked.handle.name
    };

    const block = await createBlock({
      type,
      name: picked.handle.name,
      source,
      state: initialState?.(picked) ?? {}
    });

    if (type === "pdf") await loadPdfHandle(block, picked.handle, { page: 1 });
    if (type === "gallery") await loadGalleryHandle(block, picked.handle, { currentIndex: 0 });
    if (type === "video") await loadVideoHandle(block, picked.handle, { currentTime: 0, paused: true });

    setStatus(`${picked.handle.name} added.`);
  } catch (error) {
    if (isPickerCancel(error)) return;
    console.error(error);
    setStatus("Flashframe could not open that local source.");
  }
}

addTextButton.addEventListener("click", async () => {
  const block = await createBlock({ type: "text", name: "Untitled", state: { text: "" } });
  block?.querySelector(".text-editor")?.focus();
  setStatus("Text block added.");
});

openTextButton.addEventListener("click", async () => {
  try {
    const picked = await pickTextFile();
    const handleKey = makeHandleKey("text");
    await storeHandle(handleKey, picked.handle);

    const block = await createBlock({
      type: "text",
      name: picked.file.name,
      source: { kind: "file", handleKey, displayName: picked.file.name },
      state: { text: picked.text, scrollTop: 0, cursorOffset: 0 }
    });

    block?.querySelector(".text-editor")?.focus();
    setStatus(`${picked.file.name} opened. Flashframe snapshots preserve the text they contain.`);
  } catch (error) {
    if (isPickerCancel(error)) return;
    console.error(error);
    setStatus("Flashframe could not open that text file.");
  }
});

openPdfButton.addEventListener("click", () => void addPickedBlock({ type: "pdf", picker: pickPdfFile }));
openGalleryButton.addEventListener("click", () => void addPickedBlock({ type: "gallery", picker: pickImageDirectory }));
openVideoButton.addEventListener("click", () => void addPickedBlock({ type: "video", picker: pickVideoFile }));

saveFrameButton.addEventListener("click", async () => {
  const defaultName = `Flashframe ${new Date().toLocaleString()}`;
  const name = window.prompt("Name this Flashframe", defaultName);
  if (name == null) return;

  try {
    const snapshot = captureWorkspace(name.trim() || defaultName);
    await saveSnapshot(snapshot);
    await refreshSnapshotList(snapshot.id);
    setStatus(`Saved “${snapshot.name}”.`);
  } catch (error) {
    console.error(error);
    setStatus("Could not save this Flashframe.");
  }
});

restoreFrameButton.addEventListener("click", async () => {
  const id = savedFramesSelect.value;
  if (!id) {
    setStatus("Choose a saved Flashframe first.");
    return;
  }

  try {
    const snapshot = await getSnapshot(id);
    if (!snapshot) {
      setStatus("That Flashframe could not be found.");
      return;
    }

    await restoreWorkspace(snapshot);
  } catch (error) {
    console.error(error);
    setStatus("Could not restore that Flashframe.");
  }
});

try {
  await refreshSnapshotList();
  await createBlock({
    type: "text",
    name: "Welcome",
    state: {
      text: "Flashframe is running as a Chrome/Chromium extension.\n\nOpen local text, PDFs, image folders, or video. Arrange the blocks, leave each item where it is useful, then save a Flashframe."
    }
  });
  setStatus("Ready. Your workspace data stays local in this extension.");
} catch (error) {
  console.error(error);
  setStatus("Flashframe opened, but local persistence could not initialize.");
}
