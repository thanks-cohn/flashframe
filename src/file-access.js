import { getContent, getHandle, putContent, putHandle } from "./persistence.js";
import { isNativeImageName } from "./media-types.js";

// Browser-created File objects can be very large (videos especially). Keep
// transient file-backed handles in memory, but persist image drops so a saved
// FrameChute can restore them without making the user hunt for the file again.
// Native FileSystemHandles continue to use the durable handle store.
const transientHandles = new Map();
const SYNTHETIC_IMAGE_HANDLE = "framechute-synthetic-image-v1";

function isPersistableSyntheticImage(file) {
  if (!(file instanceof Blob)) return false;
  if (String(file.type || "").toLowerCase().startsWith("image/")) return true;
  return isNativeImageName(String(file.name || ""));
}

function syntheticImageRecord(handleKey, handle, file) {
  return {
    id: handleKey,
    version: 1,
    kind: "synthetic-image",
    name: String(handle?.name || file?.name || "Dropped image"),
    type: String(file?.type || "application/octet-stream"),
    lastModified: Number(file?.lastModified) || Date.now(),
    blob: file
  };
}

function restoredSyntheticHandle(record) {
  if (!record?.blob || !(record.blob instanceof Blob)) return null;
  const file = new File([record.blob], record.name || "Dropped image", {
    type: record.type || record.blob.type || "application/octet-stream",
    lastModified: Number(record.lastModified) || Date.now()
  });
  return {
    kind: "file",
    name: file.name,
    __framechuteSyntheticFile: file,
    __framechutePersistedImage: true
  };
}

export function makeHandleKey(prefix = "source") {
  return `${prefix}:${crypto.randomUUID()}`;
}

export async function storeHandle(handleKey, handle) {
  const synthetic = handle?.__framechuteSyntheticFile;
  if (synthetic instanceof Blob) {
    transientHandles.set(handleKey, handle);

    // FileChute and other browser-created image drags do not arrive with a
    // durable FileSystemFileHandle. Preserve the actual image bytes in the
    // existing IndexedDB content store and save a tiny handle marker beside
    // them. The saved-state JSON keeps the handleKey; after a restart that key
    // resolves back to this preserved image automatically.
    if (isPersistableSyntheticImage(synthetic)) {
      try {
        await putContent(handleKey, syntheticImageRecord(handleKey, handle, synthetic));
        await putHandle(handleKey, {
          kind: "file",
          name: String(handle.name || synthetic.name || "Dropped image"),
          __framechuteStoredKind: SYNTHETIC_IMAGE_HANDLE
        });
      } catch (error) {
        // The live drag must continue working even if browser quota is full.
        console.warn("FrameChute could not preserve this dropped image for later restore:", error);
      }
    }

    return handleKey;
  }

  await putHandle(handleKey, handle);
  return handleKey;
}

export async function resolveHandle(handleKey) {
  if (!handleKey) return null;
  if (transientHandles.has(handleKey)) return transientHandles.get(handleKey);

  const stored = await getHandle(handleKey);
  if (stored?.__framechuteStoredKind === SYNTHETIC_IMAGE_HANDLE) {
    try {
      const record = await getContent(handleKey);
      const restored = restoredSyntheticHandle(record);
      if (restored) {
        transientHandles.set(handleKey, restored);
        return restored;
      }
    } catch (error) {
      console.warn("FrameChute could not restore a preserved image source:", error);
    }
    return null;
  }

  return stored;
}

export async function hasReadPermission(handle) {
  if (!handle?.queryPermission) return true;

  try {
    return (await handle.queryPermission({ mode: "read" })) === "granted";
  } catch {
    return false;
  }
}

export async function requestReadPermission(handle) {
  if (!handle?.requestPermission) return true;

  try {
    const current = await handle.queryPermission({ mode: "read" });
    if (current === "granted") return true;
    return (await handle.requestPermission({ mode: "read" })) === "granted";
  } catch {
    return false;
  }
}

export async function pickTextFile() {
  const [handle] = await window.showOpenFilePicker({
    multiple: false,
    types: [
      {
        description: "Text documents",
        accept: {
          "text/plain": [".txt", ".md", ".markdown", ".log", ".csv", ".json"]
        }
      }
    ]
  });

  const file = await handle.getFile();
  return { handle, file, text: await file.text() };
}

export async function pickPdfFile() {
  const [handle] = await window.showOpenFilePicker({
    multiple: false,
    types: [
      {
        description: "PDF documents",
        accept: { "application/pdf": [".pdf"] }
      }
    ]
  });

  return { handle, file: await handle.getFile() };
}

export async function pickVideoFile() {
  const [handle] = await window.showOpenFilePicker({
    multiple: false,
    types: [
      {
        description: "Video files",
        accept: {
          "video/*": [
            ".mp4", ".m4v", ".webm", ".ogv", ".mov", ".mkv", ".avi", ".mpeg",
            ".mpg", ".wmv", ".flv", ".ts", ".m2ts", ".mts", ".3gp", ".3g2", ".vob"
          ]
        }
      }
    ]
  });

  return { handle, file: await handle.getFile() };
}

export async function pickImageDirectory() {
  const handle = await window.showDirectoryPicker({ mode: "read" });
  return { handle, entries: await listImages(handle) };
}

export async function listImages(directoryHandle) {
  const entries = [];

  for await (const [name, handle] of directoryHandle.entries()) {
    if (handle.kind !== "file") continue;
    if (!isNativeImageName(name)) continue;
    entries.push({ name, handle });
  }

  entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
  return entries;
}

export async function fileFromHandle(handle) {
  if (!handle) return null;

  const synthetic = handle.__framechuteSyntheticFile;
  if (synthetic instanceof File) return synthetic;
  if (synthetic instanceof Blob) {
    return new File([synthetic], handle.name || "Dropped file", {
      type: synthetic.type || "application/octet-stream",
      lastModified: Date.now()
    });
  }

  if (typeof handle.getFile === "function") return handle.getFile();
  return null;
}

export async function imageFileByName(directoryHandle, name) {
  if (!directoryHandle || !name) return null;

  try {
    const handle = await directoryHandle.getFileHandle(name);
    return handle.getFile();
  } catch {
    return null;
  }
}
