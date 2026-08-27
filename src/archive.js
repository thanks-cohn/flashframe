import { getHandle, putHandle } from "./persistence.js";

const ARCHIVE_HANDLE_KEY = "flashframe:archive-root";
const SESSION_SUFFIX = ".flashframe.json";
const ARCHIVE_VERSION = 1;
const MANIFEST_FILE = "assets.json";

async function permissionState(handle, mode = "readwrite") {
  if (!handle?.queryPermission) return "granted";

  try {
    return await handle.queryPermission({ mode });
  } catch {
    return "denied";
  }
}

async function writableArchiveHandle() {
  const handle = await getHandle(ARCHIVE_HANDLE_KEY);
  if (!handle) return null;

  const state = await permissionState(handle, "readwrite");
  return state === "granted" ? handle : null;
}

async function ensureLayout(root) {
  await root.getDirectoryHandle("live", { create: true });
  await root.getDirectoryHandle("sessions", { create: true });
  await root.getDirectoryHandle("assets", { create: true });
  await root.getDirectoryHandle("manifests", { create: true });
  try {
    await root.getFileHandle("framechute.json");
  } catch {
    await writeJsonFile(root, "framechute.json", { format: "framechute", archiveVersion: ARCHIVE_VERSION });
  }
}

async function writeJsonFile(directory, filename, value) {
  const handle = await directory.getFileHandle(filename, { create: true });
  const writable = await handle.createWritable();

  try {
    await writable.write(JSON.stringify(value, null, 2));
    await writable.close();
  } catch (error) {
    if (writable.abort) await writable.abort().catch(() => {});
    throw error;
  }
}

async function writeBlobFile(directory, filename, blob) {
  const handle = await directory.getFileHandle(filename, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(blob);
    await writable.close();
  } catch (error) {
    if (writable.abort) await writable.abort().catch(() => {});
    throw error;
  }
}

function imageExtension(blob) {
  const fromName = String(blob?.name || "").match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  if (fromName) return fromName;
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp", "image/avif": "avif", "image/svg+xml": "svg", "image/bmp": "bmp" })[blob?.type] || "bin";
}

async function archiveSafeSnapshot(directory, snapshot, stem) {
  const copy = { ...snapshot, appearance: snapshot.appearance ? { ...snapshot.appearance } : null };
  const image = copy.appearance?.backgroundImage;
  if (!(image instanceof Blob)) return copy;
  const assets = await directory.getDirectoryHandle("assets", { create: true });
  const filename = `${safePart(stem)}-background.${imageExtension(image)}`;
  await writeBlobFile(assets, filename, image);
  copy.appearance.backgroundImage = null;
  copy.appearance.backgroundImageAsset = { file: filename, mimeType: image.type || "application/octet-stream", name: image.name || filename };
  return copy;
}

async function hydrateBackgroundAsset(directory, snapshot) {
  const reference = snapshot?.appearance?.backgroundImageAsset;
  if (!reference?.file || snapshot.appearance.backgroundImage instanceof Blob) return snapshot;
  try {
    const assets = await directory.getDirectoryHandle("assets");
    const handle = await assets.getFileHandle(reference.file);
    const file = await handle.getFile();
    snapshot.appearance.backgroundImage = new File([file], reference.name || reference.file, { type: reference.mimeType || file.type });
  } catch (error) {
    console.warn(`Background archive asset ${reference.file} is unavailable:`, error);
    snapshot.appearance.backgroundImage = null;
  }
  return snapshot;
}

async function readJsonFile(fileHandle) {
  const file = await fileHandle.getFile();
  return JSON.parse(await file.text());
}

function safePart(value, fallback = "flashframe") {
  const clean = String(value ?? "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return clean || fallback;
}

function timestampForFilename(iso) {
  const date = iso ? new Date(iso) : new Date();
  const valid = Number.isFinite(date.getTime()) ? date : new Date();
  return valid.toISOString().replace(/[:.]/g, "-");
}

function validSnapshot(value) {
  return value && typeof value === "object" && Array.isArray(value.blocks) && typeof value.id === "string";
}

export async function getArchiveStatus() {
  const handle = await getHandle(ARCHIVE_HANDLE_KEY);

  if (!handle) {
    return {
      configured: false,
      permission: "missing",
      name: null
    };
  }

  return {
    configured: true,
    permission: await permissionState(handle, "readwrite"),
    name: handle.name || "Flashframe folder"
  };
}

export async function connectArchiveDirectory({ chooseNew = false } = {}) {
  let handle = chooseNew ? null : await getHandle(ARCHIVE_HANDLE_KEY);

  if (handle) {
    const current = await permissionState(handle, "readwrite");
    if (current === "granted") {
      await ensureLayout(handle);
      return handle;
    }

    if (handle.requestPermission) {
      try {
        const granted = await handle.requestPermission({ mode: "readwrite" });
        if (granted === "granted") {
          await ensureLayout(handle);
          return handle;
        }
      } catch {
        // Fall through to choosing another folder.
      }
    }
  }

  handle = await window.showDirectoryPicker({ mode: "readwrite" });
  await putHandle(ARCHIVE_HANDLE_KEY, handle);
  await ensureLayout(handle);
  return handle;
}

function assetStem(id) {
  return safePart(String(id).replace(/^asset:/, ""), "asset");
}

async function readAssetManifest(root) {
  try {
    const manifests = await root.getDirectoryHandle("manifests");
    return await readJsonFile(await manifests.getFileHandle(MANIFEST_FILE));
  } catch {
    return { schemaVersion: 1, assets: [] };
  }
}

async function writeAssetManifest(root, manifest) {
  const manifests = await root.getDirectoryHandle("manifests", { create: true });
  await writeJsonFile(manifests, MANIFEST_FILE, manifest);
}

export async function writeAsset(record, source) {
  const root = await writableArchiveHandle();
  if (!root) return false;
  await ensureLayout(root);

  const assets = await root.getDirectoryHandle("assets", { create: true });
  const stem = assetStem(record.id);
  let storage;

  if (source?.kind === "directory") {
    const galleries = await assets.getDirectoryHandle("galleries", { create: true });
    const gallery = await galleries.getDirectoryHandle(stem, { create: true });
    const entries = [];
    for await (const [name, handle] of source.entries()) {
      if (handle.kind !== "file") continue;
      const file = await handle.getFile();
      await writeBlobFile(gallery, name, file);
      entries.push({ name, mimeType: file.type || "application/octet-stream", size: file.size, lastModified: file.lastModified });
    }
    await writeJsonFile(gallery, "manifest.json", { schemaVersion: 1, name: record.name, entries });
    storage = { kind: "gallery", path: `assets/galleries/${stem}` };
  } else {
    const file = source?.getFile ? await source.getFile() : source?.__framechuteSyntheticFile || source;
    if (!(file instanceof Blob)) throw new Error(`Asset ${record.id} has no readable bytes`);
    const files = await assets.getDirectoryHandle("files", { create: true });
    const extension = String(record.name || "").match(/(\.[a-z0-9]{1,10})$/i)?.[1] || "";
    const filename = `${stem}${extension}`;
    await writeBlobFile(files, filename, file);
    storage = { kind: "embedded", path: `assets/files/${filename}` };
  }

  const manifest = await readAssetManifest(root);
  const durableRecord = { ...record, durable: true, storage };
  manifest.assets = (manifest.assets || []).filter((item) => item.id !== record.id);
  manifest.assets.push(durableRecord);
  await writeAssetManifest(root, manifest);
  return durableRecord;
}

async function fileAtPath(root, path) {
  const parts = path.split("/").filter(Boolean);
  let directory = root;
  for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part);
  return directory.getFileHandle(parts.at(-1));
}

function archivedFileHandle(file, name = file.name) {
  return { kind: "file", name, __framechuteSyntheticFile: new File([file], name, { type: file.type, lastModified: file.lastModified }) };
}

export async function readAsset(assetId) {
  const root = await writableArchiveHandle();
  if (!root) return null;
  const manifest = await readAssetManifest(root);
  const record = (manifest.assets || []).find((item) => item.id === assetId);
  if (!record) return null;

  if (record.storage?.kind === "gallery") {
    const parts = record.storage.path.split("/").filter(Boolean);
    let gallery = root;
    for (const part of parts) gallery = await gallery.getDirectoryHandle(part);
    const metadata = await readJsonFile(await gallery.getFileHandle("manifest.json"));
    const names = new Set((metadata.entries || []).map((entry) => entry.name));
    return {
      record,
      source: {
        kind: "directory",
        name: record.name,
        async *entries() {
          for await (const [name, handle] of gallery.entries()) {
            if (handle.kind === "file" && names.has(name)) yield [name, handle];
          }
        }
      }
    };
  }

  const file = await (await fileAtPath(root, record.storage.path)).getFile();
  return { record, source: archivedFileHandle(file, record.name) };
}

export async function listArchivedAssets() {
  const root = await writableArchiveHandle();
  if (!root) return [];
  return (await readAssetManifest(root)).assets || [];
}

export async function writeNamedSnapshot(snapshot) {
  const root = await writableArchiveHandle();
  if (!root) return false;

  await ensureLayout(root);
  const sessions = await root.getDirectoryHandle("sessions", { create: true });
  const filename = `${safePart(snapshot.id)}${SESSION_SUFFIX}`;
  const archived = await archiveSafeSnapshot(sessions, snapshot, safePart(snapshot.id).slice(0, 24));
  await writeJsonFile(sessions, filename, archived);
  return true;
}

export async function writeLiveSnapshot(snapshot) {
  const root = await writableArchiveHandle();
  if (!root) return false;

  await ensureLayout(root);
  const live = await root.getDirectoryHandle("live", { create: true });
  const archived = await archiveSafeSnapshot(live, snapshot, "current");
  await writeJsonFile(live, `current${SESSION_SUFFIX}`, archived);
  return true;
}

export async function readNamedSnapshots() {
  const root = await writableArchiveHandle();
  if (!root) return [];

  let sessions;
  try {
    sessions = await root.getDirectoryHandle("sessions");
  } catch {
    return [];
  }

  const snapshots = [];

  for await (const [name, handle] of sessions.entries()) {
    if (handle.kind !== "file" || !name.endsWith(SESSION_SUFFIX)) continue;

    try {
      const snapshot = await hydrateBackgroundAsset(sessions, await readJsonFile(handle));
      if (validSnapshot(snapshot)) snapshots.push(snapshot);
    } catch (error) {
      console.warn(`Could not read archived Flashframe ${name}:`, error);
    }
  }

  snapshots.sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));
  return snapshots;
}

export async function readLiveSnapshot() {
  const root = await writableArchiveHandle();
  if (!root) return null;

  try {
    const live = await root.getDirectoryHandle("live");
    const file = await live.getFileHandle(`current${SESSION_SUFFIX}`);
    const snapshot = await hydrateBackgroundAsset(live, await readJsonFile(file));
    return validSnapshot(snapshot) ? snapshot : null;
  } catch {
    return null;
  }
}
