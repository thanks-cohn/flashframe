import {
  getContent,
  getHandle,
  getSnapshot as getCachedSnapshot,
  listHandles,
  listSnapshots as listCachedSnapshots,
  putContent,
  putHandle,
  saveSnapshot as cacheSnapshot
} from "./persistence.js";
import {
  getArchiveStatus,
  listArchivedAssets,
  readAsset,
  readLiveSnapshot,
  readNamedSnapshots,
  writeAsset,
  writeLiveSnapshot,
  writeNamedSnapshot
} from "./archive.js";

export const LIVE_SNAPSHOT_ID = "__flashframe_live__";

export function migrateSnapshot(input) {
  const snapshot = structuredClone(input);
  snapshot.schemaVersion = 3;
  snapshot.blocks = (snapshot.blocks || []).map((block) => {
    if (!block.source) return block;
    const source = { ...block.source };
    source.assetId ||= source.handleKey || null;
    source.sourceKind ||= source.kind || (block.type === "gallery" ? "directory" : "file");
    return { ...block, source };
  });
  return snapshot;
}

async function durableStatus() {
  return getArchiveStatus();
}

async function ensureReferencedAssets(snapshot) {
  const ids = new Set((snapshot.blocks || []).map((block) => block.source?.assetId || block.source?.handleKey).filter(Boolean));
  for (const assetId of ids) {
    if (await readAsset(assetId)) continue;
    const source = await resolveAsset(assetId);
    if (!source) continue; // Keep unresolved legacy blocks relinkable.
    await writeAsset(assetRecord(assetId, source), source);
  }
}

export async function saveFrame(snapshot) {
  const migrated = migrateSnapshot(snapshot);
  const archive = await durableStatus();
  if (archive.configured) {
    await ensureReferencedAssets(migrated);
    if (archive.permission !== "granted" || !(await writeNamedSnapshot(migrated))) {
      throw new Error("Could not save to your FrameChute folder.");
    }
  }
  try {
    await cacheSnapshot(migrated);
  } catch (error) {
    if (!archive.configured) throw error;
    console.warn("FrameChute was saved durably, but its browser cache could not be updated:", error);
  }
  return migrated;
}

export async function saveLive(snapshot) {
  const migrated = migrateSnapshot({ ...snapshot, id: LIVE_SNAPSHOT_ID });
  const archive = await durableStatus();
  if (archive.configured) {
    await ensureReferencedAssets(migrated);
    if (archive.permission !== "granted" || !(await writeLiveSnapshot(migrated))) {
      throw new Error("Could not autosave to your FrameChute folder.");
    }
  }
  try {
    await cacheSnapshot(migrated);
  } catch (error) {
    if (!archive.configured) throw error;
    console.warn("Durable autosave succeeded, but browser caching failed:", error);
  }
  return migrated;
}

export async function getFrame(id) {
  const cached = await getCachedSnapshot(id);
  if (cached) return migrateSnapshot(cached);
  const snapshots = id === LIVE_SNAPSHOT_ID ? [await readLiveSnapshot()] : await readNamedSnapshots();
  const found = snapshots.find((snapshot) => snapshot?.id === id) || null;
  if (found) await cacheSnapshot(migrateSnapshot(found));
  return found ? migrateSnapshot(found) : null;
}

export async function listFrames() {
  return (await listCachedSnapshots()).map(migrateSnapshot);
}

function assetRecord(assetId, source) {
  const file = source?.__framechuteSyntheticFile;
  return {
    id: assetId,
    kind: source?.kind === "directory" ? "gallery" : "file",
    name: String(source?.name || file?.name || "Local source"),
    mimeType: String(file?.type || "application/octet-stream"),
    size: Number(file?.size) || null,
    lastModified: Number(file?.lastModified) || null,
    durable: false,
    storage: { kind: "indexeddb" }
  };
}

export async function ingestAsset(assetId, source) {
  const record = assetRecord(assetId, source);
  await putHandle(assetId, source);
  await putContent(`asset-record:${assetId}`, record);
  const archive = await durableStatus();
  if (archive.configured) {
    if (archive.permission !== "granted") throw new Error("FrameChute folder permission is required to ingest this asset durably.");
    const durableRecord = await writeAsset(record, source);
    if (!durableRecord) throw new Error("Could not write the asset to your FrameChute folder.");
    await putContent(`asset-record:${assetId}`, durableRecord);
    return durableRecord;
  }
  return record;
}

export async function resolveAsset(assetId) {
  const cached = await getHandle(assetId);
  if (cached?.__framechuteStoredKind === "framechute-synthetic-image-v1") {
    const legacy = await getContent(assetId);
    if (legacy?.blob instanceof Blob) {
      const file = new File([legacy.blob], legacy.name || "Dropped image", {
        type: legacy.type || legacy.blob.type,
        lastModified: legacy.lastModified || Date.now()
      });
      return { kind: "file", name: file.name, __framechuteSyntheticFile: file };
    }
  }
  if (cached) return cached;
  const archived = await readAsset(assetId);
  if (!archived) return null;
  await putHandle(assetId, archived.source);
  await putContent(`asset-record:${assetId}`, archived.record);
  return archived.source;
}

export async function migrateCacheToArchive() {
  const snapshots = await listCachedSnapshots();
  const seen = new Set();
  for (const snapshot of snapshots) {
    for (const block of snapshot.blocks || []) {
      const assetId = block.source?.assetId || block.source?.handleKey;
      if (!assetId || seen.has(assetId)) continue;
      seen.add(assetId);
      const source = await resolveAsset(assetId);
      if (!source) continue;
      await writeAsset(assetRecord(assetId, source), source);
    }
  }
  for (const snapshot of snapshots) {
    const migrated = migrateSnapshot(snapshot);
    if (snapshot.id === LIVE_SNAPSHOT_ID) await writeLiveSnapshot(migrated);
    else await writeNamedSnapshot(migrated);
  }
  return snapshots.length;
}

export async function listSourcesByName() {
  const records = await listArchivedAssets();
  return new Map(records.filter((record) => record.name).map((record) => [record.name, record.id]));
}

export async function listCachedSources() {
  return listHandles();
}

export async function recoverArchiveToCache() {
  const named = await readNamedSnapshots();
  const live = await readLiveSnapshot();
  for (const snapshot of named) await cacheSnapshot(migrateSnapshot(snapshot));
  if (live) await cacheSnapshot(migrateSnapshot({ ...live, id: LIVE_SNAPSHOT_ID }));
  for (const record of await listArchivedAssets()) {
    await putContent(`asset-record:${record.id}`, record);
    await resolveAsset(record.id);
  }
  return { named: named.map(migrateSnapshot), live: live ? migrateSnapshot(live) : null };
}

export { getContent, putContent };
