const GRAB_ART_KEY = "flashframe.grab-art.v1";
const GRAB_STATES = ["default", "hover", "faded", "expanded"];

const PACKAGED = Object.fromEntries(
  GRAB_STATES.map((state) => [state, chrome.runtime.getURL(`assets/grab/${state}.png`)])
);

function readCustomArt() {
  try {
    const raw = localStorage.getItem(GRAB_ART_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function customSource(art, state) {
  return typeof art?.[state] === "string" && art[state] ? art[state] : "";
}

function normalizedState(state) {
  return GRAB_STATES.includes(state) ? state : "default";
}

function candidatesForState(state) {
  const nextState = normalizedState(state);
  const art = readCustomArt();
  const candidates = [];
  const seen = new Set();

  const push = (source, kind, label) => {
    if (!source || seen.has(source)) return;
    seen.add(source);
    candidates.push({ source, kind, label });
  };

  push(customSource(art, nextState), "custom-exact", "Custom image");
  push(customSource(art, "default"), "custom-default", nextState === "default" ? "Custom image" : "Uses custom Default image");
  push(PACKAGED[nextState], "packaged-exact", "Packaged FrameChute default");
  push(PACKAGED.default, "packaged-default", nextState === "default" ? "Packaged FrameChute default" : "Uses packaged Default image");
  return candidates;
}

function showInlineFallback(image, fallback) {
  if (image) {
    image.hidden = true;
    image.removeAttribute("src");
    delete image.dataset.framechuteResolvedSource;
  }
  if (fallback) {
    fallback.hidden = false;
    fallback.style.display = "";
    fallback.style.visibility = "";
  }
}

function showResolvedImage(image, fallback, source, custom) {
  image.hidden = false;
  image.dataset.framechuteResolvedSource = source;
  if (fallback) {
    fallback.hidden = true;
    fallback.style.display = "none";
    fallback.style.visibility = "hidden";
  }
  const handle = image.closest(".grab-image-slot, .compact-drag-handle, #video-dock-grip");
  if (handle) handle.dataset.customGrab = custom ? "true" : "false";
}

function loadCandidates(image, fallback, candidates, index = 0) {
  if (!(image instanceof HTMLImageElement)) return;
  const candidate = candidates[index];
  if (!candidate) {
    showInlineFallback(image, fallback);
    return;
  }

  const succeed = () => {
    if (image.dataset.framechuteDesiredSource !== candidate.source) return;
    showResolvedImage(image, fallback, candidate.source, candidate.kind.startsWith("custom"));
  };
  const fail = () => {
    if (image.dataset.framechuteDesiredSource !== candidate.source) return;
    loadCandidates(image, fallback, candidates, index + 1);
  };

  image.onload = succeed;
  image.onerror = fail;
  image.dataset.framechuteDesiredSource = candidate.source;

  const current = image.getAttribute("src") || "";
  if (current !== candidate.source) {
    image.hidden = false;
    image.removeAttribute("src");
    image.src = candidate.source;
    return;
  }

  if (image.complete) {
    if (image.naturalWidth > 0) succeed();
    else fail();
  }
}

function applyHandle(handle) {
  if (!(handle instanceof HTMLElement)) return;
  const state = normalizedState(handle.dataset.grabState || (handle.closest("#video-dock") ? "default" : "expanded"));
  let image = handle.querySelector(":scope > .grab-art-image, :scope > .media-dock-grab-image");
  if (!(image instanceof HTMLImageElement)) {
    image = document.createElement("img");
    image.className = "grab-art-image";
    image.alt = "";
    image.draggable = false;
    handle.prepend(image);
  }
  const fallback = handle.querySelector(":scope > .grab-fallback-art");
  loadCandidates(image, fallback, candidatesForState(state));
}

function applyPreview(row) {
  if (!(row instanceof HTMLElement)) return;
  const state = normalizedState(row.dataset.grabStateSetting);
  const image = row.querySelector(".grab-state-preview img");
  if (!(image instanceof HTMLImageElement)) return;
  const fallback = row.querySelector(".grab-preview-fallback");
  const small = row.querySelector(".grab-state-copy small, small");
  const candidates = candidatesForState(state);
  const first = candidates[0];

  if (small) small.textContent = first?.label || "Built-in fallback";

  image.onload = () => {
    image.hidden = false;
    if (fallback) fallback.hidden = true;
  };
  image.onerror = () => {
    const failed = image.dataset.previewCandidate || "";
    const index = candidates.findIndex((candidate) => candidate.source === failed);
    const next = candidates[index + 1];
    if (next) {
      image.dataset.previewCandidate = next.source;
      image.src = next.source;
    } else {
      image.hidden = true;
      if (fallback) fallback.hidden = false;
    }
  };

  if (!first) {
    image.hidden = true;
    image.removeAttribute("src");
    if (fallback) fallback.hidden = false;
    return;
  }

  image.dataset.previewCandidate = first.source;
  if ((image.getAttribute("src") || "") !== first.source) {
    image.hidden = false;
    image.removeAttribute("src");
    image.src = first.source;
  } else if (image.complete && image.naturalWidth > 0) {
    image.hidden = false;
    if (fallback) fallback.hidden = true;
  }
}

function refreshAll() {
  for (const handle of document.querySelectorAll(".grab-image-slot, .compact-drag-handle, #video-dock-grip")) {
    applyHandle(handle);
  }
  for (const row of document.querySelectorAll("[data-grab-state-setting]")) applyPreview(row);
}

let refreshQueued = false;
function scheduleRefresh() {
  if (refreshQueued) return;
  refreshQueued = true;
  queueMicrotask(() => {
    refreshQueued = false;
    refreshAll();
  });
}

new MutationObserver(scheduleRefresh).observe(document.body, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ["data-grab-state", "src", "hidden"]
});

document.addEventListener("pointerenter", (event) => {
  if (event.target instanceof Element && event.target.closest(".grab-image-slot, .compact-drag-handle, #video-dock-grip")) {
    scheduleRefresh();
  }
}, true);

document.addEventListener("pointerleave", (event) => {
  if (event.target instanceof Element && event.target.closest(".grab-image-slot, .compact-drag-handle, #video-dock-grip")) {
    scheduleRefresh();
  }
}, true);

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (!target.closest(".grab-art-setting")) return;
  setTimeout(() => {
    refreshAll();
    if (target.closest(".grab-reset-all")) {
      const status = document.querySelector("#status");
      if (status) status.textContent = "Grab artwork reset to packaged FrameChute defaults.";
    }
  }, 0);
}, true);

window.addEventListener("focus", scheduleRefresh);
window.addEventListener("storage", (event) => {
  if (event.key === GRAB_ART_KEY) scheduleRefresh();
});

refreshAll();
queueMicrotask(refreshAll);
setTimeout(refreshAll, 200);
