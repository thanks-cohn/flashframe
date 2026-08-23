const workspace = document.querySelector("#workspace");

function blocksByLayer() {
  return [...workspace.querySelectorAll(".block")].sort((a, b) => {
    const az = Number.parseInt(a.style.zIndex, 10) || 0;
    const bz = Number.parseInt(b.style.zIndex, 10) || 0;
    return az - bz;
  });
}

function applyLayerOrder(blocks) {
  blocks.forEach((block, index) => {
    block.style.zIndex = String(index + 1);
  });
  workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
}

function bringToFront(block) {
  const ordered = blocksByLayer().filter((candidate) => candidate !== block);
  ordered.push(block);
  applyLayerOrder(ordered);
}

function sendToBack(block) {
  const ordered = blocksByLayer().filter((candidate) => candidate !== block);
  ordered.unshift(block);
  applyLayerOrder(ordered);
}

const menu = document.createElement("div");
menu.className = "flashframe-layer-menu";
menu.hidden = true;
menu.setAttribute("role", "menu");
menu.innerHTML = `
  <button type="button" data-layer-action="front" role="menuitem">Bring to front</button>
  <button type="button" data-layer-action="back" role="menuitem">Send to back</button>
`;
document.body.append(menu);

const style = document.createElement("style");
style.textContent = `
  .flashframe-layer-menu {
    position: fixed;
    z-index: 2147483647;
    min-width: 158px;
    padding: 6px;
    border: 1px solid rgba(255,255,255,.16);
    border-radius: 10px;
    background: rgba(20,22,24,.97);
    color: #fff;
    box-shadow: 0 14px 34px rgba(0,0,0,.38);
    backdrop-filter: blur(10px);
  }
  .flashframe-layer-menu[hidden] { display: none; }
  .flashframe-layer-menu button {
    display: block;
    width: 100%;
    padding: 8px 10px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: #fff;
    text-align: left;
    cursor: pointer;
    font: inherit;
  }
  .flashframe-layer-menu button:hover,
  .flashframe-layer-menu button:focus-visible {
    background: rgba(255,255,255,.10);
    outline: none;
  }
`;
document.head.append(style);

let targetBlock = null;

function hideMenu() {
  menu.hidden = true;
  targetBlock = null;
}

function showMenu(block, x, y) {
  targetBlock = block;
  menu.hidden = false;

  const margin = 8;
  const rect = menu.getBoundingClientRect();
  const left = Math.min(Math.max(margin, x), Math.max(margin, window.innerWidth - rect.width - margin));
  const top = Math.min(Math.max(margin, y), Math.max(margin, window.innerHeight - rect.height - margin));
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;

  menu.querySelector("button")?.focus({ preventScroll: true });
}

// Existing blocks normally rise on pointerdown. Suppress that behavior for
// right-click so opening the layer menu does not silently change the stack.
workspace.addEventListener("pointerdown", (event) => {
  if (event.button !== 2) return;
  if (!event.target.closest(".block")) return;
  event.stopPropagation();
}, true);

workspace.addEventListener("contextmenu", (event) => {
  const block = event.target.closest(".block");
  if (!block) {
    hideMenu();
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  showMenu(block, event.clientX, event.clientY);
});

menu.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-layer-action]");
  if (!button || !targetBlock) return;

  if (button.dataset.layerAction === "front") bringToFront(targetBlock);
  if (button.dataset.layerAction === "back") sendToBack(targetBlock);
  hideMenu();
});

menu.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    hideMenu();
  }
});

document.addEventListener("pointerdown", (event) => {
  if (!menu.hidden && !menu.contains(event.target)) hideMenu();
}, true);

window.addEventListener("blur", hideMenu);
window.addEventListener("resize", hideMenu);
window.addEventListener("scroll", hideMenu, true);
