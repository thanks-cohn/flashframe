import assert from "node:assert/strict";
import test from "node:test";

import { migrateSnapshot } from "../src/storage.js";

test("migrates v1/v2 sources to stable schema v3 asset references", () => {
  const original = {
    schemaVersion: 2,
    id: "frame-1",
    blocks: [{ id: "pdf-1", type: "pdf", source: { handleKey: "pdf:old", kind: "file", displayName: "notes.pdf" } }]
  };
  const migrated = migrateSnapshot(original);
  assert.equal(migrated.schemaVersion, 3);
  assert.equal(migrated.blocks[0].source.assetId, "pdf:old");
  assert.equal(migrated.blocks[0].source.sourceKind, "file");
  assert.equal(original.schemaVersion, 2);
  assert.equal(original.blocks[0].source.assetId, undefined);
});

test("preserves stable asset IDs", () => {
  const migrated = migrateSnapshot({
    schemaVersion: 3,
    id: "frame-2",
    blocks: [{ id: "gallery-1", type: "gallery", source: { assetId: "asset:stable", handleKey: "legacy", sourceKind: "directory" } }]
  });
  assert.equal(migrated.blocks[0].source.assetId, "asset:stable");
  assert.equal(migrated.blocks[0].source.handleKey, "legacy");
});
