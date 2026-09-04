const workspace = document.querySelector("#workspace");
const status = document.querySelector("#status");
const bar = document.querySelector(".quick-actions");
const actions = window.FrameChuteActions;

if (!workspace || !bar || !actions?.selection) {
  console.warn("FrameChute Quick Actions visibility controls could not initialize.");
} else {
  const selection = actions.selection;
  const HIDDEN_KEY = "quickActionsHidden";

  const style = document.createElement("style");
  style.textContent = `
    .quick-actions-close {
      width: 28px;
      min-width: 28px;
      height: 28px;
      min-height: 28px;
      padding: 0 !important;
      border-radius: 999px !important;
      background: transparent !important;
      color: #dce6f4;
      font-size: 18px;
      line-height: 1;
      opacity: .72;
    }
    .quick-actions-close:hover { opacity: 1; background: #ffffff18 !important; }
    .framechute-object-context-menu {
      position: fixed;
      z-index: 2147483647;
      min-width: 190px;
      padding: 5px;
      border: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
      border-radius: 10px;
      background: Canvas;
      color: CanvasText;
      box-shadow: 0 12px 34px #0005;
      font: 13px system-ui, sans-serif;
    }
    .framechute-object-context-menu[hidden] { display: none; }
    .framechute-object-context-menu button {
      width: 100%;
      min-height: 34px;
      padding: 6px 10px;
      border: 0;
      border-radius: 7px;
      background: transparent;
      color: inherit;
      text-align: left;
      cursor: pointer;
    }
    .framechute-object-context-menu button:hover,
    .framechute-object-context-menu button:focus-visible {
      background: color-mix(in srgb, CanvasText 8%, Canvas);
      outline: none;
    }
  `;
  document.head.append(style);

  function isImageBlock(block) {
    return block instanceof HTMLElement && (block.dataset.customKind === "image" || Boolean(block.querySelector(".image-frame")));
  }

  function isHiddenFor(block) {
    return isImageBlock(block) && block.dataset[HIDDEN_KEY] === "true";
  }

  function setHiddenFor(block, hidden) {
    if (!isImageBlock(block)) return;
    if (hidden) block.dataset[HIDDEN_KEY] = "true";
    else delete block.dataset[HIDDEN_KEY];
  }

  function selectedImagesOnly() {
    const items = selection.items;
    return items.length > 0 && items.every(isImageBlock) ? items : [];
  }

  function shouldHideBar() {
    const items = selection.items;
    if (!items.length) return true;
    return items.every(isImageBlock) && items.every(isHiddenFor);
  }

  function applyBarVisibility() {
    const desiredHidden = shouldHideBar();
    if (bar.hidden !== desiredHidden) bar.hidden = desiredHidden;
    const close = bar.querySelector(".quick-actions-close");
    if (close) close.hidden = selectedImagesOnly().length === 0;
  }

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "quick-actions-close";
  closeButton.textContent = "×";
  closeButton.title = "Hide Quick Actions for this image";
  closeButton.setAttribute("aria-label", "Hide Quick Actions for selected image");
  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const images = selectedImagesOnly();
    if (!images.length) return;
    images.forEach((block) => setHiddenFor(block, true));
    applyBarVisibility();
    if (status) status.textContent = images.length === 1
      ? "Quick Actions hidden for this image. Right-click it to show them again."
      : `Quick Actions hidden for ${images.length} selected images. Right-click an image to show them again.`;
  });
  bar.insertBefore(closeButton, bar.querySelector("progress"));

  const menu = document.createElement("div");
  menu.className = "framechute-object-context-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.setAttribute("role", "menuitem");
  menu.append(toggleButton);
  document.body.append(menu);

  let menuBlock = null;

  function closeMenu() {
    menu.hidden = true;
    menuBlock = null;
  }

  function positionMenu(clientX, clientY) {
    menu.style.left = `${clientX}px`;
    menu.style.top = `${clientY}px`;
    menu.hidden = false;
    const rect = menu.getBoundingClientRect();
    const left = Math.max(6, Math.min(clientX, window.innerWidth - rect.width - 6));
    const top = Math.max(6, Math.min(clientY, window.innerHeight - rect.height - 6));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  workspace.addEventListener("contextmenu", (event) => {
    const block = event.target.closest(".block");
    if (!isImageBlock(block)) {
      closeMenu();
      return;
    }
    event.preventDefault();
    menuBlock = block;
    const hidden = isHiddenFor(block);
    toggleButton.textContent = hidden ? "Show Quick Actions" : "Hide Quick Actions";
    toggleButton.dataset.mode = hidden ? "show" : "hide";
    positionMenu(event.clientX, event.clientY);
  });

  toggleButton.addEventListener("click", () => {
    if (!menuBlock) return;
    const show = toggleButton.dataset.mode === "show";
    setHiddenFor(menuBlock, !show);
    selection.replace(menuBlock);
    applyBarVisibility();
    if (status) status.textContent = show
      ? "Quick Actions shown for this image."
      : "Quick Actions hidden for this image. Right-click it to show them again.";
    closeMenu();
  });

  document.addEventListener("pointerdown", (event) => {
    if (!menu.hidden && !menu.contains(event.target)) closeMenu();
  });
  window.addEventListener("blur", closeMenu);
  window.addEventListener("resize", closeMenu);
  window.addEventListener("scroll", closeMenu, true);
  window.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });

  selection.addEventListener("change", applyBarVisibility);

  const barObserver = new MutationObserver(() => applyBarVisibility());
  barObserver.observe(bar, { attributes: true, attributeFilter: ["hidden"] });

  window.addEventListener("framechute:block-captured", (event) => {
    const { block, record } = event.detail;
    if (!isImageBlock(block) || !isHiddenFor(block)) return;
    record.state.quickActionsHidden = true;
    if (typeof record.state.text === "string" && record.state.text.startsWith("__FLASHFRAME_CUSTOM_BLOCK_V1__")) {
      const marker = "__FLASHFRAME_CUSTOM_BLOCK_V1__";
      const payload = JSON.parse(record.state.text.slice(marker.length));
      payload.quickActionsHidden = true;
      record.state.text = marker + JSON.stringify(payload);
    }
  });

  function restoreVisibility(block, hidden) {
    if (!isImageBlock(block)) return;
    setHiddenFor(block, hidden === true);
    applyBarVisibility();
  }

  window.addEventListener("framechute:block-restored", (event) => {
    restoreVisibility(event.detail.block, event.detail.record.state?.quickActionsHidden);
  });
  window.addEventListener("framechute:custom-block-ready", (event) => {
    restoreVisibility(event.detail.block, event.detail.payload?.quickActionsHidden);
  });

  applyBarVisibility();
}
