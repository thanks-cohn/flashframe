import { ActionRegistry, runBatch } from "./action-registry.js";
import { SelectionModel } from "./selection-model.js";
import { imageElementToBlob, alphaBounds } from "./image-operations.js";
import { saveBlobAs } from "./native-save.js";
import { zipSync } from "../vendor/fflate.mjs";
import { PDFDocument } from "../vendor/pdf-lib.mjs";

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
function showDialog(title, content, applyLabel = "Apply") {
  return new Promise((resolve) => { const dialog=document.createElement("dialog");dialog.className="utility-dialog";dialog.innerHTML=`<form method="dialog"><h2></h2><div class="utility-dialog-body"></div><div class="utility-dialog-actions"><button type="button">Cancel</button><button type="submit">${applyLabel}</button></div></form>`;dialog.querySelector("h2").textContent=title;dialog.querySelector(".utility-dialog-body").append(content);document.body.append(dialog);dialog.querySelector('[type="button"]').onclick=()=>dialog.close("cancel");dialog.onclose=()=>{const accepted=dialog.returnValue!=="cancel";dialog.remove();resolve(accepted?content:null);};dialog.showModal(); });
}
async function resizeOptions(image) { const panel=document.createElement("div");panel.className="resize-panel";panel.innerHTML=`<label>Width <input name="width" type="number" min="1" value="${image.naturalWidth}"></label><label>Height <input name="height" type="number" min="1" value="${image.naturalHeight}"></label><label><input name="lock" type="checkbox" checked> Lock aspect ratio</label><div><button type="button" data-scale=".5">50%</button> <button type="button" data-scale="2">200%</button></div>`;const width=panel.querySelector('[name="width"]'),height=panel.querySelector('[name="height"]'),ratio=image.naturalWidth/image.naturalHeight;width.oninput=()=>{if(panel.querySelector('[name="lock"]').checked)height.value=Math.round(width.value/ratio);};height.oninput=()=>{if(panel.querySelector('[name="lock"]').checked)width.value=Math.round(height.value*ratio);};panel.querySelectorAll("[data-scale]").forEach(button=>button.onclick=()=>{width.value=Math.round(image.naturalWidth*button.dataset.scale);height.value=Math.round(image.naturalHeight*button.dataset.scale);});if(!await showDialog("Resize image",panel))return null;return{width:Number(width.value),height:Number(height.value),lockAspect:panel.querySelector('[name="lock"]').checked}; }
async function cropOptions(image) { const panel=document.createElement("div");panel.className="crop-panel";const stage=document.createElement("div");stage.className="crop-stage";const preview=image.cloneNode();preview.removeAttribute("style");const box=document.createElement("div");box.className="crop-box";for(const edge of["nw","ne","sw","se"]){const handle=document.createElement("span");handle.className=`crop-handle crop-handle-${edge}`;handle.dataset.edge=edge;box.append(handle);}stage.append(preview,box);panel.append(stage);let rect={x:.1,y:.1,width:.8,height:.8};const paint=()=>Object.assign(box.style,{left:`${rect.x*100}%`,top:`${rect.y*100}%`,width:`${rect.width*100}%`,height:`${rect.height*100}%`});paint();box.onpointerdown=(event)=>{event.preventDefault();const bounds=stage.getBoundingClientRect(),edge=event.target.dataset.edge,start={clientX:event.clientX,clientY:event.clientY,...rect};box.setPointerCapture(event.pointerId);box.onpointermove=(move)=>{const dx=(move.clientX-start.clientX)/bounds.width,dy=(move.clientY-start.clientY)/bounds.height;if(!edge){rect.x=Math.max(0,Math.min(1-rect.width,start.x+dx));rect.y=Math.max(0,Math.min(1-rect.height,start.y+dy));}else{const left=edge.includes("w")?Math.max(0,Math.min(start.x+start.width-.02,start.x+dx)):start.x,top=edge.includes("n")?Math.max(0,Math.min(start.y+start.height-.02,start.y+dy)):start.y,right=edge.includes("e")?Math.min(1,Math.max(start.x+.02,start.x+start.width+dx)):start.x+start.width,bottom=edge.includes("s")?Math.min(1,Math.max(start.y+.02,start.y+start.height+dy)):start.y+start.height;rect={x:left,y:top,width:right-left,height:bottom-top};}paint();};box.onpointerup=()=>{box.onpointermove=null;};};if(!await showDialog("Crop image — drag or resize the crop box",panel))return null;return{x:Math.round(rect.x*image.naturalWidth),y:Math.round(rect.y*image.naturalHeight),width:Math.round(rect.width*image.naturalWidth),height:Math.round(rect.height*image.naturalHeight)}; }

register({ id: "object.rename", label: "Rename", appliesTo: (s) => s.length > 0, async run({ selection: items }) {
  if (items.length === 1) { const value = prompt("New name", nameOf(items[0])); if (value?.trim()) items[0].querySelector(".block-name").value = value.trim(); return; }
  const panel=document.createElement("div");panel.className="batch-rename-panel";panel.innerHTML='<label>Prefix <input name="prefix"></label><label>Suffix <input name="suffix"></label><label>Search <input name="search"></label><label>Replace <input name="replace"></label><label><input name="sequence" type="checkbox" checked> Add sequence number</label><ol></ol>';const preview=()=>{const data=Object.fromEntries(new FormData(panel.closest("form")||document.createElement("form")));const prefix=panel.querySelector('[name=prefix]').value,suffix=panel.querySelector('[name=suffix]').value,search=panel.querySelector('[name=search]').value,replacement=panel.querySelector('[name=replace]').value,sequence=panel.querySelector('[name=sequence]').checked;panel.querySelector("ol").replaceChildren(...items.map((item,index)=>{const li=document.createElement("li");let value=nameOf(item);if(search)value=value.split(search).join(replacement);li.textContent=`${prefix}${value}${suffix}${sequence?`-${String(index+1).padStart(String(items.length).length,"0")}`:""}`;return li;}));};panel.addEventListener("input",preview);preview();if(!await showDialog(`Rename ${items.length} objects — preview`,panel))return;[...panel.querySelectorAll("ol li")].forEach((li,index)=>items[index].querySelector(".block-name").value=li.textContent);
} });
register({ id: "object.duplicate", label: "Duplicate", appliesTo: (s) => s.length > 0, async run({ selection: items }) {
  for (const item of items) await window.FrameChuteWorkspace.duplicateBlock(item);
  announce(`${items.length} non-destructive workspace cop${items.length === 1 ? "y" : "ies"} created.`);
} });
register({id:"object.copy-to",label:"Copy To…",appliesTo:(s)=>s.length>0&&typeof window.showDirectoryPicker==="function",async run({selection:items}){let directory;try{directory=await window.showDirectoryPicker({mode:"readwrite"});}catch(error){if(error.name==="AbortError")return;throw error;}let copied=0,excluded=[];for(const item of items){const blob=imageOf(item)?await transformed(item,{format:"png"}):await window.FrameChuteWorkspace.sourceBlob(item);if(!blob){excluded.push(nameOf(item));continue;}const filename=imageOf(item)?`${nameOf(item).replace(/\.[^.]+$/,"")}.png`:nameOf(item),handle=await directory.getFileHandle(filename,{create:true}),writer=await handle.createWritable();await writer.write(blob);await writer.close();copied++;}announce(`${copied} file(s) copied. Originals were not deleted.${excluded.length?` Unsupported: ${excluded.join(", ")}.`:""}`);}});
register({ id: "image.rotate-left", label: "↶ Rotate", appliesTo: applies("image"), async run({ selection: items }) { items.forEach((item) => updateTransform(item, { rotate: (transforms.get(item)?.rotate || 0) - 90 })); } });
register({ id: "image.rotate-right", label: "Rotate ↷", appliesTo: applies("image"), async run({ selection: items }) { items.forEach((item) => updateTransform(item, { rotate: (transforms.get(item)?.rotate || 0) + 90 })); } });
register({ id: "image.flip-x", label: "Flip Horizontal", appliesTo: applies("image"), async run({ selection: items }) { items.forEach((item) => updateTransform(item, { flipX: !transforms.get(item)?.flipX })); } });
register({ id: "image.flip-y", label: "Flip Vertical", appliesTo: applies("image"), async run({ selection: items }) { items.forEach((item) => updateTransform(item, { flipY: !transforms.get(item)?.flipY })); } });
register({ id: "image.resize", label: "Resize", appliesTo: applies("image"), async run({ selection: items, progress }) {
  const options=await resizeOptions(imageOf(items[0]));if(!options)return;
  const results = await runBatch(items, async (item) => { const blob = await transformed(item, { ...options, format: "png" }); addResult(blob, `${nameOf(item)}-${options.width}px.png`); }, { onProgress: progress });
  announce(`${results.filter((r) => r.status === "fulfilled").length} resized image result(s) added.`);
} });
register({ id: "image.crop", label: "Crop", appliesTo: applies("image", { max: 1 }), async run({ selection: [item] }) {
  const crop=await cropOptions(imageOf(item));if(!crop)return;updateTransform(item,{crop});announce("Crop is non-destructive. Use Save As to bake it.");
} });
register({ id: "image.trim-alpha", label: "Trim transparency", appliesTo: applies("image", { max: 1 }), async run({ selection: [item] }) {
  const image = imageOf(item), canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d"); context.drawImage(image, 0, 0); const bounds = alphaBounds(context.getImageData(0,0,canvas.width,canvas.height).data, canvas.width, canvas.height);
  if (!bounds) throw new Error("The image is fully transparent"); updateTransform(item, { crop: bounds }); announce("Transparent margins trimmed non-destructively.");
} });
register({id:"image.color-transparent",label:"Make color transparent",appliesTo:applies("image"),async run({selection:items}){const panel=document.createElement("div");panel.innerHTML='<label>Color <input type="color" value="#ffffff"></label><label>Tolerance <input type="range" min="0" max="150" value="30"></label>';if(!await showDialog("Make a color transparent",panel))return;items.forEach(item=>updateTransform(item,{transparentColor:panel.querySelector('[type=color]').value,tolerance:Number(panel.querySelector('[type=range]').value)}));}});
register({id:"image.fill-background",label:"Fill background",appliesTo:applies("image"),async run({selection:items}){const color=prompt("Background color", "#ffffff");if(color)items.forEach(item=>updateTransform(item,{background:color}));}});
register({id:"image.privacy-region",label:"Blur / pixelate",appliesTo:applies("image",{max:1}),async run({selection:[item]}){const crop=await cropOptions(imageOf(item));if(!crop)return;const image=imageOf(item),effect=confirm("OK for pixelate, Cancel for blur")?"pixelate":"blur",region={x:crop.x/image.naturalWidth,y:crop.y/image.naturalHeight,width:crop.width/image.naturalWidth,height:crop.height/image.naturalHeight,effect};updateTransform(item,{regions:[...(transforms.get(item)?.regions||[]),region]});announce(`${effect} region added non-destructively.`);}});
register({id:"image.annotate",label:"Annotate",appliesTo:applies("image",{max:1}),async run({selection:[item]}){const choice=(prompt("Annotation type: text, rectangle, or arrow","text")||"").toLowerCase();if(!choice)return;let annotation;if(choice.startsWith("t")){const text=prompt("Annotation text","");if(text==null)return;annotation={type:"text",text,x:.1,y:.15,color:"#ff0000",size:28};}else if(choice.startsWith("a")||choice.startsWith("l"))annotation={type:"arrow",x:.1,y:.2,endX:.7,endY:.7,color:"#ff0000",width:4};else annotation={type:"rectangle",x:.1,y:.1,width:.5,height:.3,color:"#ff0000"};updateTransform(item,{annotations:[...(transforms.get(item)?.annotations||[]),annotation]});announce("Annotation added. It remains editable in the snapshot until Save As.");}});
register({ id: "image.straighten", label: "Straighten", appliesTo: applies("image"), async run({ selection: items }) { const degrees = Number(prompt("Straighten angle (-15 to 15 degrees)", "0")); if (!Number.isFinite(degrees)) return; items.forEach((item) => updateTransform(item, { straighten: Math.max(-15, Math.min(15, degrees)) })); } });
register({id:"image.perspective",label:"Perspective",appliesTo:applies("image",{max:1}),async run({selection:[item]}){const inset=Math.max(0,Math.min(45,Number(prompt("Basic four-corner correction: top edge inset percent", "8"))||0))/100;updateTransform(item,{perspective:[[inset,0],[1-inset,0],[1,1],[0,1]]});announce("Basic four-corner perspective correction applied non-destructively.");}});
register({ id: "image.save-as", label: "Save As", appliesTo: applies("image"), async run({ selection: items, progress }) {
  const panel=document.createElement("div");panel.className="export-panel";panel.innerHTML='<label>Format <select name="format"><option value="webp">WebP</option><option value="jpeg">JPEG</option><option value="png">PNG</option></select></label><label>Quality <input name="quality" type="range" min="10" max="100" value="86"><output>86%</output></label><label>Transparency background <input name="background" type="color" value="#ffffff"></label><p>The source remains unchanged. Encoded byte size is reported after export.</p>';panel.querySelector('[name="quality"]').oninput=e=>panel.querySelector("output").value=`${e.target.value}%`;if(!await showDialog(items.length>1?`Convert/compress ${items.length} images`:"Convert / compress image",panel,"Save As"))return;const format=panel.querySelector('[name="format"]').value,quality=Number(panel.querySelector('[name="quality"]').value)/100,background=format==="jpeg"?panel.querySelector('[name="background"]').value:undefined;
  const sizes=[],batchFiles={};await runBatch(items, async (item) => { const blob = await transformed(item, { format, quality, background });let before=null;try{const response=await fetch(imageOf(item).currentSrc||imageOf(item).src);before=Number(response.headers.get("content-length"))|| (await response.blob()).size;}catch{}sizes.push([before,blob.size]);const extension=format==="jpeg"?"jpg":format,filename=`${nameOf(item).replace(/\.[^.]+$/,"")}.${extension}`;if(items.length>1)batchFiles[filename]=new Uint8Array(await blob.arrayBuffer());else await saveBlobAs({ blob, filename, extension, mimeType: blob.type, description: "Image" }); }, { onProgress: progress });
  if(items.length>1)await saveBlobAs({blob:new Blob([zipSync(batchFiles)],{type:"application/zip"}),filename:`converted-${format}-images.zip`,extension:"zip",mimeType:"application/zip",description:"Converted image batch"});
  if(items.length===1)announce(`${sizes[0][0]?.toLocaleString()||"Unknown source size"} → ${sizes[0][1].toLocaleString()} bytes. Source unchanged.`);else announce(`${items.length} images encoded with one shared configuration.`);
} });
register({ id: "image.stitch", label: "Stitch", appliesTo: applies("image", { min: 2 }), async run({ selection: items }) {
  const direction = prompt("Stitch direction: vertical or horizontal", "vertical"); if (!direction) return;
  const images = items.map(imageOf), vertical = direction.toLowerCase() !== "horizontal", canvas = document.createElement("canvas");
  canvas.width = vertical ? Math.max(...images.map(i => i.naturalWidth)) : images.reduce((n,i) => n+i.naturalWidth,0);
  canvas.height = vertical ? images.reduce((n,i) => n+i.naturalHeight,0) : Math.max(...images.map(i => i.naturalHeight));
  const ctx = canvas.getContext("2d"); let offset = 0; for (const image of images) { ctx.drawImage(image, vertical ? 0 : offset, vertical ? offset : 0); offset += vertical ? image.naturalHeight : image.naturalWidth; }
  const blob = await new Promise(r => canvas.toBlob(r, "image/png")); addResult(blob, "stitched-images.png");
} });
register({id:"image.contact-sheet",label:"Contact sheet",appliesTo:applies("image",{min:2}),async run({selection:items}){const images=items.map(imageOf),columns=Math.ceil(Math.sqrt(images.length)),cell=220,caption=28,rows=Math.ceil(images.length/columns),canvas=document.createElement("canvas");canvas.width=columns*cell;canvas.height=rows*(cell+caption);const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);images.forEach((image,index)=>{const x=index%columns*cell,y=Math.floor(index/columns)*(cell+caption),scale=Math.min(cell/image.naturalWidth,cell/image.naturalHeight);ctx.drawImage(image,x+(cell-image.naturalWidth*scale)/2,y,image.naturalWidth*scale,image.naturalHeight*scale);ctx.fillStyle="#111";ctx.font="14px sans-serif";ctx.fillText(nameOf(items[index]).slice(0,28),x+6,y+cell+19);});const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));addResult(blob,"contact-sheet.png");}});
register({id:"image.icons",label:"Generate icons",appliesTo:applies("image",{max:1}),async run({selection:[item]}){const files={};for(const size of [16,32,48,128,192,512])files[`icon-${size}.png`]=new Uint8Array(await (await transformed(item,{width:size,height:size,lockAspect:false,format:"png"})).arrayBuffer());await saveBlobAs({blob:new Blob([zipSync(files)],{type:"application/zip"}),filename:"icons.zip",extension:"zip",mimeType:"application/zip",description:"Icon set"});}});
register({id:"image.compare",label:"Compare",appliesTo:applies("image",{min:2,max:2}),async run({selection:items}){const panel=document.createElement("div");panel.className="compare-panel";const first=imageOf(items[0]).cloneNode(),second=imageOf(items[1]).cloneNode(),range=document.createElement("input");range.type="range";range.min=0;range.max=100;range.value=50;second.style.opacity=".5";range.oninput=()=>second.style.opacity=String(Number(range.value)/100);panel.append(first,second,range);await showDialog("Compare two images — adjust opacity",panel,"Done");}});
register({id:"image.make-pdf",label:"Make PDF",appliesTo:applies("image"),async run({selection:items}){const pdf=await PDFDocument.create();for(const item of items){const blob=await transformed(item,{format:"png"}),embedded=await pdf.embedPng(await blob.arrayBuffer()),page=pdf.addPage([embedded.width,embedded.height]);page.drawImage(embedded,{x:0,y:0,width:embedded.width,height:embedded.height});}const blob=new Blob([await pdf.save()],{type:"application/pdf"});window.dispatchEvent(new CustomEvent("framechute:add-result-object",{detail:{blob,name:"images.pdf",kind:"pdf"}}));}});
register({id:"csv.merge",label:"Merge CSVs",appliesTo:applies("csv",{min:2}),async run({selection:items}){const records=items.map(item=>window.FrameChuteWorkspace.captureBlock(item)),headers=records.map(record=>JSON.stringify(record.state.rows?.[0]||[]));if(!headers.every(header=>header===headers[0]))throw new Error("CSV headers are not compatible.");const rows=[records[0].state.rows[0],...records.flatMap(record=>record.state.rows.slice(1))];await window.FrameChuteWorkspace.createBlock({type:"csv",name:"merged.csv",state:{rows}});announce(`${items.length} compatible CSV tables merged.`);}});
register({ id: "video.extract-frame", label: "Extract Frame", appliesTo: applies("video", { max: 1 }), async run({ selection: [item] }) {
  const video = item.querySelector("video"); if (!video?.videoWidth) throw new Error("Seek to a decoded video frame first");
  const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight; canvas.getContext("2d").drawImage(video,0,0);
  const blob = await new Promise(r => canvas.toBlob(r,"image/png")); addResult(blob, `${nameOf(item)}-frame.png`); announce("Frame extracted as an editable image object.");
} });
register({ id: "selection.zip", label: "Compress to ZIP", appliesTo: (s) => s.length > 1, async run({ selection: items }) {
  const files = {}, excluded=[]; for (const item of items) { const image = imageOf(item); let blob,filename=nameOf(item);if(image){blob=await transformed(item,{format:"png"});filename=`${filename.replace(/\.[^.]+$/,"")}.png`;}else blob=await window.FrameChuteWorkspace.sourceBlob(item);if(blob)files[filename]=new Uint8Array(await blob.arrayBuffer());else excluded.push(filename); }
  if (!Object.keys(files).length) throw new Error("None of the selected objects expose safe source or result bytes.");
  await saveBlobAs({ blob: new Blob([zipSync(files)], { type: "application/zip" }), filename: "framechute-selection.zip", extension: "zip", mimeType: "application/zip", description: "ZIP archive" });
  if(excluded.length)announce(`ZIP saved. Excluded unsupported objects: ${excluded.join(", ")}.`);
} });

function updateTransform(item, patch) {
  const value = { ...(transforms.get(item) || {}), ...patch }; transforms.set(item, value);
  const image = imageOf(item); if (image) image.style.transform = `rotate(${(value.rotate || 0) + (value.straighten || 0)}deg) scaleX(${value.flipX ? -1 : 1}) scaleY(${value.flipY ? -1 : 1})`;
  item.dataset.utilityTransformed = "true";
}
function render() {
  const items = selection.items; workspace.querySelectorAll(".block").forEach((node) => node.classList.toggle("is-quick-selected", selection.has(node)));
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
window.addEventListener("framechute:block-captured", (event) => {
  const { block, record } = event.detail; const value = transforms.get(block); if (!value) return;
  record.state.quickActionTransforms = structuredClone(value);
  if (typeof record.state.text === "string" && record.state.text.startsWith("__FLASHFRAME_CUSTOM_BLOCK_V1__")) {
    const marker = "__FLASHFRAME_CUSTOM_BLOCK_V1__"; const payload = JSON.parse(record.state.text.slice(marker.length)); payload.quickActionTransforms = value; record.state.text = marker + JSON.stringify(payload);
  }
});
function restoreTransforms(block, value) { if (!value) return; transforms.set(block, structuredClone(value)); updateTransform(block, {}); }
window.addEventListener("framechute:block-restored", (event) => restoreTransforms(event.detail.block, event.detail.record.state?.quickActionTransforms));
window.addEventListener("framechute:custom-block-ready", (event) => restoreTransforms(event.detail.block, event.detail.payload?.quickActionTransforms));
selection.addEventListener("change", render);
workspace.addEventListener("click", (event) => { const block=event.target.closest(".block"); if (!block || event.target.closest("button,input,textarea,[contenteditable=true]")) return; if (event.ctrlKey||event.metaKey||event.shiftKey) selection.toggle(block); else selection.replace(block); });
workspace.addEventListener("contextmenu", (event) => { const block=event.target.closest(".block"); if (!block) return; event.preventDefault(); selection.has(block) ? render() : selection.replace(block); });
new MutationObserver((mutations) => { selection.items.filter((item)=>!item.isConnected).forEach((item)=>selection.remove(item)); for (const mutation of mutations) for (const node of mutation.addedNodes) if (node instanceof HTMLElement && node.classList.contains("block")) enhanceSelectionControl(node); }).observe(workspace,{childList:true});
workspace.querySelectorAll(".block").forEach(enhanceSelectionControl);

window.FrameChuteActions = Object.freeze({ registry, selection, runBatch, addResult });
