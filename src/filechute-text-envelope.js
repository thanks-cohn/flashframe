import { frameChuteBlackBox } from "./black-box.js";

const FILECHUTE_DRAG_TYPE = "application/x-filechute-item+json";
const COMPACT_PREFIX = "FILECHUTE1|";
const LEGACY_PREFIX = "filechute-transfer-v1:";
const workspace = document.querySelector("#workspace");
const status = document.querySelector("#status");

function looksLikeTransport(transfer) {
  try {
    const types = [...(transfer?.types || [])];
    const match = types.includes("text/plain") && (
      transfer.effectAllowed === "copy" ||
      transfer.effectAllowed === "all" ||
      transfer.effectAllowed === "uninitialized"
    );
    return match;
  } catch {
    return false;
  }
}

function validPayload(payload) {
  return payload?.protocol === "filechute-item" && payload?.version === 1 ? payload : null;
}

function parseCompact(text) {
  if (!text.startsWith(COMPACT_PREFIX)) return null;
  const parts = text.slice(COMPACT_PREFIX.length).split("|");
  if (parts.length < 5) return null;
  const [sourceExtensionId, transferToken, kindCode, encodedPath, ...nameParts] = parts;
  if (!sourceExtensionId || !transferToken) return null;

  try {
    const relativePath = decodeURIComponent(encodedPath || "");
    const originalName = decodeURIComponent(nameParts.join("|") || "");
    return {
      protocol: "filechute-item",
      version: 1,
      kind: kindCode === "d" ? "directory" : "file",
      name: originalName,
      originalName,
      representation: "original",
      mime: kindCode === "d" ? "inode/directory" : "",
      relativePath,
      sourceUrl: null,
      parentPageUrl: null,
      size: null,
      lastModified: null,
      sourceExtensionId,
      transferToken
    };
  } catch {
    return null;
  }
}

function parseLegacy(text) {
  if (!text.startsWith(LEGACY_PREFIX)) return null;
  try {
    return validPayload(JSON.parse(decodeURIComponent(text.slice(LEGACY_PREFIX.length))));
  } catch {
    return null;
  }
}

function parseTicket(transfer) {
  let text = "";
  try {
    text = String(transfer?.getData("text/plain") || "");
  } catch (error) {
    frameChuteBlackBox("text-envelope-read-failed", { message: error?.message || String(error) });
    return null;
  }
  const payload = parseCompact(text) || parseLegacy(text);
  if (payload) {
    frameChuteBlackBox("text-envelope-parsed", {
      transferToken: payload.transferToken,
      itemName: payload.originalName || payload.name || null,
      kind: payload.kind,
      relativePath: payload.relativePath
    });
  }
  return payload;
}

workspace?.addEventListener("dragenter", (event) => {
  if (!looksLikeTransport(event.dataTransfer)) return;
  frameChuteBlackBox("text-envelope-dragenter-claimed", {
    types: [...(event.dataTransfer?.types || [])]
  });
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  workspace.classList.add("is-drop-target");
}, { capture: true });

workspace?.addEventListener("dragover", (event) => {
  if (!looksLikeTransport(event.dataTransfer)) return;
  frameChuteBlackBox("text-envelope-dragover-claimed", {
    types: [...(event.dataTransfer?.types || [])]
  });
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  workspace.classList.add("is-drop-target");
}, { capture: true });

workspace?.addEventListener("drop", (event) => {
  frameChuteBlackBox("text-envelope-drop-entered", {
    types: [...(event.dataTransfer?.types || [])]
  });
  const payload = parseTicket(event.dataTransfer);
  if (!payload) {
    frameChuteBlackBox("text-envelope-drop-ignored", { reason: "payload-not-recognized" });
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  workspace.classList.remove("is-drop-target");
  if (status) status.textContent = `FileChute ticket caught: ${payload.originalName || payload.name || "item"}`;

  const transfer = new DataTransfer();
  transfer.effectAllowed = "copy";
  transfer.setData(FILECHUTE_DRAG_TYPE, JSON.stringify(payload));

  frameChuteBlackBox("text-envelope-synthetic-drop-dispatch-start", {
    transferToken: payload.transferToken,
    itemName: payload.originalName || payload.name || null,
    syntheticTypes: [...transfer.types]
  });

  const target = event.target instanceof EventTarget ? event.target : workspace;
  try {
    const accepted = target.dispatchEvent(new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      composed: true,
      dataTransfer: transfer,
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: event.screenX,
      screenY: event.screenY
    }));
    frameChuteBlackBox("text-envelope-synthetic-drop-dispatch-result", {
      transferToken: payload.transferToken,
      itemName: payload.originalName || payload.name || null,
      dispatchReturned: accepted
    });
  } catch (error) {
    frameChuteBlackBox("text-envelope-synthetic-drop-dispatch-error", {
      transferToken: payload.transferToken,
      itemName: payload.originalName || payload.name || null,
      message: error?.message || String(error),
      stack: error?.stack || null
    });
    throw error;
  }
}, { capture: true });
