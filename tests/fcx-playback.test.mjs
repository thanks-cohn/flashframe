import assert from "node:assert/strict";
import test from "node:test";
import { playConcurrently } from "../src/fcx-playback.mjs";

test("requests every snapshot player before awaiting playback results", async () => {
  const calls = [];
  let releaseFirst;
  const first = new Promise((resolve) => { releaseFirst = resolve; });
  const players = [
    { play() { calls.push("first"); return first; } },
    { play() { calls.push("second"); return Promise.resolve(); } },
    { play() { calls.push("third"); throw new Error("blocked"); } }
  ];

  const resultsPromise = playConcurrently(players);
  assert.deepEqual(calls, ["first", "second", "third"]);
  releaseFirst();
  const results = await resultsPromise;
  assert.deepEqual(results.map(({ status }) => status), ["fulfilled", "fulfilled", "rejected"]);
});
