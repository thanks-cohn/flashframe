const workspace = document.querySelector("#workspace");
const topPlay = document.querySelector("#video-play-all");
const sequencePanel = document.querySelector(".frame-sequence-panel");
const presentationControls = document.querySelector(".frame-sequence-top-controls");
const presentationPlay = presentationControls?.querySelector(".frame-sequence-play-top");
const presentationRewind = presentationControls?.querySelector('[data-action="rewind"], .is-rewind');
const presentationBack = presentationControls?.querySelector('[data-action="back"], .is-back');
const presentationForward = presentationControls?.querySelector('[data-action="forward"], .is-forward');
const sequenceClock = sequencePanel?.querySelector(".frame-sequence-clock");

const state = {
  loopActions: false,
  loopMedia: false
};

let playing = false;
let playhead = 0;
let startedAt = 0;
let clockFrame = 0;
let stopTimer = null;
const actionTimers = new Set();
const mediaHooks = new WeakSet();

function number(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function durationSetting() {
  return Math.max(0.1, number(sequencePanel?.querySelector('[data-config="duration"]')?.value, 30));
}

function stepSetting() {
  return Math.min(3600, Math.max(0.1, number(sequencePanel?.querySelector('[data-config="step"]')?.value, 1)));
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = (safe % 60).toFixed(1).padStart(4, "0");
  return `${minutes}:${remainder}`;
}

function masterTime() {
  return playing ? Math.max(0, (performance.now() - startedAt) / 1000) : playhead;
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
        start = resolve(preceding)
          + number(precedingMotion?.delay)
          + number(precedingMotion?.duration)
          + schedule.offset;
      } else {
        start = schedule.offset;
      }
    }
    resolving.delete(id);
    starts.set(id, start);
    return start;
  };

  for (const block of blocks) resolve(block);

  let end = 0;
  for (const block of blocks) {
    const action = effectiveMotion(block);
    const start = starts.get(block.dataset.blockId) || 0;
    end = Math.max(end, start + number(action?.delay) + number(action?.duration));
  }

  return { blocks, starts, end };
}

function clearActionTimers() {
  for (const timer of actionTimers) clearTimeout(timer);
  actionTimers.clear();
}

function pauseActions() {
  clearActionTimers();
  for (const block of timedBlocks()) {
    window.dispatchEvent(new CustomEvent("flashframe:pause-timed-motion", { detail: { block } }));
  }
}

function returnActions() {
  clearActionTimers();
  for (const block of timedBlocks()) {
    window.dispatchEvent(new CustomEvent("flashframe:return-timed-motion", { detail: { block } }));
  }
}

function seekActions(time) {
  clearActionTimers();
  const plan = buildPlan();
  const phase = state.loopActions && plan.end > 0 ? time % plan.end : time;
  for (const block of plan.blocks) {
    const localTime = phase - (plan.starts.get(block.dataset.blockId) || 0);
    window.dispatchEvent(new CustomEvent("flashframe:seek-timed-motion", { detail: { block, time: localTime } }));
  }
}

function launchAction(block, startAt = 0) {
  if (!playing || !block?.isConnected) return;
  window.dispatchEvent(new CustomEvent("flashframe:play-timed-motion", {
    detail: { block, motion: effectiveMotion(block), startAt }
  }));
}

function scheduleActionCycle(fromMasterTime = 0) {
  clearActionTimers();
  const plan = buildPlan();
  if (!plan.blocks.length) return;

  const phase = state.loopActions && plan.end > 0 ? fromMasterTime % plan.end : fromMasterTime;

  for (const block of plan.blocks) {
    const start = plan.starts.get(block.dataset.blockId) || 0;
    const localTime = phase - start;
    const action = effectiveMotion(block);
    const total = number(action?.delay) + number(action?.duration);

    if (localTime >= total) {
      window.dispatchEvent(new CustomEvent("flashframe:seek-timed-motion", { detail: { block, time: total } }));
    } else if (localTime >= 0) {
      launchAction(block, localTime);
    } else {
      const timer = setTimeout(() => {
        actionTimers.delete(timer);
        launchAction(block, 0);
      }, -localTime * 1000);
      actionTimers.add(timer);
    }
  }

  if (state.loopActions && plan.end > 0) {
    const remaining = Math.max(0.001, plan.end - phase);
    const timer = setTimeout(() => {
      actionTimers.delete(timer);
      if (!playing || !state.loopActions) return;
      returnActions();
      scheduleActionCycle(0);
    }, remaining * 1000);
    actionTimers.add(timer);
  }
}

function mediaPlayers() {
  return [...new Set(workspace.querySelectorAll("video, audio"))];
}

function ensureMediaHooks() {
  for (const player of mediaPlayers()) {
    if (mediaHooks.has(player)) continue;
    mediaHooks.add(player);
    player.addEventListener("ended", () => {
      if (!playing || !state.loopMedia || player.loop || !player.src) return;
      try { player.currentTime = 0; } catch { return; }
      void player.play().catch(() => {});
    });
  }
}

function pauseMedia() {
  for (const player of mediaPlayers()) player.pause();
}

function playMedia() {
  ensureMediaHooks();
  for (const player of mediaPlayers()) {
    if (!player.src) continue;
    if (!state.loopMedia && player.ended) continue;
    void player.play().catch(() => {});
  }
}

function seekMedia(time) {
  ensureMediaHooks();
  for (const player of mediaPlayers()) {
    if (!Number.isFinite(player.currentTime)) continue;
    let target = Math.max(0, time);
    if (Number.isFinite(player.duration) && player.duration > 0) {
      target = state.loopMedia ? target % player.duration : Math.min(player.duration, target);
    }
    try { player.currentTime = target; } catch { /* Some streams are not seekable yet. */ }
  }
}

function setPlayingVisual(isPlaying) {
  document.documentElement.dataset.frameSequencePlaying = isPlaying ? "true" : "false";
  if (!isPlaying) delete document.documentElement.dataset.frameSequencePlaying;
  topPlay?.classList.toggle("is-frame-sequence-playing", isPlaying);
  if (topPlay) {
    topPlay.textContent = isPlaying ? "❚❚" : "▶";
    topPlay.title = isPlaying ? "Pause master sequence" : "Play master sequence";
    topPlay.setAttribute("aria-label", topPlay.title);
  }
  if (presentationPlay) {
    presentationPlay.textContent = isPlaying ? "❚❚" : "▶";
    presentationPlay.dataset.label = isPlaying ? "Pause" : "Play";
    presentationPlay.title = isPlaying ? "Pause master sequence" : "Play master sequence";
    presentationPlay.setAttribute("aria-label", presentationPlay.title);
  }
}

function updateClock() {
  if (!playing) return;
  playhead = masterTime();
  if (sequenceClock) sequenceClock.textContent = formatTime(playhead);
  setPlayingVisual(true);
  clockFrame = requestAnimationFrame(updateClock);
}

function clearStopTimer() {
  if (stopTimer != null) clearTimeout(stopTimer);
  stopTimer = null;
}

function scheduleStopIfNeeded() {
  clearStopTimer();
  if (!playing || state.loopActions || state.loopMedia) return;
  const remaining = durationSetting() - masterTime();
  if (remaining <= 0) {
    pauseSequence();
    return;
  }
  stopTimer = setTimeout(() => {
    stopTimer = null;
    if (playing && !state.loopActions && !state.loopMedia) pauseSequence();
  }, remaining * 1000);
}

function playSequence() {
  if (playing) {
    pauseSequence();
    return;
  }

  if (!state.loopActions && !state.loopMedia && playhead >= durationSetting()) {
    totalRewind();
  }

  playing = true;
  startedAt = performance.now() - playhead * 1000;
  setPlayingVisual(true);
  scheduleActionCycle(playhead);
  seekMedia(playhead);
  playMedia();
  clearStopTimer();
  scheduleStopIfNeeded();
  cancelAnimationFrame(clockFrame);
  clockFrame = requestAnimationFrame(updateClock);

  window.dispatchEvent(new CustomEvent("flashframe:master-sequence-resumed", {
    detail: { time: playhead, loopActions: state.loopActions, loopMedia: state.loopMedia }
  }));
}

function pauseSequence() {
  if (playing) playhead = masterTime();
  playing = false;
  clearStopTimer();
  cancelAnimationFrame(clockFrame);
  pauseActions();
  pauseMedia();
  setPlayingVisual(false);
  if (sequenceClock) sequenceClock.textContent = formatTime(playhead);

  window.dispatchEvent(new CustomEvent("flashframe:master-sequence-paused", { detail: { time: playhead } }));
}

function seekSequence(time) {
  const wasPlaying = playing;
  if (wasPlaying) pauseSequence();
  const bounded = state.loopActions || state.loopMedia
    ? Math.max(0, number(time))
    : Math.min(durationSetting(), Math.max(0, number(time)));
  playhead = bounded;
  seekActions(playhead);
  seekMedia(playhead);
  if (sequenceClock) sequenceClock.textContent = formatTime(playhead);
  window.dispatchEvent(new CustomEvent("flashframe:master-sequence-seek", { detail: { time: playhead } }));
}

function totalRewind() {
  pauseSequence();
  playhead = 0;
  returnActions();
  seekMedia(0);
  if (sequenceClock) sequenceClock.textContent = formatTime(0);
  window.dispatchEvent(new CustomEvent("flashframe:master-sequence-rewound"));
}

function refreshLoopRuntime() {
  if (!playing) return;
  const now = masterTime();
  pauseActions();
  seekActions(now);
  scheduleActionCycle(now);
  scheduleStopIfNeeded();
}

const style = document.createElement("style");
style.textContent = `
  .frame-sequence-loop { display: none !important; }

  .frame-sequence-top-controls > .frame-sequence-loop-top {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-width: 64px;
    height: 34px;
    min-height: 34px;
    padding: 0 9px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: .075em;
    line-height: 1;
    white-space: nowrap;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, box-shadow 120ms ease;
  }

  .frame-sequence-loop-top[data-loop-summary="all"] {
    color: #effff4 !important;
    background: #148a43 !important;
    border-color: #32c76d !important;
    box-shadow: 0 0 0 1px rgba(50,199,109,.18), 0 4px 14px rgba(20,138,67,.26) !important;
  }

  .frame-sequence-loop-top[data-loop-summary="partial"] {
    color: #241b00 !important;
    background: #f6bf26 !important;
    border-color: #ffd75c !important;
    box-shadow: 0 0 0 1px rgba(246,191,38,.16), 0 4px 14px rgba(246,191,38,.24) !important;
  }

  .frame-sequence-loop-top[data-loop-summary="off"] {
    color: #fff !important;
    background: #ef233c !important;
    border-color: #ff596c !important;
    box-shadow: 0 0 0 1px rgba(239,35,60,.18), 0 4px 14px rgba(239,35,60,.28) !important;
  }

  .frame-sequence-loop-top[data-loop-summary="off"] .frame-sequence-loop-word {
    text-decoration: line-through !important;
    text-decoration-thickness: 2px !important;
  }

  .frame-sequence-loop-top[data-loop-summary="partial"] .frame-sequence-loop-word,
  .frame-sequence-loop-top[data-loop-summary="all"] .frame-sequence-loop-word {
    text-decoration: none !important;
  }

  .frame-sequence-loop-chevron {
    font-size: 9px;
    opacity: .82;
    letter-spacing: 0;
  }

  .frame-sequence-loop-menu {
    position: fixed;
    z-index: 2147483647;
    width: 196px;
    padding: 6px;
    border: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
    border-radius: 11px;
    background: color-mix(in srgb, Canvas 97%, transparent);
    color: CanvasText;
    box-shadow: 0 16px 42px rgba(0,0,0,.28);
    backdrop-filter: blur(16px);
  }

  .frame-sequence-loop-menu[hidden] { display: none; }

  .frame-sequence-loop-menu button {
    display: grid;
    grid-template-columns: 22px 1fr;
    align-items: center;
    width: 100%;
    min-height: 34px;
    padding: 6px 8px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: inherit;
    text-align: left;
  }

  .frame-sequence-loop-menu button:hover,
  .frame-sequence-loop-menu button:focus-visible {
    background: color-mix(in srgb, CanvasText 7%, Canvas);
    outline: none;
  }

  .frame-sequence-loop-menu button.is-active {
    color: #27ad5d;
    font-weight: 760;
  }

  .frame-sequence-loop-menu button.is-inactive {
    color: #e34050;
  }

  .frame-sequence-loop-menu button.is-inactive .loop-menu-label {
    text-decoration: line-through;
    text-decoration-thickness: 1.5px;
  }

  .loop-menu-mark {
    font-size: 14px;
    font-weight: 900;
    text-align: center;
  }
`;
document.head.append(style);

let loopButton = presentationControls?.querySelector(".frame-sequence-loop-top");
if (!loopButton && presentationControls) {
  loopButton = document.createElement("button");
  loopButton.type = "button";
  loopButton.className = "frame-sequence-loop-top";
  const forward = presentationControls.querySelector('[data-action="forward"], .is-forward');
  if (forward) forward.insertAdjacentElement("afterend", loopButton);
  else presentationControls.append(loopButton);
}

if (loopButton) {
  loopButton.innerHTML = '<span class="frame-sequence-loop-word">LOOP</span><span class="frame-sequence-loop-chevron" aria-hidden="true">▼</span>';
  loopButton.setAttribute("aria-haspopup", "menu");
  loopButton.setAttribute("aria-expanded", "false");
}

const loopMenu = document.createElement("div");
loopMenu.className = "frame-sequence-loop-menu";
loopMenu.hidden = true;
loopMenu.setAttribute("role", "menu");
loopMenu.innerHTML = `
  <button type="button" data-loop-mode="actions" role="menuitemcheckbox"><span class="loop-menu-mark"></span><span class="loop-menu-label">Loop actions</span></button>
  <button type="button" data-loop-mode="media" role="menuitemcheckbox"><span class="loop-menu-mark"></span><span class="loop-menu-label">Loop media</span></button>
  <button type="button" data-loop-mode="everything" role="menuitemcheckbox"><span class="loop-menu-mark"></span><span class="loop-menu-label">Loop everything</span></button>
`;
document.body.append(loopMenu);

function loopSummary() {
  if (state.loopActions && state.loopMedia) return "all";
  if (state.loopActions || state.loopMedia) return "partial";
  return "off";
}

function syncLoopUi() {
  const summary = loopSummary();
  if (loopButton) {
    loopButton.dataset.loopSummary = summary;
    loopButton.classList.remove("is-loop-on", "is-loop-off");
    loopButton.setAttribute("aria-pressed", String(summary !== "off"));
    loopButton.title = summary === "all"
      ? "All looping is ON"
      : summary === "partial"
        ? "Some looping is ON"
        : "Looping is OFF";
    loopButton.setAttribute("aria-label", `${loopButton.title}. Open loop menu.`);
  }

  const values = {
    actions: state.loopActions,
    media: state.loopMedia,
    everything: state.loopActions && state.loopMedia
  };

  for (const button of loopMenu.querySelectorAll("button[data-loop-mode]")) {
    const active = Boolean(values[button.dataset.loopMode]);
    button.classList.toggle("is-active", active);
    button.classList.toggle("is-inactive", !active);
    button.setAttribute("aria-checked", String(active));
    button.querySelector(".loop-menu-mark").textContent = active ? "✓" : "✕";
  }

  window.dispatchEvent(new CustomEvent("flashframe:master-loop-state", {
    detail: { actions: state.loopActions, media: state.loopMedia, everything: state.loopActions && state.loopMedia }
  }));
}

function positionLoopMenu() {
  if (!loopButton || loopMenu.hidden) return;
  const rect = loopButton.getBoundingClientRect();
  const margin = 8;
  const left = Math.min(window.innerWidth - loopMenu.offsetWidth - margin, Math.max(margin, rect.left));
  const top = Math.min(window.innerHeight - loopMenu.offsetHeight - margin, rect.bottom + 7);
  loopMenu.style.left = `${left}px`;
  loopMenu.style.top = `${Math.max(margin, top)}px`;
}

function closeLoopMenu() {
  loopMenu.hidden = true;
  loopButton?.setAttribute("aria-expanded", "false");
}

function toggleLoopMenu() {
  const opening = loopMenu.hidden;
  loopMenu.hidden = !opening;
  loopButton?.setAttribute("aria-expanded", String(opening));
  if (opening) positionLoopMenu();
}

function setLoopMode(mode) {
  if (mode === "actions") state.loopActions = !state.loopActions;
  if (mode === "media") state.loopMedia = !state.loopMedia;
  if (mode === "everything") {
    const enable = !(state.loopActions && state.loopMedia);
    state.loopActions = enable;
    state.loopMedia = enable;
  }
  syncLoopUi();
  refreshLoopRuntime();
}

loopMenu.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-loop-mode]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  setLoopMode(button.dataset.loopMode);
});

document.addEventListener("click", (event) => {
  if (!loopMenu.hidden && !loopMenu.contains(event.target) && !loopButton?.contains(event.target)) closeLoopMenu();
});
window.addEventListener("resize", positionLoopMenu);
window.addEventListener("scroll", positionLoopMenu, true);

function actionForControl(button) {
  if (!button) return null;
  if (button === topPlay || button === presentationPlay) return "play";
  if (button === presentationRewind) return "rewind";
  if (button === presentationBack) return "back";
  if (button === presentationForward) return "forward";
  if (button.closest(".frame-sequence-panel")) {
    const action = button.dataset.action;
    if (["play", "stop", "rewind", "back", "forward"].includes(action)) return action;
  }
  return null;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (loopButton && button === loopButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    toggleLoopMenu();
    return;
  }

  const action = actionForControl(button);
  if (!action) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  if (action === "play") playSequence();
  if (action === "stop") pauseSequence();
  if (action === "rewind") totalRewind();
  if (action === "back") seekSequence(masterTime() - stepSetting());
  if (action === "forward") seekSequence(masterTime() + stepSetting());
}, true);

sequencePanel?.querySelector('[data-config="duration"]')?.addEventListener("change", scheduleStopIfNeeded);

const legacyLoopCheckbox = sequencePanel?.querySelector('[data-config="loop"]');
if (legacyLoopCheckbox) legacyLoopCheckbox.checked = false;

window.addEventListener("flashframe:capture-appearance", (event) => {
  event.detail.appearance ||= {};
  event.detail.appearance.masterLoop = {
    actions: state.loopActions,
    media: state.loopMedia
  };
});

window.addEventListener("flashframe:restore-appearance", (event) => {
  const saved = event.detail?.appearance?.masterLoop;
  const legacy = Boolean(event.detail?.appearance?.frameSequence?.loop);
  state.loopActions = saved ? Boolean(saved.actions) : legacy;
  state.loopMedia = saved ? Boolean(saved.media) : legacy;
  totalRewind();
  syncLoopUi();
});

window.addEventListener("flashframe:set-master-loop", (event) => {
  const detail = event.detail || {};
  if (typeof detail.actions === "boolean") state.loopActions = detail.actions;
  if (typeof detail.media === "boolean") state.loopMedia = detail.media;
  syncLoopUi();
  refreshLoopRuntime();
});

new MutationObserver(() => ensureMediaHooks()).observe(workspace, { childList: true, subtree: true });
ensureMediaHooks();
syncLoopUi();
setPlayingVisual(false);
if (sequenceClock) sequenceClock.textContent = formatTime(0);
