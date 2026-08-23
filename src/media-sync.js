const workspace = document.querySelector("#workspace");
const settingsBody = document.querySelector("#settings-dock .settings-body");
const scope = document.querySelector("#media-scope");
const MARKER = "__FLASHFRAME_LOCAL_DROP_V1__";

function timedBlocks() {
  return [...workspace.querySelectorAll(".block")].filter((block) =>
    block.dataset.timedMedia === "true" || Boolean(block.querySelector("video, audio"))
  );
}

function persistMetadata(block) {
  const store = block.querySelector(".custom-state-store");
  if (store?.value.startsWith(MARKER)) {
    try {
      const payload = JSON.parse(store.value.slice(MARKER.length));
      payload.syncGroup = block.dataset.syncGroup || "all";
      payload.visibility = block.dataset.audioVisibility || payload.visibility;
      store.value = MARKER + JSON.stringify(payload);
    } catch { /* A malformed legacy marker remains restorable as a note. */ }
  }
  workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
}

function groupLabel(group) {
  if (group === "all") return "All";
  if (group === "independent") return "Independent";
  return group.replace("sync-", "Link ").slice(0, 12);
}

function updateIndicators() {
  for (const block of timedBlocks()) {
    block.dataset.timedMedia = "true";
    if (!block.dataset.syncGroup) block.dataset.syncGroup = "all";
    let badge = block.querySelector(".sync-indicator");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "sync-indicator";
      block.querySelector(".block-actions")?.prepend(badge);
    }
    badge.textContent = block.dataset.syncGroup === "independent" ? "" : `🔗 ${groupLabel(block.dataset.syncGroup)}`;
    badge.title = `Transport group: ${groupLabel(block.dataset.syncGroup)}`;
  }

  const selected = scope.value;
  const groups = [...new Set(timedBlocks().map((block) => block.dataset.syncGroup)
    .filter((group) => group && group !== "independent" && group !== "all"))];
  scope.replaceChildren(new Option("All media", "all"), ...groups.map((group) => new Option(groupLabel(group), group)));
  if ([...scope.options].some((option) => option.value === selected)) scope.value = selected;
}

window.addEventListener("flashframe:media-link-request", (event) => {
  const block = event.detail?.block;
  if (!block) return;
  if (event.detail.independent) {
    block.dataset.syncGroup = "independent";
    persistMetadata(block);
    updateIndicators();
    return;
  }
  const candidates = timedBlocks().filter((candidate) => candidate !== block);
  if (!candidates.length) {
    document.querySelector("#status").textContent = "Add another audio or video block before linking media.";
    return;
  }
  const choices = candidates.map((candidate, index) => `${index + 1}. ${candidate.querySelector(".block-name")?.value || "Untitled media"}`).join("\n");
  const answer = window.prompt(`Sync with…\n${choices}\n\nEnter a number:`);
  const other = candidates[Number.parseInt(answer, 10) - 1];
  if (!other) return;
  const existing = [block.dataset.syncGroup, other.dataset.syncGroup]
    .find((group) => group && group !== "all" && group !== "independent");
  const group = existing || `sync-${crypto.randomUUID().slice(0, 8)}`;
  block.dataset.syncGroup = group;
  other.dataset.syncGroup = group;
  persistMetadata(block);
  persistMetadata(other);
  updateIndicators();
});

const hiddenRecovery = document.createElement("div");
hiddenRecovery.className = "storage-setting hidden-audio-recovery";
hiddenRecovery.innerHTML = '<div><strong>Hidden audio: <span>0</span></strong><small>Hidden audio remains in this workspace and can keep playing.</small></div><button type="button">Show hidden audio</button>';
settingsBody?.prepend(hiddenRecovery);
hiddenRecovery.querySelector("button").addEventListener("click", () => {
  for (const block of workspace.querySelectorAll(".audio-hidden")) {
    block.classList.remove("audio-hidden");
    block.classList.add("audio-visible");
    block.dataset.audioVisibility = "visible";
    const select = block.querySelector(".audio-visibility");
    if (select) select.value = "visible";
    persistMetadata(block);
  }
  refresh();
});

function refresh() {
  updateIndicators();
  const count = workspace.querySelectorAll(".audio-hidden").length;
  hiddenRecovery.querySelector("span").textContent = String(count);
  hiddenRecovery.querySelector("button").disabled = count === 0;
}

new MutationObserver(refresh).observe(workspace, { childList: true, subtree: false, attributes: true, attributeFilter: ["class", "data-sync-group"] });
workspace.addEventListener("change", refresh);
setTimeout(refresh, 200);
