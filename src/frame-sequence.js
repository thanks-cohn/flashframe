const workspace = document.querySelector("#workspace");
const topPlay = document.querySelector("#video-play-all");
const brand = document.querySelector(".toolbar .brand");

const stylesheet = document.createElement("link");
stylesheet.rel = "stylesheet";
stylesheet.href = new URL("./frame-sequence.css", import.meta.url).href;
document.head.append(stylesheet);

const openButton = document.createElement("button");
openButton.type = "button";
openButton.className = "frame-sequence-open-top";
openButton.textContent = "Set times";
openButton.title = "Open the current frame master timeline";

const presentationPlay = document.createElement("button");
presentationPlay.type = "button";
presentationPlay.className = "frame-sequence-play-top";
presentationPlay.textContent = "▶";
presentationPlay.title = "Play current frame sequence";
presentationPlay.setAttribute("aria-label", presentationPlay.title);

const presentationControls = document.createElement("div");
presentationControls.className = "frame-sequence-top-controls";
presentationControls.append(openButton, presentationPlay);
brand?.after(presentationControls);

const panel = document.createElement("section");
panel.className = "frame-sequence-panel";
panel.hidden = true;
panel.innerHTML = `
  <div class="frame-sequence-head"><strong>Sequence of current frame</strong><span class="frame-sequence-clock">0:00.0</span><button data-action="close" type="button" aria-label="Close">×</button></div>
  <div class="frame-sequence-grid">
    <label>Total frame time (seconds)<input data-config="duration" type="number" min="0.1" max="86400" step="0.1" value="30"></label>
    <label>Step size (seconds)<input data-config="step" type="number" min="0.1" max="3600" step="0.1" value="1"></label>
    <label class="frame-sequence-loop"><input data-config="loop" type="checkbox"><span>Loop current frame</span></label>
  </div>
  <div class="frame-sequence-actions"><button class="frame-sequence-step-button" data-action="back" type="button" title="Step backward 1 second" aria-label="Step backward 1 second">↶</button><button data-action="play" type="button">▶ Play</button><button data-action="stop" type="button">■ Stop</button><button class="frame-sequence-step-button" data-action="forward" type="button" title="Step forward 1 second" aria-label="Step forward 1 second">↷</button><button data-action="rewind" type="button">⏮ Total rewind</button></div>
  <div class="frame-sequence-list"></div>
  <p class="frame-sequence-note">Untouched actions begin with the top Play button. Set an exact master time, or tie an action to another action's completion.</p>
`;
document.body.append(panel);

let config = { duration: 30, step: 1, loop: false, touched: false };
let run = null;
let playhead = 0;
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

function mediaPlayers() {
  return [...workspace.querySelectorAll("video, audio")].filter((player) => player.closest(".block")?.dataset.syncGroup !== "independent");
}

function pauseMedia() {
  for (const player of mediaPlayers()) player.pause();
}

async function playMedia() {
  for (const player of mediaPlayers()) {
    if (!player.src) continue;
    try { await player.play(); } catch { /* An unavailable source does not stop the sequence. */ }
  }
}

function seekMedia(time) {
  for (const player of mediaPlayers()) {
    if (!Number.isFinite(player.currentTime)) continue;
    const end = Number.isFinite(player.duration) ? player.duration : time;
    try { player.currentTime = Math.min(end, Math.max(0, time)); } catch { /* Some streams are not seekable yet. */ }
  }
}

function returnAll() {
  for (const block of timedBlocks()) {
    window.dispatchEvent(new CustomEvent("flashframe:return-timed-motion", { detail: { block } }));
  }
}

function effectiveMotion(block) {
  const action = motion(block);
  if (!action) return null;
  if (scheduleFor(block).mode !== "play") action.delay = 0;
  return action;
}

function buildPlan() {
  const blocks = timedBlocks();
  const byId = new Map(blocks.map((block) => [block.dataset.blockId, block]));
  const starts = new Map();
  const resolving = new Set();
  const resolve = (block) => {
    const id = block.dataset.blockId;
    if (starts.has(id)) return starts.get(id);
    if (resolving.has(id)) return 0;
    resolving.add(id);
    const schedule = scheduleFor(block);
    let start = schedule.mode === "absolute" ? schedule.at : 0;
    if (schedule.mode === "after") {
      const preceding = byId.get(schedule.after);
      if (preceding) {
        const precedingMotion = effectiveMotion(preceding);
        start = resolve(preceding) + number(precedingMotion?.delay) + number(precedingMotion?.duration) + schedule.offset;
      } else start = schedule.offset;
    }
    resolving.delete(id);
    starts.set(id, start);
    return start;
  };
  for (const block of blocks) resolve(block);
  return { blocks, starts };
}

function currentTime() {
  return run ? Math.min(config.duration, Math.max(0, (performance.now() - run.startedAt) / 1000)) : playhead;
}

function updateClockText() {
  panel.querySelector(".frame-sequence-clock").textContent = formatTime(playhead);
}

function updateClock() {
  if (!run) return;
  playhead = currentTime();
  updateClockText();
  if (playhead < config.duration) clockFrame = requestAnimationFrame(updateClock);
}

function launch(block, startAt = 0) {
  if (!run || run.launched.has(block.dataset.blockId)) return;
  run.launched.add(block.dataset.blockId);
  window.dispatchEvent(new CustomEvent("flashframe:play-timed-motion", { detail: { block, motion: effectiveMotion(block), startAt } }));
}

function scheduleCycle() {
  const plan = buildPlan();
  run.startedAt = performance.now() - playhead * 1000;
  run.launched.clear();
  window.dispatchEvent(new CustomEvent("flashframe:frame-sequence-resumed", { detail: { time: playhead, starts: Object.fromEntries(plan.starts) } }));
  updateClockText();
  cancelAnimationFrame(clockFrame);
  clockFrame = requestAnimationFrame(updateClock);

  for (const block of plan.blocks) {
    const start = plan.starts.get(block.dataset.blockId) || 0;
    const localTime = playhead - start;
    const action = effectiveMotion(block);
    const total = number(action?.delay) + number(action?.duration);
    if (localTime >= total) {
      window.dispatchEvent(new CustomEvent("flashframe:seek-timed-motion", { detail: { block, time: total } }));
    } else if (localTime >= 0) launch(block, localTime);
    else {
      const timer = setTimeout(() => launch(block), -localTime * 1000);
      run.timers.add(timer);
    }
  }
  const finishTimer = setTimeout(() => {
    if (!run) return;
    playhead = config.duration;
    pauseSequence();
    if (config.loop) { totalRewind(); playSequence(); }
  }, Math.max(0, config.duration - playhead) * 1000);
  run.timers.add(finishTimer);
}

function playSequence() {
  if (run) return;
  if (playhead >= config.duration) totalRewind();
  run = { timers: new Set(), launched: new Set(), startedAt: performance.now() };
  document.documentElement.dataset.frameSequencePlaying = "true";
  topPlay?.classList.add("is-frame-sequence-playing");
  presentationPlay.textContent = "❚❚";
  presentationPlay.title = "Pause current frame sequence";
  presentationPlay.setAttribute("aria-label", presentationPlay.title);
  scheduleCycle();
  void playMedia();
}

function pauseSequence() {
  if (run) {
    playhead = currentTime();
    clearRunTimers();
  }
  run = null;
  cancelAnimationFrame(clockFrame);
  for (const block of timedBlocks()) window.dispatchEvent(new CustomEvent("flashframe:pause-timed-motion", { detail: { block } }));
  pauseMedia();
  delete document.documentElement.dataset.frameSequencePlaying;
  topPlay?.classList.remove("is-frame-sequence-playing");
  presentationPlay.textContent = "▶";
  presentationPlay.title = "Play current frame sequence";
  presentationPlay.setAttribute("aria-label", presentationPlay.title);
  updateClockText();
  window.dispatchEvent(new CustomEvent("flashframe:frame-sequence-paused", { detail: { time: playhead } }));
}

function seekSequence(time) {
  pauseSequence();
  playhead = Math.min(config.duration, Math.max(0, number(time)));
  const plan = buildPlan();
  for (const block of plan.blocks) {
    const localTime = playhead - (plan.starts.get(block.dataset.blockId) || 0);
    window.dispatchEvent(new CustomEvent("flashframe:seek-timed-motion", { detail: { block, time: localTime } }));
  }
  seekMedia(playhead);
  updateClockText();
  window.dispatchEvent(new CustomEvent("flashframe:frame-sequence-seek", { detail: { time: playhead, starts: Object.fromEntries(plan.starts) } }));
}

function totalRewind() {
  pauseSequence();
  playhead = 0;
  returnAll();
  seekMedia(0);
  updateClockText();
  window.dispatchEvent(new CustomEvent("flashframe:frame-sequence-stopped"));
}

function updateStepLabels() {
  for (const [action, direction] of [["back", "backward"], ["forward", "forward"]]) {
    const button = panel.querySelector(`[data-action="${action}"]`);
    const label = `Step ${direction} ${config.step} second${config.step === 1 ? "" : "s"}`;
    button.title = label;
    button.setAttribute("aria-label", label);
  }
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
  if (action === "stop") pauseSequence();
  if (action === "back") seekSequence(currentTime() - config.step);
  if (action === "forward") seekSequence(currentTime() + config.step);
  if (action === "rewind") totalRewind();
});
panel.addEventListener("change", (event) => {
  const key = event.target.dataset.config;
  if (!key) return;
  config.touched = true;
  if (key === "duration") config.duration = Math.max(0.1, number(event.target.value, 30));
  if (key === "step") { config.step = Math.min(3600, Math.max(0.1, number(event.target.value, 1))); updateStepLabels(); }
  if (key === "loop") config.loop = event.target.checked;
});

topPlay?.addEventListener("click", () => {
  if (run) pauseSequence();
  else playSequence();
});
presentationPlay.addEventListener("click", () => {
  if (topPlay) topPlay.click();
  else if (run) pauseSequence();
  else playSequence();
});

window.addEventListener("flashframe:capture-appearance", (event) => {
  event.detail.appearance ||= {};
  event.detail.appearance.frameSequence = { ...config };
});
window.addEventListener("flashframe:restore-appearance", (event) => {
  const saved = event.detail?.appearance?.frameSequence;
  config = saved ? { duration: Math.max(0.1, number(saved.duration, 30)), step: Math.min(3600, Math.max(0.1, number(saved.step, 1))), loop: Boolean(saved.loop), touched: Boolean(saved.touched) } : { duration: 30, step: 1, loop: false, touched: false };
  panel.querySelector('[data-config="duration"]').value = String(config.duration);
  panel.querySelector('[data-config="step"]').value = String(config.step);
  panel.querySelector('[data-config="loop"]').checked = config.loop;
  totalRewind();
  updateStepLabels();
  renderList();
});

new MutationObserver(() => { if (!panel.hidden) renderList(); }).observe(workspace, { childList: true, subtree: false });
makeDraggable();
updateClockText();
updateStepLabels();
