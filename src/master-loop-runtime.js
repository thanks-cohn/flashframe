const workspace = document.querySelector("#workspace");
const mediaPlay = document.querySelector("#video-play-all");
const panel = document.querySelector(".frame-sequence-panel");
const topControls = document.querySelector(".frame-sequence-top-controls");
const topPlay = topControls?.querySelector(".frame-sequence-play-top");
const topRewind = topControls?.querySelector('[data-action="rewind"], .is-rewind');
const topBack = topControls?.querySelector('[data-action="back"], .is-back');
const topForward = topControls?.querySelector('[data-action="forward"], .is-forward');
const clock = panel?.querySelector(".frame-sequence-clock");

const loopState = { actions: false, media: false };
let playing = false;
let playhead = 0;
let startedAt = 0;
let clockFrame = 0;
let stopTimer = null;
const actionTimers = new Set();
const mediaHooks = new WeakSet();

function num(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function durationSetting() {
  return Math.max(0.1, num(panel?.querySelector('[data-config="duration"]')?.value, 30));
}

function stepSetting() {
  return Math.min(3600, Math.max(0.1, num(panel?.querySelector('[data-config="step"]')?.value, 1)));
}

function masterTime() {
  return playing ? (performance.now() - startedAt) / 1000 : playhead;
}

function formatTime(seconds) {
  const value = Number.isFinite(seconds) ? seconds : 0;
  const sign = value < 0 ? "−" : "";
  const safe = Math.abs(value);
  const minutes = Math.floor(safe / 60);
  const remainder = (safe % 60).toFixed(1).padStart(4, "0");
  return `${sign}${minutes}:${remainder}`;
}

function timedBlocks() {
  return [...workspace.querySelectorAll(".block")].filter((block) => block.dataset.timedMotion);
}

function motion(block) {
  try { return JSON.parse(block.dataset.timedMotion || "null"); } catch { return null; }
}

function scheduleFor(block) {
  const schedule = motion(block)?.schedule;
  if (!schedule) return { mode: "play", at: 0, after: "", offset: 0 };
  return {
    mode: ["play", "absolute", "after"].includes(schedule.mode) ? schedule.mode : "play",
    at: Math.max(0, num(schedule.at)),
    after: String(schedule.after || ""),
    offset: Math.max(0, num(schedule.offset))
  };
}

function effectiveMotion(block) {
  const action = motion(block);
  if (!action) return null;
  if (scheduleFor(block).mode !== "play") action.delay = 0;
  return action;
}

function buildActionPlan() {
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
          + num(precedingMotion?.delay)
          + num(precedingMotion?.duration)
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
    end = Math.max(end, start + num(action?.delay) + num(action?.duration));
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
  const plan = buildActionPlan();
  const phase = loopState.actions && plan.end > 0 && time >= 0 ? time % plan.end : time;
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
  const plan = buildActionPlan();
  if (!plan.blocks.length) return;

  const phase = loopState.actions && plan.end > 0 && fromMasterTime >= 0 ? fromMasterTime % plan.end : fromMasterTime;

  for (const block of plan.blocks) {
    const start = plan.starts.get(block.dataset.blockId) || 0;
    const localTime = phase - start;
    const action = effectiveMotion(block);
    const total = num(action?.delay) + num(action?.duration);

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

  // The coordinated action loop ends when the last scheduled action ends.
  if (loopState.actions && plan.end > 0) {
    const remaining = Math.max(0.001, plan.end - phase);
    const timer = setTimeout(() => {
      actionTimers.delete(timer);
      if (!playing || !loopState.actions) return;
      returnActions();
      scheduleActionCycle(0);
    }, remaining * 1000);
    actionTimers.add(timer);
  }
}

function mediaPlayers() {
  return [...new Set(workspace.querySelectorAll("video, audio"))];
}

const programmaticMediaSeeks = new WeakSet();

function savedMediaOffset(player) {
  const value = Number.parseFloat(player.dataset.masterTimelineOffset || "");
  return Number.isFinite(value) ? value : null;
}

function rememberMediaOffset(player, referenceTime = masterTime()) {
  const saved = savedMediaOffset(player);
  if (saved != null) return saved;
  const offset = (Number.isFinite(player.currentTime) ? player.currentTime : 0) - referenceTime;
  player.dataset.masterTimelineOffset = String(offset);
  return offset;
}

function rememberMediaOffsets(referenceTime = masterTime()) {
  ensureMediaHooks();
  for (const player of mediaPlayers()) rememberMediaOffset(player, referenceTime);
}

function setMediaTime(player, target) {
  if (!Number.isFinite(target) || !Number.isFinite(player.currentTime)) return;
  if (Math.abs(player.currentTime - target) < 0.08) return;
  programmaticMediaSeeks.add(player);
  try { player.currentTime = target; }
  catch { programmaticMediaSeeks.delete(player); }
}

function mediaTarget(player, time) {
  const offset = rememberMediaOffset(player, time);
  const virtualTime = time + offset;
  const duration = Number.isFinite(player.duration) && player.duration > 0
    ? player.duration
    : Number.POSITIVE_INFINITY;

  if (loopState.media && Number.isFinite(duration) && virtualTime >= 0) {
    return { virtualTime, target: virtualTime % duration, active: true };
  }

  return {
    virtualTime,
    target: Math.min(duration, Math.max(0, virtualTime)),
    active: virtualTime >= 0 && virtualTime < duration
  };
}

function applyMediaAtMaster(time, resume = false) {
  ensureMediaHooks();
  for (const player of mediaPlayers()) {
    if (!player.src) continue;
    const state = mediaTarget(player, time);
    setMediaTime(player, state.target);
    if (resume && state.active) void player.play().catch(() => {});
    else if (!state.active) player.pause();
  }
}

function ensureMediaHooks() {
  for (const player of mediaPlayers()) {
    if (mediaHooks.has(player)) continue;
    mediaHooks.add(player);
    player.addEventListener("seeked", () => {
      if (programmaticMediaSeeks.has(player)) {
        programmaticMediaSeeks.delete(player);
        return;
      }
      if (playing || !Number.isFinite(player.currentTime)) return;
      player.dataset.masterTimelineOffset = String(player.currentTime - playhead);
    });
    player.addEventListener("ended", () => {
      if (!playing || !loopState.media || player.loop || !player.src) return;
      applyMediaAtMaster(masterTime(), true);
    });
  }
}

function pauseMedia() {
  for (const player of mediaPlayers()) player.pause();
}

function playMedia() {
  rememberMediaOffsets(playhead);
  applyMediaAtMaster(playhead, true);
}

function setPlayingVisual(active) {
  if (active) document.documentElement.dataset.frameSequencePlaying = "true";
  else delete document.documentElement.dataset.frameSequencePlaying;
  mediaPlay?.classList.toggle("is-frame-sequence-playing", active);

  if (mediaPlay) {
    mediaPlay.textContent = active ? "❚❚" : "▶";
    mediaPlay.title = active ? "Pause master sequence" : "Play master sequence";
    mediaPlay.setAttribute("aria-label", mediaPlay.title);
  }
  if (topPlay) {
    topPlay.textContent = active ? "❚❚" : "▶";
    topPlay.dataset.label = active ? "Pause" : "Play";
    topPlay.title = active ? "Pause master sequence" : "Play master sequence";
    topPlay.setAttribute("aria-label", topPlay.title);
  }
}

function updateClock() {
  if (!playing) return;
  playhead = masterTime();
  applyMediaAtMaster(playhead, true);
  if (clock) clock.textContent = formatTime(playhead);
  setPlayingVisual(true);
  clockFrame = requestAnimationFrame(updateClock);
}

function clearStopTimer() {
  if (stopTimer != null) clearTimeout(stopTimer);
  stopTimer = null;
}

function scheduleStopIfNeeded() {
  clearStopTimer();
  if (!playing || loopState.actions || loopState.media) return;
  const remaining = durationSetting() - masterTime();
  if (remaining <= 0) {
    pauseSequence();
    return;
  }
  stopTimer = setTimeout(() => {
    stopTimer = null;
    if (playing && !loopState.actions && !loopState.media) pauseSequence();
  }, remaining * 1000);
}

function playSequence() {
  if (playing) {
    pauseSequence();
    return;
  }

  if (!loopState.actions && !loopState.media && playhead >= durationSetting()) totalRewind();

  playing = true;
  startedAt = performance.now() - playhead * 1000;
  setPlayingVisual(true);
  scheduleActionCycle(playhead);
  playMedia();
  scheduleStopIfNeeded();
  cancelAnimationFrame(clockFrame);
  clockFrame = requestAnimationFrame(updateClock);
  window.dispatchEvent(new CustomEvent("flashframe:master-sequence-resumed", {
    detail: { time: playhead, loopActions: loopState.actions, loopMedia: loopState.media }
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
  if (clock) clock.textContent = formatTime(playhead);
  window.dispatchEvent(new CustomEvent("flashframe:master-sequence-paused", { detail: { time: playhead } }));
}

function seekSequence(time) {
  const wasPlaying = playing;
  const before = masterTime();
  rememberMediaOffsets(before);
  if (wasPlaying) pauseSequence();
  const requested = num(time);
  const bounded = loopState.actions || loopState.media
    ? requested
    : Math.min(durationSetting(), requested);
  const delta = bounded - before;
  playhead = bounded;
  seekActions(playhead);
  applyMediaAtMaster(playhead, false);
  if (clock) clock.textContent = formatTime(playhead);
  window.dispatchEvent(new CustomEvent("flashframe:master-sequence-seek", { detail: { time: playhead, delta } }));
}

function totalRewind() {
  const before = masterTime();
  rememberMediaOffsets(before);
  pauseSequence();
  playhead = 0;
  returnActions();
  applyMediaAtMaster(0, false);
  if (clock) clock.textContent = formatTime(0);
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
    display:inline-flex;align-items:center;justify-content:center;gap:5px;
    min-width:64px;height:34px;min-height:34px;padding:0 9px;border-radius:8px;
    font-size:10px;font-weight:900;letter-spacing:.075em;line-height:1;white-space:nowrap;
    transition:background-color 120ms ease,border-color 120ms ease,color 120ms ease,box-shadow 120ms ease;
  }
  .frame-sequence-loop-top[data-loop-summary="all"] {
    color:#effff4!important;background:#148a43!important;border-color:#32c76d!important;
    box-shadow:0 0 0 1px rgba(50,199,109,.18),0 4px 14px rgba(20,138,67,.26)!important;
  }
  .frame-sequence-loop-top[data-loop-summary="partial"] {
    color:#241b00!important;background:#f6bf26!important;border-color:#ffd75c!important;
    box-shadow:0 0 0 1px rgba(246,191,38,.16),0 4px 14px rgba(246,191,38,.24)!important;
  }
  .frame-sequence-loop-top[data-loop-summary="off"] {
    color:#fff!important;background:#f0142f!important;border-color:#ff5267!important;
    box-shadow:0 0 0 1px rgba(240,20,47,.22),0 4px 15px rgba(240,20,47,.34)!important;
  }
  .frame-sequence-loop-top[data-loop-summary="off"] .frame-sequence-loop-word {
    text-decoration:line-through!important;text-decoration-thickness:2px!important;
  }
  .frame-sequence-loop-top[data-loop-summary="partial"] .frame-sequence-loop-word,
  .frame-sequence-loop-top[data-loop-summary="all"] .frame-sequence-loop-word { text-decoration:none!important; }
  .frame-sequence-loop-chevron { font-size:9px;opacity:.82;letter-spacing:0; }
  .frame-sequence-loop-menu {
    position:fixed;z-index:2147483647;width:196px;padding:6px;
    border:1px solid color-mix(in srgb, CanvasText 18%, transparent);border-radius:11px;
    background:color-mix(in srgb, Canvas 97%, transparent);color:CanvasText;
    box-shadow:0 16px 42px rgba(0,0,0,.28);backdrop-filter:blur(16px);
  }
  .frame-sequence-loop-menu[hidden] { display:none; }
  .frame-sequence-loop-menu button {
    display:grid;grid-template-columns:22px 1fr;align-items:center;width:100%;min-height:34px;
    padding:6px 8px;border:0;border-radius:7px;background:transparent;color:inherit;text-align:left;
  }
  .frame-sequence-loop-menu button:hover,.frame-sequence-loop-menu button:focus-visible {
    background:color-mix(in srgb, CanvasText 7%, Canvas);outline:none;
  }
  .frame-sequence-loop-menu button.is-active { color:#27ad5d;font-weight:760; }
  .frame-sequence-loop-menu button.is-inactive { color:#e34050; }
  .frame-sequence-loop-menu button.is-inactive .loop-menu-label {
    text-decoration:line-through;text-decoration-thickness:1.5px;
  }
  .loop-menu-mark { font-size:14px;font-weight:900;text-align:center; }
`;
document.head.append(style);

let loopButton = topControls?.querySelector(".frame-sequence-loop-top");
if (!loopButton && topControls) {
  loopButton = document.createElement("button");
  loopButton.type = "button";
  loopButton.className = "frame-sequence-loop-top";
  if (topForward) topForward.insertAdjacentElement("afterend", loopButton);
  else topControls.append(loopButton);
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
  if (loopState.actions && loopState.media) return "all";
  if (loopState.actions || loopState.media) return "partial";
  return "off";
}

function syncLoopUi() {
  const summary = loopSummary();
  if (loopButton) {
    loopButton.dataset.loopSummary = summary;
    loopButton.classList.remove("is-loop-on", "is-loop-off");
    loopButton.setAttribute("aria-pressed", String(summary !== "off"));
    loopButton.title = summary === "all" ? "All looping is ON" : summary === "partial" ? "Some looping is ON" : "Looping is OFF";
    loopButton.setAttribute("aria-label", `${loopButton.title}. Open loop menu.`);
  }

  const values = {
    actions: loopState.actions,
    media: loopState.media,
    everything: loopState.actions && loopState.media
  };

  for (const button of loopMenu.querySelectorAll("button[data-loop-mode]")) {
    const active = Boolean(values[button.dataset.loopMode]);
    button.classList.toggle("is-active", active);
    button.classList.toggle("is-inactive", !active);
    button.setAttribute("aria-checked", String(active));
    button.querySelector(".loop-menu-mark").textContent = active ? "✓" : "✕";
  }

  window.dispatchEvent(new CustomEvent("flashframe:master-loop-state", {
    detail: { actions: loopState.actions, media: loopState.media, everything: loopState.actions && loopState.media }
  }));
}

function positionLoopMenu() {
  if (!loopButton || loopMenu.hidden) return;
  const rect = loopButton.getBoundingClientRect();
  const margin = 8;
  loopMenu.style.left = `${Math.min(window.innerWidth - loopMenu.offsetWidth - margin, Math.max(margin, rect.left))}px`;
  loopMenu.style.top = `${Math.max(margin, Math.min(window.innerHeight - loopMenu.offsetHeight - margin, rect.bottom + 7))}px`;
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
  if (mode === "actions") loopState.actions = !loopState.actions;
  if (mode === "media") loopState.media = !loopState.media;
  if (mode === "everything") {
    const enable = !(loopState.actions && loopState.media);
    loopState.actions = enable;
    loopState.media = enable;
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

function controlAction(button) {
  if (!button) return null;
  if (button === mediaPlay || button === topPlay) return "play";
  if (button === topRewind) return "rewind";
  if (button === topBack) return "back";
  if (button === topForward) return "forward";
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

  const action = controlAction(button);
  if (!action) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  if (action === "play") playSequence();
  if (action === "stop") pauseSequence();
  if (action === "rewind") totalRewind();
  if (action === "back") seekSequence(masterTime() - stepSetting());
  if (action === "forward") seekSequence(masterTime() + stepSetting());
}, true);

panel?.querySelector('[data-config="duration"]')?.addEventListener("change", scheduleStopIfNeeded);
const legacyLoop = panel?.querySelector('[data-config="loop"]');
if (legacyLoop) legacyLoop.checked = false;

window.addEventListener("flashframe:capture-appearance", (event) => {
  event.detail.appearance ||= {};
  event.detail.appearance.masterLoop = { actions: loopState.actions, media: loopState.media };
});

window.addEventListener("flashframe:restore-appearance", (event) => {
  const saved = event.detail?.appearance?.masterLoop;
  const legacy = Boolean(event.detail?.appearance?.frameSequence?.loop);
  loopState.actions = saved ? Boolean(saved.actions) : legacy;
  loopState.media = saved ? Boolean(saved.media) : legacy;
  totalRewind();
  syncLoopUi();
});

window.addEventListener("flashframe:set-master-loop", (event) => {
  const detail = event.detail || {};
  if (typeof detail.actions === "boolean") loopState.actions = detail.actions;
  if (typeof detail.media === "boolean") loopState.media = detail.media;
  syncLoopUi();
  refreshLoopRuntime();
});

new MutationObserver(ensureMediaHooks).observe(workspace, { childList: true, subtree: true });
ensureMediaHooks();
syncLoopUi();
setPlayingVisual(false);
if (clock) clock.textContent = formatTime(0);
