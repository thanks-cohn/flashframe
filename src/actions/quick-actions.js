import { ActionRegistry, runBatch } from "./action-registry.js";
import { SelectionModel } from "./selection-model.js";
import { imageElementToBlob, alphaBounds } from "./image-operations.js";
import { saveBlobAs } from "./native-save.js";
import { zipSync, strToU8 } from "../vendor/fflate.mjs";

const workspace = document.querySelector("#workspace");
const status = document.querySelector("#status");
const registry = new ActionRegistry();
const selection = new SelectionModel();
const transforms = new WeakMap();

const bar = document.createElement("aside");
bar.className = "quick-actions"; bar.hidden = true; bar.setAttribute("aria-label", "Quick Actions");
bar.innerHTML = '<strong class="quick-actions-title">Quick Actions</strong><span class="quick-actions-count"></span><div class="quick-actions-buttons"></div><button class="quick-actions-clear" type="button">Clear</button><progress hidden></progress>';
document.body.append(bar);
bar.querySelector(".quick-actions-clear").addEventListener("click", () => selection.clear());

function kind(block) {
  if (block.dataset.customKind === "image" || block.querySelector(".image-frame")) return "image";
  if (block.dataset.blockType === "pdf" || block.classList.contains("pdf-block")) return "pdf";
  if (block.dataset.customLocalKind === "video" || block.querySelector("video")) return "video";
  if (block.dataset.utilityKind) return block.dataset.utilityKind;
  return block.dataset.blockType || "file";
}
function nameOf(block) { return block.querySelector(".block-name")?.value || "result"; }
function imageOf(block) { return block.querySelector(".image-frame, .gallery-image, img"); }
function applies(type, { min = 1, max = Infinity } = {}) { return (items) => items.length >= min && items.length <= max && items.every((item) => kind(item) === type); }
function announce(message) { if (status) status.textContent = message; }
function addResult(blob, name) {
  window.dispatchEvent(new CustomEvent("framechute:add-result-object", { detail: { blob, name, kind: blob.type.startsWith("image/") ? "image" : "file" } }));
}

async function transformed(block, overrides = {}) {
  const image = imageOf(block); if (!image?.complete) throw new Error("The image is not ready yet");
  return imageElementToBlob(image, { ...(transforms.get(block) || {}), ...overrides });
}
function register(action) { registry.register(action); }

register({ id: "object.rename", label: "Rename", appliesTo: (s) => s.length > 0, async run({ selection: items }) {
  if (items.length === 1) { const value = prompt("New name", nameOf(items[0])); if (value?.trim()) items[0].querySelector(".block-name").value = value.trim(); return; }
  const prefix = prompt("Prefix for selected items", "item-"); if (prefix == null) return;
  items.forEach((item, i) => { item.querySelector(".block-name").value = `${prefix}${String(i + 1).padStart(String(items.length).length, "0")}`; });
} });
register({ id: "object.duplicate", label: "Duplicate", appliesTo: (s) => s.length > 0, async run({ selection: items }) {
  for (const item of items) { const clone = item.cloneNode(true); clone.style.left = `${item.offsetLeft + 28}px`; clone.style.top = `${item.offsetTop + 28}px`; clone.dataset.blockId = crypto.randomUUID(); workspace.append(clone); }
  announce(`${items.length} non-destructive workspace cop${items.length === 1 ? "y" : "ies"} created.`);
} });
register({ id: "image.rotate-left", label: "↶ Rotate", appliesTo: applies("image"), async run({ selection: items }) { items.forEach((item) => updateTransform(item, { rotate: (transforms.get(item)?.rotate || 0) - 90 })); } });
register({ id: "image.rotate-right", label: "Rotate ↷", appliesTo: applies("image"), async run({ selection: items }) { items.forEach((item) => updateTransform(item, { rotate: (transforms.get(item)?.rotate || 0) + 90 })); } });
register({ id: "image.flip-x", label: "Flip", appliesTo: applies("image"), async run({ selection: items }) { items.forEach((item) => updateTransform(item, { flipX: !transforms.get(item)?.flipX })); } });
register({ id: "image.resize", label: "Resize", appliesTo: applies("image"), async run({ selection: items, progress }) {
  const first = imageOf(items[0]); const width = Number(prompt("Output width in pixels", String(first.naturalWidth || 1200))); if (!width) return;
  const results = await runBatch(items, async (item) => { const blob = await transformed(item, { width, format: "png" }); addResult(blob, `${nameOf(item)}-${width}px.png`); }, { onProgress: progress });
  announce(`${results.filter((r) => r.status === "fulfilled").length} resized image result(s) added.`);
} });
register({ id: "image.crop", label: "Crop", appliesTo: applies("image", { max: 1 }), async run({ selection: [item] }) {
  const image = imageOf(item), w = image.naturalWidth, h = image.naturalHeight;
  const raw = prompt("Crop rectangle: x, y, width, height", `0, 0, ${w}, ${h}`); if (!raw) return;
  const [x, y, width, height] = raw.split(",").map(Number); if (![x,y,width,height].every(Number.isFinite) || width <= 0 || height <= 0) throw new Error("Enter four valid crop numbers");
  updateTransform(item, { crop: { x, y, width, height } }); announce("Crop is non-destructive. Use Save As to bake it.");
} });
register({ id: "image.trim-alpha", label: "Trim transparency", appliesTo: applies("image", { max: 1 }), async run({ selection: [item] }) {
  const image = imageOf(item), canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d"); context.drawImage(image, 0, 0); const bounds = alphaBounds(context.getImageData(0,0,canvas.width,canvas.height).data, canvas.width, canvas.height);
  if (!bounds) throw new Error("The image is fully transparent"); updateTransform(item, { crop: bounds }); announce("Transparent margins trimmed non-destructively.");
} });
register({ id: "image.straighten", label: "Straighten", appliesTo: applies("image"), async run({ selection: items }) { const degrees = Number(prompt("Straighten angle (-15 to 15 degrees)", "0")); if (!Number.isFinite(degrees)) return; items.forEach((item) => updateTransform(item, { straighten: Math.max(-15, Math.min(15, degrees)) })); } });
register({ id: "image.save-as", label: "Save As", appliesTo: applies("image"), async run({ selection: items, progress }) {
  const format = (prompt("Format: png, jpeg, or webp", "webp") || "").toLowerCase(); if (!["png","jpeg","webp"].includes(format)) return;
  const quality = format === "png" ? 1 : Math.max(.1, Math.min(1, Number(prompt("Quality (0.1–1)", ".86")) || .86));
  const background = format === "jpeg" ? (prompt("JPEG background color", "#ffffff") || "#ffffff") : undefined;
  await runBatch(items, async (item) => { const blob = await transformed(item, { format, quality, background }); await saveBlobAs({ blob, filename: nameOf(item), extension: format === "jpeg" ? "jpg" : format, mimeType: blob.type, description: "Image" }); }, { onProgress: progress });
} });
register({ id: "image.stitch", label: "Stitch", appliesTo: applies("image", { min: 2 }), async run({ selection: items }) {
  const direction = prompt("Stitch direction: vertical or horizontal", "vertical"); if (!direction) return;
  const images = items.map(imageOf), vertical = direction.toLowerCase() !== "horizontal", canvas = document.createElement("canvas");
  canvas.width = vertical ? Math.max(...images.map(i => i.naturalWidth)) : images.reduce((n,i) => n+i.naturalWidth,0);
  canvas.height = vertical ? images.reduce((n,i) => n+i.naturalHeight,0) : Math.max(...images.map(i => i.naturalHeight));
  const ctx = canvas.getContext("2d"); let offset = 0; for (const image of images) { ctx.drawImage(image, vertical ? 0 : offset, vertical ? offset : 0); offset += vertical ? image.naturalHeight : image.naturalWidth; }
  const blob = await new Promise(r => canvas.toBlob(r, "image/png")); addResult(blob, "stitched-images.png");
} });
register({ id: "video.extract-frame", label: "Extract Frame", appliesTo: applies("video", { max: 1 }), async run({ selection: [item] }) {
  const video = item.querySelector("video"); if (!video?.videoWidth) throw new Error("Seek to a decoded video frame first");
  const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight; canvas.getContext("2d").drawImage(video,0,0);
  const blob = await new Promise(r => canvas.toBlob(r,"image/png")); addResult(blob, `${nameOf(item)}-frame.png`); announce("Frame extracted as an editable image object.");
} });
register({ id: "selection.zip", label: "Compress to ZIP", appliesTo: (s) => s.length > 1, async run({ selection: items }) {
  const files = {}; for (const item of items) { const image = imageOf(item); if (image) files[`${nameOf(item).replace(/\.[^.]+$/,"")}.png`] = new Uint8Array(await (await transformed(item,{format:"png"})).arrayBuffer()); else files[`${nameOf(item)}.txt`] = strToU8(item.querySelector("textarea")?.value || ""); }
  await saveBlobAs({ blob: new Blob([zipSync(files)], { type: "application/zip" }), filename: "framechute-selection.zip", extension: "zip", mimeType: "application/zip", description: "ZIP archive" });
} });

function updateTransform(item, patch) {
  const value = { ...(transforms.get(item) || {}), ...patch }; transforms.set(item, value);
  const image = imageOf(item); if (image) image.style.transform = `rotate(${(value.rotate || 0) + (value.straighten || 0)}deg) scaleX(${value.flipX ? -1 : 1}) scaleY(${value.flipY ? -1 : 1})`;
  item.dataset.utilityTransformed = "true";
}
function render() {
  const items = selection.items; document.querySelectorAll(".block.is-quick-selected").forEach((node) => node.classList.toggle("is-quick-selected", selection.has(node)));
  bar.hidden = !items.length; if (!items.length) return;
  bar.querySelector(".quick-actions-count").textContent = `${items.length} selected`;
  const buttons = bar.querySelector(".quick-actions-buttons"); buttons.replaceChildren();
  for (const action of registry.available(items)) { const button = document.createElement("button"); button.type="button"; button.textContent=action.label; button.addEventListener("click", async () => { try { button.disabled=true; await registry.run(action.id,{selection:items, progress:(done,total)=>{const p=bar.querySelector("progress");p.hidden=false;p.max=total;p.value=done;}}); } catch(error) { console.error(error); announce(error.message); } finally { button.disabled=false;bar.querySelector("progress").hidden=true;render(); } }); buttons.append(button); }
}
function enhanceSelectionControl(block) {
  if (block.querySelector(":scope > .quick-select-toggle")) return;
  const button = document.createElement("button"); button.type = "button"; button.className = "quick-select-toggle"; button.title = "Add or remove from selection"; button.setAttribute("aria-label", "Add or remove from Quick Actions selection"); button.textContent = "✓";
  button.addEventListener("click", (event) => { event.stopPropagation(); selection.toggle(block); }); block.append(button);
}
selection.addEventListener("change", render);
workspace.addEventListener("click", (event) => { const block=event.target.closest(".block"); if (!block || event.target.closest("button,input,textarea,[contenteditable=true]")) return; if (event.ctrlKey||event.metaKey||event.shiftKey) selection.toggle(block); else selection.replace(block); });
workspace.addEventListener("contextmenu", (event) => { const block=event.target.closest(".block"); if (!block) return; event.preventDefault(); selection.has(block) ? render() : selection.replace(block); });
new MutationObserver((mutations) => { selection.items.filter((item)=>!item.isConnected).forEach((item)=>selection.remove(item)); for (const mutation of mutations) for (const node of mutation.addedNodes) if (node instanceof HTMLElement && node.classList.contains("block")) enhanceSelectionControl(node); }).observe(workspace,{childList:true});
workspace.querySelectorAll(".block").forEach(enhanceSelectionControl);

window.FrameChuteActions = Object.freeze({ registry, selection, runBatch, addResult });
