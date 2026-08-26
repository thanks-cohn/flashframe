const workspace = document.querySelector("#workspace");
const CUSTOM_MARKERS = ["__FLASHFRAME_CUSTOM_BLOCK_V1__", "__FLASHFRAME_REMOTE_VIDEO_V1__"];

const stylesheet = document.createElement("link");
stylesheet.rel = "stylesheet";
stylesheet.href = new URL("./timed-events.css", import.meta.url).href;
document.head.append(stylesheet);

let editorSession = null;
const running = new WeakMap();

function number(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function blockPoint(block) {
  return {
    x: number(block.style.left, block.offsetLeft),
    y: number(block.style.top, block.offsetTop)
  };
}

function normalizeMotion(raw, block) {
  const start = raw?.start || blockPoint(block);
  const end = raw?.end || { x: start.x + 240, y: start.y };
  return {
    start: { x: number(start.x), y: number(start.y) },
    end: { x: number(end.x), y: number(end.y) },
    control: {
      x: number(raw?.control?.x, (start.x + end.x) / 2),
      y: number(raw?.control?.y, Math.min(start.y, end.y) - 120)
    },
    shape: raw?.shape === "straight" ? "straight" : "curve",
    delay: Math.max(0, number(raw?.delay, 0)),
    duration: Math.max(0.1, number(raw?.duration, 3)),
    showPath: Boolean(raw?.showPath),
    schedule: {
      mode: ["play", "absolute", "after"].includes(raw?.schedule?.mode) ? raw.schedule.mode : "play",
      at: Math.max(0, number(raw?.schedule?.at, 0)),
      after: String(raw?.schedule?.after || ""),
      offset: Math.max(0, number(raw?.schedule?.offset, 0))
    }
  };
}

function customStore(block) {
  return block.querySelector(":scope > .custom-state-store, :scope > .remote-video-state");
}

function readCustomPayload(block) {
  const store = customStore(block);
  const start = store?.value?.indexOf("{") ?? -1;
  if (start < 0) return null;
  try { return JSON.parse(store.value.slice(start)); } catch { return null; }
}

function writeCustomMotion(block, motion) {
  const store = customStore(block);
  const payload = readCustomPayload(block);
  if (!store || !payload) return;
  payload.timedMotion = motion;
  const start = store.value.indexOf("{");
  const marker = start >= 0 ? store.value.slice(0, start) : CUSTOM_MARKERS[0];
  store.value = `${marker}${JSON.stringify(payload)}`;
}

function readMotion(block) {
  try {
    if (block.dataset.timedMotion) return normalizeMotion(JSON.parse(block.dataset.timedMotion), block);
  } catch { /* fall through to the custom payload */ }
  return readCustomPayload(block)?.timedMotion
    ? normalizeMotion(readCustomPayload(block).timedMotion, block)
    : null;
}

function storeMotion(block, motion) {
  const normalized = normalizeMotion(motion, block);
  block.dataset.timedMotion = JSON.stringify(normalized);
  writeCustomMotion(block, normalized);
  block.classList.add("has-timed-motion");
  workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
  return normalized;
}

function clearMotion(block) {
  delete block.dataset.timedMotion;
  block.classList.remove("has-timed-motion");
  const store = customStore(block);
  const payload = readCustomPayload(block);
  if (store && payload) {
    delete payload.timedMotion;
    const start = store.value.indexOf("{");
    store.value = `${store.value.slice(0, start)}${JSON.stringify(payload)}`;
  }
  workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
}

function centerFor(point, block) {
  return { x: point.x + block.offsetWidth / 2, y: point.y + block.offsetHeight / 2 };
}

function pathData(motion, block) {
  const start = centerFor(motion.start, block);
  const end = centerFor(motion.end, block);
  const control = centerFor(motion.control, block);
  return motion.shape === "straight"
    ? `M ${start.x} ${start.y} L ${end.x} ${end.y}`
    : `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
}

function makeSvg(motion, block, editing = false) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("timed-motion-svg");
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.classList.add("timed-motion-path");
  path.setAttribute("d", pathData(motion, block));
  svg.append(path);
  if (editing) {
    const start = centerFor(motion.start, block);
    const end = centerFor(motion.end, block);
    const control = centerFor(motion.control, block);
    const guide = document.createElementNS(svg.namespaceURI, "path");
    guide.classList.add("timed-motion-guide");
    guide.setAttribute("d", `M ${start.x} ${start.y} L ${control.x} ${control.y} L ${end.x} ${end.y}`);
    guide.hidden = motion.shape !== "curve";
    svg.prepend(guide);
  }
  workspace.append(svg);
  return svg;
}

function makeHandle(className, label, point, block) {
  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = `timed-motion-handle ${className}`;
  handle.textContent = label;
  handle.title = `${label} point — drag to reposition`;
  const center = centerFor(point, block);
  handle.style.left = `${center.x - 15}px`;
  handle.style.top = `${center.y - 15}px`;
  workspace.append(handle);
  return handle;
}

function dragPoint(handle, motion, key, block, redraw) {
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const initial = { ...motion[key] };
    const startX = event.clientX;
    const startY = event.clientY;
    handle.setPointerCapture(event.pointerId);
    const move = (moveEvent) => {
      motion[key].x = initial.x + moveEvent.clientX - startX;
      motion[key].y = initial.y + moveEvent.clientY - startY;
      redraw();
    };
    const finish = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  });
}

function closeEditor() {
  if (!editorSession) return;
  for (const node of editorSession.nodes) node.remove();
  editorSession = null;
}

function editorPosition(block) {
  const rect = block.getBoundingClientRect();
  return {
    left: Math.min(window.innerWidth - 342, Math.max(12, rect.right + 12)),
    top: Math.min(window.innerHeight - 390, Math.max(12, rect.top))
  };
}

function makeEditorDraggable(editor) {
  const title = editor.querySelector("h3");
  if (!title) return;
  title.title = "Drag this panel";
  title.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const rect = editor.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = rect.left;
    const startTop = rect.top;
    title.setPointerCapture(event.pointerId);
    editor.classList.add("is-dragging");
    const move = (moveEvent) => {
      const left = Math.min(window.innerWidth - editor.offsetWidth - 8, Math.max(8, startLeft + moveEvent.clientX - startX));
      const top = Math.min(window.innerHeight - editor.offsetHeight - 8, Math.max(8, startTop + moveEvent.clientY - startY));
      editor.style.left = `${left}px`;
      editor.style.top = `${top}px`;
    };
    const finish = () => {
      editor.classList.remove("is-dragging");
      title.removeEventListener("pointermove", move);
      title.removeEventListener("pointerup", finish);
      title.removeEventListener("pointercancel", finish);
    };
    title.addEventListener("pointermove", move);
    title.addEventListener("pointerup", finish);
    title.addEventListener("pointercancel", finish);
  });
}

function editMotion(block) {
  closeEditor();
  const existing = readMotion(block);
  const motion = normalizeMotion(existing, block);
  if (!existing) motion.start = blockPoint(block);

  const editor = document.createElement("section");
  editor.className = "timed-motion-editor";
  editor.innerHTML = `
    <h3>Timed move</h3>
    <label>Delay before movement (seconds)<input data-motion="delay" type="number" min="0" max="3600" step="0.1" value="${motion.delay}"></label>
    <label>Movement duration (seconds)<input data-motion="duration" type="number" min="0.1" max="3600" step="0.1" value="${motion.duration}"></label>
    <label>Path shape<select data-motion="shape"><option value="curve">Curved arc</option><option value="straight">Straight line</option></select></label>
    <label class="timed-motion-check"><input data-motion="showPath" type="checkbox"><span>Show path during playback</span></label>
    <div class="timed-motion-actions"><button data-action="preview" type="button">Preview</button><button data-action="save" type="button">Save</button><button data-action="cancel" type="button">Cancel</button></div>
  `;
  editor.querySelector('[data-motion="shape"]').value = motion.shape;
  editor.querySelector('[data-motion="showPath"]').checked = motion.showPath;
  const pos = editorPosition(block);
  editor.style.left = `${pos.left}px`;
  editor.style.top = `${pos.top}px`;
  document.body.append(editor);
  makeEditorDraggable(editor);

  const svg = makeSvg(motion, block, true);
  const path = svg.querySelector(".timed-motion-path");
  const guide = svg.querySelector(".timed-motion-guide");
  const startHandle = makeHandle("is-start", "S", motion.start, block);
  const endHandle = makeHandle("is-end", "E", motion.end, block);
  const curveHandle = makeHandle("is-curve", "↝", motion.control, block);
  const nodes = [editor, svg, startHandle, endHandle, curveHandle];
  const placeHandle = (handle, point) => {
    const center = centerFor(point, block);
    handle.style.left = `${center.x - 15}px`;
    handle.style.top = `${center.y - 15}px`;
  };
  const redraw = () => {
    path.setAttribute("d", pathData(motion, block));
    const start = centerFor(motion.start, block);
    const end = centerFor(motion.end, block);
    const control = centerFor(motion.control, block);
    guide.setAttribute("d", `M ${start.x} ${start.y} L ${control.x} ${control.y} L ${end.x} ${end.y}`);
    guide.hidden = motion.shape !== "curve";
    curveHandle.hidden = motion.shape !== "curve";
    placeHandle(startHandle, motion.start);
    placeHandle(endHandle, motion.end);
    placeHandle(curveHandle, motion.control);
  };
  dragPoint(startHandle, motion, "start", block, redraw);
  dragPoint(endHandle, motion, "end", block, redraw);
  dragPoint(curveHandle, motion, "control", block, redraw);
  redraw();
  editorSession = { block, motion, nodes };

  editor.addEventListener("input", (event) => {
    const key = event.target.dataset.motion;
    if (key === "delay") motion.delay = Math.max(0, number(event.target.value));
    if (key === "duration") motion.duration = Math.max(0.1, number(event.target.value, 3));
    if (key === "showPath") motion.showPath = event.target.checked;
    if (key === "shape") { motion.shape = event.target.value; redraw(); }
  });
  editor.addEventListener("click", (event) => {
    const action = event.target.dataset.action;
    if (action === "cancel") closeEditor();
    if (action === "save") { storeMotion(block, motion); closeEditor(); }
    if (action === "preview") {
      const saved = storeMotion(block, motion);
      closeEditor();
      void playMotion(block, saved);
    }
  });
}

function bezier(motion, t) {
  if (motion.shape === "straight") {
    return {
      x: motion.start.x + (motion.end.x - motion.start.x) * t,
      y: motion.start.y + (motion.end.y - motion.start.y) * t
    };
  }
  const one = 1 - t;
  return {
    x: one * one * motion.start.x + 2 * one * t * motion.control.x + t * t * motion.end.x,
    y: one * one * motion.start.y + 2 * one * t * motion.control.y + t * t * motion.end.y
  };
}

function placeMotionAt(block, motion, localTime) {
  const movementTime = Math.max(0, localTime - motion.delay);
  const t = localTime <= motion.delay ? 0 : Math.min(1, movementTime / motion.duration);
  const point = bezier(motion, t);
  block.style.left = `${point.x}px`;
  block.style.top = `${point.y}px`;
}

async function playMotion(block, supplied = null, suppliedStartAt = 0) {
  const source = supplied || readMotion(block);
  if (!source || !block.isConnected) return;
  const motion = normalizeMotion(source, block);
  const startAt = Math.max(0, number(suppliedStartAt));
  const total = motion.delay + motion.duration;
  running.get(block)?.abort();
  if (startAt >= total) {
    placeMotionAt(block, motion, total);
    return;
  }
  const controller = new AbortController();
  running.set(block, controller);
  placeMotionAt(block, motion, startAt);
  block.classList.add("is-timed-motion-playing");
  const playbackPath = motion.showPath ? makeSvg(motion, block) : null;

  let completed = false;
  try {
    const remainingDelay = Math.max(0, motion.delay - startAt);
    if (remainingDelay > 0) {
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, remainingDelay * 1000);
        controller.signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
      });
    }
    if (controller.signal.aborted) return;
    window.dispatchEvent(new CustomEvent("flashframe:timed-motion-started", { detail: { block } }));
    const elapsedMovement = Math.max(0, startAt - motion.delay);
    const started = performance.now() - elapsedMovement * 1000;
    await new Promise((resolve) => {
      const frame = (now) => {
        if (controller.signal.aborted) { resolve(); return; }
        const t = Math.min(1, (now - started) / (motion.duration * 1000));
        const point = bezier(motion, t);
        block.style.left = `${point.x}px`;
        block.style.top = `${point.y}px`;
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    completed = !controller.signal.aborted;
  } finally {
    playbackPath?.remove();
    block.classList.remove("is-timed-motion-playing");
    if (running.get(block) === controller) running.delete(block);
    workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
    window.dispatchEvent(new CustomEvent("flashframe:timed-motion-finished", {
      detail: { block, aborted: !completed }
    }));
  }
}

function pauseMotion(block) {
  running.get(block)?.abort();
  block.classList.remove("is-timed-motion-playing");
}

function seekMotion(block, localTime) {
  const motion = readMotion(block);
  if (!motion) return;
  pauseMotion(block);
  placeMotionAt(block, motion, Math.max(0, number(localTime)));
  workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
}

function returnToStart(block) {
  const motion = readMotion(block);
  if (!motion) return;
  running.get(block)?.abort();
  block.style.left = `${motion.start.x}px`;
  block.style.top = `${motion.start.y}px`;
  block.classList.remove("is-timed-motion-playing");
  workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
}

function prepare(block) {
  if (!(block instanceof HTMLElement) || !block.classList.contains("block")) return;
  const payloadMotion = readCustomPayload(block)?.timedMotion;
  if (!block.dataset.timedMotion && payloadMotion) block.dataset.timedMotion = JSON.stringify(payloadMotion);
  block.classList.toggle("has-timed-motion", Boolean(readMotion(block)));
}

window.addEventListener("flashframe:edit-timed-motion", (event) => event.detail?.block && editMotion(event.detail.block));
window.addEventListener("flashframe:play-timed-motion", (event) => {
  if (event.detail?.block) void playMotion(event.detail.block, event.detail.motion, event.detail.startAt);
});
window.addEventListener("flashframe:pause-timed-motion", (event) => event.detail?.block && pauseMotion(event.detail.block));
window.addEventListener("flashframe:seek-timed-motion", (event) => event.detail?.block && seekMotion(event.detail.block, event.detail.time));
window.addEventListener("flashframe:return-timed-motion", (event) => event.detail?.block && returnToStart(event.detail.block));
window.addEventListener("flashframe:clear-timed-motion", (event) => event.detail?.block && clearMotion(event.detail.block));
window.addEventListener("flashframe:restore-timed-motion", (event) => prepare(event.detail?.block));
window.addEventListener("flashframe:set-timed-motion-schedule", (event) => {
  const block = event.detail?.block;
  const current = block && readMotion(block);
  if (!current) return;
  current.schedule = event.detail?.schedule;
  storeMotion(block, current);
});

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) for (const node of mutation.addedNodes) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.classList.contains("block")) prepare(node);
    for (const block of node.querySelectorAll?.(".block") ?? []) prepare(block);
  }
});
observer.observe(workspace, { childList: true, subtree: false });
for (const block of workspace.querySelectorAll(".block")) prepare(block);
