const FRAMECHUTE_DRAG_TYPE = "application/x-framechute-item+json";
const FRAMECHUTE_PROTOCOL = "framechute-item";
const FRAMECHUTE_VERSION = 1;
const MAX_BRIDGE_BYTES = 96 * 1024 * 1024;

const workspace = document.querySelector("#workspace");
const transfers = new Map();

function mediaElement(target) {
  if (!(target instanceof Element)) return null;
  return target.closest("img.image-frame, video.video-player, audio.audio-player");
}

function blockFor(element) {
  return element?.closest(".block") || null;
}

function sourceFor(element) {
  return String(element?.currentSrc || element?.src || "").trim();
}

function blockName(element) {
  const block = blockFor(element);
  const input = block?.querySelector(".block-name");
  return String(input?.value || input?.getAttribute("value") || element?.alt || "FrameChute media").trim() || "FrameChute media";
}

function mimeHint(element) {
  if (element instanceof HTMLVideoElement) return "video/*";
  if (element instanceof HTMLAudioElement) return "audio/*";
  if (element instanceof HTMLImageElement) return "image/*";
  return "application/octet-stream";
}

function sourceKind(element) {
  if (element instanceof HTMLVideoElement) return "video";
  if (element instanceof HTMLAudioElement) return "audio";
  if (element instanceof HTMLImageElement) return "image";
  return "file";
}

function sourceUrlForPayload(src) {
  return /^https?:/i.test(src) ? src : null;
}

function cleanupTransfers() {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [token, record] of transfers) {
    if (record.createdAt < cutoff) transfers.delete(token);
  }
}

function markDraggable(root = document) {
  const elements = [];
  if (root instanceof Element && root.matches("img.image-frame, video.video-player, audio.audio-player")) elements.push(root);
  root.querySelectorAll?.("img.image-frame, video.video-player, audio.audio-player").forEach((element) => elements.push(element));

  for (const element of elements) {
    element.draggable = true;
    if (!element.title) element.title = "Drag this media to FileChute or another file target";
  }
}

function writeDragPayload(event, element) {
  const transfer = event.dataTransfer;
  if (!transfer) return;

  const src = sourceFor(element);
  if (!src) return;

  cleanupTransfers();
  const token = crypto.randomUUID();
  const name = blockName(element);
  const mime = mimeHint(element);

  transfers.set(token, {
    src,
    name,
    mime,
    kind: sourceKind(element),
    createdAt: Date.now()
  });

  const payload = {
    protocol: FRAMECHUTE_PROTOCOL,
    version: FRAMECHUTE_VERSION,
    kind: sourceKind(element),
    name,
    mime,
    sourceUrl: sourceUrlForPayload(src),
    sourceExtensionId: chrome.runtime.id,
    transferToken: token
  };

  transfer.effectAllowed = "copy";
  transfer.setData(FRAMECHUTE_DRAG_TYPE, JSON.stringify(payload));

  if (payload.sourceUrl) {
    try { transfer.setData("text/uri-list", payload.sourceUrl); } catch {}
    try { transfer.setData("text/plain", payload.sourceUrl); } catch {}
  }
}

function bytesToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

async function readTransfer(token) {
  cleanupTransfers();
  const record = transfers.get(String(token || ""));
  if (!record) throw new Error("That FrameChute drag expired. Drag the media item again.");

  if (/^https?:/i.test(record.src)) {
    return {
      ok: true,
      sourceUrl: record.src,
      name: record.name,
      type: record.mime,
      kind: record.kind
    };
  }

  const response = await fetch(record.src);
  if (!response.ok) throw new Error(`FrameChute media returned HTTP ${response.status}.`);
  const blob = await response.blob();
  if (blob.size > MAX_BRIDGE_BYTES) {
    throw new Error("This FrameChute media item is too large for the fallback bridge. Drag the original local file from FileChute or the operating system instead.");
  }

  const result = {
    ok: true,
    name: record.name,
    type: blob.type || record.mime || "application/octet-stream",
    size: blob.size,
    lastModified: Date.now(),
    kind: record.kind,
    base64: bytesToBase64(await blob.arrayBuffer())
  };
  transfers.delete(String(token || ""));
  return result;
}

workspace?.addEventListener("dragstart", (event) => {
  const element = mediaElement(event.target);
  if (!element) return;
  writeDragPayload(event, element);
}, true);

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;
      markDraggable(node);
    }
  }
});
if (workspace) observer.observe(workspace, { childList: true, subtree: true });
markDraggable(workspace || document);

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "framechute-read-dragged-resource-v1") return false;
  void readTransfer(message?.transferToken)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
  return true;
});
