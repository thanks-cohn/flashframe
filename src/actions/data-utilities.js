import { parseCsv, serializeCsv, removeDuplicateRows } from "./csv.js";
import { saveBlobAs } from "./native-save.js";
import { unzipSync, strFromU8 } from "../vendor/fflate.mjs";

const workspace = document.querySelector("#workspace");
const status = document.querySelector("#status");
let offset = 0;
function shell(kind, name) {
  const block = document.createElement("section"); block.className = `block utility-block ${kind}-block`; block.dataset.utilityKind=kind; block.dataset.blockType="text"; block.dataset.blockId=crypto.randomUUID();
  block.style.cssText=`left:${50+offset}px;top:${70+offset}px;width:680px;height:520px;z-index:50`; offset=(offset+24)%180;
  const header=document.createElement("div");header.className="block-header";header.innerHTML='<input class="block-name" aria-label="Block name"><div class="block-actions"><button class="remove-block" type="button" title="Remove">×</button></div>';
  header.querySelector("input").value=name; header.querySelector("button").onclick=()=>block.remove(); block.append(header); workspace.append(block); return block;
}
function setStatus(message){if(status)status.textContent=message;}
function renderTable(block, rows) {
  const table=block.querySelector("table");table.replaceChildren();
  rows.forEach((row,y)=>{const tr=table.insertRow();row.forEach((value,x)=>{const cell=y===0?document.createElement("th"):document.createElement("td");cell.contentEditable="true";cell.textContent=value;cell.dataset.column=x;tr.append(cell);});});
}
function readTable(block){return [...block.querySelectorAll("tr")].map(row=>[...row.cells].map(cell=>cell.textContent));}
export function openCsv(file) {
  const rowsPromise=file.text().then(parseCsv), block=shell("csv",file.name||"Table.csv");
  const tools=document.createElement("div");tools.className="block-toolbar table-toolbar";tools.innerHTML='<input class="table-find" type="search" placeholder="Find / filter rows"><button class="table-add-row">Add row</button><button class="table-dedupe">Remove duplicates</button><button class="table-save">Save As CSV</button>';
  const scroller=document.createElement("div");scroller.className="table-scroller";const table=document.createElement("table");scroller.append(table);block.append(tools,scroller);
  rowsPromise.then(rows=>{renderTable(block,rows); tools.querySelector(".table-add-row").onclick=()=>{const values=readTable(block);values.push(Array(values[0]?.length||1).fill(""));renderTable(block,values);}; tools.querySelector(".table-dedupe").onclick=()=>{const result=removeDuplicateRows(readTable(block));renderTable(block,result.rows);setStatus(`${result.removed} duplicate row(s) removed.`);};tools.querySelector(".table-save").onclick=()=>saveBlobAs({blob:new Blob([serializeCsv(readTable(block))],{type:"text/csv"}),filename:block.querySelector(".block-name").value,extension:"csv",mimeType:"text/csv",description:"CSV table"});tools.querySelector(".table-find").oninput=(event)=>{const query=event.target.value.toLowerCase();[...table.rows].slice(1).forEach(row=>row.hidden=query&&!row.textContent.toLowerCase().includes(query));};table.addEventListener("click",event=>{if(event.target.tagName!=="TH")return;const values=readTable(block),column=Number(event.target.dataset.column),header=values.shift();values.sort((a,b)=>a[column].localeCompare(b[column],undefined,{numeric:true}));renderTable(block,[header,...values]);});});
}
export async function openArchive(file) {
  const block=shell(/\.cbz$/i.test(file.name)?"cbz":"zip",file.name||"Archive.zip"), list=document.createElement("div");list.className="archive-entry-list";block.append(list);
  let entries;try{entries=unzipSync(new Uint8Array(await file.arrayBuffer()),{filter:({originalSize})=>originalSize<100*1024*1024});}catch(error){setStatus(`Could not open archive: ${error.message}`);return;}
  for(const [path,bytes] of Object.entries(entries)){if(path.endsWith("/"))continue;const row=document.createElement("button");row.type="button";row.className="archive-entry";row.innerHTML=`<span></span><small>${bytes.length.toLocaleString()} bytes</small>`;row.firstElementChild.textContent=path;row.onclick=async()=>{const name=path.split("/").pop(),type=/\.(png|jpe?g|gif|webp)$/i.test(name)?`image/${/\.jpe?g$/i.test(name)?"jpeg":name.split(".").pop().toLowerCase()}`:"application/octet-stream";const blob=new Blob([bytes],{type});if(type.startsWith("image/"))window.dispatchEvent(new CustomEvent("framechute:add-result-object",{detail:{blob,name,kind:"image"}}));else await saveBlobAs({blob,filename:name,extension:name.split(".").pop()||"bin",mimeType:type});};list.append(row);}
  setStatus(`${Object.keys(entries).length} archive entries available. Nothing is uploaded.`);
}
workspace.addEventListener("drop",event=>{const files=[...event.dataTransfer?.files||[]];const supported=files.filter(file=>/\.(csv|zip|cbz)$/i.test(file.name));if(!supported.length)return;event.preventDefault();event.stopImmediatePropagation();for(const file of supported)/\.csv$/i.test(file.name)?openCsv(file):openArchive(file);},{capture:true});
