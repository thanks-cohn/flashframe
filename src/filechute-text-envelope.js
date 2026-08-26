const FILECHUTE_DRAG_TYPE = "application/x-filechute-item+json";
const FILECHUTE_TEXT_PREFIX = "filechute-transfer-v1:";
const workspace = document.querySelector("#workspace");

function looksLikeTransport(transfer) {
  try {
    const types = [...(transfer?.types || [])];
    return types.includes("text/plain") && (transfer.effectAllowed === "copy" || transfer.effectAllowed === "all" || transfer.effectAllowed === "uninitialized");
  } catch {
    return false;
  }
}

function parseEnvelope(transfer) {
  let text = "";
  try {
    text = String(transfer?.getData("text/plain") || "");
  } catch {
    return null;
  }
  if (!text.startsWith(FILECHUTE_TEXT_PREFIX)) return null;

  try {
    const payload = JSON.parse(decodeURIComponent(text.slice(FILECHUTE_TEXT_PREFIX.length)));
    if (payload?.protocol !== "filechute-item" || payload?.version !== 1) return null;
    return payload;
  } catch {
    return null;
  }
}

workspace?.addEventListener("dragenter", (event) => {
  if (!looksLikeTransport(event.dataTransfer)) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  workspace.classList.add("is-drop-target");
}, { capture: true });

workspace?.addEventListener("dragover", (event) => {
  if (!looksLikeTransport(event.dataTransfer)) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  workspace.classList.add("is-drop-target");
}, { capture: true });

workspace?.addEventListener("drop", (event) => {
  const payload = parseEnvelope(event.dataTransfer);
  if (!payload) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  workspace.classList.remove("is-drop-target");

  const transfer = new DataTransfer();
  transfer.effectAllowed = "copy";
  transfer.setData(FILECHUTE_DRAG_TYPE, JSON.stringify(payload));

  const target = event.target instanceof EventTarget ? event.target : workspace;
  target.dispatchEvent(new DragEvent("drop", {
    bubbles: true,
    cancelable: true,
    composed: true,
    dataTransfer: transfer,
    clientX: event.clientX,
    clientY: event.clientY,
    screenX: event.screenX,
    screenY: event.screenY
  }));
}, { capture: true });
