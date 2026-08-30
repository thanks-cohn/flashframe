const workspace = document.querySelector("#workspace");

function imageContentInsets(block) {
  const image = block?.querySelector(":scope > .image-frame");
  if (!(image instanceof HTMLImageElement)) return { right: 0, bottom: 0 };

  const box = image.getBoundingClientRect();
  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  if (!box.width || !box.height || !naturalWidth || !naturalHeight) {
    return { right: 0, bottom: 0 };
  }

  const scale = Math.min(box.width / naturalWidth, box.height / naturalHeight);
  const renderedWidth = naturalWidth * scale;
  const renderedHeight = naturalHeight * scale;

  return {
    right: Math.max(0, (box.width - renderedWidth) / 2),
    bottom: Math.max(0, (box.height - renderedHeight) / 2)
  };
}

function placeHandle(block) {
  if (!(block instanceof HTMLElement)) return;
  const { right, bottom } = imageContentInsets(block);
  block.style.setProperty("--frameless-content-right-gap", `${right}px`);
  block.style.setProperty("--frameless-content-bottom-gap", `${bottom}px`);
}

function bind(block) {
  if (!(block instanceof HTMLElement) || block.dataset.visibleImageResizeAnchor === "true") return;
  const image = block.querySelector(":scope > .image-frame");
  if (!(image instanceof HTMLImageElement)) return;

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
