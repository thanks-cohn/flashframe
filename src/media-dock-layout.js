const GRAB_ART_KEY = "flashframe.grab-art.v1";
const PACKAGED_DEFAULT_GRAB = chrome.runtime.getURL("assets/grab/default.png");

function readGrabArt() {
  try {
    const raw = localStorage.getItem(GRAB_ART_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function sourceForState(state) {
  const art = readGrabArt();
  const exact = typeof art[state] === "string" ? art[state] : "";
  const fallback = typeof art.default === "string" ? art.default : "";
  return exact || fallback || PACKAGED_DEFAULT_GRAB;
}

function ensureDockGrabParts(grip) {
  if (!(grip instanceof HTMLElement)) return null;

  grip.classList.add("grab-image-slot", "media-dock-grab");
  grip.dataset.grabState ||= "default";

  for (const node of [...grip.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) node.remove();
  }
  grip.querySelectorAll(".spinner-mark").forEach((node) => node.remove());

  let image = grip.querySelector(":scope > .media-dock-grab-image");
  if (!image) {
    const oldImages = [...grip.querySelectorAll(":scope > .grab-art-image")];
    image = oldImages.shift() || document.createElement("img");
    for (const extra of oldImages) extra.remove();
    image.classList.add("grab-art-image", "media-dock-grab-image");
    image.alt = "";
    if (!image.parentElement) grip.prepend(image);
  }

  const fallbacks = [...grip.querySelectorAll(":scope > .grab-fallback-art")];
  for (const extra of fallbacks.slice(1)) extra.remove();

  return { image, fallback: fallbacks[0] || null };
}

function renderDockGrab(state = null) {
  const grip = document.querySelector("#video-dock-grip");
  const parts = ensureDockGrabParts(grip);
  if (!parts) return;

  const nextState = state || grip.dataset.grabState || "default";
  grip.dataset.grabState = nextState;
  const source = sourceForState(nextState);
  grip.dataset.customGrab = source ? "true" : "false";

  parts.image.removeAttribute("src");
  if (source) {
    parts.image.hidden = false;
    /* Re-assigning after clearing forces Chromium to repaint replaced data URLs. */
    requestAnimationFrame(() => {
      parts.image.src = source;
    });
  } else {
    parts.image.hidden = true;
  }

  if (parts.fallback) {
    parts.fallback.hidden = Boolean(source);
    parts.fallback.style.display = source ? "none" : "";
    parts.fallback.style.visibility = source ? "hidden" : "";
  }
}

function makeZone(className) {
  const zone = document.createElement("div");
  zone.className = `media-dock-zone ${className}`;
  return zone;
}

function structureMediaDock() {
  const dock = document.querySelector("#video-dock");
  const head = dock?.querySelector(".player-head");
  if (!dock || !head || head.dataset.spatialLayout === "true") {
    renderDockGrab();
    return;
  }

  const grip = dock.querySelector("#video-dock-grip");
  const middle = head.querySelector(".player-middle");
  const scope = dock.querySelector("#media-scope");
  const rewind = dock.querySelector("#video-rewind-all");
  const play = dock.querySelector("#video-play-all");
  const forward = dock.querySelector("#video-forward-all");
  const expand = dock.querySelector("#video-expand");

  if (!grip || !scope || !rewind || !play || !forward || !expand) return;

  let title = dock.querySelector(".media-dock-title");
  if (!title) {
    title = document.createElement("strong");
    title.className = "media-dock-title";
    title.textContent = "Media";
  }

  const dragZone = makeZone("media-dock-drag-zone");
  const identityZone = makeZone("media-dock-identity");
  const scopeZone = makeZone("media-dock-scope");
  const transportZone = makeZone("media-dock-transport");
  const windowZone = makeZone("media-dock-window-zone");

  dragZone.append(grip);
  identityZone.append(title);
  scopeZone.append(scope);
  transportZone.append(rewind, play, forward);
  windowZone.append(expand);

  middle?.remove();
  head.replaceChildren(dragZone, identityZone, scopeZone, transportZone, windowZone);
  head.classList.add("media-spatial-head");
  head.dataset.spatialLayout = "true";

  renderDockGrab("default");

  if (grip.dataset.mediaGrabStateBound !== "true") {
    grip.dataset.mediaGrabStateBound = "true";
    grip.addEventListener("pointerenter", () => renderDockGrab("hover"));
    grip.addEventListener("pointerleave", () => renderDockGrab("default"));
    grip.addEventListener("focus", () => renderDockGrab("hover"));
    grip.addEventListener("blur", () => renderDockGrab("default"));
  }
}

function watchGrabSettings() {
  const settings = document.querySelector("#settings-dock");
  if (!settings || settings.dataset.mediaGrabWatch === "true") return;
  settings.dataset.mediaGrabWatch = "true";

  new MutationObserver((mutations) => {
    const changedGrabPreview = mutations.some((mutation) => {
      const target = mutation.target;
      return target instanceof Element && Boolean(target.closest(".grab-art-setting"));
    });
    if (changedGrabPreview) renderDockGrab();
  }).observe(settings, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["src", "hidden", "disabled"]
  });
}

structureMediaDock();
watchGrabSettings();
queueMicrotask(() => {
  structureMediaDock();
  renderDockGrab();
});
setTimeout(() => {
  structureMediaDock();
  renderDockGrab();
}, 180);

window.addEventListener("focus", () => renderDockGrab());
window.addEventListener("storage", (event) => {
  if (event.key === GRAB_ART_KEY) renderDockGrab();
});
