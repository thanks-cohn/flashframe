import assert from "node:assert/strict";
import test from "node:test";
import { isTransientSyntheticHandle, resolveHandle, storeHandle } from "../src/file-access.js";

test("stores and resolves function-bearing FCX directories without IndexedDB", async () => {
  const directory = {
    kind: "directory",
    __framechuteSyntheticDirectory: true,
    async *entries() {},
    async getFileHandle() {}
  };
  assert.equal(isTransientSyntheticHandle(directory), true);
  assert.equal(isTransientSyntheticHandle({ kind: "directory" }), false);
  await storeHandle("fcx:test-directory", directory);
  assert.equal(await resolveHandle("fcx:test-directory"), directory);
});
