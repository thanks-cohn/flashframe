export const FCX_FORMAT = "framechute-fcx";
export const FCX_VERSION = 1;
export const FCX_LIMITS = Object.freeze({ entries: 10000, uncompressedBytes: 2 * 1024 * 1024 * 1024 });

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function safePath(path) {
  return typeof path === "string" && path.length > 0 && path.length <= 512 &&
    !path.startsWith("/") && !path.includes("\\") &&
    path.split("/").every((part) => part && part !== "." && part !== "..");
}

export function validateArchivePath(path) {
  if (!safePath(path)) throw new Error(`Unsafe archive path: ${String(path)}`);
  return path;
}

export function validateManifest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The .fcx manifest is malformed.");
  if (value.format !== FCX_FORMAT) throw new Error("This is not a FrameChute .fcx snapshot.");
  if (!Number.isInteger(value.version)) throw new Error("The .fcx manifest has no valid version.");
  if (value.version !== FCX_VERSION) throw new Error(`Unsupported .fcx version ${value.version}. This FrameChute supports version ${FCX_VERSION}.`);
  if (!Number.isFinite(Date.parse(value.createdAt))) throw new Error("The .fcx creation timestamp is invalid.");
  if (!["embedded", "state-only"].includes(value.assetMode)) throw new Error("The .fcx asset mode is invalid.");
  if (value.assets != null && (typeof value.assets !== "object" || Array.isArray(value.assets))) throw new Error("The .fcx asset table is malformed.");
  if (Object.keys(value.assets || {}).length > FCX_LIMITS.entries) throw new Error("The snapshot contains too many assets.");
  return value;
}

export function validateState(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.blocks)) throw new Error("state.json does not contain a workspace.");
  if (value.blocks.length > FCX_LIMITS.entries) throw new Error("The snapshot contains too many blocks.");
  return value;
}

let crcTable;
function crc32(bytes) {
  crcTable ||= Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function write16(view, offset, value) { view.setUint16(offset, value, true); }
function write32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }

export async function createZip(entries) {
  const normalized = [];
  for (const [name, input] of entries) {
    validateArchivePath(name);
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(await input.arrayBuffer());
    normalized.push({ name: encoder.encode(name), bytes, crc: crc32(bytes), offset: 0 });
  }
  const localSize = normalized.reduce((n, e) => n + 30 + e.name.length + e.bytes.length, 0);
  const centralSize = normalized.reduce((n, e) => n + 46 + e.name.length, 0);
  const out = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(out.buffer);
  let p = 0;
  for (const entry of normalized) {
    entry.offset = p; write32(view, p, 0x04034b50); write16(view, p + 4, 20); write16(view, p + 6, 0x800);
    write16(view, p + 8, 0); write32(view, p + 14, entry.crc); write32(view, p + 18, entry.bytes.length); write32(view, p + 22, entry.bytes.length);
    write16(view, p + 26, entry.name.length); out.set(entry.name, p + 30); out.set(entry.bytes, p + 30 + entry.name.length); p += 30 + entry.name.length + entry.bytes.length;
  }
  const centralOffset = p;
  for (const entry of normalized) {
    write32(view, p, 0x02014b50); write16(view, p + 4, 20); write16(view, p + 6, 20); write16(view, p + 8, 0x800);
    write32(view, p + 16, entry.crc); write32(view, p + 20, entry.bytes.length); write32(view, p + 24, entry.bytes.length);
    write16(view, p + 28, entry.name.length); write32(view, p + 42, entry.offset); out.set(entry.name, p + 46); p += 46 + entry.name.length;
  }
  write32(view, p, 0x06054b50); write16(view, p + 8, normalized.length); write16(view, p + 10, normalized.length);
  write32(view, p + 12, centralSize); write32(view, p + 16, centralOffset);
  return new Blob([out], { type: "application/vnd.framechute.fcx+zip" });
}

export async function readZip(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const result = new Map();
  let p = 0; let total = 0;
  while (p + 4 <= bytes.length && view.getUint32(p, true) === 0x04034b50) {
    if (result.size >= FCX_LIMITS.entries) throw new Error("The archive contains too many entries.");
    const flags = view.getUint16(p + 6, true); const method = view.getUint16(p + 8, true);
    const expectedCrc = view.getUint32(p + 14, true);
    const size = view.getUint32(p + 18, true); const rawSize = view.getUint32(p + 22, true);
    const nameLength = view.getUint16(p + 26, true); const extraLength = view.getUint16(p + 28, true);
    if (flags & 0x8 || method !== 0 || size !== rawSize) throw new Error("This .fcx uses an unsupported ZIP encoding.");
    const start = p + 30 + nameLength + extraLength; const end = start + size;
    if (end > bytes.length) throw new Error("The .fcx archive is truncated.");
    const name = decoder.decode(bytes.subarray(p + 30, p + 30 + nameLength)); validateArchivePath(name);
    if (result.has(name)) throw new Error(`Duplicate archive entry: ${name}`);
    total += rawSize; if (total > FCX_LIMITS.uncompressedBytes) throw new Error("The .fcx expands beyond the safety limit.");
    const content = bytes.slice(start, end);
    if (crc32(content) !== expectedCrc) throw new Error(`Archive entry failed its integrity check: ${name}`);
    result.set(name, new Blob([content])); p = end;
  }
  if (!result.size) throw new Error("The file is not a readable .fcx archive.");
  return result;
}

export async function jsonEntry(entries, name) {
  const blob = entries.get(name); if (!blob) throw new Error(`The .fcx is missing ${name}.`);
  try { return JSON.parse(await blob.text()); } catch { throw new Error(`${name} is not valid JSON.`); }
}
