const workspace = document.querySelector("#workspace");
const toolbar = document.querySelector(".toolbar");

if (workspace) {
  const BASE_WIDTH = 2400;
  const BASE_HEIGHT = 1600;
  const EXTENT_PADDING = 180;
  const MIN_GRAB_LEFT = -28;
  const MIN_GRAB_TOP = -6;
  const TOOLBAR_GRAB_GAP = 6;

  const style = document.createElement("style");
  style.textContent = `
    html[data-framechute-offscreen="true"],
    html[data-framechute-offscreen="true"] body {
      overflow: auto !important;
      overscroll-behavior: auto;
    }

    #workspace.framechute-scroll-reachable {
      overflow: visible !important;
    }
  `;
  document.head.append(style);

  let frame = 0;

  function number(value, fallback = 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toolbarBottom() {
    if (!toolbar || document.body.classList.contains("toolbar-hidden")) return 0;
    const rect = toolbar.getBoundingClientRect();
    return rect.height > 0 ? rect.bottom : 0;
  }

  function grabSurface(block) {
    const compact = block.querySelector(":scope > .compact-drag-handle");
    if (compact && getComputedStyle(compact).display !== "none") return compact;
    const header = block.querySelector(":scope > .block-header");
    if (header && getComputedStyle(header).display !== "none") return header;
    return block;
  }

  function keepGrabAreaReachable(block) {
    if (!(block instanceof HTMLElement) || block.classList.contains("is-maximized")) return false;

    let left = number(block.style.left, block.offsetLeft);
    let top = number(block.style.top, block.offsetTop);
    let changed = false;

    // Browsers cannot scroll into negative document coordinates. Permit a
    // little visual overhang, but never lose the left/top recovery surface.
    if (left < MIN_GRAB_LEFT) {
      left = MIN_GRAB_LEFT;
      block.style.left = `${left}px`;
      changed = true;
    }
    if (top < MIN_GRAB_TOP) {
      top = MIN_GRAB_TOP;
      block.style.top = `${top}px`;
      changed = true;
    }

    // A sticky toolbar can grow after a toolbar command opens/wraps. In that
    // case a perfectly valid block coordinate can suddenly leave its draggable
    // header underneath the toolbar. Keep the current grab surface below the
    // toolbar's *actual current* bottom edge, not merely below viewport y=0.
    const grab = grabSurface(block);
    const grabRect = grab.getBoundingClientRect();
    const safeViewportTop = toolbarBottom() + TOOLBAR_GRAB_GAP;
    if (grabRect.top < safeViewportTop) {
      const delta = safeViewportTop - grabRect.top;
      top = number(block.style.top, block.offsetTop) + delta;
      block.style.top = `${top}px`;
      changed = true;
    }

    return changed;
  }

  function updateReachability({ rescueNegative = false } = {}) {
    frame = 0;
    const blocks = [...workspace.querySelectorAll(".block")];
    let maxRight = BASE_WIDTH;
    let maxBottom = BASE_HEIGHT;
    let anyOffscreen = false;
    let rescued = false;

    for (const block of blocks) {
      if (rescueNegative) rescued = keepGrabAreaReachable(block) || rescued;

      const left = number(block.style.left, block.offsetLeft);
      const top = number(block.style.top, block.offsetTop);
      const width = Math.max(block.offsetWidth, number(block.style.width, 0));
      const height = Math.max(block.offsetHeight, number(block.style.height, 0));
      maxRight = Math.max(maxRight, left + width + EXTENT_PADDING);
      maxBottom = Math.max(maxBottom, top + height + EXTENT_PADDING);

      const rect = block.getBoundingClientRect();
      if (
        rect.right > window.innerWidth ||
        rect.bottom > window.innerHeight ||
        rect.left < 0 ||
        rect.top < toolbarBottom()
      ) {
        anyOffscreen = true;
      }
    }

    workspace.style.width = `${Math.ceil(Math.max(BASE_WIDTH, maxRight, window.innerWidth))}px`;
    workspace.style.height = `${Math.ceil(Math.max(BASE_HEIGHT, maxBottom, window.innerHeight))}px`;
    workspace.classList.toggle("framechute-scroll-reachable", anyOffscreen);
    document.documentElement.dataset.framechuteOffscreen = anyOffscreen ? "true" : "false";

    if (rescued) {
      workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
    }
  }

  function schedule(options = {}) {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => updateReachability(options));
  }

  // Grow the scrollable canvas while a block is being moved or resized. Do
  // not clamp during the gesture; rescue coordinates once the gesture ends.
  workspace.addEventListener("pointermove", () => schedule(), true);
  document.addEventListener("pointerup", () => schedule({ rescueNegative: true }), true);
  document.addEventListener("pointercancel", () => schedule({ rescueNegative: true }), true);
  window.addEventListener("resize", () => schedule({ rescueNegative: true }));
  window.addEventListener("scroll", () => schedule(), { passive: true });
  window.addEventListener("flashframe:rescue-reachability", () => schedule({ rescueNegative: true }));

  // The toolbar can morph/wrap after a button is used. Re-run reachability
  // whenever its dimensions change so a block header cannot become trapped.
  if (toolbar) {
    new ResizeObserver(() => schedule({ rescueNegative: true })).observe(toolbar);
  }

  const mutations = new MutationObserver(() => schedule({ rescueNegative: true }));
  mutations.observe(workspace, { childList: true });

  const resizeObserver = new ResizeObserver(() => schedule());
  const observeBlocks = () => {
    for (const block of workspace.querySelectorAll(".block")) {
      if (block.dataset.offscreenObserved === "true") continue;
      block.dataset.offscreenObserved = "true";
      resizeObserver.observe(block);
    }
  };

  const blockObserver = new MutationObserver(() => {
    observeBlocks();
    schedule({ rescueNegative: true });
  });
  blockObserver.observe(workspace, { childList: true });

  observeBlocks();
  schedule({ rescueNegative: true });
}
