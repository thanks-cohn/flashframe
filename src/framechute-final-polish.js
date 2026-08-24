const THEME_KEY = "flashframe.theme.v1";
const DOCK_FADE_KEY = "flashframe.dock-fade.v1";
const MEDIA_PLAYER_MODE_KEY = "flashframe.media-player-mode.v1";

const TEXT_THEME_DEFAULTS = {
  toolbarTextColor: "#171717",
  blockHeaderTextColor: "#171717",
  menuTextColor: "#171717"
};

const mediaDock = document.querySelector("#video-dock");
const settingsBody = document.querySelector("#settings-dock .settings-body");
const legacyFadePlayer = document.querySelector("#setting-fade-player");
const status = document.querySelector("#status");

function readJson(key, fallback = {}) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Could not persist ${key}:`, error);
    return false;
  }
}

function setStatus(message) {
  if (status) status.textContent = message;
}

function readTheme() {
  return { ...TEXT_THEME_DEFAULTS, ...readJson(THEME_KEY, {}) };
}

function applyTextTheme(theme = readTheme()) {
  const root = document.documentElement;
  root.style.setProperty("--ff-toolbar-text", theme.toolbarTextColor || TEXT_THEME_DEFAULTS.toolbarTextColor);
  root.style.setProperty("--ff-block-header-text", theme.blockHeaderTextColor || TEXT_THEME_DEFAULTS.blockHeaderTextColor);
  root.style.setProperty("--ff-menu-text", theme.menuTextColor || TEXT_THEME_DEFAULTS.menuTextColor);
}

function makeTextColorRow(label, key) {
  const row = document.createElement("label");
  row.className = "theme-setting-row framechute-text-color-row";
  row.dataset.themeKey = key;

  const copy = document.createElement("span");
  copy.textContent = label;

  const input = document.createElement("input");
  input.type = "color";
  input.setAttribute("aria-label", `${label} color`);
  input.value = readTheme()[key] || TEXT_THEME_DEFAULTS[key];
  input.addEventListener("input", () => {
    const theme = readJson(THEME_KEY, {});
    theme[key] = input.value;
    if (!writeJson(THEME_KEY, theme)) {
      setStatus("Could not save text color.");
      return;
    }
    applyTextTheme({ ...TEXT_THEME_DEFAULTS, ...theme });
  });

  row.append(copy, input);
  return row;
}

function installTextColorControls() {
  const grid = document.querySelector(".theme-customization-setting .theme-color-grid");
  if (!grid) return false;

  for (const [label, key] of [
    ["Top toolbar text", "toolbarTextColor"],
    ["Block header text", "blockHeaderTextColor"],
    ["Menus / floating panels text", "menuTextColor"]
  ]) {
    let row = grid.querySelector(`[data-theme-key="${key}"]`);
    if (!row) {
      row = makeTextColorRow(label, key);
      grid.append(row);
    } else {
      const input = row.querySelector('input[type="color"]');
      const value = readTheme()[key] || TEXT_THEME_DEFAULTS[key];
      if (input && input.value.toLowerCase() !== value.toLowerCase()) input.value = value;
    }
  }

  applyTextTheme();
  return true;
}

function readMediaPlayerMode() {
  const stored = localStorage.getItem(MEDIA_PLAYER_MODE_KEY);
  if (["visible", "fade", "hidden"].includes(stored)) return stored;
  const old = readJson(DOCK_FADE_KEY, {});
  return old.player ? "fade" : "visible";
}

function syncLegacyFadePreference(enabled) {
  const old = readJson(DOCK_FADE_KEY, {});
  old.player = Boolean(enabled);
  writeJson(DOCK_FADE_KEY, old);

  if (legacyFadePlayer) {
    const changed = legacyFadePlayer.checked !== Boolean(enabled);
    legacyFadePlayer.checked = Boolean(enabled);
    if (changed) legacyFadePlayer.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function applyMediaPlayerMode(mode = readMediaPlayerMode(), { persist = false } = {}) {
  if (!["visible", "fade", "hidden"].includes(mode)) mode = "visible";
  if (persist) localStorage.setItem(MEDIA_PLAYER_MODE_KEY, mode);

  syncLegacyFadePreference(mode === "fade");
  mediaDock?.classList.toggle("media-player-hidden", mode === "hidden");
  if (mode !== "fade") mediaDock?.classList.remove("is-faded");

  const select = document.querySelector("#setting-media-player-mode");
  if (select && select.value !== mode) select.value = mode;
}

function installMediaPlayerModeSetting() {
  if (!settingsBody) return false;

  const oldRow = legacyFadePlayer?.closest("label");
  if (oldRow) oldRow.hidden = true;

  let row = settingsBody.querySelector(".media-player-mode-row");
  if (!row) {
    row = document.createElement("label");
    row.className = "media-player-mode-row";

    const copy = document.createElement("span");
    copy.innerHTML = "<strong>Media player</strong><small>Keep it visible, let the whole player fade, or hide it until restored here.</small>";

    const select = document.createElement("select");
    select.id = "setting-media-player-mode";
    select.setAttribute("aria-label", "Media player visibility");
    for (const [value, label] of [["visible", "Visible"], ["fade", "Fade"], ["hidden", "Hidden"]]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.append(option);
    }
    select.value = readMediaPlayerMode();
    select.addEventListener("change", () => applyMediaPlayerMode(select.value, { persist: true }));
    row.append(copy, select);

    const fadeDelayRow = document.querySelector("#setting-fade-delay")?.closest("label");
    if (fadeDelayRow?.parentElement === settingsBody) settingsBody.insertBefore(row, fadeDelayRow);
    else if (oldRow?.parentElement === settingsBody) oldRow.insertAdjacentElement("afterend", row);
    else settingsBody.prepend(row);
  }

  applyMediaPlayerMode();
  return true;
}

function ensureMediaPlayerHideButton() {
  const zone = mediaDock?.querySelector(".media-dock-window-zone");
  if (!zone) return false;
  let button = zone.querySelector("#media-player-hide");
  if (!button) {
    button = document.createElement("button");
    button.id = "media-player-hide";
    button.className = "player-control media-player-hide";
    button.type = "button";
    button.textContent = "×";
    button.title = "Hide media player";
    button.setAttribute("aria-label", "Hide media player");
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      applyMediaPlayerMode("hidden", { persist: true });
      setStatus("Media player hidden. Restore it from Settings > Media player.");
    });
    zone.prepend(button);
  }
  return true;
}

function renameText(value) {
  return String(value)
    .replaceAll("Flashframes", "FrameChutes")
    .replaceAll("Flashframe", "FrameChute");
}

function renameVisibleNode(root) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    const next = renameText(root.nodeValue || "");
    if (next !== root.nodeValue) root.nodeValue = next;
    return;
  }

  if (!(root instanceof Element) && root !== document.body) return;
  if (root instanceof Element) {
    for (const attr of ["title", "aria-label", "placeholder"]) {
      if (!root.hasAttribute(attr)) continue;
      const oldValue = root.getAttribute(attr) || "";
      const next = renameText(oldValue);
      if (next !== oldValue) root.setAttribute(attr, next);
    }
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node = walker.currentNode;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const next = renameText(node.nodeValue || "");
      if (next !== node.nodeValue) node.nodeValue = next;
    } else if (node instanceof Element) {
      for (const attr of ["title", "aria-label", "placeholder"]) {
        if (!node.hasAttribute(attr)) continue;
        const oldValue = node.getAttribute(attr) || "";
        const next = renameText(oldValue);
        if (next !== oldValue) node.setAttribute(attr, next);
      }
    }
    node = walker.nextNode();
  }
}

function applyFrameChuteName() {
  document.title = "FrameChute";
  renameVisibleNode(document.body);
}

function install() {
  applyTextTheme();
  installTextColorControls();
  installMediaPlayerModeSetting();
  ensureMediaPlayerHideButton();
  applyFrameChuteName();
}

install();
queueMicrotask(install);
setTimeout(install, 200);

new MutationObserver((mutations) => {
  let needsInstall = false;
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      renameVisibleNode(node);
      if (node instanceof Element && (
        node.matches?.(".theme-customization-setting, .media-dock-window-zone") ||
        node.querySelector?.(".theme-customization-setting, .media-dock-window-zone")
      )) needsInstall = true;
    }
  }
  if (needsInstall) queueMicrotask(install);
}).observe(document.body, { childList: true, subtree: true });
