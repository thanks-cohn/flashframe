const BLACK_BOX_KEY = "framechute-black-box-v1";
const MAX_EVENTS = 5000;
const COMPACT_PREFIX = "FILECHUTE1|";
const LEGACY_PREFIX = "filechute-transfer-v1:";
const CUSTOM_TYPE = "application/x-filechute-item+json";

let writeChain = Promise.resolve();
let lastDragoverLog = 0;
let lastKnownToken = null;
let lastKnownName = null;

const sessionKey = "framechute-blackbox-session-v1";
let sessionId = "";
try {
  sessionId = sessionStorage.getItem(sessionKey) || crypto.randomUUID();
  sessionStorage.setItem(sessionKey, sessionId);
} catch {
  sessionId = crypto.randomUUID();
}

function targetDescriptor(target) {
  if (!(target instanceof Element)) return null;
  return {
    tag: target.tagName.toLowerCase(),
    id: target.id || null,
    classes: [...target.classList].slice(0, 6),
    role: target.getAttribute("role") || null,
    type: target.getAttribute("type") || null
  };
}

function parseTextTicket(text) {
  const value = String(text || "");
  if (value.startsWith(COMPACT_PREFIX)) {
    const parts = value.slice(COMPACT_PREFIX.length).split("|");
    if (parts.length >= 5) {
      const [sourceExtensionId, transferToken, kindCode, encodedPath, ...nameParts] = parts;
      try {
        return {
          sourceExtensionId,
          transferToken,
          kind: kindCode === "d" ? "directory" : "file",
          relativePath: decodeURIComponent(encodedPath || ""),
          originalName: decodeURIComponent(nameParts.join("|") || "")
        };
      } catch {}
    }
  }
  if (value.startsWith(LEGACY_PREFIX)) {
    try { return JSON.parse(decodeURIComponent(value.slice(LEGACY_PREFIX.length))); } catch {}
  }
  return null;
}

function transferSnapshot(transfer, allowRead = true) {
  if (!transfer) return null;
  const snapshot = {
    effectAllowed: transfer.effectAllowed || null,
    dropEffect: transfer.dropEffect || null,
    types: [],
    filesLength: null,
    items: []
  };
  try { snapshot.types = [...(transfer.types || [])]; } catch {}
  try { snapshot.filesLength = transfer.files?.length ?? null; } catch {}
  try {
    snapshot.items = [...(transfer.items || [])].map((item) => ({ kind: item.kind || null, type: item.type || null }));
  } catch {}

  if (allowRead) {
    let payload = null;
    try {
      const raw = transfer.getData(CUSTOM_TYPE);
      if (raw) payload = JSON.parse(raw);
    } catch {}
    if (!payload) {
      try { payload = parseTextTicket(transfer.getData("text/plain")); } catch {}
    }
    if (payload) {
      snapshot.payload = {
        transferToken: payload.transferToken || null,
        originalName: payload.originalName || payload.name || null,
        relativePath: payload.relativePath || null,
        kind: payload.kind || null,
        sourceExtensionId: payload.sourceExtensionId || null
      };
      if (snapshot.payload.transferToken) lastKnownToken = snapshot.payload.transferToken;
      if (snapshot.payload.originalName) lastKnownName = snapshot.payload.originalName;
    }
  }
  return snapshot;
}

async function append(record) {
  writeChain = writeChain.then(async () => {
    const stored = await chrome.storage.local.get(BLACK_BOX_KEY).catch(() => ({}));
    const box = stored?.[BLACK_BOX_KEY] || { nextSequence: 1, events: [] };
    const sequence = Number(box.nextSequence) || 1;
    const events = [...(Array.isArray(box.events) ? box.events : []), { sequence, storedAt: new Date().toISOString(), ...record }];
    if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
    await chrome.storage.local.set({ [BLACK_BOX_KEY]: { nextSequence: sequence + 1, events } });
    return sequence;
  }).catch((error) => {
    console.debug("FrameChute black-box write failed", error);
    return null;
  });
  return writeChain;
}

export function frameChuteBlackBox(checkpoint, details = {}) {
  const record = {
    at: new Date().toISOString(),
    performanceNow: Number(performance.now().toFixed(3)),
    sessionId,
    source: "framechute-workspace",
    checkpoint,
    transferToken: details.transferToken || lastKnownToken || null,
    itemName: details.itemName || lastKnownName || null,
    visible: document.visibilityState,
    hasFocus: document.hasFocus(),
    userAgent: navigator.userAgent,
    platform: navigator.userAgentData?.platform || navigator.platform || null,
    ...details
  };
  void append(record);
}

globalThis.FrameChuteBlackBox = frameChuteBlackBox;

function logEvent(checkpoint, event, allowRead = true) {
  const transfer = transferSnapshot(event?.dataTransfer || null, allowRead);
  frameChuteBlackBox(checkpoint, {
    target: targetDescriptor(event?.target),
    defaultPrevented: Boolean(event?.defaultPrevented),
    clientX: Number.isFinite(event?.clientX) ? event.clientX : null,
    clientY: Number.isFinite(event?.clientY) ? event.clientY : null,
    transfer,
    transferToken: transfer?.payload?.transferToken || null,
    itemName: transfer?.payload?.originalName || null
  });
}

for (const [name, read] of [["dragenter", false], ["drop", true], ["dragend", true]]) {
  document.addEventListener(name, (event) => logEvent(name, event, read), true);
}
document.addEventListener("dragover", (event) => {
  const now = performance.now();
  if (now - lastDragoverLog < 250) return;
  lastDragoverLog = now;
  logEvent("dragover", event, false);
}, true);

window.addEventListener("focus", () => frameChuteBlackBox("window-focus"), true);
window.addEventListener("blur", () => frameChuteBlackBox("window-blur"), true);
document.addEventListener("visibilitychange", () => frameChuteBlackBox("visibilitychange", { state: document.visibilityState }), true);
window.addEventListener("error", (event) => frameChuteBlackBox("window-error", {
  message: event.message || null,
  filename: event.filename || null,
  lineno: event.lineno || null,
  colno: event.colno || null,
  stack: event.error?.stack || null
}), true);
window.addEventListener("unhandledrejection", (event) => frameChuteBlackBox("unhandledrejection", {
  message: event.reason?.message || String(event.reason || ""),
  stack: event.reason?.stack || null
}), true);

const status = document.querySelector("#status");
if (status) {
  let previous = "";
  new MutationObserver(() => {
    const message = String(status.textContent || "").trim();
    if (!message || message === previous) return;
    previous = message;
    frameChuteBlackBox("status-message", { message: message.slice(0, 500) });
  }).observe(status, { childList: true, characterData: true, subtree: true });
}

async function exportLog() {
  const stored = await chrome.storage.local.get(BLACK_BOX_KEY).catch(() => ({}));
  const box = stored?.[BLACK_BOX_KEY] || { nextSequence: 1, events: [] };
  const payload = {
    ok: true,
    format: "framechute-black-box-v1",
    exportedAt: new Date().toISOString(),
    extensionId: chrome.runtime.id,
    manifest: chrome.runtime.getManifest(),
    ...box
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `framechute-black-box-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function clearLog() {
  if (!confirm("Clear the local FrameChute black-box history?")) return;
  await chrome.storage.local.remove(BLACK_BOX_KEY);
  frameChuteBlackBox("blackbox-cleared");
}

function mountControls() {
  if (document.getElementById("framechute-blackbox-controls")) return;
  const wrap = document.createElement("div");
  wrap.id = "framechute-blackbox-controls";
  Object.assign(wrap.style, {
    position: "fixed", right: "8px", bottom: "8px", zIndex: "2147483647",
    display: "flex", gap: "5px", opacity: ".88"
  });
  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.textContent = "Export bug log";
  exportButton.addEventListener("click", () => void exportLog());
  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.textContent = "Clear";
  clearButton.addEventListener("click", () => void clearLog());
  wrap.append(exportButton, clearButton);
  document.body.append(wrap);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountControls, { once: true });
else mountControls();

frameChuteBlackBox("blackbox-loaded", { hrefOrigin: location.origin, pathname: location.pathname });
