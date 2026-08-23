const SETTINGS_KEY = "flashframe.settings.v1";
const LOOP_INPUT_ID = "setting-loop-videos";
const WORKSPACE_CHANGED = "flashframe:workspace-changed";

const workspace = document.querySelector("#workspace");
const loopInput = document.querySelector(`#${LOOP_INPUT_ID}`);

function readSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function globalLoopEnabled() {
  if (loopInput) return Boolean(loopInput.checked);
  const settings = readSettings();
  return Boolean(settings.loopMediaByDefault ?? settings.loopVideosByDefault);
}

function notifyWorkspaceChanged() {
  workspace?.dispatchEvent(new CustomEvent(WORKSPACE_CHANGED, { bubbles: true }));
}

function updateMarkerLoop(block, loop) {
  const store = block.querySelector(".custom-state-store");
  const value = store?.value;
  if (!value) return;

  const jsonStart = value.indexOf("{");
  if (jsonStart < 0) return;

  try {
    const payload = JSON.parse(value.slice(jsonStart));
    payload.loop = Boolean(loop);
    store.value = `${value.slice(0, jsonStart)}${JSON.stringify(payload)}`;
  } catch {
    // Leave malformed legacy state untouched.
  }
}

function makeAudioLoopControl(block, player) {
  let checkbox = block.querySelector(".audio-loop");
  if (checkbox) return checkbox;

  const toolbar = block.querySelector(".source-toolbar");
  const visibility = block.querySelector(".audio-visibility");
  const reconnect = block.querySelector(".reconnect-source");
  if (!toolbar || !visibility) return null;

  for (const node of [...toolbar.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) node.remove();
  }

  let visibilityLabel = visibility.closest(".audio-option");
  if (!visibilityLabel) {
    visibilityLabel = document.createElement("label");
    visibilityLabel.className = "audio-option audio-visibility-option";
    const caption = document.createElement("span");
    caption.textContent = "Display";
    visibility.before(visibilityLabel);
    visibilityLabel.append(caption, visibility);
  }

  const loopLabel = document.createElement("label");
  loopLabel.className = "audio-option audio-loop-control";
  loopLabel.title = "Loop this audio";
  checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "audio-loop";
  checkbox.checked = Boolean(player.loop);
  const caption = document.createElement("span");
  caption.textContent = "Loop";
  loopLabel.append(checkbox, caption);

  toolbar.classList.add("audio-toolbar");
  if (reconnect) toolbar.insertBefore(loopLabel, reconnect);
  else toolbar.append(loopLabel);

  checkbox.addEventListener("change", () => {
    player.loop = checkbox.checked;
    updateMarkerLoop(block, checkbox.checked);
    notifyWorkspaceChanged();
  });

  return checkbox;
}

function enhanceAudioBlock(block) {
  if (!(block instanceof HTMLElement) || !block.classList.contains("audio-block")) return;
  block.classList.add("audio-polished");

  const player = block.querySelector(".audio-player");
  if (!player) return;

  const checkbox = makeAudioLoopControl(block, player);
  const desired = globalLoopEnabled();

  if (player.loop !== desired) player.loop = desired;
  if (checkbox && checkbox.checked !== desired) {
    checkbox.checked = desired;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function loopControlFor(block) {
  return block.querySelector(".audio-loop, .video-loop");
}

function setBlockLoop(block, loop) {
  const player = block.querySelector(".audio-player, .video-player");
  if (!player) return;

  const desired = Boolean(loop);
  const checkbox = loopControlFor(block);

  if (checkbox) {
    const changed = checkbox.checked !== desired || player.loop !== desired;
    checkbox.checked = desired;
    player.loop = desired;
    if (changed) checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  if (player.loop !== desired) {
    player.loop = desired;
    updateMarkerLoop(block, desired);
    notifyWorkspaceChanged();
  }
}

function setAllMediaLoop(loop) {
  for (const block of workspace?.querySelectorAll(".block") ?? []) {
    if (block.querySelector(".audio-player, .video-player")) setBlockLoop(block, loop);
  }
}

function updateLoopSettingCopy() {
  if (!loopInput) return;
  const row = loopInput.closest("label");
  const strong = row?.querySelector("strong");
  const small = row?.querySelector("small");
  if (strong) strong.textContent = "Loop all media";
  if (small) small.textContent = "Turns looping on or off for every audio and video block, including direct media.";
  loopInput.setAttribute("aria-label", "Loop all media");
}

updateLoopSettingCopy();

loopInput?.addEventListener("change", () => {
  setAllMediaLoop(loopInput.checked);
});

function enhanceExisting() {
  for (const block of workspace?.querySelectorAll(".audio-block") ?? []) enhanceAudioBlock(block);
  setAllMediaLoop(globalLoopEnabled());
}

const observer = new MutationObserver((mutations) => {
  let sawMedia = false;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;

      if (node.classList.contains("audio-block")) {
        enhanceAudioBlock(node);
        sawMedia = true;
      }

      for (const block of node.querySelectorAll?.(".audio-block") ?? []) {
        enhanceAudioBlock(block);
        sawMedia = true;
      }

      if (node.matches?.(".block") && node.querySelector(".video-player")) sawMedia = true;
      if (node.querySelector?.(".video-player")) sawMedia = true;
    }
  }

  if (sawMedia) queueMicrotask(() => setAllMediaLoop(globalLoopEnabled()));
});

if (workspace) {
  observer.observe(workspace, { childList: true, subtree: true });
  workspace.addEventListener("loadedmetadata", (event) => {
    const player = event.target;
    if (!(player instanceof HTMLMediaElement) || !player.matches(".audio-player, .video-player")) return;
    const block = player.closest(".block");
    if (block) setBlockLoop(block, globalLoopEnabled());
  }, true);
}

enhanceExisting();
