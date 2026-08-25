const FILECHUTE_DRAG_TYPE = "application/x-filechute-item+json";
const FILECHUTE_PROTOCOL = "filechute-item";
const FILECHUTE_VERSION = 1;
const EXTENSION_GALLERY_EVENT = "framechute:add-extension-gallery";

const workspace = document.querySelector("#workspace");
const status = document.querySelector("#status");

function setStatus(message) {
  if (status) status.textContent = message;
}

function parseFileChutePayload(transfer) {
  try {
    const raw = transfer?.getData(FILECHUTE_DRAG_TYPE);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (payload?.protocol !== FILECHUTE_PROTOCOL || payload?.version !== FILECHUTE_VERSION) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function base64File(response) {
  const binary = atob(String(response.base64 || ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], response.name || "FileChute file", {
    type: response.type || "application/octet-stream",
    lastModified: Number(response.lastModified) || Date.now()
  });
}

function redispatchAsLocalFile(file, originalEvent) {
  const transfer = new DataTransfer();
  transfer.effectAllowed = "copy";
  transfer.items.add(file);

  const event = new DragEvent("drop", {
    bubbles: true,
    cancelable: true,
    dataTransfer: transfer,
    clientX: originalEvent.clientX,
    clientY: originalEvent.clientY,
    screenX: originalEvent.screenX,
    screenY: originalEvent.screenY
  });

  workspace.dispatchEvent(event);
}

function galleryPoint(event) {
  const rect = workspace.getBoundingClientRect();
  return {
    x: Math.max(8, event.clientX - rect.left - 80),
    y: Math.max(8, event.clientY - rect.top - 40)
  };
}

function openDirectoryGallery(payload, event) {
  if (!payload.sourceExtensionId || !payload.transferToken || !payload.relativePath) {
    throw new Error(
      "Reload FileChute, then drag this folder again so FrameChute can connect to it."
    );
  }

  workspace.dispatchEvent(new CustomEvent(EXTENSION_GALLERY_EVENT, {
    bubbles: false,
    detail: {
      name: payload.originalName || payload.name || "FileChute folder",
      point: galleryPoint(event),
      source: {
        protocol: "chute-gallery-source-v1",
        providerName: "FileChute",
        extensionId: payload.sourceExtensionId,
        token: payload.transferToken,
        path: payload.relativePath
      }
    }
  }));
}

function directTransferredFile(transfer) {
  const files = transfer?.files;
  if (!files?.length) return null;
  return files[0] instanceof File ? files[0] : null;
}

workspace?.addEventListener("drop", (event) => {
  const payload = parseFileChutePayload(event.dataTransfer);
  if (!payload) return;

  // Claim FileChute drops before generic URL/text handlers can mistake a
  // surviving filename or relative path for a web address.
  event.preventDefault();
  event.stopImmediatePropagation();
  workspace.classList.remove("is-drop-target");

  void (async () => {
    if (payload.kind === "directory") {
      openDirectoryGallery(payload, event);
      setStatus(`Opening ${payload.name || "FileChute folder"} as a gallery…`);
      return;
    }

    // FileChute places the original File in DataTransfer whenever Chromium
    // allows it. Prefer that path because it avoids extension messaging,
    // base64 overhead, and the bridge size limit. The normal FrameChute local
    // drop pipeline already knows how to create image, video, audio, PDF, text,
    // and generic-file blocks.
    const directFile = directTransferredFile(event.dataTransfer);
    if (directFile) {
      setStatus(`Adding ${directFile.name || payload.name || "FileChute file"}…`);
      redispatchAsLocalFile(directFile, event);
      return;
    }

    // Some Chromium surfaces strip File objects while preserving custom drag
    // data. Fall back to FileChute's explicit cross-extension byte bridge.
    if (!payload.sourceExtensionId || !payload.transferToken || !payload.relativePath) {
      setStatus(
        `Reload FileChute, then drag ${payload.name || "this file"} again so FrameChute can request the original bytes.`
      );
      return;
    }

    setStatus(`Receiving ${payload.originalName || payload.name || "file"} from FileChute…`);

    let response;
    try {
      response = await chrome.runtime.sendMessage(payload.sourceExtensionId, {
        type: "filechute-read-dragged-file-v1",
        transferToken: payload.transferToken,
        relativePath: payload.relativePath,
        representation: payload.representation || "original",
        mime: payload.mime || ""
      });
    } catch (error) {
      throw new Error(
        `Could not reach FileChute. Reload both extensions and try again. ${error?.message || ""}`.trim()
      );
    }

    if (!response?.ok) {
      throw new Error(response?.error || "FileChute did not return the original file.");
    }

    const file = base64File(response);
    redispatchAsLocalFile(file, event);
  })().catch((error) => {
    console.error("FileChute → FrameChute handoff failed", error);
    setStatus(error?.message || "Could not receive that FileChute item.");
  });
}, { capture: true });
