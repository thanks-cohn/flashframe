const TEXT_MODE_KEY = "framechute.toolbar-show-text.v1";
const textMode = document.querySelector("#setting-toolbar-text");
const slots = [...document.querySelectorAll(".toolbar-slot")];
const slotEntries = slots.map((slot) => ({
  slot,
  toggle: slot.querySelector(":scope > [aria-controls]"),
  panel: slot.querySelector(":scope > .toolbar-slot-panel")
})).filter(({ toggle, panel }) => toggle && panel);

for (const { panel } of slotEntries) document.body.append(panel);

const toolbarStateStyle = document.createElement("style");
toolbarStateStyle.textContent = `
  #toolbar-saved-toggle.toolbar-dropdown-command {
    padding-right: 7px;
  }

  #toolbar-saved-toggle .toolbar-dropdown-chevron {
    flex: 0 0 auto;
    margin-left: 1px;
    font-size: 10px;
    line-height: 1;
    opacity: .58;
    transition: transform 120ms ease, opacity 120ms ease;
  }

  #toolbar-saved-toggle[aria-expanded="true"] .toolbar-dropdown-chevron {
    transform: rotate(180deg);
    opacity: .9;
  }

  .frame-sequence-top-controls > .frame-sequence-loop-top {
    box-sizing: border-box;
    flex: 0 0 auto;
    height: 34px;
    min-height: 34px;
    min-width: 54px;
    padding: 0 9px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 850;
    line-height: 1;
    letter-spacing: .075em;
    white-space: nowrap;
    transition: color 120ms ease, background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
  }

  .frame-sequence-top-controls > .frame-sequence-loop-top.is-loop-on {
    color: #eafff0;
    background: #176b3a;
    border-color: #2c9a58;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .06), 0 2px 8px rgba(23, 107, 58, .22);
  }

  .frame-sequence-top-controls > .frame-sequence-loop-top.is-loop-off {
    color: #ffdede;
    background: #6a2d2d;
    border-color: #8b4444;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .035);
  }

  .frame-sequence-top-controls > .frame-sequence-loop-top.is-loop-off .frame-sequence-loop-word {
    text-decoration-line: line-through;
    text-decoration-thickness: 2px;
    text-decoration-color: currentColor;
  }

  .frame-sequence-top-controls > .frame-sequence-loop-top:hover {
    filter: brightness(1.08);
  }

  .frame-sequence-top-controls > .frame-sequence-loop-top:active {
    transform: translateY(1px);
  }

  .frame-sequence-top-controls > .frame-sequence-loop-top:focus-visible {
    outline: 2px solid color-mix(in srgb, CanvasText 42%, transparent);
    outline-offset: 2px;
  }
`;
document.head.append(toolbarStateStyle);

const savedToggle = document.querySelector("#toolbar-saved-toggle");
if (savedToggle) {
  savedToggle.classList.add("toolbar-dropdown-command");
  savedToggle.setAttribute("aria-haspopup", "dialog");
  savedToggle.title = "Choose a saved FrameChute";
  if (!savedToggle.querySelector(".toolbar-dropdown-chevron")) {
    const chevron = document.createElement("span");
    chevron.className = "toolbar-dropdown-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "▼";
    savedToggle.append(chevron);
  }
}

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

let loopButton = null;
let loopCheckbox = null;

function syncLoopButton() {
  if (!loopButton || !loopCheckbox) return;
  const enabled = Boolean(loopCheckbox.checked);
  loopButton.classList.toggle("is-loop-on", enabled);
  loopButton.classList.toggle("is-loop-off", !enabled);
  loopButton.setAttribute("aria-pressed", String(enabled));
  loopButton.title = enabled ? "Loop is ON — repeat the frame sequence forever" : "Loop is OFF — play the frame sequence once";
  loopButton.setAttribute("aria-label", loopButton.title);
}

function installLoopButton() {
  const controls = document.querySelector(".frame-sequence-top-controls");
  const checkbox = document.querySelector('.frame-sequence-panel [data-config="loop"]');
  if (!controls || !checkbox) return false;

  loopCheckbox = checkbox;
  loopButton = controls.querySelector(".frame-sequence-loop-top");

  if (!loopButton) {
    loopButton = document.createElement("button");
    loopButton.type = "button";
    loopButton.className = "frame-sequence-loop-top";
    loopButton.innerHTML = '<span class="frame-sequence-loop-word">LOOP</span>';
    const forward = controls.querySelector('[data-action="forward"], .is-forward');
    if (forward) forward.insertAdjacentElement("afterend", loopButton);
    else controls.append(loopButton);

    loopButton.addEventListener("click", () => {
      loopCheckbox.checked = !loopCheckbox.checked;
      loopCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
      syncLoopButton();
    });
  }

  if (loopCheckbox.dataset.toolbarLoopBound !== "true") {
    loopCheckbox.dataset.toolbarLoopBound = "true";
    loopCheckbox.addEventListener("change", syncLoopButton);
  }

  syncLoopButton();
  return true;
}

const loopInstaller = new MutationObserver(() => {
  if (installLoopButton()) loopInstaller.disconnect();
});

if (!installLoopButton()) loopInstaller.observe(document.body, { childList: true, subtree: true });

window.addEventListener("flashframe:restore-appearance", () => {
  requestAnimationFrame(() => {
    installLoopButton();
    syncLoopButton();
  });
});

document.addEventListener("click", () => closeSlots());
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSlots();
});
window.addEventListener("resize", repositionOpenSlots);
window.addEventListener("scroll", repositionOpenSlots, true);

textMode?.addEventListener("change", () => applyTextMode(textMode.checked));
applyTextMode(readTextMode());
