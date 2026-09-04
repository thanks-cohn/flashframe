import test from "node:test";
import assert from "node:assert/strict";
import { ActionRegistry, runBatch } from "../src/actions/action-registry.js";
import { SelectionModel } from "../src/actions/selection-model.js";
import { outputDimensions, alphaBounds } from "../src/actions/image-operations.js";
import { parseCsv, serializeCsv, removeDuplicateRows } from "../src/actions/csv.js";
import { normalizeFilename } from "../src/actions/native-save.js";
import { PDFDocument } from "../src/vendor/pdf-lib.mjs";
import { transformPdfPages } from "../src/documents/pdf-document.js";

test("registry derives availability and runs immutable selection snapshots", async()=>{const registry=new ActionRegistry();registry.register({id:"x",label:"X",appliesTo:s=>s.length===1,run:({selection})=>selection.length});assert.equal(registry.available([{}]).length,1);assert.equal(await registry.run("x",{selection:[{}]}),1);});
test("bounded batch preserves order and reports progress",async()=>{const progress=[];const result=await runBatch([3,1,2],async value=>value*2,{concurrency:2,onProgress:(done)=>progress.push(done)});assert.deepEqual(result.map(item=>item.value),[6,2,4]);assert.equal(progress.at(-1),3);});
test("selection supports replace and toggle",()=>{const model=new SelectionModel(),a={},b={};model.replace(a);model.toggle(b);assert.deepEqual(model.items,[a,b]);model.toggle(a);assert.deepEqual(model.items,[b]);});
test("image geometry preserves aspect and finds alpha bounds",()=>{assert.deepEqual(outputDimensions(400,200,100,null,true),{width:100,height:50});const pixels=new Uint8Array(4*3*2);pixels[(1*3+2)*4+3]=255;assert.deepEqual(alphaBounds(pixels,3,2),{x:2,y:1,width:1,height:1});});
test("CSV quoting round trips and duplicate rows are removed",()=>{const rows=[["a","b"],["x,y",'say "hi"'],["x,y",'say "hi"']];assert.deepEqual(parseCsv(serializeCsv(rows)),rows);const result=removeDuplicateRows(rows);assert.equal(result.removed,1);assert.deepEqual(result.rows,rows.slice(0,2));});
test("native result filenames replace an existing extension",()=>{assert.equal(normalizeFilename("photo.png","webp"),"photo.webp");assert.equal(normalizeFilename("photo.WEBP","webp"),"photo.WEBP");});
test("PDF page operations preserve a valid document",async()=>{const pdf=await PDFDocument.create();pdf.addPage();pdf.addPage();let bytes=await pdf.save();bytes=await transformPdfPages(bytes,{type:"duplicate",page:1});assert.equal((await PDFDocument.load(bytes)).getPageCount(),3);bytes=await transformPdfPages(bytes,{type:"delete",page:2});assert.equal((await PDFDocument.load(bytes)).getPageCount(),2);bytes=await transformPdfPages(bytes,{type:"rotate",page:1,degrees:90});assert.equal((await PDFDocument.load(bytes)).getPage(0).getRotation().angle,90);});
