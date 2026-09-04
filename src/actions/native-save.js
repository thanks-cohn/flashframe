export function normalizeFilename(name, extension) {
  const ext = `.${String(extension).replace(/^\./, "").toLowerCase()}`;
  const base = String(name || "result").trim() || "result";
  return base.toLowerCase().endsWith(ext) ? base : `${base.replace(/\.[^./\\]+$/, "")}${ext}`;
}

export async function saveBlobAs({ blob, serialize, filename, extension, mimeType, description = "FrameChute result" }) {
  // Complete expensive serialization before a writable is created, so failure cannot truncate a file.
  const output = blob ?? await serialize?.();
  if (!(output instanceof Blob)) throw new TypeError("Save As requires a Blob");
  const suggestedName = normalizeFilename(filename, extension);
  if (typeof window.showSaveFilePicker === "function") {
    let handle;
    try { handle = await window.showSaveFilePicker({ suggestedName, types: [{ description, accept: { [mimeType]: [`.${String(extension).replace(/^\./, "")}`] } }] }); }
    catch (error) { if (error?.name === "AbortError") return { saved: false, cancelled: true }; throw error; }
    const writer = await handle.createWritable();
    try { await writer.write(output); await writer.close(); }
    catch (error) { await writer.abort?.(); throw error; }
    return { saved: true, handle, blob: output };
  }
  const url = URL.createObjectURL(output);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = suggestedName; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return { saved: true, downloaded: true, blob: output };
}
