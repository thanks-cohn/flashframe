import "./live-state.js";
import { getSnapshot, listSnapshots, saveSnapshot } from "./persistence.js";
import { readLiveSnapshot, readNamedSnapshots, writeLiveSnapshot, writeNamedSnapshot } from "./archive.js";

const LIVE_ID = "__flashframe_live__";
const saveButton = document.querySelector("#save-frame");
const restoreButton = document.querySelector("#restore-frame");
const savedFramesSelect = document.querySelector("#saved-frames");
const status = document.querySelector("#status");

let syncTimer = null;

function setStatus(message) {
  if (status) status.textContent = message;
}

async function refreshSnapshotOptions(selectedId = "") {
  const snapshots = (await listSnapshots()).filter((snapshot) => snapshot.id !== LIVE_ID);
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

  if (selectedId && selectedId !== LIVE_ID) savedFramesSelect.value = selectedId;
}

async function importArchive() {
  try {
    const archived = await readNamedSnapshots();
    const live = await readLiveSnapshot();

    for (const snapshot of archived) {
      if (snapshot.id !== LIVE_ID) await saveSnapshot(snapshot);
    }

    if (live) await saveSnapshot({ ...live, id: LIVE_ID, name: "Current workspace" });

    if (archived.length || live) {
      await refreshSnapshotOptions(archived[0]?.id ?? "");
      setStatus(`Recovered ${archived.length + (live ? 1 : 0)} Flashframe state${archived.length + (live ? 1 : 0) === 1 ? "" : "s"} from disk.`);
      window.dispatchEvent(new CustomEvent("flashframe:archive-imported"));
    }
  } catch (error) {
    console.warn("Could not import Flashframe archive:", error);
  }
}

async function mirrorNamedSnapshotsToDisk(preferredId = "") {
  try {
    const snapshots = (await listSnapshots()).filter((snapshot) => snapshot.id !== LIVE_ID);
    if (!snapshots.length) return;

    for (const snapshot of snapshots) {
      await writeNamedSnapshot(snapshot);
    }

    const current = preferredId
      ? snapshots.find((snapshot) => snapshot.id === preferredId) ?? null
      : null;

    if (current) await writeLiveSnapshot(current);
  } catch (error) {
    console.warn("Could not mirror Flashframe sessions to disk:", error);
  }
}

function scheduleMirror(preferredId = "") {
  if (syncTimer != null) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void mirrorNamedSnapshotsToDisk(preferredId);
  }, 300);
}

saveButton.addEventListener("click", () => {
  scheduleMirror(savedFramesSelect.value);
});

restoreButton.addEventListener("click", () => {
  const id = savedFramesSelect.value;
  if (!id || id === LIVE_ID) return;

  setTimeout(async () => {
    const snapshot = await getSnapshot(id);
    if (snapshot) await writeLiveSnapshot(snapshot);
  }, 300);
});

window.addEventListener("flashframe:archive-ready", async () => {
  await importArchive();
  await mirrorNamedSnapshotsToDisk(savedFramesSelect.value);
});

setTimeout(() => void importArchive(), 0);
