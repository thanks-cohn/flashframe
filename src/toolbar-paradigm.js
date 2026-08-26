const TEXT_MODE_KEY = "framechute.toolbar-show-text.v1";
const textMode = document.querySelector("#setting-toolbar-text");
const slots = [...document.querySelectorAll(".toolbar-slot")];

function readTextMode() {
  try {
    const saved = localStorage.getItem(TEXT_MODE_KEY);
    return saved == null ? true : saved === "true";
  } catch {
    return true;
  }
}

function applyTextMode(show) {
  document.body.classList.toggle("toolbar-show-text", show);
  if (textMode) textMode.checked = show;
  try { localStorage.setItem(TEXT_MODE_KEY, String(show)); } catch { /* Keep the current-session choice. */ }
}

function closeSlots(except = null) {
  for (const slot of slots) {
    if (slot === except) continue;
    const toggle = slot.querySelector(":scope > [aria-controls]");
    const panel = slot.querySelector(":scope > .toolbar-slot-panel");
    if (!toggle || !panel) continue;
    toggle.setAttribute("aria-expanded", "false");
    panel.hidden = true;
  }
}

for (const slot of slots) {
  const toggle = slot.querySelector(":scope > [aria-controls]");
  const panel = slot.querySelector(":scope > .toolbar-slot-panel");
  if (!toggle || !panel) continue;
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const opening = panel.hidden;
    closeSlots(opening ? slot : null);
    panel.hidden = !opening;
    toggle.setAttribute("aria-expanded", String(opening));
  });
  panel.addEventListener("click", (event) => {
    event.stopPropagation();
    if (event.target.closest("button")) setTimeout(() => closeSlots(), 0);
  });
}

document.addEventListener("click", () => closeSlots());
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSlots();
});

textMode?.addEventListener("change", () => applyTextMode(textMode.checked));
applyTextMode(readTextMode());
