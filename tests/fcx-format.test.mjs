import assert from "node:assert/strict";
import test from "node:test";
import { createZip, jsonEntry, readZip, validateArchivePath, validateManifest, validateState } from "../src/fcx-format.mjs";

const manifest = { format: "framechute-fcx", version: 1, createdAt: "2026-09-04T00:00:00.000Z", app: "FrameChute", assetMode: "embedded" };

test("round trips an FCX store-mode ZIP", async () => {
  const archive = await createZip([
    ["manifest.json", new Blob([JSON.stringify(manifest)])],
    ["state.json", new Blob([JSON.stringify({ blocks: [] })])],
    ["assets/asset-1/0001.png", new Blob([new Uint8Array([1, 2, 3])])]
  ]);
  const entries = await readZip(archive);
  assert.deepEqual(validateManifest(await jsonEntry(entries, "manifest.json")), manifest);
  assert.deepEqual(validateState(await jsonEntry(entries, "state.json")), { blocks: [] });
  assert.deepEqual([...new Uint8Array(await entries.get("assets/asset-1/0001.png").arrayBuffer())], [1, 2, 3]);
});

test("rejects malformed and future manifests", () => {
  assert.throws(() => validateManifest({}), /not a FrameChute/);
  assert.throws(() => validateManifest({ ...manifest, version: 2 }), /Unsupported/);
  assert.throws(() => validateManifest({ ...manifest, assets: [] }), /asset table/);
  assert.throws(() => validateState({ blocks: "no" }), /workspace/);
});

test("rejects traversal and duplicate archive names", async () => {
  assert.throws(() => validateArchivePath("../state.json"), /Unsafe/);
  assert.throws(() => validateArchivePath("assets\\escape"), /Unsafe/);
  const archive = await createZip([["same", new Blob(["a"])], ["same", new Blob(["b"])]]);
  await assert.rejects(readZip(archive), /Duplicate/);
});

test("reports corrupt state JSON and missing embedded entries", async () => {
  const archive = await createZip([["state.json", new Blob(["{"])]]);
  const entries = await readZip(archive);
  await assert.rejects(jsonEntry(entries, "state.json"), /not valid JSON/);
  await assert.rejects(jsonEntry(entries, "manifest.json"), /missing/);
});
