import test from "node:test";
import assert from "node:assert/strict";
import { routeOpenFileSelection } from "../src/file-selection-routing.mjs";

function route(names) {
  const calls = { snapshots: [], ingested: [], messages: [] };
  const kind = routeOpenFileSelection(names.map(name => ({ name })), {
    openSnapshot: file => calls.snapshots.push(file.name),
    ingestFiles: files => calls.ingested.push(files.map(file => file.name)),
    announce: message => calls.messages.push(message)
  });
  return { kind, ...calls };
}

test("one snapshot is restored exactly once", () => {
  assert.deepEqual(route(["project.FCX"]), { kind: "snapshot", snapshots: ["project.FCX"], ingested: [], messages: [] });
});

test("multiple snapshots are rejected without partial routing", () => {
  const result = route(["one.fcx", "two.fcx"]);
  assert.equal(result.kind, "multiple-snapshots");
  assert.deepEqual(result.snapshots, []);
  assert.deepEqual(result.ingested, []);
  assert.match(result.messages[0], /Choose one/);
});

test("mixed snapshot and ordinary files are rejected together", () => {
  const result = route(["project.fcx", "photo.png"]);
  assert.equal(result.kind, "mixed-snapshot");
  assert.deepEqual(result.snapshots, []);
  assert.deepEqual(result.ingested, []);
  assert.match(result.messages[0], /separately/);
});

test("ordinary multi-file selections retain one ingestion call", () => {
  assert.deepEqual(route(["one.png", "two.jpg"]), { kind: "ordinary", snapshots: [], ingested: [["one.png", "two.jpg"]], messages: [] });
});
