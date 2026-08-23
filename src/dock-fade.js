const STORAGE_KEY = "flashframe.dock-fade.v1";
const FADE_DELAY_KEY = "flashframe.fade-delay-seconds.v1";

const settingsDock = document.querySelector("#settings-dock");
const videoDock = document.querySelector("#video-dock");
const fadeSettingsInput = document.querySelector("#setting-fade-settings");
const fadePlayerInput = document.querySelector("#setting-fade-player");
const fadeDelayInput = document.querySelector("#setting-fade-delay");

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

function readFadeDelaySeconds() {
  try {
    const raw = Number.parseFloat(localStorage.getItem(FADE_DELAY_KEY) ?? "10");
    return Number.isFinite(raw) ? Math.min(300, Math.max(1, raw)) : 10;
  } catch {
    return 10;
  }
}

function saveFadeDelaySeconds(value) {
  try {
    localStorage.setItem(FADE_DELAY_KEY, String(value));
  } catch (error) {
    console.warn("Could not save fade delay:", error);
  }
}

function clearFadeTimer(dock) {
  const timer = timers.get(dock);
  if (timer != null) clearTimeout(timer);
  timers.delete(dock);
}

function revealDock(dock) {
  if (!dock) return;
  clearFadeTimer(dock);
  dock.classList.remove("is-faded");
}

function fadeEnabledFor(dock) {
  return dock === settingsDock ? preferences.settings : preferences.player;
}

function scheduleFade(dock) {
  if (!dock) return;
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
  }, readFadeDelaySeconds() * 1000);

  timers.set(dock, timer);
}

function revealMenusTemporarily() {
  for (const dock of [settingsDock, videoDock]) {
    if (!dock) continue;
    revealDock(dock);
    scheduleFade(dock);
  }
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
  if (fadeDelayInput) fadeDelayInput.value = String(readFadeDelaySeconds());

  if (settingsDock) {
    revealDock(settingsDock);
    scheduleFade(settingsDock);
  }

  if (videoDock) {
    revealDock(videoDock);
    scheduleFade(videoDock);
  }

  window.dispatchEvent(new CustomEvent("flashframe:fade-delay-changed", {
    detail: { seconds: readFadeDelaySeconds() }
  }));
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

fadeDelayInput?.addEventListener("change", () => {
  const parsed = Number.parseFloat(fadeDelayInput.value);
  const seconds = Number.isFinite(parsed) ? Math.min(300, Math.max(1, parsed)) : 10;
  fadeDelayInput.value = String(seconds);
  saveFadeDelaySeconds(seconds);
  applyPreferences();
});

window.addEventListener("flashframe:reveal-menus", revealMenusTemporarily);

bindDock(settingsDock);
bindDock(videoDock);
applyPreferences();
