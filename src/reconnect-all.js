import { listSnapshots } from "./persistence.js";
import { resolveHandle } from "./file-access.js";

const reconnectAllButton = document.querySelector("#reconnect-all");
const workspace = document.querySelector("#workspace");
const status = document.querySelector("#status");

let rememberedHandles = new Map();

function setStatus(message) {
  if (status) status.textContent = message;
}

async function preloadRememberedHandles() {
  try {
    const snapshots = await listSnapshots();
    const handleKeysByBlockId = new Map();

    for (const snapshot of snapshots) {
      for (const block of snapshot.blocks ?? []) {
        const handleKey = block?.source?.handleKey;
        if (block?.id && handleKey && !handleKeysByBlockId.has(block.id)) {
          handleKeysByBlockId.set(block.id, handleKey);
        }
      }
    }

    const next = new Map();
    await Promise.all(
      [...handleKeysByBlockId].map(async ([blockId, handleKey]) => {
        try {
          const handle = await resolveHandle(handleKey);
          if (!handle) return;

          let permission = "granted";
          if (handle.queryPermission) {
            try {
              permission = await handle.queryPermission({ mode: "read" });
            } catch {
              permission = "prompt";
            }
          }

          next.set(blockId, { handle, permission });
        } catch {
          // A missing remembered handle should not prevent the others from reconnecting.
        }
      })
    );

    rememberedHandles = next;
  } catch (error) {
    console.warn("Could not preload remembered Flashframe handles:", error);
  }
}

async function reconnectAllRememberedSources() {
  const targets = [...workspace.querySelectorAll(".block")]
    .map((block) => ({
      block,
      reconnect: block.querySelector(".reconnect-source"),
      remembered: rememberedHandles.get(block.dataset.blockId)
    }))
    .filter(({ reconnect }) => reconnect && !reconnect.hidden);

  if (!targets.length) {
    setStatus("All remembered sources are already connected.");
    return;
  }

  reconnectAllButton.disabled = true;
  reconnectAllButton.textContent = "Reconnecting…";

  try {
    // Start all permission requests directly from the user's click. Chromium may
    // still choose to show permission UI for individual handles, but Flashframe
    // never forces the user through a chain of file pickers here.
    const permissionJobs = targets.map(({ remembered }) => {
      if (!remembered?.handle) return Promise.resolve("missing");
      if (remembered.permission === "granted") return Promise.resolve("granted");
      if (!remembered.handle.requestPermission) return Promise.resolve("granted");

      try {
        return remembered.handle.requestPermission({ mode: "read" });
      } catch {
        return Promise.resolve("denied");
      }
    });

    const permissions = await Promise.allSettled(permissionJobs);
    let reconnected = 0;
    let manual = 0;

    permissions.forEach((result, index) => {
      const permission = result.status === "fulfilled" ? result.value : "denied";
      const { reconnect, remembered } = targets[index];

      if (permission === "granted" && remembered?.handle) {
        remembered.permission = "granted";
        reconnect.click();
        reconnected += 1;
      } else {
        manual += 1;
      }
    });

    if (reconnected && !manual) {
      setStatus(`Reconnecting all ${reconnected} remembered source${reconnected === 1 ? "" : "s"}.`);
    } else if (reconnected) {
      setStatus(`Reconnecting ${reconnected}. ${manual} source${manual === 1 ? "" : "s"} still need an individual relink.`);
    } else {
      setStatus(`${manual} source${manual === 1 ? "" : "s"} need Chrome permission or an individual relink.`);
    }

    setTimeout(() => void preloadRememberedHandles(), 600);
  } finally {
    reconnectAllButton.disabled = false;
    reconnectAllButton.textContent = "Reconnect all";
  }
}

reconnectAllButton?.addEventListener("click", () => void reconnectAllRememberedSources());

window.addEventListener("flashframe:archive-ready", () => void preloadRememberedHandles());
window.addEventListener("focus", () => void preloadRememberedHandles());
setTimeout(() => void preloadRememberedHandles(), 0);
