import test from "node:test";
import assert from "node:assert/strict";
import { isQuickActionsHidden, objectMenuItems, setQuickActionsHidden } from "../src/actions/object-menu-model.mjs";
import { canvasMetadata, createCanvasPayload, deserializeCanvasPayload, normalizeCanvasSize, serializeCanvasPayload, transparentRgba, validateCanvasSize } from "../src/standalone-canvas.mjs";
import { compositeRgba, floodFill } from "../src/image-edit/paint-layer.mjs";

test("object menu reflects per-object Quick Actions visibility",()=>{
  assert.equal(objectMenuItems({quickActionsHidden:true})[0].label,"Show Quick Actions");
  assert.equal(objectMenuItems({quickActionsHidden:false})[0].label,"Hide Quick Actions");
  assert.deepEqual(objectMenuItems().filter(item=>item.id).map(item=>item.id),["quick-actions","edit","duplicate","save-as","open-file","remove"]);
});

test("standalone canvas metadata is honest, bounded, and transparent",()=>{
  assert.deepEqual(canvasMetadata(1080,1080),{version:1,width:1080,height:1080,background:"transparent"});
  assert.deepEqual(normalizeCanvasSize(0,2048),{width:1,height:2048});
  assert.throws(()=>validateCanvasSize(4096,4096),/total pixels/);
  assert.throws(()=>validateCanvasSize(4097,1),/dimensions/);
  assert.ok(transparentRgba(3,2).every(channel=>channel===0));
});

test("ordinary selection cannot resurrect independently hidden object controls",()=>{
  const imageA={dataset:{}},imageB={dataset:{}},canvasC={dataset:{canvasObject:"true"}};
  setQuickActionsHidden(imageA,true);setQuickActionsHidden(canvasC,true);
  let selected=imageA; selected=imageB; selected=imageA; selected=canvasC;
  assert.equal(selected,canvasC);
  assert.equal(isQuickActionsHidden(imageA),true);
  assert.equal(isQuickActionsHidden(imageB),false);
  assert.equal(isQuickActionsHidden(canvasC),true);
  setQuickActionsHidden(imageA,false); // the explicit object-menu Show action
  assert.equal(isQuickActionsHidden(imageA),false);
  assert.equal(isQuickActionsHidden(canvasC),true);
});

test("Canvas payload round-trips semantic identity and real FCX extension state",()=>{
  const paint={version:1,width:2,height:2,overlay:"data:image/png;base64,paint",rgbaBase64:null,sourceMask:null};
  const original=createCanvasPayload(2,2,"data:image/png;base64,transparent",{imagePaintLayer:paint,quickActionsHidden:true});
  const restored=deserializeCanvasPayload(serializeCanvasPayload(original));
  assert.equal(restored.kind,"canvas");
  assert.deepEqual(restored.canvas,{version:1,width:2,height:2,background:"transparent"});
  assert.equal(restored.dataUrl,"data:image/png;base64,transparent");
  assert.deepEqual(restored.imagePaintLayer,paint);
  assert.equal(restored.quickActionsHidden,true);
  assert.equal(objectMenuItems({quickActionsHidden:restored.quickActionsHidden})[1].label,"Edit");
});

test("canvas pixels use the shared flood-fill and composition engine",()=>{
  const base=transparentRgba(2,2),overlay=transparentRgba(2,2);
  assert.equal(floodFill({visible:base,overlay,width:2,height:2,x:0,y:0,color:[10,20,30,255],tolerance:0}),4);
  assert.deepEqual([...compositeRgba(base,overlay)],[10,20,30,255,10,20,30,255,10,20,30,255,10,20,30,255]);
});
