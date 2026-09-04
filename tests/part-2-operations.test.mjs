import test from "node:test";
import assert from "node:assert/strict";
import { cleanTable, previewSplitColumn, previewMergeColumns, chartSeries } from "../src/actions/table-operations.js";
import { compareText, replaceAllText, createSimpleDocx, extractDocxText, textToPdf } from "../src/actions/document-operations.js";

test("spreadsheet cleanup, split, merge, and chart data are deterministic",()=>{const rows=[["Name","Amount"],["  ada   lovelace ","2"],["",""]];assert.deepEqual(cleanTable(rows,{capitalization:"title"}),[["Name","Amount"],["Ada Lovelace","2"]]);assert.deepEqual(previewSplitColumn(rows,0,{delimiter:" ",names:["First","Rest"]})[0],["First","Rest","Amount"]);assert.deepEqual(previewMergeColumns([["A","B","C"],["x","y","z"]],[0,1]),[["Combined","C"],["x y","z"]]);assert.deepEqual(chartSeries(rows,0,1),[{label:"  ada   lovelace ",value:2},{label:"",value:0}]);});
test("document text comparison and replacement report honest changes",()=>{assert.deepEqual(compareText("one two","one three").map(x=>x.type),["same","delete","insert"]);assert.deepEqual(replaceAllText("Cat cat","cat","dog"),{text:"dog dog",count:2});});
test("simple DOCX and PDF conversions produce real local documents",async()=>{const docx=createSimpleDocx("Hello\nFramechute");assert.equal(await extractDocxText(docx),"Hello\nFramechute");const pdf=await textToPdf("Hello",{pageNumbers:true,watermark:"DRAFT"});assert.equal((new Uint8Array(await pdf.arrayBuffer())).slice(0,5).toString(),"37,80,68,70,45");});
