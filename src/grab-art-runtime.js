const GRAB_ART_KEY = "flashframe.grab-art.v1";
const STATES = ["default", "hover", "faded", "expanded"];
const PACKAGED = Object.fromEntries(
  STATES.map((state) => [state, chrome.runtime.getURL(`assets/grab/${state}.png`)])
);

function readCustomArt() {
  try {
    const raw = localStorage.getItem(GRAB_ART_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function normalizeState(state) {
  return STATES.includes(state) ? state : "default";
}

function resolvedSource(state) {
  const next = normalizeState(state);
  const art = readCustomArt();
  const exact = typeof art[next] === "string" ? art[next] : "";
  const customDefault = typeof art.default === "string" ? art.default : "";
  return exact || customDefault || PACKAGED[next] || PACKAGED.default;
}

function stateForHandle(handle) {
  return normalizeState(
    handle.dataset.grabState || (handle.closest("#video-dock") ? "default" : "expanded")
  );
}

function ensureImage(handle) {
  let image = handle.querySelector(":scope > .grab-art-image, :scope > .media-dock-grab-image");
  if (image instanceof HTMLImageElement) return image;

  image = document.createElement("img");
  image.className = handle.id === "video-dock-grip"
    ? "grab-art-image media-dock-grab-image"
    : "grab-art-image";
  image.alt = "";
  image.draggable = false;
  handle.prepend(image);
  return image;
}

function setHidden(node, hidden) {
  if (!(node instanceof Element)) return;
  if (hidden) {
    if (!node.hasAttribute("hidden")) node.setAttribute("hidden", "");
  } else if (node.hasAttribute("hidden")) {
    node.removeAttribute("hidden");
  }
}

function renderHandle(handle) {
  if (!(handle instanceof HTMLElement)) return;
  const image = ensureImage(handle);
  const fallback = handle.querySelector(":scope > .grab-fallback-art");
  const source = resolvedSource(stateForHandle(handle));

  if ((image.getAttribute("src") || "") !== source) image.src = source;
  setHidden(image, false);
  setHidden(fallback, true);
  if (fallback instanceof Element && "style" in fallback) {
    if (fallback.style.display !== "none") fallback.style.display = "none";
    if (fallback.style.visibility !== "hidden") fallback.style.visibility = "hidden";
  }
}

function renderPreview(row) {
  if (!(row instanceof HTMLElement)) return;
  const state = normalizeState(row.dataset.grabStateSetting);
  const image = row.querySelector(".grab-state-preview img");
  const fallback = row.querySelector(".grab-preview-fallback");
  const small = row.querySelector(".grab-state-copy small, small");
  if (!(image instanceof HTMLImageElement)) return;

  const art = readCustomArt();
  const exact = typeof art[state] === "string" && art[state];
  const inherited = !exact && typeof art.default === "string" && art.default;
  const source = resolvedSource(state);

  if ((image.getAttribute("src") || "") !== source) image.src = source;
  setHidden(image, false);
  setHidden(fallback, true);

  if (small) {
    small.textContent = exact
      ? "Custom image"
      : inherited
        ? "Uses custom Default image"
        : "Packaged FrameChute default";
  }
}

function renderAll() {
  for (const handle of document.querySelectorAll(
    ".grab-image-slot, .compact-drag-handle, #video-dock-grip"
  )) renderHandle(handle);

  for (const row of document.querySelectorAll("[data-grab-state-setting]")) {
    renderPreview(row);
  }
}

let frame = 0;
function scheduleRender() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    renderAll();
  });
}

// Only observe structural changes and state changes. Do not observe src/hidden:
// this renderer changes those attributes itself, and watching them can create a
// self-sustaining MutationObserver refresh loop on low-memory machines.
new MutationObserver(scheduleRender).observe(document.body, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ["data-grab-state"]
});

for (const eventName of ["pointerenter", "pointerleave", "focusin", "focusout"]) {
  document.addEventListener(eventName, (event) => {
    if (event.target instanceof Element && event.target.closest(
      ".grab-image-slot, .compact-drag-handle, #video-dock-grip"
    )) scheduleRender();
  }, true);
}

document.addEventListener("change", (event) => {
  if (!(event.target instanceof Element) || !event.target.closest(".grab-art-setting")) return;
  scheduleRender();
  setTimeout(scheduleRender, 60);
  setTimeout(scheduleRender, 250);
}, true);

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element) || !event.target.closest(".grab-art-setting")) return;
  scheduleRender();
  setTimeout(scheduleRender, 0);
}, true);

window.addEventListener("focus", scheduleRender);
window.addEventListener("storage", (event) => {
  if (event.key === GRAB_ART_KEY) scheduleRender();
});

renderAll();
queueMicrotask(scheduleRender);
setTimeout(scheduleRender, 200);
