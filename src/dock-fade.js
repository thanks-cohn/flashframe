const STORAGE_KEY = "flashframe.dock-fade.v1";
const FADE_DELAY_MS = 10_000;

const settingsDock = document.querySelector("#settings-dock");
const videoDock = document.querySelector("#video-dock");
const fadeSettingsInput = document.querySelector("#setting-fade-settings");
const fadePlayerInput = document.querySelector("#setting-fade-player");

const defaults = {
  settings: false,
  player: false
};

let preferences = { ...defaults, ...readPreferences() };
const timers = new Map();

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
    console.warn("Could not save sticky fade preferences:", error);
  }
}

function clearFadeTimer(dock) {
  const timer = timers.get(dock);
  if (timer != null) clearTimeout(timer);
  timers.delete(dock);
}

function revealDock(dock) {
  clearFadeTimer(dock);
  dock.classList.remove("is-faded");
}

function fadeEnabledFor(dock) {
  return dock === settingsDock ? preferences.settings : preferences.player;
}

function scheduleFade(dock) {
  clearFadeTimer(dock);

  if (!fadeEnabledFor(dock)) {
    dock.classList.remove("is-faded");
    return;
  }

  const timer = setTimeout(() => {
    timers.delete(dock);

    if (dock.matches(":hover") || dock.matches(":focus-within") || dock.classList.contains("is-dragging")) {
      return;
    }

    dock.classList.add("is-faded");
  }, FADE_DELAY_MS);

  timers.set(dock, timer);
}

function bindDock(dock) {
  if (!dock) return;

  dock.addEventListener("pointerenter", () => revealDock(dock));
  dock.addEventListener("pointerleave", () => scheduleFade(dock));
  dock.addEventListener("pointerdown", () => revealDock(dock));
  dock.addEventListener("focusin", () => revealDock(dock));
  dock.addEventListener("focusout", () => {
    queueMicrotask(() => {
      if (!dock.matches(":focus-within")) scheduleFade(dock);
    });
  });

  scheduleFade(dock);
}

function applyPreferences() {
  if (fadeSettingsInput) fadeSettingsInput.checked = Boolean(preferences.settings);
  if (fadePlayerInput) fadePlayerInput.checked = Boolean(preferences.player);

  if (settingsDock) {
    revealDock(settingsDock);
    scheduleFade(settingsDock);
  }

  if (videoDock) {
    revealDock(videoDock);
    scheduleFade(videoDock);
  }
}

fadeSettingsInput?.addEventListener("change", () => {
  preferences.settings = fadeSettingsInput.checked;
  savePreferences();
  applyPreferences();
});

fadePlayerInput?.addEventListener("change", () => {
  preferences.player = fadePlayerInput.checked;
  savePreferences();
  applyPreferences();
});

bindDock(settingsDock);
bindDock(videoDock);
applyPreferences();
