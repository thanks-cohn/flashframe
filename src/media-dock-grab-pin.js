const GRAB_ART_KEY = "flashframe.grab-art.v1";
const PACKAGED_DEFAULT = chrome.runtime.getURL("assets/grab/default.png");

function customDefault() {
  try {
    const raw = localStorage.getItem(GRAB_ART_KEY);
    if (!raw) return "";
    const art = JSON.parse(raw);
    return typeof art?.default === "string" ? art.default : "";
  } catch {
    return "";
  }
}

function pinMediaGrab() {
  const grip = document.querySelector("#video-dock-grip");
  if (!(grip instanceof HTMLElement)) return;

  grip.classList.add("grab-image-slot", "media-dock-grab");
  grip.dataset.grabState = "default";
  grip.dataset.customGrab = "true";
  grip.querySelectorAll(".spinner-mark").forEach((node) => node.remove());

  let image = grip.querySelector(":scope > .media-dock-grab-image, :scope > .grab-art-image");
  if (!(image instanceof HTMLImageElement)) {
    image = document.createElement("img");
    grip.prepend(image);
  }

  image.classList.add("grab-art-image", "media-dock-grab-image");
  image.alt = "";
  image.draggable = false;
  image.decoding = "async";

  const source = customDefault() || PACKAGED_DEFAULT;
  if ((image.getAttribute("src") || "") !== source) image.src = source;
  if (image.hidden) image.hidden = false;
  if (image.style.display !== "block") image.style.display = "block";
  if (image.style.visibility !== "visible") image.style.visibility = "visible";

  for (const fallback of grip.querySelectorAll(":scope > .grab-fallback-art")) {
    if (!fallback.hasAttribute("hidden")) fallback.setAttribute("hidden", "");
    if (fallback.style.display !== "none") fallback.style.display = "none";
    if (fallback.style.visibility !== "hidden") fallback.style.visibility = "hidden";
  }
}

let frame = 0;
function schedulePin() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    pinMediaGrab();
  });
}

// Older media polish only re-renders the dock Grab when body-level UI state
// changes. Watch that exact trigger instead of every class mutation in the
// entire document. This keeps the final packaged Default authority while
// avoiding needless whole-page observer churn on low-memory machines.
new MutationObserver(schedulePin).observe(document.body, {
  attributes: true,
  attributeFilter: ["class"]
});

const dock = document.querySelector("#video-dock");
if (dock) {
  new MutationObserver(schedulePin).observe(dock, {
    childList: true,
    subtree: true
  });
}

for (const eventName of ["click", "change"]) {
  document.addEventListener(eventName, (event) => {
    if (event.target instanceof Element && event.target.closest(".grab-art-setting")) {
      queueMicrotask(schedulePin);
    }
  }, true);
}

window.addEventListener("focus", schedulePin);
window.addEventListener("storage", (event) => {
  if (event.key === GRAB_ART_KEY) schedulePin();
});

pinMediaGrab();
queueMicrotask(schedulePin);
setTimeout(schedulePin, 250);
