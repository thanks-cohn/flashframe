import { getSnapshot, listSnapshots, saveSnapshot } from "./persistence.js";

const workspace = document.querySelector("#workspace");
const addTextButton = document.querySelector("#add-text");
const saveFrameButton = document.querySelector("#save-frame");
const restoreFrameButton = document.querySelector("#restore-frame");
const savedFramesSelect = document.querySelector("#saved-frames");
const status = document.querySelector("#status");
const textTemplate = document.querySelector("#text-block-template");

const blockTypes = new Map();
let zCounter = 1;
let newBlockOffset = 0;

function registerBlockType(type, definition) {
  blockTypes.set(type, definition);
}

registerBlockType("text", {
  createElement() {
    return textTemplate.content.firstElementChild.cloneNode(true);
  },

  capture(block) {
    const editor = block.querySelector(".text-editor");

    return {
      text: editor.value,
      scrollTop: editor.scrollTop,
      cursorOffset: editor.selectionStart
    };
  },

  restore(block, state = {}) {
    const editor = block.querySelector(".text-editor");
    editor.value = state.text ?? "";

    requestAnimationFrame(() => {
      editor.scrollTop = Number.isFinite(state.scrollTop) ? state.scrollTop : 0;

      if (Number.isFinite(state.cursorOffset)) {
        const cursor = Math.min(state.cursorOffset, editor.value.length);
        editor.setSelectionRange(cursor, cursor);
      }
    });
  }
});

function setStatus(message) {
  status.textContent = message;
}

function numberFromStyle(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bringToFront(block) {
  zCounter += 1;
  block.style.zIndex = String(zCounter);
}

function defaultGeometry() {
  const offset = newBlockOffset % 220;
  newBlockOffset += 28;

  return {
    x: 36 + offset,
    y: 36 + offset,
    width: 540,
    height: 390,
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
    width: block.offsetWidth,
    height: block.offsetHeight,
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

  block.style.left = `${workspace.scrollLeft + 16}px`;
  block.style.top = `${workspace.scrollTop + 16}px`;
  block.style.width = `${Math.max(320, workspace.clientWidth - 32)}px`;
  block.style.height = `${Math.max(240, workspace.clientHeight - 32)}px`;
  bringToFront(block);
}

function attachBlockInteractions(block) {
  const header = block.querySelector(".block-header");
  const removeButton = block.querySelector(".remove-block");
  const maximizeButton = block.querySelector(".maximize-block");

  block.addEventListener("pointerdown", () => bringToFront(block));

  removeButton?.addEventListener("click", () => {
    block.remove();
    setStatus("Block removed from workspace. The source file was not deleted.");
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
      const nextLeft = startLeft + moveEvent.clientX - startPointerX;
      const nextTop = startTop + moveEvent.clientY - startPointerY;
      block.style.left = `${nextLeft}px`;
      block.style.top = `${nextTop}px`;
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

function createBlock(record) {
  const type = record?.type ?? "text";
  const definition = blockTypes.get(type);

  if (!definition) {
    console.warn(`Unknown Flashframe block type: ${type}`);
    return null;
  }

  const block = definition.createElement();
  block.dataset.blockId = record?.id ?? crypto.randomUUID();
  block.dataset.blockType = type;

  const nameInput = block.querySelector(".block-name");
  if (nameInput) nameInput.value = record?.name ?? "Untitled";

  applyGeometry(block, record?.geometry ?? defaultGeometry());
  attachBlockInteractions(block);
  workspace.append(block);
  definition.restore(block, record?.state ?? {});

  return block;
}

function captureBlock(block) {
  const type = block.dataset.blockType;
  const definition = blockTypes.get(type);

  if (!definition) {
    throw new Error(`Cannot serialize unknown block type: ${type}`);
  }

  return {
    id: block.dataset.blockId,
    type,
    name: block.querySelector(".block-name")?.value?.trim() || "Untitled",
    geometry: readGeometry(block),
    source: null,
    state: definition.capture(block)
  };
}

function captureWorkspace(name) {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    blocks: [...workspace.querySelectorAll(".block")].map(captureBlock)
  };
}

function restoreWorkspace(snapshot) {
  workspace.replaceChildren();
  zCounter = 1;
  newBlockOffset = 0;

  for (const record of snapshot.blocks ?? []) {
    createBlock(record);
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

addTextButton.addEventListener("click", () => {
  const block = createBlock({ type: "text", name: "Untitled", state: { text: "" } });
  block?.querySelector(".text-editor")?.focus();
  setStatus("Text block added.");
});

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

    restoreWorkspace(snapshot);
  } catch (error) {
    console.error(error);
    setStatus("Could not restore that Flashframe.");
  }
});

try {
  await refreshSnapshotList();
  createBlock({
    type: "text",
    name: "Welcome",
    state: {
      text: "Flashframe is running as a Chrome/Chromium extension.\n\nMove this block by its header, resize it from the corner, write something, then save a Flashframe."
    }
  });
  setStatus("Ready.");
} catch (error) {
  console.error(error);
  setStatus("Flashframe opened, but local persistence could not initialize.");
}
