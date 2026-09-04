import { objectMenuItems } from "./object-menu-model.mjs";
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
  menu.className = "framechute-object-context-menu"; menu.hidden = true; menu.setAttribute("role", "menu");
  document.body.append(menu); let menuBlock = null;

  function closeMenu() { menu.hidden = true; menuBlock = null; }
  function positionMenu(clientX, clientY) { menu.style.left=`${clientX}px`;menu.style.top=`${clientY}px`;menu.hidden=false;const rect=menu.getBoundingClientRect();menu.style.left=`${Math.max(6,Math.min(clientX,innerWidth-rect.width-6))}px`;menu.style.top=`${Math.max(6,Math.min(clientY,innerHeight-rect.height-6))}px`;menu.querySelector("button")?.focus(); }
  async function runMenuAction(id) {
    const block=menuBlock; if(!block)return;
    if(id==="quick-actions"){const show=isHiddenFor(block);setHiddenFor(block,!show);selection.replace(block);applyBarVisibility();if(status)status.textContent=`Quick Actions ${show?"shown":"hidden"} for this ${block.dataset.canvasObject==="true"?"canvas":"image"}.`;}
    if(id==="edit")await actions.registry.run("image.paint",{selection:[block]});
    if(id==="duplicate")await actions.registry.run("object.duplicate",{selection:[block]});
    if(id==="save-as")await actions.registry.run("image.save-as",{selection:[block]});
    if(id==="remove")block.querySelector(":scope > .block-header .remove-block")?.click();
    closeMenu();
  }
  function openMenu(block,clientX,clientY){if(!isImageBlock(block))return;menuBlock=block;menu.replaceChildren();for(const item of objectMenuItems({quickActionsHidden:isHiddenFor(block)})){if(item.separator){const rule=document.createElement("hr");rule.setAttribute("role","separator");menu.append(rule);continue;}const control=document.createElement("button");control.type="button";control.setAttribute("role","menuitem");control.textContent=item.label;if(item.danger)control.className="danger";control.onclick=()=>void runMenuAction(item.id);menu.append(control);}positionMenu(clientX,clientY);}
  window.addEventListener("framechute:open-object-menu",event=>openMenu(event.detail?.block,event.detail?.clientX||0,event.detail?.clientY||0));
  workspace.addEventListener("contextmenu", event => { const block=event.target.closest(".block");if(!isImageBlock(block)){closeMenu();return;}event.preventDefault();if(!selection.has(block))selection.replace(block);openMenu(block,event.clientX,event.clientY); });

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
