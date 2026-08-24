const THEME_KEY = "flashframe.theme.v1";
const MEDIA_HEADER_KEY = "mediaHeaderColor";
const DEFAULT_MEDIA_HEADER = "#fef8e5";

const status = document.querySelector("#status");

function setStatus(message) {
  if (status) status.textContent = message;
}

function readTheme() {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeTheme(theme) {
  try {
    const encoded = JSON.stringify(theme);
    localStorage.setItem(THEME_KEY, encoded);
    return localStorage.getItem(THEME_KEY) === encoded;
  } catch (error) {
    console.error("Could not persist media-player header color:", error);
    return false;
  }
}

function currentColor() {
  const theme = readTheme();
  return typeof theme[MEDIA_HEADER_KEY] === "string" && /^#[0-9a-f]{6}$/i.test(theme[MEDIA_HEADER_KEY])
    ? theme[MEDIA_HEADER_KEY]
    : DEFAULT_MEDIA_HEADER;
}

function applyMediaHeaderColor() {
  document.documentElement.style.setProperty("--ff-media-header-bg", currentColor());
}

function ensureStyle() {
  if (document.querySelector("#flashframe-media-header-theme-style")) return;
  const style = document.createElement("style");
  style.id = "flashframe-media-header-theme-style";
  style.textContent = `
:root {
  --ff-media-header-bg: ${DEFAULT_MEDIA_HEADER};
}

.media-dock-polished .player-head {
  background: var(--ff-media-header-bg);
}
`;
  document.head.append(style);
}

function buildControl() {
  const row = document.createElement("label");
  row.className = "theme-setting-row media-header-theme-row";
  row.dataset.themeKey = MEDIA_HEADER_KEY;

  const label = document.createElement("span");
  label.textContent = "Media player header";

  const input = document.createElement("input");
  input.type = "color";
  input.value = currentColor();
  input.setAttribute("aria-label", "Media player header color");

  input.addEventListener("input", () => {
    const theme = readTheme();
    theme[MEDIA_HEADER_KEY] = input.value;
    if (!writeTheme(theme)) {
      setStatus("Could not save media player header color.");
      return;
    }
    applyMediaHeaderColor();
  });

  row.append(label, input);
  return row;
}

function installControl() {
  const grid = document.querySelector(".theme-customization-setting .theme-color-grid");
  if (!grid) return false;

  let row = grid.querySelector(`[data-theme-key="${MEDIA_HEADER_KEY}"]`);
  if (!row) {
    row = buildControl();
    grid.append(row);
  } else {
    const input = row.querySelector('input[type="color"]');
    if (input && input.value.toLowerCase() !== currentColor().toLowerCase()) input.value = currentColor();
  }
  return true;
}

function install() {
  ensureStyle();
  applyMediaHeaderColor();
  installControl();
}

install();
queueMicrotask(install);
setTimeout(install, 150);

const settingsBody = document.querySelector("#settings-dock .settings-body");
if (settingsBody) {
  new MutationObserver(() => queueMicrotask(install)).observe(settingsBody, {
    childList: true,
    subtree: true
  });
}
