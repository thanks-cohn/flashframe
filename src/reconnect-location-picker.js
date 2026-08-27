import { listFrames as listSnapshots } from "./storage.js";
import { resolveHandle } from "./file-access.js";

const LOCAL_MARKER = "__FLASHFRAME_LOCAL_DROP_V1__";
const CUSTOM_MARKER = "__FLASHFRAME_CUSTOM_BLOCK_V1__";
const EXTENSION_GALLERY_MARKER = "__FRAMECHUTE_EXTENSION_GALLERY_V1__";
const RECONNECT_SELECTOR = ".reconnect-source, .reconnect-custom-image, .framechute-reconnect-location";
const CONTEXT_TTL_MS = 12000;

const workspace = document.querySelector("#workspace");
const status = document.querySelector("#status");

let snapshotSources = new Map();
let pendingReconnect = null;
let refreshTimer = 0;

function setStatus(message) {
  if (status) status.textContent = message;
}

function markerPayload(block) {
  const store = block?.querySelector(".custom-state-store, .text-editor");
  const value = String(store?.value || "");
  for (const marker of [LOCAL_MARKER, CUSTOM_MARKER, EXTENSION_GALLERY_MARKER]) {
    if (!value.startsWith(marker)) continue;
    try {
      return { marker, payload: JSON.parse(value.slice(marker.length)) };
    } catch {
      return null;
    }
  }
  return null;
}

function sourceFromMarker(block) {
  const record = markerPayload(block);
  if (!record) return null;
  const payload = record.payload || {};
  if (record.marker === EXTENSION_GALLERY_MARKER) {
    return {
      handleKey: null,
      address: payload.sourceAddress || payload.source?.path || payload.name || "",
      expectedKind: "directory",
      direct: true
    };
  }
  return {
    handleKey: payload.handleKey || null,
    address: payload.sourceAddress || payload.displayName || payload.name || "",
    expectedKind: payload.kind === "gallery" ? "directory" : "file",
    direct: false
  };
}

function sourceFromSnapshot(block) {
  const source = snapshotSources.get(block?.dataset?.blockId) || null;
  if (!source) return null;
  return {
    handleKey: source.handleKey || null,
    address: source.address || source.relativePath || source.path || source.displayName || "",
    expectedKind: block.dataset.blockType === "gallery" ? "directory" : "file",
    direct: false
  };
}

function sourceForBlock(block) {
  return sourceFromMarker(block) || sourceFromSnapshot(block) || null;
}

async function refreshSnapshotSources() {
  try {
    const snapshots = await listSnapshots();
    snapshots.sort((a, b) => {
      if (a?.id === "__flashframe_live__" && b?.id !== "__flashframe_live__") return -1;
      if (b?.id === "__flashframe_live__" && a?.id !== "__flashframe_live__") return 1;
      return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
    });

    const next = new Map();
    for (const snapshot of snapshots) {
      for (const record of snapshot?.blocks || []) {
        if (!record?.id || next.has(record.id) || !record.source) continue;
        next.set(record.id, record.source);
      }
    }
    snapshotSources = next;
  } catch (error) {
    console.warn("Could not refresh saved reconnect locations:", error);
  }
}

function sanitizePickerIdPart(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]+/g, "")
    .slice(0, 22) || "source";
}

function pickerIdFor(block, expectedKind) {
  const prefix = expectedKind === "directory" ? "fc-dir-" : "fc-file-";
  return `${prefix}${sanitizePickerIdPart(block?.dataset?.blockId)}`.slice(0, 32);
}

function addressForBlock(block, source) {
  const footerValue = block?.querySelector(".framechute-source-location-value")?.value;
  return String(footerValue || source?.address || block?.querySelector(".block-name")?.value || "").trim();
}

function wellKnownDirectory(address) {
  const first = String(address || "").replace(/\\/g, "/").split("/").filter(Boolean)[0]?.toLowerCase();
  const known = new Map([
    ["desktop", "desktop"],
    ["documents", "documents"],
    ["downloads", "downloads"],
    ["music", "music"],
    ["pictures", "pictures"],
    ["videos", "videos"]
  ]);
  return known.get(first) || null;
}

function rememberReconnectContext(block) {
  if (!(block instanceof HTMLElement)) return;
  const source = sourceForBlock(block);
  if (source?.direct) {
    pendingReconnect = null;
    return;
  }

  const expectedKind = source?.expectedKind || (block.dataset.blockType === "gallery" ? "directory" : "file");
  pendingReconnect = {
    blockId: block.dataset.blockId || "",
    handleKey: source?.handleKey || null,
    address: addressForBlock(block, source),
    expectedKind,
    pickerId: pickerIdFor(block, expectedKind),
    expiresAt: Date.now() + CONTEXT_TTL_MS
  };
}

function activeReconnectContext(pickerKind) {
  const context = pendingReconnect;
  if (!context || Date.now() > context.expiresAt) {
    pendingReconnect = null;
    return null;
  }
  if (pickerKind === "directory" && context.expectedKind !== "directory") return null;
  if (pickerKind === "file" && context.expectedKind === "directory") return null;
  return context;
}

function isNativeFilesystemHandle(handle) {
  if (!handle || !["file", "directory"].includes(handle.kind)) return false;
  if (handle.__framechuteSyntheticFile) return false;
  return typeof handle.isSameEntry === "function" || typeof handle.queryPermission === "function";
}

async function startHandleFor(context) {
  if (!context?.handleKey) return null;
  try {
    const handle = await resolveHandle(context.handleKey);
    return isNativeFilesystemHandle(handle) ? handle : null;
  } catch {
    return null;
  }
}

function shouldRetryWithoutStartIn(error) {
  return error?.name === "TypeError" || error?.name === "NotFoundError";
}

function installPickerWrapper(methodName, pickerKind) {
  const original = window[methodName];
  if (typeof original !== "function") return;
  const nativePicker = original.bind(window);

  try {
    window[methodName] = async function frameChuteRememberedLocationPicker(options = {}) {
      const context = activeReconnectContext(pickerKind);
      if (!context) return nativePicker(options);

      // If the live handle itself can no longer be used, startIn still gives
      // Chromium the strongest possible hint about the file's old location.
      // The stable picker id gives Chrome a second memory of the directory once
      // the user confirms a replacement there.
      const startHandle = await startHandleFor(context);
      const enhanced = { ...options };
      if (!enhanced.id) enhanced.id = context.pickerId;
      if (!enhanced.startIn) enhanced.startIn = startHandle || wellKnownDirectory(context.address) || undefined;

      const readable = context.address || "the saved source location";
      setStatus(`Opening ${readable}… If Chrome asks, the picker should already be at the remembered location.`);

      try {
        return await nativePicker(enhanced);
      } catch (error) {
        if (enhanced.startIn && shouldRetryWithoutStartIn(error)) {
          const fallback = { ...enhanced };
          delete fallback.startIn;
          return nativePicker(fallback);
        }
        throw error;
      } finally {
        pendingReconnect = null;
      }
    };
  } catch (error) {
    console.warn(`Could not install remembered-location wrapper for ${methodName}:`, error);
  }
}

function polishReconnectButton(button) {
  if (!(button instanceof HTMLButtonElement)) return;
  if (button.classList.contains("framechute-reconnect-location")) return;
  button.textContent = "Reconnect to saved location";
  button.title = "Use the remembered source first. If Chrome needs manual confirmation, open the picker at the saved location.";
}

function polishReconnectControls(root = document) {
  if (root instanceof HTMLButtonElement && root.matches(RECONNECT_SELECTOR)) polishReconnectButton(root);
  for (const button of root.querySelectorAll?.(".reconnect-source, .reconnect-custom-image") || []) {
    polishReconnectButton(button);
  }
}

document.addEventListener("click", (event) => {
  const control = event.target instanceof Element ? event.target.closest(RECONNECT_SELECTOR) : null;
  if (!control) return;
  const block = control.closest(".block");
  if (!block) return;
  rememberReconnectContext(block);
}, { capture: true });

workspace?.addEventListener("flashframe:workspace-changed", () => {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => void refreshSnapshotSources(), 120);
});
window.addEventListener("flashframe:archive-imported", () => void refreshSnapshotSources());
window.addEventListener("focus", () => void refreshSnapshotSources());

new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;
      polishReconnectControls(node);
    }
  }
}).observe(document.body, { childList: true, subtree: true });

installPickerWrapper("showOpenFilePicker", "file");
installPickerWrapper("showDirectoryPicker", "directory");
polishReconnectControls();
void refreshSnapshotSources();
