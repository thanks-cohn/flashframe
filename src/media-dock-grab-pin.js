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

  const source = customDefault() || PACKAGED_DEFAULT;
  if ((image.getAttribute("src") || "") !== source) image.src = source;
  image.hidden = false;
  image.style.display = "block";
  image.style.visibility = "visible";

  for (const fallback of grip.querySelectorAll(":scope > .grab-fallback-art")) {
    fallback.setAttribute("hidden", "");
    fallback.style.display = "none";
    fallback.style.visibility = "hidden";
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

// Older polish code still reacts to class changes and can blank the dock image.
// This module loads last and is the final authority for the media-player grip.
new MutationObserver(schedulePin).observe(document.body, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ["class"]
});

window.addEventListener("focus", schedulePin);
window.addEventListener("storage", (event) => {
  if (event.key === GRAB_ART_KEY) schedulePin();
});

pinMediaGrab();
queueMicrotask(schedulePin);
setTimeout(schedulePin, 250);
