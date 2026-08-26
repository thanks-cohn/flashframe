const workspace = document.querySelector("#workspace");
const CUSTOM_MARKER = "__FLASHFRAME_CUSTOM_BLOCK_V1__";
let panel = null;
const timers = new Set();
const active = new Map();
const baselineZ = new Map();

const stylesheet = document.createElement("link");
stylesheet.rel = "stylesheet";
stylesheet.href = new URL("./layer-rules.css", import.meta.url).href;
document.head.append(stylesheet);

function number(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCue(raw) {
  const from = Math.max(0, number(raw?.from));
  const to = Math.max(from + 0.1, number(raw?.to, from + 1));
  return {
    id: String(raw?.id || crypto.randomUUID()),
    from,
    to,
    relation: raw?.relation === "below" ? "below" : "above",
    target: String(raw?.target || "")
  };
}

function normalizeRule(raw) {
  return { cues: Array.isArray(raw?.cues) ? raw.cues.map(normalizeCue).filter((cue) => cue.target) : [] };
}

function customStore(block) {
  return block.querySelector(":scope > .custom-state-store, :scope > .remote-video-state");
}

function customPayload(block) {
  const store = customStore(block);
  const start = store?.value?.indexOf("{") ?? -1;
  if (start < 0) return null;
  try { return JSON.parse(store.value.slice(start)); } catch { return null; }
}

function writeCustom(block, rule) {
  const store = customStore(block);
  const payload = customPayload(block);
  if (!store || !payload) return;
  payload.layerRule = rule;
  const start = store.value.indexOf("{");
  const marker = start >= 0 ? store.value.slice(0, start) : CUSTOM_MARKER;
  store.value = `${marker}${JSON.stringify(payload)}`;
}

function readRule(block) {
  try {
    if (block.dataset.layerRuleData) return normalizeRule(JSON.parse(block.dataset.layerRuleData));
  } catch { /* try custom state */ }
  return normalizeRule(customPayload(block)?.layerRule);
}

function storeRule(block, rule) {
  const normalized = normalizeRule(rule);
  block.dataset.layerRuleData = JSON.stringify(normalized);
  block.classList.toggle("has-layer-cues", normalized.cues.length > 0);
  writeCustom(block, normalized);
  workspace.dispatchEvent(new CustomEvent("flashframe:workspace-changed", { bubbles: true }));
}

function blocks() {
  return [...workspace.querySelectorAll(".block")];
}

function blockById(id) {
  return blocks().find((block) => block.dataset.blockId === id) || null;
}

function applyActiveConstraints() {
  const all = blocks();
  const byId = new Map(all.map((block) => [block.dataset.blockId, block]));
  const edges = new Map(all.map((block) => [block.dataset.blockId, new Set()]));
  const indegree = new Map(all.map((block) => [block.dataset.blockId, 0]));
  for (const entry of active.values()) {
    if (!byId.has(entry.owner) || !byId.has(entry.target)) continue;
    const lower = entry.relation === "above" ? entry.target : entry.owner;
    const higher = entry.relation === "above" ? entry.owner : entry.target;
    if (edges.get(lower).has(higher)) continue;
    edges.get(lower).add(higher);
    indegree.set(higher, indegree.get(higher) + 1);
  }
  const baseOrder = all.sort((a, b) => number(a.style.zIndex, 1) - number(b.style.zIndex, 1));
  const queue = baseOrder.map((block) => block.dataset.blockId).filter((id) => indegree.get(id) === 0);
  const ordered = [];
  while (queue.length) {
    const id = queue.shift();
    ordered.push(id);
    for (const higher of edges.get(id)) {
      indegree.set(higher, indegree.get(higher) - 1);
      if (indegree.get(higher) === 0) queue.push(higher);
    }
  }
  if (ordered.length !== all.length) {
    document.querySelector("#status").textContent = "A layer-rule cycle was skipped. Edit the involved objects so above/below rules do not contradict.";
    return;
  }
  ordered.forEach((id, index) => { byId.get(id).style.zIndex = String(index + 1); });
}

function clearScheduled() {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
  active.clear();
}

function clearTimersOnly() {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
}

function scheduleCues(block, localTime = 0, continueRunning = true) {
  if (localTime < 0 && !continueRunning) return;
  if (!baselineZ.size) {
    for (const candidate of blocks()) baselineZ.set(candidate.dataset.blockId, candidate.style.zIndex || "1");
  }
  const owner = block.dataset.blockId;
  for (const cue of readRule(block).cues) {
    const key = `${owner}:${cue.id}`;
    if (cue.from <= localTime && localTime < cue.to) {
      active.set(key, { owner, target: cue.target, relation: cue.relation });
    }
    if (!continueRunning) continue;
    if (cue.from > localTime) {
      const startTimer = setTimeout(() => {
        timers.delete(startTimer);
        active.set(key, { owner, target: cue.target, relation: cue.relation });
        applyActiveConstraints();
      }, (cue.from - localTime) * 1000);
      timers.add(startTimer);
    }
    if (cue.to > localTime) {
      const endTimer = setTimeout(() => {
        timers.delete(endTimer);
        active.delete(key);
        if (active.size) applyActiveConstraints();
        else restoreBaseline();
      }, (cue.to - localTime) * 1000);
      timers.add(endTimer);
    }
  }
  if (active.size) applyActiveConstraints();
}

function restoreBaseline() {
  for (const block of blocks()) {
    const saved = baselineZ.get(block.dataset.blockId);
    if (saved != null) block.style.zIndex = saved;
  }
  baselineZ.clear();
}

function startMasterRules() {
  clearScheduled();
  restoreBaseline();
  for (const block of blocks()) baselineZ.set(block.dataset.blockId, block.style.zIndex || "1");
  for (const block of blocks()) {
    if (!block.dataset.timedMotion) scheduleCues(block);
  }
}

function setRulesAt(detail, continueRunning) {
  clearScheduled();
  restoreBaseline();
  for (const block of blocks()) baselineZ.set(block.dataset.blockId, block.style.zIndex || "1");
  const masterTime = Math.max(0, number(detail?.time));
  const starts = detail?.starts || {};
  for (const block of blocks()) {
    const localTime = block.dataset.timedMotion ? masterTime - number(starts[block.dataset.blockId]) : masterTime;
    scheduleCues(block, localTime, continueRunning);
  }
}

function stopRules() {
  clearScheduled();
  restoreBaseline();
}

function overlaps(a, b) {
  return a.from < b.to && b.from < a.to;
}

function validate(cues) {
  for (let i = 0; i < cues.length; i += 1) {
    if (!cues[i].target) return "Every row needs a target object.";
    if (cues[i].to <= cues[i].from) return "Every row must end after it starts.";
    for (let j = i + 1; j < cues.length; j += 1) {
      if (cues[i].target === cues[j].target && cues[i].relation !== cues[j].relation && overlaps(cues[i], cues[j])) {
        return "The same object cannot be both above and below this object during overlapping time.";
      }
    }
  }
  return "";
}

function makeDraggable(element) {
  const head = element.querySelector(".layer-rule-head");
  head.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button")) return;
    event.preventDefault();
    const rect = element.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    head.setPointerCapture(event.pointerId);
    element.classList.add("is-dragging");
    const move = (moveEvent) => {
      element.style.left = `${Math.min(window.innerWidth - element.offsetWidth - 8, Math.max(8, rect.left + moveEvent.clientX - startX))}px`;
      element.style.top = `${Math.min(window.innerHeight - element.offsetHeight - 8, Math.max(8, rect.top + moveEvent.clientY - startY))}px`;
    };
    const finish = () => {
      element.classList.remove("is-dragging");
      head.removeEventListener("pointermove", move);
      head.removeEventListener("pointerup", finish);
      head.removeEventListener("pointercancel", finish);
    };
    head.addEventListener("pointermove", move);
    head.addEventListener("pointerup", finish);
    head.addEventListener("pointercancel", finish);
  });
}

function cueRow(cue, owner) {
  const row = document.createElement("div");
  row.className = "layer-cue-row";
  row.dataset.cueId = cue.id;
  row.innerHTML = `
    <label>From<input data-field="from" type="number" min="0" step="0.1" value="${cue.from}"></label>
    <label>To<input data-field="to" type="number" min="0.1" step="0.1" value="${cue.to}"></label>
    <label>Position<select data-field="relation"><option value="above">Above</option><option value="below">Below</option></select></label>
    <label>Object<select data-field="target"><option value="">Choose object…</option></select></label>
    <button class="layer-cue-remove" data-action="remove" type="button" title="Remove row">×</button>
  `;
  row.querySelector('[data-field="relation"]').value = cue.relation;
  const target = row.querySelector('[data-field="target"]');
  for (const candidate of blocks().filter((block) => block !== owner)) target.append(new Option(candidate.querySelector(".block-name")?.value || "Untitled", candidate.dataset.blockId));
  target.value = cue.target;
  return row;
}

function openPanel(block) {
  panel?.remove();
  const draft = readRule(block).cues.map((cue) => ({ ...cue }));
  panel = document.createElement("section");
  panel.className = "layer-rule-panel";
  panel.innerHTML = `
    <div class="layer-rule-head"><strong>Layer timing — ${block.querySelector(".block-name")?.value || "Object"}</strong><button data-action="close" type="button">×</button></div>
    <p class="layer-rule-clock-note">${block.dataset.timedMotion ? "Times use this object's own clock, beginning when its action is triggered." : "Times use the current frame's master clock."}</p>
    <div class="layer-cue-list"></div>
    <p class="layer-rule-error"></p>
    <div class="layer-rule-actions"><button data-action="add" type="button">+ Add layer row</button><button data-action="save" type="button">Save rules</button><button data-action="clear" type="button">Clear all</button></div>
  `;
  const list = panel.querySelector(".layer-cue-list");
  const render = () => {
    list.replaceChildren(...draft.map((cue) => cueRow(cue, block)));
  };
  render();
  panel.style.left = `${Math.min(window.innerWidth - 622, Math.max(12, block.getBoundingClientRect().right + 12))}px`;
  panel.style.top = `${Math.min(window.innerHeight - 420, Math.max(12, block.getBoundingClientRect().top))}px`;
  document.body.append(panel);
  makeDraggable(panel);
  panel.addEventListener("input", (event) => {
    const row = event.target.closest(".layer-cue-row");
    if (!row) return;
    const cue = draft.find((item) => item.id === row.dataset.cueId);
    const field = event.target.dataset.field;
    if (field === "from" || field === "to") cue[field] = Math.max(0, number(event.target.value));
    if (field === "relation" || field === "target") cue[field] = event.target.value;
    panel.querySelector(".layer-rule-error").textContent = validate(draft);
  });
  panel.addEventListener("click", (event) => {
    const action = event.target.dataset.action;
    if (action === "close") { panel.remove(); panel = null; }
    if (action === "add") { draft.push(normalizeCue({ from: 0, to: 1, relation: "above" })); render(); }
    if (action === "remove") { const id = event.target.closest(".layer-cue-row").dataset.cueId; draft.splice(draft.findIndex((cue) => cue.id === id), 1); render(); }
    if (action === "clear") { storeRule(block, { cues: [] }); panel.remove(); panel = null; }
    if (action === "save") {
      const error = validate(draft);
      panel.querySelector(".layer-rule-error").textContent = error;
      if (!error) { storeRule(block, { cues: draft }); panel.remove(); panel = null; }
    }
  });
}

function prepare(block) {
  if (!(block instanceof HTMLElement) || !block.classList.contains("block")) return;
  const payloadRule = customPayload(block)?.layerRule;
  if (!block.dataset.layerRuleData && payloadRule) block.dataset.layerRuleData = JSON.stringify(payloadRule);
  block.classList.toggle("has-layer-cues", readRule(block).cues.length > 0);
}

window.addEventListener("flashframe:edit-layer-rule", (event) => event.detail?.block && openPanel(event.detail.block));
window.addEventListener("flashframe:frame-sequence-cycle", startMasterRules);
window.addEventListener("flashframe:frame-sequence-resumed", (event) => setRulesAt(event.detail, true));
window.addEventListener("flashframe:frame-sequence-paused", clearTimersOnly);
window.addEventListener("flashframe:frame-sequence-seek", (event) => setRulesAt(event.detail, false));
window.addEventListener("flashframe:frame-sequence-stopped", stopRules);
window.addEventListener("flashframe:timed-motion-started", (event) => {
  if (!document.documentElement.dataset.frameSequencePlaying && event.detail?.block) scheduleCues(event.detail.block);
});
window.addEventListener("flashframe:restore-layer-rule", (event) => prepare(event.detail?.block));

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) for (const node of mutation.addedNodes) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.classList.contains("block")) prepare(node);
    for (const block of node.querySelectorAll?.(".block") ?? []) prepare(block);
  }
});
observer.observe(workspace, { childList: true, subtree: false });
for (const block of workspace.querySelectorAll(".block")) prepare(block);
