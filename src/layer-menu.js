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

function closeBlock(block) {
  if (!block) return;
  const remove = block.querySelector(".remove-block");
  if (remove instanceof HTMLElement) {
    remove.click();
    return;
  }
  block.remove();
  workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
}

function makeMenusVisible() {
  window.dispatchEvent(new CustomEvent("flashframe:reveal-menus"));
}

const menu = document.createElement("div");
menu.className = "flashframe-layer-menu";
menu.hidden = true;
menu.setAttribute("role", "menu");
menu.innerHTML = `
  <button type="button" data-layer-action="front" role="menuitem">Bring to front</button>
  <button type="button" data-layer-action="back" role="menuitem">Send to back</button>
  <div class="flashframe-layer-menu-separator" role="separator"></div>
  <button type="button" data-layer-action="sync" role="menuitem">Sync with…</button>
  <button type="button" data-layer-action="independent" role="menuitem">Make independent</button>
  <div class="flashframe-layer-menu-separator" role="separator"></div>
  <button type="button" data-layer-action="show-toolbar" role="menuitem">Show top bar</button>
  <button type="button" data-layer-action="show-settings" role="menuitem">Show Settings</button>
  <button type="button" data-layer-action="show-media-player" role="menuitem">Show media player</button>
  <button type="button" data-layer-action="reveal-menus" role="menuitem">Make menus visible</button>
  <div class="flashframe-layer-menu-separator" role="separator"></div>
  <button type="button" data-layer-action="object-header" role="menuitem">Hide object header</button>
  <button type="button" data-layer-action="object-footer" role="menuitem">Hide object footer</button>
  <button type="button" data-layer-action="frameless" role="menuitem">Show image only</button>
  <div class="flashframe-layer-menu-separator frameless-separator" role="separator"></div>
  <button type="button" data-layer-action="close" class="flashframe-layer-menu-close" role="menuitem">Close frame</button>
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
  .flashframe-layer-menu .flashframe-layer-menu-close {
    color: #ffb1a2;
  }
  .flashframe-layer-menu-separator {
    height: 1px;
    margin: 5px 4px;
    background: rgba(255,255,255,.14);
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
  const timed = Boolean(block) && (block.dataset.timedMedia === "true" || Boolean(block.querySelector("video, audio")));
  menu.querySelector('[data-layer-action="front"]').hidden = !block;
  menu.querySelector('[data-layer-action="back"]').hidden = !block;
  menu.querySelector('[data-layer-action="sync"]').hidden = !timed;
  menu.querySelector('[data-layer-action="independent"]').hidden = !timed;
  const isImage = block?.dataset.customKind === "image";
  const isVideo = Boolean(block?.querySelector(":scope > video"))
    || block?.dataset.blockType === "video"
    || block?.dataset.customKind === "remote-video";
  const isVisualMedia = isImage || isVideo;
  const isGallery = block?.dataset.blockType === "gallery" || block?.classList.contains("gallery-block");
  const framelessButton = menu.querySelector('[data-layer-action="frameless"]');
  const objectHeaderButton = menu.querySelector('[data-layer-action="object-header"]');
  const objectFooterButton = menu.querySelector('[data-layer-action="object-footer"]');
  const frameless = Boolean(block?.classList.contains("is-frameless-media"));
  const headerHidden = Boolean(block?.classList.contains("hide-object-header"))
    || (frameless && !block?.classList.contains("show-object-header"));
  const footerHidden = Boolean(block?.classList.contains("hide-object-footer"))
    || (frameless && !block?.classList.contains("show-object-footer"));
  objectHeaderButton.hidden = !isVisualMedia;
  objectFooterButton.hidden = !(isVisualMedia || isGallery);
  objectHeaderButton.textContent = headerHidden
    ? (frameless ? "Show header" : "Restore object header")
    : "Hide object header";
  objectFooterButton.textContent = footerHidden
    ? (frameless ? "Show footer" : "Restore object footer")
    : "Hide object footer";
  framelessButton.hidden = !isVisualMedia;
  framelessButton.textContent = block.classList.contains("is-frameless-media")
    ? `Restore ${isVideo ? "video" : "image"} frame`
    : `Show ${isVideo ? "video" : "image"} only`;
  menu.querySelector(".frameless-separator").hidden = !isVisualMedia;
  const closeButton = menu.querySelector('[data-layer-action="close"]');
  closeButton.hidden = !block;
  closeButton.textContent = isVisualMedia ? "Close object" : "Close frame";

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
  event.preventDefault();
  event.stopPropagation();
  showMenu(block, event.clientX, event.clientY);
});

menu.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-layer-action]");
  if (!button) return;

  if (button.dataset.layerAction === "reveal-menus") {
    makeMenusVisible();
    hideMenu();
    return;
  }
  if (button.dataset.layerAction === "show-toolbar") {
    window.dispatchEvent(new CustomEvent("flashframe:show-toolbar"));
    hideMenu();
    return;
  }
  if (button.dataset.layerAction === "show-settings") {
    window.dispatchEvent(new CustomEvent("flashframe:show-settings"));
    hideMenu();
    return;
  }
  if (button.dataset.layerAction === "show-media-player") {
    window.dispatchEvent(new CustomEvent("flashframe:show-media-player"));
    hideMenu();
    return;
  }
  if (button.dataset.layerAction === "sync" || button.dataset.layerAction === "independent") {
    window.dispatchEvent(new CustomEvent("flashframe:media-link-request", {
      detail: { block: targetBlock, independent: button.dataset.layerAction === "independent" }
    }));
    hideMenu();
    return;
  }
  if (button.dataset.layerAction === "close") {
    const block = targetBlock;
    hideMenu();
    closeBlock(block);
    return;
  }
  if (button.dataset.layerAction === "frameless") {
    const block = targetBlock;
    hideMenu();
    if (block) {
      window.dispatchEvent(new CustomEvent("flashframe:set-frameless", {
        detail: { block, frameless: !block.classList.contains("is-frameless-media") }
      }));
    }
    return;
  }
  if (button.dataset.layerAction === "object-header" || button.dataset.layerAction === "object-footer") {
    const block = targetBlock;
    const part = button.dataset.layerAction === "object-header" ? "header" : "footer";
    const hidden = block && (block.classList.contains(`hide-object-${part}`)
      || (block.classList.contains("is-frameless-media") && !block.classList.contains(`show-object-${part}`)));
    hideMenu();
    if (block) {
      window.dispatchEvent(new CustomEvent("flashframe:set-object-chrome", {
        detail: { block, part, hidden: !hidden }
      }));
    }
    return;
  }

  if (!targetBlock) return;
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
