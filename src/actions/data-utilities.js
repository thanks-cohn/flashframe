import { parseCsv, serializeCsv, removeDuplicateRows } from "./csv.js";
import { saveBlobAs } from "./native-save.js";
import { unzipSync } from "../vendor/fflate.mjs";
import { captureCsvState, restoreCsvState } from "./block-records.js";

const workspace = document.querySelector("#workspace");
const status = document.querySelector("#status");
const api = window.FrameChuteWorkspace;
const archiveRuntime = new WeakMap();
const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const setStatus = (message) => { if (status) status.textContent = message; };
const bytesToBase64 = (bytes) => { let result = ""; for (let at = 0; at < bytes.length; at += 0x8000) result += String.fromCharCode(...bytes.subarray(at, at + 0x8000)); return btoa(result); };
const base64ToBytes = (value) => { const binary = atob(value || ""), bytes = new Uint8Array(binary.length); for (let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i); return bytes; };

function shell(kind) {
  const block=document.createElement("section");block.className=`block utility-block ${kind}-block`;
  block.innerHTML='<div class="block-header"><input class="block-name" aria-label="Block name"><div class="block-actions"><button class="maximize-block" type="button" title="Maximize">□</button><button class="remove-block" type="button" title="Remove">×</button></div></div>';
  return block;
}
function renderTable(block, rows) {
  const table=block.querySelector("table");table.replaceChildren();
  rows.forEach((row,y)=>{const tr=table.insertRow();row.forEach((value,x)=>{const cell=y===0?document.createElement("th"):document.createElement("td");cell.contentEditable="true";cell.textContent=value;cell.dataset.column=x;tr.append(cell);});});
}
const readTable=(block)=>[...block.querySelectorAll("tr")].map(row=>[...row.cells].map(cell=>cell.textContent));
function initializeCsv(block) {
  const tools=document.createElement("div");tools.className="block-toolbar table-toolbar";tools.innerHTML='<input class="table-find" type="search" placeholder="Find / filter rows"><button class="table-add-row">Add row</button><button class="table-remove-row">Remove row</button><button class="table-remove-column">Remove column</button><button class="table-dedupe">Remove duplicates</button><button class="table-save">Save As CSV</button>';
  const scroller=document.createElement("div");scroller.className="table-scroller";scroller.append(document.createElement("table"));block.append(tools,scroller);
  let activeCell=null;block.addEventListener("focusin",event=>{if(event.target.matches("td,th"))activeCell=event.target;});
  tools.querySelector(".table-add-row").onclick=()=>{const rows=readTable(block);rows.push(Array(rows[0]?.length||1).fill(""));renderTable(block,rows);};
  tools.querySelector(".table-remove-row").onclick=()=>{if(activeCell?.parentElement.rowIndex>0){const rows=readTable(block);rows.splice(activeCell.parentElement.rowIndex,1);renderTable(block,rows);}};
  tools.querySelector(".table-remove-column").onclick=()=>{if(activeCell){const column=activeCell.cellIndex;renderTable(block,readTable(block).map(row=>row.filter((_,i)=>i!==column)));}};
  tools.querySelector(".table-dedupe").onclick=()=>{const result=removeDuplicateRows(readTable(block));renderTable(block,result.rows);setStatus(`${result.removed} duplicate row(s) removed.`);};
  tools.querySelector(".table-save").onclick=()=>saveBlobAs({blob:new Blob([serializeCsv(readTable(block))],{type:"text/csv"}),filename:block.querySelector(".block-name").value,extension:"csv",mimeType:"text/csv",description:"CSV table"});
  tools.querySelector(".table-find").oninput=(event)=>{const query=event.target.value.toLowerCase();[...block.querySelector("table").rows].slice(1).forEach(row=>row.hidden=Boolean(query&&!row.textContent.toLowerCase().includes(query)));};
  block.querySelector("table").addEventListener("click",event=>{if(event.target.tagName!=="TH")return;const values=readTable(block),column=Number(event.target.dataset.column),header=values.shift();values.sort((a,b)=>a[column].localeCompare(b[column],undefined,{numeric:true}));renderTable(block,[header,...values]);});
}
api.registerBlockType("csv",{createElement:()=>shell("csv"),initialize:initializeCsv,capture:(block)=>captureCsvState(readTable(block)),restore:(block,state)=>renderTable(block,restoreCsvState(state)),exportBlob:(block)=>new Blob([serializeCsv(readTable(block))],{type:"text/csv"})});

function archiveMime(name) { const ext=name.split(".").pop().toLowerCase(); return ({png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",webp:"image/webp",txt:"text/plain",md:"text/markdown",csv:"text/csv",pdf:"application/pdf",mp4:"video/mp4",webm:"video/webm",mp3:"audio/mpeg",wav:"audio/wav"})[ext]||"application/octet-stream"; }
function archiveTree(paths) { const root={}; for(const path of paths){let node=root;for(const part of path.split("/").filter(Boolean))node=node[part]||(node[part]={});}return root; }
function renderArchive(block, bytes, selected="") {
  let entries;try{entries=unzipSync(bytes,{filter:({originalSize})=>originalSize<=MAX_ARCHIVE_BYTES});}catch(error){setStatus(`Could not open archive: ${error.message}`);return;}
  archiveRuntime.set(block,{bytes,entries});const list=block.querySelector(".archive-entry-list");list.replaceChildren(); const tree=archiveTree(Object.keys(entries));
  const add=(node,parent,prefix="")=>Object.entries(node).forEach(([part,children])=>{const path=prefix?`${prefix}/${part}`:part;if(Object.keys(children).length){const details=document.createElement("details");details.open=true;const summary=document.createElement("summary");summary.textContent=part;details.append(summary);add(children,details,path);parent.append(details);}else if(entries[path]){const row=document.createElement("button");row.type="button";row.className="archive-entry";row.dataset.path=path;row.innerHTML='<span></span><small></small>';row.firstElementChild.textContent=part;row.lastElementChild.textContent=`${entries[path].length.toLocaleString()} bytes`;row.onclick=()=>openEntry(block,path);parent.append(row);}});add(tree,list);if(selected)list.querySelector(`[data-path="${CSS.escape(selected)}"]`)?.focus();
  if(block.dataset.blockType==="cbz"){const images=Object.keys(entries).filter(name=>archiveMime(name).startsWith("image/")).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));const viewer=block.querySelector(".cbz-viewer");if(images.length){let index=Math.max(0,images.indexOf(selected));const show=()=>{const path=images[index];viewer.src=URL.createObjectURL(new Blob([entries[path]],{type:archiveMime(path)}));viewer.alt=path;block.dataset.cbzIndex=String(index);block.dataset.selectedEntry=path;block.querySelector(".cbz-position").textContent=`${index+1} / ${images.length}`;};block.querySelector(".cbz-prev").onclick=()=>{index=(index-1+images.length)%images.length;show();};block.querySelector(".cbz-next").onclick=()=>{index=(index+1)%images.length;show();};show();}}
}
async function openEntry(block,path){const runtime=archiveRuntime.get(block),bytes=runtime?.entries[path];if(!bytes)return;block.dataset.selectedEntry=path;const name=path.split("/").pop(),type=archiveMime(name),blob=new Blob([bytes],{type});if(type.startsWith("image/"))window.dispatchEvent(new CustomEvent("framechute:add-result-object",{detail:{blob,name,kind:"image"}}));else if(type.startsWith("text/")||type==="text/csv"){if(type==="text/csv")await createCsv(new File([blob],name,{type}));else window.dispatchEvent(new CustomEvent("framechute:add-result-object",{detail:{blob,name,kind:"text"}}));}else window.dispatchEvent(new CustomEvent("framechute:add-result-object",{detail:{blob,name,kind:type.startsWith("video/")?"video":type.startsWith("audio/")?"audio":type==="application/pdf"?"pdf":"file"}}));}
function archiveDefinition(type){return{createElement(){const block=shell(type);if(type==="cbz"){const controls=document.createElement("div");controls.className="block-toolbar cbz-toolbar";controls.innerHTML='<button class="cbz-prev">‹</button><span class="cbz-position"></span><button class="cbz-next">›</button>';const img=document.createElement("img");img.className="cbz-viewer";block.append(controls,img);}const list=document.createElement("div");list.className="archive-entry-list";block.append(list);return block;},capture(block){const runtime=archiveRuntime.get(block);return{archiveBase64:bytesToBase64(runtime?.bytes||new Uint8Array()),selectedEntry:block.dataset.selectedEntry||""};},restore(block,state){renderArchive(block,base64ToBytes(state.archiveBase64),state.selectedEntry);}};}
api.registerBlockType("zip",archiveDefinition("zip"));api.registerBlockType("cbz",archiveDefinition("cbz"));

export async function createCsv(file){return api.createBlock({type:"csv",name:file.name||"Table.csv",state:{rows:parseCsv(await file.text())}});}
export async function createArchive(file){if(file.size>MAX_ARCHIVE_BYTES)throw new Error("Archives over 100 MB are not embedded in workspace snapshots yet.");const type=/\.cbz$/i.test(file.name)?"cbz":"zip";return api.createBlock({type,name:file.name,state:{archiveBase64:bytesToBase64(new Uint8Array(await file.arrayBuffer()))}});}
workspace.addEventListener("drop",event=>{const files=[...event.dataTransfer?.files||[]],supported=files.filter(file=>/\.(csv|zip|cbz)$/i.test(file.name));if(!supported.length)return;event.preventDefault();event.stopImmediatePropagation();for(const file of supported)(/\.csv$/i.test(file.name)?createCsv(file):createArchive(file)).catch(error=>setStatus(error.message));},{capture:true});
