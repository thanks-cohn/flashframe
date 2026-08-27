import "./live-state.js";
import { listFrames, migrateCacheToArchive, recoverArchiveToCache } from "./storage.js";

const LIVE_ID = "__flashframe_live__";
const saveButton = document.querySelector("#save-frame");
const restoreButton = document.querySelector("#restore-frame");
const savedFramesSelect = document.querySelector("#saved-frames");
const status = document.querySelector("#status");

function setStatus(message) {
  if (status) status.textContent = message;
}

async function refreshSnapshotOptions(selectedId = "") {
  const snapshots = (await listFrames()).filter((snapshot) => snapshot.id !== LIVE_ID);
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
    const { named: archived, live } = await recoverArchiveToCache();

    if (archived.length || live) {
      await refreshSnapshotOptions(archived[0]?.id ?? "");
      setStatus(`Recovered ${archived.length + (live ? 1 : 0)} Flashframe state${archived.length + (live ? 1 : 0) === 1 ? "" : "s"} from disk.`);
      window.dispatchEvent(new CustomEvent("flashframe:archive-imported"));
    }
  } catch (error) {
    console.warn("Could not import Flashframe archive:", error);
  }
}

window.addEventListener("flashframe:archive-ready", async () => {
  await importArchive();
  try {
    await migrateCacheToArchive();
  } catch (error) {
    console.warn("Could not migrate every browser-cached asset to the FrameChute folder:", error);
    setStatus("Folder connected, but some browser-only assets still require relinking.");
  }
});

setTimeout(() => void importArchive(), 0);
