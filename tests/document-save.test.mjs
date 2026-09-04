import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDocumentFilename, writeCompleteBlob } from "../src/documents/document-save.js";

test("normalizes native document extensions", () => {
  assert.equal(normalizeDocumentFilename("report", "pdf"), "report.pdf");
  assert.equal(normalizeDocumentFilename("report.PDF", ".pdf"), "report.PDF");
  assert.equal(normalizeDocumentFilename("draft.txt", "docx"), "draft.docx");
});

test("serializes the complete document before opening a writer", async () => {
  const order = [];
  const handle = { async createWritable() { order.push("writer"); return { async write() { order.push("write"); }, async close() { order.push("close"); } }; } };
  const result = await writeCompleteBlob(handle, async () => { order.push("serialize"); return new Blob(["document"]); });
  assert.equal(result.saved, true);
  assert.deepEqual(order, ["serialize", "writer", "write", "close"]);
});

test("serialization failure never opens or truncates the destination", async () => {
  let opened = false;
  const handle = { async createWritable() { opened = true; } };
  await assert.rejects(writeCompleteBlob(handle, async () => { throw new Error("bad document"); }), /bad document/);
  assert.equal(opened, false);
});

test("an unwritable source remains unsaved", async () => {
  const result = await writeCompleteBlob({ __framechuteSyntheticFile: new Blob() }, async () => new Blob(["edit"]));
  assert.deepEqual(result, { saved: false, reason: "unwritable" });
});
