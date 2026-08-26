const workspace = document.querySelector("#workspace");
const topPlay = document.querySelector("#video-play-all");
const toolbarActions = document.querySelector(".frame-actions");

const stylesheet = document.createElement("link");
stylesheet.rel = "stylesheet";
stylesheet.href = new URL("./frame-sequence.css", import.meta.url).href;
document.head.append(stylesheet);

const openButton = document.createElement("button");
openButton.type = "button";
openButton.textContent = "Frame sequence";
openButton.title = "Open the current frame master timeline";
toolbarActions?.append(openButton);

const panel = document.createElement("section");
panel.className = "frame-sequence-panel";
panel.hidden = true;
panel.innerHTML = `
  <div class="frame-sequence-head"><strong>Sequence of current frame</strong><span class="frame-sequence-clock">0:00.0</span><button data-action="close" type="button" aria-label="Close">×</button></div>
  <div class="frame-sequence-grid">
    <label>Total frame time (seconds)<input data-config="duration" type="number" min="0.1" max="86400" step="0.1" value="30"></label>
    <label class="frame-sequence-loop"><input data-config="loop" type="checkbox"><span>Loop current frame</span></label>
  </div>
  <div class="frame-sequence-actions"><button data-action="play" type="button">▶ Play</button><button data-action="stop" type="button">■ Stop</button><button data-action="restart" type="button">↺ Restart</button><button data-action="return" type="button">Return all to start</button></div>
  <div class="frame-sequence-list"></div>
  <p class="frame-sequence-note">Untouched actions begin with the top Play button. Set an exact master time, or tie an action to another action's completion.</p>
`;
document.body.append(panel);

let config = { duration: 30, loop: false, touched: false };
let run = null;
let clockFrame = 0;

function number(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function timedBlocks() {
  return [...workspace.querySelectorAll(".block")].filter((block) => block.dataset.timedMotion);
}

function motion(block) {
  try { return JSON.parse(block.dataset.timedMotion || "null"); } catch { return null; }
}

function scheduleFor(block) {
  const value = motion(block)?.schedule;
  if (!value) return { mode: "play", at: 0, after: "", offset: 0 };
  return {
    mode: ["play", "absolute", "after"].includes(value.mode) ? value.mode : "play",
    at: Math.max(0, number(value.at)),
    after: String(value.after || ""),
    offset: Math.max(0, number(value.offset))
  };
}

function blockName(block) {
  return block.querySelector(".block-name")?.value?.trim() || "Untitled object";
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = (safe % 60).toFixed(1).padStart(4, "0");
  return `${minutes}:${remainder}`;
}

function setSchedule(block, schedule) {
  window.dispatchEvent(new CustomEvent("flashframe:set-timed-motion-schedule", { detail: { block, schedule } }));
}

function renderList() {
  const list = panel.querySelector(".frame-sequence-list");
  const blocks = timedBlocks();
  list.replaceChildren();
  if (!blocks.length) {
    const empty = document.createElement("p");
    empty.className = "frame-sequence-empty";
    empty.textContent = "No timed actions yet. Right-click an object and create a timed move.";
    list.append(empty);
    return;
  }

  for (const block of blocks) {
    const schedule = scheduleFor(block);
    const row = document.createElement("div");
    row.className = "frame-sequence-row";
    const name = document.createElement("span");
    name.className = "frame-sequence-name";
    name.textContent = blockName(block);
    name.title = name.textContent;
    const mode = document.createElement("select");
    mode.innerHTML = '<option value="play">With Play</option><option value="absolute">At master time</option><option value="after">After action</option>';
    mode.value = schedule.mode;
    const target = document.createElement(schedule.mode === "after" ? "select" : "input");
    if (schedule.mode === "after") {
      target.append(new Option("Choose action…", ""));
      for (const other of blocks.filter((candidate) => candidate !== block)) target.append(new Option(blockName(other), other.dataset.blockId));
      target.value = schedule.after;
      target.title = "Action that must finish first";
    } else {
      target.type = "number";
      target.min = "0";
      target.step = "0.1";
      target.value = String(schedule.mode === "absolute" ? schedule.at : 0);
      target.disabled = schedule.mode === "play";
      target.title = schedule.mode === "absolute" ? "Master start time in seconds" : "Starts with Play";
    }
    const offset = document.createElement("input");
    offset.type = "number";
    offset.min = "0";
    offset.step = "0.1";
    offset.value = String(schedule.offset);
    offset.disabled = schedule.mode !== "after";
    offset.title = "Delay after the preceding action finishes";
    const save = () => {
      config.touched = true;
      const next = {
        mode: mode.value,
        at: mode.value === "absolute" ? Math.max(0, number(target.value)) : 0,
        after: mode.value === "after" ? target.value : "",
        offset: mode.value === "after" ? Math.max(0, number(offset.value)) : 0
      };
      setSchedule(block, next);
    };
    mode.addEventListener("change", () => { save(); renderList(); });
    target.addEventListener("change", save);
    offset.addEventListener("change", save);
    row.append(name, mode, target, offset);
    list.append(row);
  }
}

function clearRunTimers() {
  if (!run) return;
  for (const timer of run.timers) clearTimeout(timer);
  run.timers.clear();
}

function returnAll() {
  for (const block of timedBlocks()) {
    window.dispatchEvent(new CustomEvent("flashframe:return-timed-motion", { detail: { block } }));
  }
}

function updateClock() {
  if (!run) return;
  const elapsed = (performance.now() - run.startedAt) / 1000;
  panel.querySelector(".frame-sequence-clock").textContent = formatTime(Math.min(config.duration, elapsed));
  if (elapsed < config.duration) clockFrame = requestAnimationFrame(updateClock);
}

function launch(block) {
  if (!run || run.launched.has(block.dataset.blockId)) return;
  run.launched.add(block.dataset.blockId);
  const action = motion(block);
  const schedule = scheduleFor(block);
  if (action && schedule.mode !== "play") action.delay = 0;
  window.dispatchEvent(new CustomEvent("flashframe:play-timed-motion", { detail: { block, motion: action } }));
}

function scheduleCycle() {
  returnAll();
  window.dispatchEvent(new CustomEvent("flashframe:frame-sequence-cycle"));
  const blocks = timedBlocks();
  run.startedAt = performance.now();
  run.launched.clear();
  panel.querySelector(".frame-sequence-clock").textContent = "0:00.0";
  cancelAnimationFrame(clockFrame);
  clockFrame = requestAnimationFrame(updateClock);

  for (const block of blocks) {
    const schedule = scheduleFor(block);
    if (schedule.mode === "after") continue;
    const delay = schedule.mode === "absolute" ? schedule.at : 0;
    const timer = setTimeout(() => launch(block), delay * 1000);
    run.timers.add(timer);
  }
  const finishTimer = setTimeout(() => {
    if (!run) return;
    clearRunTimers();
    if (config.loop) scheduleCycle();
    else stopSequence({ returnToStart: false });
  }, config.duration * 1000);
  run.timers.add(finishTimer);
}

function playSequence() {
  if (run) return;
  run = { timers: new Set(), launched: new Set(), startedAt: performance.now() };
  document.documentElement.dataset.frameSequencePlaying = "true";
  topPlay?.classList.add("is-frame-sequence-playing");
  scheduleCycle();
}

function stopSequence({ returnToStart = false } = {}) {
  if (run) clearRunTimers();
  run = null;
  cancelAnimationFrame(clockFrame);
  delete document.documentElement.dataset.frameSequencePlaying;
  topPlay?.classList.remove("is-frame-sequence-playing");
  if (returnToStart) returnAll();
  window.dispatchEvent(new CustomEvent("flashframe:frame-sequence-stopped"));
}

function restartSequence() {
  stopSequence({ returnToStart: true });
  playSequence();
}

function makeDraggable() {
  const head = panel.querySelector(".frame-sequence-head");
  head.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button")) return;
    event.preventDefault();
    const rect = panel.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    head.setPointerCapture(event.pointerId);
    panel.classList.add("is-dragging");
    const move = (moveEvent) => {
      panel.style.left = `${Math.min(window.innerWidth - panel.offsetWidth - 8, Math.max(8, rect.left + moveEvent.clientX - startX))}px`;
      panel.style.top = `${Math.min(window.innerHeight - panel.offsetHeight - 8, Math.max(8, rect.top + moveEvent.clientY - startY))}px`;
    };
    const finish = () => {
      panel.classList.remove("is-dragging");
      head.removeEventListener("pointermove", move);
      head.removeEventListener("pointerup", finish);
      head.removeEventListener("pointercancel", finish);
    };
    head.addEventListener("pointermove", move);
    head.addEventListener("pointerup", finish);
    head.addEventListener("pointercancel", finish);
  });
}

openButton.addEventListener("click", () => {
  panel.hidden = false;
  if (!panel.style.left) { panel.style.left = "18px"; panel.style.top = "90px"; }
  renderList();
});
panel.addEventListener("click", (event) => {
  const action = event.target.dataset.action;
  if (action === "close") panel.hidden = true;
  if (action === "play") playSequence();
  if (action === "stop") stopSequence();
  if (action === "restart") restartSequence();
  if (action === "return") { stopSequence(); returnAll(); }
});
panel.addEventListener("change", (event) => {
  const key = event.target.dataset.config;
  if (!key) return;
  config.touched = true;
  if (key === "duration") config.duration = Math.max(0.1, number(event.target.value, 30));
  if (key === "loop") config.loop = event.target.checked;
});

topPlay?.addEventListener("click", () => {
  if (run) stopSequence();
  else playSequence();
});

window.addEventListener("flashframe:timed-motion-finished", (event) => {
  if (!run || event.detail?.aborted) return;
  const finishedId = event.detail?.block?.dataset.blockId;
  for (const block of timedBlocks()) {
    const schedule = scheduleFor(block);
    if (schedule.mode !== "after" || schedule.after !== finishedId || run.launched.has(block.dataset.blockId)) continue;
    const timer = setTimeout(() => launch(block), schedule.offset * 1000);
    run.timers.add(timer);
  }
});

window.addEventListener("flashframe:capture-appearance", (event) => {
  event.detail.appearance ||= {};
  event.detail.appearance.frameSequence = { ...config };
});
window.addEventListener("flashframe:restore-appearance", (event) => {
  const saved = event.detail?.appearance?.frameSequence;
  config = saved ? { duration: Math.max(0.1, number(saved.duration, 30)), loop: Boolean(saved.loop), touched: Boolean(saved.touched) } : { duration: 30, loop: false, touched: false };
  panel.querySelector('[data-config="duration"]').value = String(config.duration);
  panel.querySelector('[data-config="loop"]').checked = config.loop;
  stopSequence();
  renderList();
});

new MutationObserver(() => { if (!panel.hidden) renderList(); }).observe(workspace, { childList: true, subtree: false });
makeDraggable();
