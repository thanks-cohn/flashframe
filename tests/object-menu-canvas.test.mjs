import test from "node:test";
import assert from "node:assert/strict";
import { objectMenuItems } from "../src/actions/object-menu-model.mjs";
import { canvasMetadata, normalizeCanvasSize, transparentRgba } from "../src/standalone-canvas.mjs";
import { compositeRgba, floodFill } from "../src/image-edit/paint-layer.mjs";

test("object menu reflects per-object Quick Actions visibility",()=>{
  assert.equal(objectMenuItems({quickActionsHidden:true})[0].label,"Show Quick Actions");
  assert.equal(objectMenuItems({quickActionsHidden:false})[0].label,"Hide Quick Actions");
  assert.deepEqual(objectMenuItems().filter(item=>item.id).map(item=>item.id),["quick-actions","edit","duplicate","save-as","remove"]);
});

test("standalone canvas metadata is honest, bounded, and transparent",()=>{
  assert.deepEqual(canvasMetadata(1080,1080),{version:1,width:1080,height:1080,background:"transparent"});
  assert.deepEqual(normalizeCanvasSize(0,99999),{width:1,height:8192});
  assert.ok(transparentRgba(3,2).every(channel=>channel===0));
});

test("canvas pixels use the shared flood-fill and composition engine",()=>{
  const base=transparentRgba(2,2),overlay=transparentRgba(2,2);
  assert.equal(floodFill({visible:base,overlay,width:2,height:2,x:0,y:0,color:[10,20,30,255],tolerance:0}),4);
  assert.deepEqual([...compositeRgba(base,overlay)],[10,20,30,255,10,20,30,255,10,20,30,255,10,20,30,255]);
});
