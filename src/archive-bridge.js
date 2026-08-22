import { getSnapshot, listSnapshots, saveSnapshot } from "./persistence.js";
import { readLiveSnapshot, readNamedSnapshots, writeLiveSnapshot, writeNamedSnapshot } from "./archive.js";

const saveButton = document.querySelector("#save-frame");
const restoreButton = document.querySelector("#restore-frame");
const savedFramesSelect = document.querySelector("#saved-frames");
const status = document.querySelector("#status");

let syncTimer = null;

function setStatus(message) {
  if (status) status.textContent = message;
}

async function refreshSnapshotOptions(selectedId = "") {
  const snapshots = await listSnapshots();
  savedFramesSelect.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = snapshots.length ? "Saved Flashframes" : "No saved Flashframes";
  savedFramesSelect.append(placeholder);

  for (const snapshot of snapshots) {
    const option = document.createElement("option");
    option.value = snapshot.id;
    option.textContent = `${snapshot.name} — ${new Date(snapshot.createdAt).toLocaleString()}`;
    savedFramesSelect.append(option);
  }

  if (selectedId) savedFramesSelect.value = selectedId;
}

async function importArchive() {
  try {
    const archived = await readNamedSnapshots();
    const live = await readLiveSnapshot();

    for (const snapshot of archived) {
      await saveSnapshot(snapshot);
    }

    if (live) await saveSnapshot(live);

    if (archived.length || live) {
      await refreshSnapshotOptions(live?.id ?? archived[0]?.id ?? "");
      setStatus(`Recovered ${archived.length || 1} Flashframe session${archived.length === 1 ? "" : "s"} from disk.`);
    }
  } catch (error) {
    console.warn("Could not import Flashframe archive:", error);
  }
}

async function mirrorAllSnapshotsToDisk(preferredId = "") {
  try {
    const snapshots = await listSnapshots();
    if (!snapshots.length) return;

    for (const snapshot of snapshots) {
      await writeNamedSnapshot(snapshot);
    }

    const current = preferredId
      ? snapshots.find((snapshot) => snapshot.id === preferredId) ?? snapshots[0]
      : snapshots[0];

    if (current) await writeLiveSnapshot(current);
  } catch (error) {
    console.warn("Could not mirror Flashframe sessions to disk:", error);
  }
}

function scheduleMirror(preferredId = "") {
  if (syncTimer != null) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void mirrorAllSnapshotsToDisk(preferredId);
  }, 300);
}

saveButton.addEventListener("click", () => {
  // workspace.js performs the actual save first; wait for its IndexedDB write.
  scheduleMirror();
});

restoreButton.addEventListener("click", () => {
  const id = savedFramesSelect.value;
  if (!id) return;

  setTimeout(async () => {
    const snapshot = await getSnapshot(id);
    if (snapshot) await writeLiveSnapshot(snapshot);
  }, 300);
});

window.addEventListener("flashframe:archive-ready", async () => {
  await importArchive();
  await mirrorAllSnapshotsToDisk(savedFramesSelect.value);
});

// If Chrome retained permission to the chosen folder, recover sessions immediately.
setTimeout(() => void importArchive(), 0);
