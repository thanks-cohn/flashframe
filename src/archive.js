import { getHandle, putHandle } from "./persistence.js";

const ARCHIVE_HANDLE_KEY = "flashframe:archive-root";
const SESSION_SUFFIX = ".flashframe.json";

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
}

async function writeJsonFile(directory, filename, value) {
  const handle = await directory.getFileHandle(filename, { create: true });
  const writable = await handle.createWritable();

  try {
    await writable.write(JSON.stringify(value, null, 2));
  } finally {
    await writable.close();
  }
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

export async function writeNamedSnapshot(snapshot) {
  const root = await writableArchiveHandle();
  if (!root) return false;

  await ensureLayout(root);
  const sessions = await root.getDirectoryHandle("sessions", { create: true });
  const filename = `${timestampForFilename(snapshot.createdAt)}--${safePart(snapshot.name)}--${safePart(snapshot.id).slice(0, 12)}${SESSION_SUFFIX}`;
  await writeJsonFile(sessions, filename, snapshot);
  return true;
}

export async function writeLiveSnapshot(snapshot) {
  const root = await writableArchiveHandle();
  if (!root) return false;

  await ensureLayout(root);
  const live = await root.getDirectoryHandle("live", { create: true });
  await writeJsonFile(live, `current${SESSION_SUFFIX}`, snapshot);
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
      const snapshot = await readJsonFile(handle);
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
    const snapshot = await readJsonFile(file);
    return validSnapshot(snapshot) ? snapshot : null;
  } catch {
    return null;
  }
}
