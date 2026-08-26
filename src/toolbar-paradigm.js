const TEXT_MODE_KEY = "framechute.toolbar-show-text.v1";
const textMode = document.querySelector("#setting-toolbar-text");
const slots = [...document.querySelectorAll(".toolbar-slot")];
const slotEntries = slots.map((slot) => ({
  slot,
  toggle: slot.querySelector(":scope > [aria-controls]"),
  panel: slot.querySelector(":scope > .toolbar-slot-panel")
})).filter(({ toggle, panel }) => toggle && panel);

for (const { panel } of slotEntries) document.body.append(panel);

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
  for (const entry of slotEntries) {
    if (entry === except) continue;
    const { toggle, panel } = entry;
    toggle.setAttribute("aria-expanded", "false");
    panel.hidden = true;
  }
}

function positionPanel({ toggle, panel }) {
  const rect = toggle.getBoundingClientRect();
  const margin = 8;
  const left = Math.min(window.innerWidth - panel.offsetWidth - margin, Math.max(margin, rect.left));
  panel.style.left = `${left}px`;
  const top = Math.min(window.innerHeight - panel.offsetHeight - margin, rect.bottom + 8);
  panel.style.top = `${Math.max(margin, top)}px`;
}

for (const entry of slotEntries) {
  const { toggle, panel } = entry;
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const opening = panel.hidden;
    closeSlots(opening ? entry : null);
    panel.hidden = !opening;
    toggle.setAttribute("aria-expanded", String(opening));
    if (opening) positionPanel(entry);
  });
  panel.addEventListener("click", (event) => {
    event.stopPropagation();
    if (event.target.closest("button")) setTimeout(() => closeSlots(), 0);
  });
}

function repositionOpenSlots() {
  for (const entry of slotEntries) if (!entry.panel.hidden) positionPanel(entry);
}

document.addEventListener("click", () => closeSlots());
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSlots();
});
window.addEventListener("resize", repositionOpenSlots);
window.addEventListener("scroll", repositionOpenSlots, true);

textMode?.addEventListener("change", () => applyTextMode(textMode.checked));
applyTextMode(readTextMode());
