const GRAB_ART_KEY = "flashframe.grab-art.v1";
const THEME_KEY = "flashframe.theme.v1";
const TOOLBAR_MODE_KEY = "flashframe.toolbar-mode.v1";
const MAX_GRAB_ART_BYTES = 750 * 1024;
const GRAB_STATES = ["default", "hover", "faded", "expanded"];

const DEFAULT_THEME = {
  toolbarColor: "#f7dc68",
  accentColor: "#f7cf4b",
  blockHeaderColor: "#fff5c7",
  toolbarFont: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  blockHeaderFont: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
};

const status = document.querySelector("#status");
const toolbar = document.querySelector(".toolbar");
const legacyToolbarCheckbox = document.querySelector("#setting-toolbar");
const toolbarSummon = document.querySelector("#toolbar-summon");
let toolbarHideTimer = null;

function setStatus(message) {
  if (status) status.textContent = message;
}

function readJson(key, fallback = {}) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStrict(key, value) {
  try {
    const encoded = JSON.stringify(value);
    localStorage.setItem(key, encoded);
    return localStorage.getItem(key) === encoded;
  } catch (error) {
    console.error(`Could not persist ${key}:`, error);
    return false;
  }
}

function stateTitle(state) {
  return state[0].toUpperCase() + state.slice(1);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

function readGrabArt() {
  return readJson(GRAB_ART_KEY, {});
}

function exactGrabSource(art, state) {
  return typeof art[state] === "string" ? art[state] : "";
}

function effectiveGrabSource(art, state) {
  return exactGrabSource(art, state) || exactGrabSource(art, "default") || "";
}

function normalizeGrabHandle(handle) {
  if (!(handle instanceof HTMLElement)) return null;

  for (const node of [...handle.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) node.remove();
  }
  handle.querySelectorAll(".spinner-mark").forEach((node) => node.remove());

  const images = [...handle.querySelectorAll(":scope > .grab-art-image")];
  for (const extra of images.slice(1)) extra.remove();

  const fallbacks = [...handle.querySelectorAll(":scope > .grab-fallback-art")];
  for (const extra of fallbacks.slice(1)) extra.remove();

  return {
    image: handle.querySelector(":scope > .grab-art-image"),
    fallback: handle.querySelector(":scope > .grab-fallback-art")
  };
}

function renderGrabHandle(handle) {
  const parts = normalizeGrabHandle(handle);
  if (!parts) return;

  const art = readGrabArt();
  const state = handle.dataset.grabState || (handle.closest("#video-dock") ? "default" : "expanded");
  const source = effectiveGrabSource(art, state);
  handle.dataset.customGrab = source ? "true" : "false";

  if (parts.image) {
    parts.image.removeAttribute("src");
    if (source) {
      parts.image.hidden = false;
      parts.image.src = source;
    } else {
      parts.image.hidden = true;
    }
  }

  if (parts.fallback) {
    parts.fallback.hidden = Boolean(source);
    parts.fallback.style.display = source ? "none" : "";
    parts.fallback.style.visibility = source ? "hidden" : "";
  }
}

function refreshGrabHandles() {
  for (const handle of document.querySelectorAll(".grab-image-slot, .compact-drag-handle, #video-dock-grip")) {
    renderGrabHandle(handle);
  }
}

function buildGrabStateRow(state) {
  const row = document.createElement("div");
  row.className = "grab-state-row";
  row.dataset.grabStateSetting = state;

  const preview = document.createElement("div");
  preview.className = "grab-state-preview";
  const image = document.createElement("img");
  image.alt = "";
  image.hidden = true;
  const fallback = document.createElement("span");
  fallback.className = "grab-preview-fallback";
  fallback.textContent = "hand";
  preview.append(image, fallback);

  const copy = document.createElement("div");
  copy.className = "grab-state-copy";
  const strong = document.createElement("strong");
  strong.textContent = stateTitle(state);
  const small = document.createElement("small");
  copy.append(strong, small);

  const actions = document.createElement("div");
  actions.className = "grab-state-actions";
  const choose = document.createElement("button");
  choose.type = "button";
  choose.textContent = "Choose";
  const clear = document.createElement("button");
  clear.type = "button";
  clear.textContent = "Clear";
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "image/png,image/webp,image/gif,image/svg+xml,image/jpeg";
  picker.hidden = true;

  choose.addEventListener("click", () => {
    picker.value = "";
    picker.click();
  });

  picker.addEventListener("change", async () => {
    const file = picker.files?.[0];
    if (!file) return;
    if (file.size > MAX_GRAB_ART_BYTES) {
      setStatus("Grab artwork must be smaller than 750 KB.");
      return;
    }

    try {
      const source = await fileToDataUrl(file);
      const art = readGrabArt();
      art[state] = source;
      if (!writeJsonStrict(GRAB_ART_KEY, art)) {
        setStatus("Could not replace Grab artwork. Browser storage may be full.");
        return;
      }
      updateGrabSettingsPreviews();
      refreshGrabHandles();
      setStatus(`${stateTitle(state)} Grab artwork replaced.`);
    } catch (error) {
      console.error(error);
      setStatus("Could not load that Grab artwork.");
    }
  });

  clear.addEventListener("click", () => {
    const art = readGrabArt();
    delete art[state];
    if (!writeJsonStrict(GRAB_ART_KEY, art)) {
      setStatus("Could not clear Grab artwork.");
      return;
    }
    updateGrabSettingsPreviews();
    refreshGrabHandles();
    setStatus(`${stateTitle(state)} Grab artwork cleared.`);
  });

  actions.append(choose, clear, picker);
  row.append(preview, copy, actions);
  return row;
}

function updateGrabSettingsPreviews() {
  const art = readGrabArt();
  for (const row of document.querySelectorAll("[data-grab-state-setting]")) {
    const state = row.dataset.grabStateSetting;
    const exact = exactGrabSource(art, state);
    const inherited = !exact && state !== "default" ? exactGrabSource(art, "default") : "";
    const source = exact || inherited;
    const preview = row.querySelector(".grab-state-preview img");
    const fallback = row.querySelector(".grab-preview-fallback");
    const small = row.querySelector("small");
    const buttons = row.querySelectorAll(".grab-state-actions button");
    const choose = buttons[0];
    const clear = buttons[1];

    if (preview) {
      preview.removeAttribute("src");
      if (source) {
        preview.hidden = false;
        preview.src = source;
      } else {
        preview.hidden = true;
      }
    }
    if (fallback) fallback.hidden = Boolean(source);
    if (small) small.textContent = exact ? "Custom image" : inherited ? "Uses Default image" : "Uses Flashframe hand";
    if (choose) choose.textContent = exact ? "Replace" : "Choose";
    if (clear) clear.disabled = !exact;
  }
}

function upgradeGrabArtworkSettings() {
  const section = document.querySelector("#settings-dock .grab-art-setting");
  if (!section || section.dataset.grabSettingsV2 === "true") return false;
  section.dataset.grabSettingsV2 = "true";
  section.replaceChildren();

  const heading = document.createElement("div");
  heading.className = "grab-settings-heading";
  heading.innerHTML = "<strong>Grab artwork</strong><small>Each state owns its own image. Choose again at any time to replace it. States without an image inherit Default.</small>";

  const rows = document.createElement("div");
  rows.className = "grab-state-list";
  for (const state of GRAB_STATES) rows.append(buildGrabStateRow(state));

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "grab-reset-all";
  reset.textContent = "Reset all Grab artwork";
  reset.addEventListener("click", () => {
    localStorage.removeItem(GRAB_ART_KEY);
    updateGrabSettingsPreviews();
    refreshGrabHandles();
    setStatus("All Grab artwork reset to the Flashframe hand.");
  });

  section.append(heading, rows, reset);
  updateGrabSettingsPreviews();
  refreshGrabHandles();
  return true;
}

function readTheme() {
  return { ...DEFAULT_THEME, ...readJson(THEME_KEY, {}) };
}

function applyTheme(theme = readTheme()) {
  const root = document.documentElement;
  root.style.setProperty("--ff-toolbar-bg", theme.toolbarColor || DEFAULT_THEME.toolbarColor);
  root.style.setProperty("--ff-accent", theme.accentColor || DEFAULT_THEME.accentColor);
  root.style.setProperty("--ff-block-header-bg", theme.blockHeaderColor || DEFAULT_THEME.blockHeaderColor);
  root.style.setProperty("--ff-toolbar-font", theme.toolbarFont || DEFAULT_THEME.toolbarFont);
  root.style.setProperty("--ff-block-header-font", theme.blockHeaderFont || DEFAULT_THEME.blockHeaderFont);
}

function persistTheme(theme) {
  if (!writeJsonStrict(THEME_KEY, theme)) {
    setStatus("Could not save theme settings.");
    return false;
  }
  applyTheme(theme);
  return true;
}

function makeColorRow(label, key, value) {
  const row = document.createElement("label");
  row.className = "theme-setting-row";
  const text = document.createElement("span");
  text.textContent = label;
  const input = document.createElement("input");
  input.type = "color";
  input.value = value;
  input.addEventListener("input", () => {
    const theme = readTheme();
    theme[key] = input.value;
    persistTheme(theme);
  });
  row.append(text, input);
  return row;
}

function makeFontRow(label, key, value) {
  const row = document.createElement("label");
  row.className = "theme-font-row";
  const text = document.createElement("span");
  text.textContent = label;
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.maxLength = 200;
  input.placeholder = "Inter, system-ui, sans-serif";
  input.addEventListener("change", () => {
    const theme = readTheme();
    theme[key] = input.value.trim() || DEFAULT_THEME[key];
    persistTheme(theme);
  });
  row.append(text, input);
  return row;
}

function addThemeSettings() {
  const body = document.querySelector("#settings-dock .settings-body");
  if (!body || body.querySelector(".theme-customization-setting")) return false;

  const theme = readTheme();
  const section = document.createElement("div");
  section.className = "storage-setting theme-customization-setting";

  const heading = document.createElement("div");
  heading.className = "theme-heading";
  heading.innerHTML = "<strong>Theme</strong><small>Change the top toolbar, accent buttons, and block headers. Font fields use installed/local font-family names now; Google Fonts can plug into this same theme model later.</small>";

  const colors = document.createElement("div");
  colors.className = "theme-color-grid";
  colors.append(
    makeColorRow("Top toolbar", "toolbarColor", theme.toolbarColor),
    makeColorRow("Accent / small buttons", "accentColor", theme.accentColor),
    makeColorRow("Block headers", "blockHeaderColor", theme.blockHeaderColor)
  );

  const fonts = document.createElement("div");
  fonts.className = "theme-font-grid";
  fonts.append(
    makeFontRow("Top toolbar font", "toolbarFont", theme.toolbarFont),
    makeFontRow("Block header font", "blockHeaderFont", theme.blockHeaderFont)
  );

  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "Reset theme";
  reset.addEventListener("click", () => {
    localStorage.removeItem(THEME_KEY);
    applyTheme(DEFAULT_THEME);
    section.remove();
    addThemeSettings();
    setStatus("Theme reset.");
  });

  section.append(heading, colors, fonts, reset);
  const grab = body.querySelector(".grab-art-setting");
  if (grab) body.insertBefore(section, grab);
  else body.append(section);
  return true;
}

function readToolbarMode() {
  const saved = localStorage.getItem(TOOLBAR_MODE_KEY);
  if (["always", "hover", "hidden"].includes(saved)) return saved;
  return legacyToolbarCheckbox?.checked === false ? "hidden" : "always";
}

function setLegacyToolbarVisible(visible) {
  if (!legacyToolbarCheckbox || legacyToolbarCheckbox.checked === visible) return;
  legacyToolbarCheckbox.checked = visible;
  legacyToolbarCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
}

function clearToolbarHideTimer() {
  if (toolbarHideTimer != null) clearTimeout(toolbarHideTimer);
  toolbarHideTimer = null;
}

function revealToolbar() {
  if (readToolbarMode() !== "hover") return;
  clearToolbarHideTimer();
  document.body.classList.add("toolbar-peeking");
}

function scheduleToolbarHide() {
  if (readToolbarMode() !== "hover") return;
  clearToolbarHideTimer();
  toolbarHideTimer = setTimeout(() => {
    toolbarHideTimer = null;
    if (toolbar?.matches(":hover") || toolbar?.matches(":focus-within")) return;
    document.body.classList.remove("toolbar-peeking");
  }, 180);
}

function ensureToolbarHoverZone() {
  let zone = document.querySelector("#toolbar-hover-zone");
  if (zone) return zone;
  zone = document.createElement("div");
  zone.id = "toolbar-hover-zone";
  zone.className = "toolbar-hover-zone";
  zone.setAttribute("aria-hidden", "true");
  document.body.append(zone);
  zone.addEventListener("pointerenter", revealToolbar);
  zone.addEventListener("pointerleave", scheduleToolbarHide);
  return zone;
}

function applyToolbarMode(mode = readToolbarMode(), { persist = false } = {}) {
  if (!["always", "hover", "hidden"].includes(mode)) mode = "always";
  if (persist) localStorage.setItem(TOOLBAR_MODE_KEY, mode);

  document.body.classList.toggle("toolbar-hover-reveal", mode === "hover");
  if (mode !== "hover") {
    clearToolbarHideTimer();
    document.body.classList.remove("toolbar-peeking");
  }

  setLegacyToolbarVisible(mode !== "hidden");
  const select = document.querySelector("#setting-toolbar-mode");
  if (select && select.value !== mode) select.value = mode;
}

function addToolbarModeSetting() {
  const body = document.querySelector("#settings-dock .settings-body");
  if (!body || body.querySelector("#setting-toolbar-mode")) return false;

  const oldRow = legacyToolbarCheckbox?.closest("label");
  if (oldRow) oldRow.hidden = true;

  const row = document.createElement("label");
  row.className = "toolbar-mode-row";
  const copy = document.createElement("span");
  copy.innerHTML = "<strong>Top toolbar</strong><small>Keep it visible, reveal it only at the top edge, or hide it completely.</small>";
  const select = document.createElement("select");
  select.id = "setting-toolbar-mode";
  select.setAttribute("aria-label", "Top toolbar behavior");
  for (const [value, label] of [["always", "Always visible"], ["hover", "Reveal on hover"], ["hidden", "Hidden"]]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
  select.value = readToolbarMode();
  select.addEventListener("change", () => applyToolbarMode(select.value, { persist: true }));
  row.append(copy, select);

  const headersRow = document.querySelector("#setting-block-headers")?.closest("label");
  if (headersRow?.parentElement === body) headersRow.insertAdjacentElement("afterend", row);
  else body.prepend(row);
  return true;
}

function installCustomizationUi() {
  ensureToolbarHoverZone();
  applyTheme();
  addToolbarModeSetting();
  addThemeSettings();
  upgradeGrabArtworkSettings();
  applyToolbarMode();
  refreshGrabHandles();
}

if (toolbar) {
  toolbar.addEventListener("pointerenter", revealToolbar);
  toolbar.addEventListener("pointerleave", scheduleToolbarHide);
  toolbar.addEventListener("focusin", revealToolbar);
  toolbar.addEventListener("focusout", scheduleToolbarHide);
}

toolbarSummon?.addEventListener("click", () => {
  if (readToolbarMode() !== "hover") return;
  queueMicrotask(() => {
    setLegacyToolbarVisible(true);
    revealToolbar();
  });
});

installCustomizationUi();
queueMicrotask(installCustomizationUi);
setTimeout(installCustomizationUi, 150);

const settingsBody = document.querySelector("#settings-dock .settings-body");
if (settingsBody) {
  new MutationObserver(() => {
    if (!settingsBody.querySelector(".theme-customization-setting") || !settingsBody.querySelector('[data-grab-settings-v2="true"]') || !settingsBody.querySelector("#setting-toolbar-mode")) {
      installCustomizationUi();
    }
  }).observe(settingsBody, { childList: true });
}

const workspace = document.querySelector("#workspace");
if (workspace) {
  new MutationObserver(() => refreshGrabHandles()).observe(workspace, { childList: true, subtree: true });
}
