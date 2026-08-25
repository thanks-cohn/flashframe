const workspace = document.querySelector("#workspace");
const status = document.querySelector("#status");

const MAX_CONTENT_WIDTH = 1200;
const MAX_CONTENT_HEIGHT = 700;

let activeImageBlock = null;

function setStatus(message) {
  if (status) status.textContent = message;
}

function ensureButton() {
  let button = document.querySelector("#fit-to-size");
  if (button) return button;

  button = document.createElement("button");
  button.id = "fit-to-size";
  button.type = "button";
  button.textContent = "Fit to Size";
  button.title = "Fit the selected image or gallery image inside a 1200 × 700 view while preserving its aspect ratio";
  button.setAttribute("aria-label", "Fit selected image to size");

  const openUrl = document.querySelector("#open-url");
  const addActions = openUrl?.closest(".toolbar-actions") || document.querySelector(".toolbar-actions");
  if (openUrl?.parentElement) openUrl.insertAdjacentElement("afterend", button);
  else addActions?.append(button);

  return button;
}

function imageForBlock(block) {
  if (!(block instanceof HTMLElement)) return null;
  return block.querySelector(".image-frame, .gallery-image");
}

function isImageBlock(block) {
  return Boolean(imageForBlock(block));
}

function rememberBlockFromTarget(target) {
  if (!(target instanceof Element)) return;
  const block = target.closest(".block");
  if (block && isImageBlock(block)) activeImageBlock = block;
}

function highestImageBlock() {
  const candidates = [...(workspace?.querySelectorAll(".block") || [])]
    .filter((block) => isImageBlock(block));

  candidates.sort((a, b) => {
    const az = Number.parseInt(a.style.zIndex || "0", 10) || 0;
    const bz = Number.parseInt(b.style.zIndex || "0", 10) || 0;
    return bz - az;
  });

  return candidates[0] || null;
}

async function waitForImage(image) {
  if (!(image instanceof HTMLImageElement)) return false;
  if (image.naturalWidth > 0 && image.naturalHeight > 0) return true;
  if (!image.currentSrc && !image.src) return false;

  try {
    await image.decode();
  } catch {
    // decode() can reject for formats Chromium cannot render. The natural
    // dimensions check below decides whether Fit to Size can continue.
  }

  return image.naturalWidth > 0 && image.naturalHeight > 0;
}

function visibleImageArea(block, image) {
  if (image.classList.contains("gallery-image")) {
    return image.closest(".gallery-stage") || image;
  }
  return image;
}

function numberCss(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function viewportContentLimit() {
  return {
    width: Math.min(MAX_CONTENT_WIDTH, Math.max(280, window.innerWidth - 64)),
    height: Math.min(MAX_CONTENT_HEIGHT, Math.max(220, window.innerHeight - 140))
  };
}

async function leaveMaximized(block) {
  if (!block.classList.contains("is-maximized")) return;
  block.querySelector(".maximize-block")?.click();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function fitBlock(block) {
  const image = imageForBlock(block);
  if (!(image instanceof HTMLImageElement)) {
    setStatus("Select an image or gallery first, then use Fit to Size.");
    return;
  }

  if (!(await waitForImage(image))) {
    setStatus("That image is not currently available to measure. Reconnect or load it first.");
    return;
  }

  await leaveMaximized(block);

  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  const limit = viewportContentLimit();
  const scale = Math.min(
    1,
    limit.width / naturalWidth,
    limit.height / naturalHeight
  );

  const fittedWidth = Math.max(1, Math.round(naturalWidth * scale));
  const fittedHeight = Math.max(1, Math.round(naturalHeight * scale));

  // Measure the non-image chrome (header, footer, source-location bar, borders)
  // at the moment the user asks to fit. Then resize only the workspace block;
  // the source image itself is never modified or re-encoded.
  const visual = visibleImageArea(block, image);
  const blockRect = block.getBoundingClientRect();
  const visualRect = visual.getBoundingClientRect();
  const chromeWidth = Math.max(0, blockRect.width - visualRect.width);
  const chromeHeight = Math.max(0, blockRect.height - visualRect.height);
  const computed = getComputedStyle(block);
  const minWidth = numberCss(computed.minWidth, 0);
  const minHeight = numberCss(computed.minHeight, 0);

  const blockWidth = Math.max(minWidth, Math.ceil(fittedWidth + chromeWidth));
  const blockHeight = Math.max(minHeight, Math.ceil(fittedHeight + chromeHeight));

  block.style.width = `${blockWidth}px`;
  block.style.height = `${blockHeight}px`;
  activeImageBlock = block;

  workspace?.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));

  const name = block.querySelector(".block-name")?.value?.trim() || "Image";
  const reduced = scale < 0.999;
  setStatus(
    reduced
      ? `${name} fitted to ${fittedWidth} × ${fittedHeight} without changing its aspect ratio.`
      : `${name} already fits; sized to its natural ${fittedWidth} × ${fittedHeight} view.`
  );
}

const fitButton = ensureButton();
fitButton?.addEventListener("click", () => {
  const block = activeImageBlock?.isConnected ? activeImageBlock : highestImageBlock();
  if (!block) {
    setStatus("Select an image or gallery first, then use Fit to Size.");
    return;
  }
  void fitBlock(block);
});

workspace?.addEventListener("pointerdown", (event) => rememberBlockFromTarget(event.target), true);
workspace?.addEventListener("focusin", (event) => rememberBlockFromTarget(event.target), true);

new MutationObserver(() => {
  if (activeImageBlock && !activeImageBlock.isConnected) activeImageBlock = null;
}).observe(workspace || document.body, { childList: true, subtree: true });
