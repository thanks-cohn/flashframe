import { listSnapshots } from "./persistence.js";
import { resolveHandle } from "./file-access.js";

const reconnectAllButton = document.querySelector("#reconnect-all");
const workspace = document.querySelector("#workspace");
const status = document.querySelector("#status");

const IDLE_LABEL = "Reconnect all to locations";
const LOCAL_MARKER = "__FLASHFRAME_LOCAL_DROP_V1__";
const CUSTOM_MARKER = "__FLASHFRAME_CUSTOM_BLOCK_V1__";
const EXTENSION_GALLERY_MARKER = "__FRAMECHUTE_EXTENSION_GALLERY_V1__";

let rememberedHandles = new Map();
let preloadTimer = 0;

function setStatus(message) {
  if (status) status.textContent = message;
}

function setButtonLabel(label) {
  if (!reconnectAllButton) return;
  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "⛓";
  const text = document.createElement("span");
  text.className = "toolbar-command-label";
  text.textContent = label === IDLE_LABEL ? "Reconnect" : label;
  reconnectAllButton.replaceChildren(icon, text);
}

function markerPayloadFromText(value) {
  const text = String(value || "");
  for (const marker of [LOCAL_MARKER, CUSTOM_MARKER, EXTENSION_GALLERY_MARKER]) {
    if (!text.startsWith(marker)) continue;
    try {
      return { marker, payload: JSON.parse(text.slice(marker.length)) };
    } catch {
      return null;
    }
  }
  return null;
}

function markerPayload(record) {
  return markerPayloadFromText(record?.state?.text);
}

function rememberedSourceFromMarker(marker) {
  if (!marker) return null;
  if (marker.marker === EXTENSION_GALLERY_MARKER) {
    return { handleKey: null, direct: true };
  }
  if (marker.payload?.handleKey) {
    return { handleKey: marker.payload.handleKey, direct: false };
  }
  return null;
}

function rememberedSourceForRecord(record) {
  if (record?.source?.handleKey) {
    return { handleKey: record.source.handleKey, direct: false };
  }
  return rememberedSourceFromMarker(markerPayload(record));
}

function rememberedSourceForBlock(block) {
  const store = block?.querySelector(".custom-state-store, .text-editor");
  return rememberedSourceFromMarker(markerPayloadFromText(store?.value));
}

async function preloadRememberedHandles() {
  try {
    const snapshots = await listSnapshots();
    const sourcesByBlockId = new Map();

    for (const snapshot of snapshots) {
      for (const block of snapshot.blocks ?? []) {
        if (!block?.id || sourcesByBlockId.has(block.id)) continue;
        const source = rememberedSourceForRecord(block);
        if (source) sourcesByBlockId.set(block.id, source);
      }
    }

    // A newly-created custom block can exist before the live snapshot write has
    // landed. Read its versioned marker too so the toolbar button can still
    // reconnect it during the same workspace session.
    for (const block of workspace?.querySelectorAll(".block") ?? []) {
      const blockId = block.dataset.blockId;
      if (!blockId || sourcesByBlockId.has(blockId)) continue;
      const source = rememberedSourceForBlock(block);
      if (source) sourcesByBlockId.set(blockId, source);
    }

    const next = new Map();
    await Promise.all(
      [...sourcesByBlockId].map(async ([blockId, source]) => {
        if (source.direct) {
          next.set(blockId, { handle: null, permission: "direct", direct: true });
          return;
        }

        try {
          const handle = await resolveHandle(source.handleKey);
          if (!handle) {
            next.set(blockId, { handle: null, permission: "missing", direct: false });
            return;
          }

          let permission = "granted";
          if (handle.queryPermission) {
            try {
              permission = await handle.queryPermission({ mode: "read" });
            } catch {
              permission = "prompt";
            }
          }

          next.set(blockId, { handle, permission, direct: false });
        } catch {
          next.set(blockId, { handle: null, permission: "missing", direct: false });
        }
      })
    );

    rememberedHandles = next;
  } catch (error) {
    console.warn("Could not preload remembered FrameChute handles:", error);
  }
}

function visibleReconnectControl(block) {
  const controls = [
    ...block.querySelectorAll(".reconnect-custom-image, .reconnect-source")
  ];
  return controls.find((control) => !control.hidden) || null;
}

function isExtensionGallery(block) {
  if (block.dataset.extensionGallery === "true") return true;
  const editor = block.querySelector(".text-editor");
  return String(editor?.value || "").startsWith(EXTENSION_GALLERY_MARKER);
}

async function reconnectAllRememberedSources() {
  const targets = [...workspace.querySelectorAll(".block")]
    .map((block) => ({
      block,
      reconnect: visibleReconnectControl(block),
      remembered: rememberedHandles.get(block.dataset.blockId) || null,
      direct: isExtensionGallery(block)
    }))
    .filter(({ reconnect }) => Boolean(reconnect));

  if (!targets.length) {
    setStatus("All remembered source locations are already connected.");
    return;
  }

  reconnectAllButton.disabled = true;
  setButtonLabel("Reconnecting…");

  try {
    // Start every permission request from the same explicit toolbar click.
    // Chromium may still ask about a remembered handle, but FrameChute avoids
    // opening a chain of file pickers when it already knows the source.
    const permissionJobs = targets.map(({ remembered, direct }) => {
      if (direct || remembered?.direct) return Promise.resolve("direct");
      if (!remembered?.handle) return Promise.resolve("missing");
      if (remembered.permission === "granted") return Promise.resolve("granted");
      if (!remembered.handle.requestPermission) return Promise.resolve("granted");

      try {
        return remembered.handle.requestPermission({ mode: "read" });
      } catch {
        return Promise.resolve("denied");
      }
    });

    const permissions = await Promise.allSettled(permissionJobs);
    let reconnected = 0;
    let manual = 0;

    permissions.forEach((result, index) => {
      const permission = result.status === "fulfilled" ? result.value : "denied";
      const { reconnect, remembered } = targets[index];

      if (permission === "direct" || permission === "granted") {
        if (remembered && permission === "granted") remembered.permission = "granted";
        reconnect.click();
        reconnected += 1;
      } else {
        manual += 1;
      }
    });

    if (reconnected && !manual) {
      setStatus(`Reconnecting all ${reconnected} remembered location${reconnected === 1 ? "" : "s"}.`);
    } else if (reconnected) {
      setStatus(`Reconnecting ${reconnected}. ${manual} source${manual === 1 ? "" : "s"} still need an individual relink.`);
    } else {
      setStatus(`${manual} source${manual === 1 ? "" : "s"} need Chrome permission or an individual relink.`);
    }

    setTimeout(() => void preloadRememberedHandles(), 600);
  } finally {
    reconnectAllButton.disabled = false;
    setButtonLabel(IDLE_LABEL);
  }
}

if (reconnectAllButton) {
  setButtonLabel(IDLE_LABEL);
  reconnectAllButton.title = "Reconnect every disconnected block to its remembered source location";
  reconnectAllButton.addEventListener("click", () => void reconnectAllRememberedSources());
}

workspace?.addEventListener("flashframe:workspace-changed", () => {
  clearTimeout(preloadTimer);
  preloadTimer = setTimeout(() => void preloadRememberedHandles(), 180);
});
window.addEventListener("flashframe:archive-ready", () => void preloadRememberedHandles());
window.addEventListener("flashframe:archive-imported", () => void preloadRememberedHandles());
window.addEventListener("focus", () => void preloadRememberedHandles());
setTimeout(() => void preloadRememberedHandles(), 0);
