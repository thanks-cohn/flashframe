import test from "node:test";
import assert from "node:assert/strict";
import { floodFill, displayToIntrinsic, serializePaintLayer, deserializePaintLayer, compositeRgba } from "../src/image-edit/paint-layer.mjs";

function pixels(width, height, color = [255, 255, 255, 255]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let at = 0; at < data.length; at += 4) data.set(color, at);
  return data;
}
function set(data, width, x, y, color) { data.set(color, (y * width + x) * 4); }

test("bucket fills only the connected region", () => {
  const width = 7, height = 3, visible = pixels(width, height), overlay = pixels(width, height, [0, 0, 0, 0]);
  for (let y = 0; y < height; y++) set(visible, width, 3, y, [0, 0, 0, 255]);
  assert.equal(floodFill({ visible, overlay, width, height, x: 1, y: 1, color: [0, 0, 255, 255], tolerance: 0 }), 9);
  assert.deepEqual([...overlay.slice((1 * width + 1) * 4, (1 * width + 1) * 4 + 4)], [0, 0, 255, 255]);
  assert.equal(overlay[(1 * width + 5) * 4 + 3], 0);
});

test("bucket tolerance is deterministic", () => {
  const visible = new Uint8ClampedArray([100,100,100,255, 110,100,100,255, 140,100,100,255]), overlay = new Uint8ClampedArray(12);
  assert.equal(floodFill({ visible, overlay, width: 3, height: 1, x: 0, y: 0, color: [1,2,3,255], tolerance: 12 }), 2);
});

test("bucket safely fills a region touching every image boundary", () => {
  const visible = pixels(4, 4), overlay = new Uint8ClampedArray(64);
  assert.equal(floodFill({ visible, overlay, width: 4, height: 4, x: 0, y: 0, color: [9,8,7,255], tolerance: 0 }), 16);
});

test("large flat fills are iterative and bounded", () => {
  const width = 900, height = 700, visible = pixels(width, height), overlay = new Uint8ClampedArray(visible.length);
  assert.equal(floodFill({ visible, overlay, width, height, x: 450, y: 350, color: [1,2,3,255] }), width * height);
});

test("display coordinates stay registered across resizing", () => {
  assert.deepEqual(displayToIntrinsic(150, 100, { left: 50, top: 50, width: 200, height: 100 }, 1000, 500), { x: 500, y: 250 });
  assert.deepEqual(displayToIntrinsic(250, 150, { left: 50, top: 50, width: 400, height: 200 }, 1000, 500), { x: 500, y: 250 });
});

test("paint-layer state round trips RGBA and reserves a source mask", () => {
  const input = new Uint8ClampedArray([1,2,3,4, 5,6,7,8]), encoded = serializePaintLayer(input, 2, 1), output = deserializePaintLayer(encoded);
  assert.deepEqual([...output.bytes], [...input]); assert.equal(output.sourceMask, null);
});

test("encoded overlay state round trips without expanding PNG data", () => {
  const encoded = serializePaintLayer(new Uint8ClampedArray(), 12, 8, "data:image/png;base64,abc");
  assert.deepEqual(deserializePaintLayer(encoded), { width: 12, height: 8, overlay: "data:image/png;base64,abc", bytes: null, sourceMask: null });
});

test("alpha compositing preserves source transparency", () => {
  assert.deepEqual([...compositeRgba(new Uint8ClampedArray([0,0,0,0]), new Uint8ClampedArray([255,0,0,128]))], [255,0,0,128]);
  assert.deepEqual([...compositeRgba(new Uint8ClampedArray([0,0,255,255]), new Uint8ClampedArray([255,0,0,255]))], [255,0,0,255]);
});
