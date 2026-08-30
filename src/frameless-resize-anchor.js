const workspace = document.querySelector("#workspace");

function imageContentInsets(block) {
  const image = block?.querySelector(":scope > .image-frame");
  if (!(image instanceof HTMLImageElement)) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const box = image.getBoundingClientRect();
  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  if (!box.width || !box.height || !naturalWidth || !naturalHeight) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const scale = Math.min(box.width / naturalWidth, box.height / naturalHeight);
  const renderedWidth = naturalWidth * scale;
  const renderedHeight = naturalHeight * scale;
  const horizontalGap = Math.max(0, (box.width - renderedWidth) / 2);
  const verticalGap = Math.max(0, (box.height - renderedHeight) / 2);

  return {
    top: verticalGap,
    right: horizontalGap,
    bottom: verticalGap,
    left: horizontalGap
  };
}

function placeHandle(block) {
  if (!(block instanceof HTMLElement)) return;
  const { top, right, bottom, left } = imageContentInsets(block);
  block.style.setProperty("--frameless-content-top-gap", `${top}px`);
  block.style.setProperty("--frameless-content-right-gap", `${right}px`);
  block.style.setProperty("--frameless-content-bottom-gap", `${bottom}px`);
  block.style.setProperty("--frameless-content-left-gap", `${left}px`);
}

function bind(block) {
  if (!(block instanceof HTMLElement)) return;
  const image = block.querySelector(":scope > .image-frame");
  if (!(image instanceof HTMLImageElement)) return;

  if (block.dataset.visibleImageResizeAnchor === "true") {
    placeHandle(block);
    return;
  }

  block.dataset.visibleImageResizeAnchor = "true";
  const update = () => placeHandle(block);

  image.addEventListener("load", update);
  new ResizeObserver(update).observe(block);
  new ResizeObserver(update).observe(image);
  requestAnimationFrame(update);
}

function scan(root = workspace) {
  if (!root) return;
  if (root instanceof HTMLElement && root.classList.contains("block")) bind(root);
  for (const block of root.querySelectorAll?.(".block:has(> .image-frame)") ?? []) bind(block);
}

scan();

new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLElement) scan(node);
    }
  }
}).observe(workspace, { childList: true, subtree: true });

window.addEventListener("resize", () => scan());
