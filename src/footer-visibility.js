import "./local-source-links.js";

const STORAGE_KEY = "flashframe.block-controls.v1";
const FADE_DELAY_KEY = "flashframe.fade-delay-seconds.v1";

const workspace = document.querySelector("#workspace");
const videoFooterSelect = document.querySelector("#setting-video-footer");
const otherFootersSelect = document.querySelector("#setting-other-footers");

const defaults = {
  video: "show",
  other: "show"
};

let preferences = { ...defaults, ...readPreferences() };
const timers = new WeakMap();

function readPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePreferences() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn("Could not save block control preferences:", error);
  }
}

function fadeDelayMs() {
  try {
    const seconds = Number.parseFloat(localStorage.getItem(FADE_DELAY_KEY) ?? "10");
    const safe = Number.isFinite(seconds) ? Math.min(300, Math.max(1, seconds)) : 10;
    return safe * 1000;
  } catch {
    return 10_000;
  }
}

function isVideoToolbar(toolbar) {
  const block = toolbar.closest(".block");
  if (!block) return false;

  return block.dataset.blockType === "video"
    || block.dataset.customKind === "remote-video"
    || block.classList.contains("remote-video-block");
}

function modeFor(toolbar) {
  return isVideoToolbar(toolbar) ? preferences.video : preferences.other;
}

function clearTimer(toolbar) {
  const timer = timers.get(toolbar);
  if (timer != null) clearTimeout(timer);
  timers.delete(toolbar);
}

function reveal(toolbar) {
  clearTimer(toolbar);
  toolbar.classList.remove("is-control-faded");
}

function schedule(toolbar) {
  clearTimer(toolbar);

  const mode = modeFor(toolbar);
  const hidden = mode === "hide";
  toolbar.hidden = hidden;
  toolbar.classList.toggle("is-control-hidden", hidden);

  if (mode !== "fade") {
    toolbar.classList.remove("is-control-faded");
    return;
  }

  toolbar.hidden = false;
  toolbar.classList.remove("is-control-hidden");

  const timer = setTimeout(() => {
    timers.delete(toolbar);
    if (toolbar.matches(":hover") || toolbar.matches(":focus-within")) return;
    toolbar.classList.add("is-control-faded");
  }, fadeDelayMs());

  timers.set(toolbar, timer);
}

function bindToolbar(toolbar) {
  if (!(toolbar instanceof HTMLElement)) return;
  if (toolbar.dataset.flashframeFooterVisibilityBound === "true") {
    reveal(toolbar);
    schedule(toolbar);
    return;
  }

  toolbar.dataset.flashframeFooterVisibilityBound = "true";
  toolbar.addEventListener("pointerenter", () => reveal(toolbar));
  toolbar.addEventListener("pointerleave", () => schedule(toolbar));
  toolbar.addEventListener("pointerdown", () => reveal(toolbar));
  toolbar.addEventListener("focusin", () => reveal(toolbar));
  toolbar.addEventListener("focusout", () => {
    queueMicrotask(() => {
      if (!toolbar.matches(":focus-within")) schedule(toolbar);
    });
  });

  schedule(toolbar);
}

function bindAllToolbars() {
  for (const toolbar of workspace.querySelectorAll(".block-toolbar")) {
    bindToolbar(toolbar);
  }
}

function applyPreferences() {
  if (videoFooterSelect) videoFooterSelect.value = preferences.video;
  if (otherFootersSelect) otherFootersSelect.value = preferences.other;
  bindAllToolbars();
}

videoFooterSelect?.addEventListener("change", () => {
  preferences.video = videoFooterSelect.value;
  savePreferences();
  applyPreferences();
});

otherFootersSelect?.addEventListener("change", () => {
  preferences.other = otherFootersSelect.value;
  savePreferences();
  applyPreferences();
});

window.addEventListener("flashframe:fade-delay-changed", () => bindAllToolbars());

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.classList.contains("block-toolbar")) bindToolbar(node);
      for (const toolbar of node.querySelectorAll?.(".block-toolbar") ?? []) bindToolbar(toolbar);
    }
  }
});

observer.observe(workspace, { childList: true, subtree: true });
applyPreferences();
