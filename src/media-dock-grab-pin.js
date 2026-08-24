const PACKAGED_DEFAULT = chrome.runtime.getURL("assets/grab/default.png");

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

  // The unified Media player intentionally uses one boring, reliable image:
  // FrameChute's packaged Default Grab artwork. It does not inherit a custom
  // Grab setting and it must never fall back to an empty src.
  if ((image.getAttribute("src") || "") !== PACKAGED_DEFAULT) image.src = PACKAGED_DEFAULT;
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

// Legacy Grab code can refresh after blocks are added/removed and rewrite this
// same <img> back to an empty source. Watch only the tiny Media dock for those
// exact mutations and immediately restore the packaged Default. This avoids the
// old whole-document observer churn while making the Media image authoritative.
const dock = document.querySelector("#video-dock");
if (dock) {
  new MutationObserver(schedulePin).observe(dock, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "hidden", "style", "data-grab-state"]
  });
}

// Body classes are another legacy refresh trigger (toolbar/header/fade modes).
new MutationObserver(schedulePin).observe(document.body, {
  attributes: true,
  attributeFilter: ["class"]
});

window.addEventListener("focus", schedulePin);

pinMediaGrab();
queueMicrotask(schedulePin);
setTimeout(schedulePin, 250);
