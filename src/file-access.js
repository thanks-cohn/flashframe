import { ingestAsset, resolveAsset } from "./storage.js";

// Browser-created File objects can be very large (videos especially). Keep
// transient file-backed handles in memory, but persist image drops so a saved
// FrameChute can restore them without making the user hunt for the file again.
// Native FileSystemHandles continue to use the durable handle store.
const transientHandles = new Map();

export function makeHandleKey(prefix = "source") {
  return `asset:${crypto.randomUUID()}`;
}

export async function storeHandle(handleKey, handle) {
  transientHandles.set(handleKey, handle);
  await ingestAsset(handleKey, handle);
  return handleKey;
}

export async function resolveHandle(handleKey) {
  if (!handleKey) return null;
  if (transientHandles.has(handleKey)) return transientHandles.get(handleKey);

  const stored = await resolveAsset(handleKey);
  if (stored) transientHandles.set(handleKey, stored);
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
