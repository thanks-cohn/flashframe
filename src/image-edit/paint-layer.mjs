export const PAINT_LAYER_VERSION = 1;
export const DEFAULT_FILL_TOLERANCE = 32;

function similar(data, at, target, tolerance) {
  const alphaWeight = 1.25;
  return Math.hypot(data[at] - target[0], data[at + 1] - target[1], data[at + 2] - target[2], (data[at + 3] - target[3]) * alphaWeight) <= tolerance;
}

/** Iterative four-neighbour fill. Boundary pixels come from `visible`; changes go to `overlay`. */
export function floodFill({ visible, overlay, width, height, x, y, color, tolerance = DEFAULT_FILL_TOLERANCE }) {
  x = Math.floor(x); y = Math.floor(y);
  if (width < 1 || height < 1 || x < 0 || y < 0 || x >= width || y >= height) return 0;
  if (visible.length !== width * height * 4 || overlay.length !== visible.length) throw new RangeError("Pixel buffer dimensions do not match");
  const seed = (y * width + x) * 4;
  const target = [visible[seed], visible[seed + 1], visible[seed + 2], visible[seed + 3]];
  const seen = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let size = 1, changed = 0; stack[0] = y * width + x; seen[stack[0]] = 1;
  while (size) {
    const pixel = stack[--size];
    const at = pixel * 4;
    if (!similar(visible, at, target, tolerance)) continue;
    overlay[at] = color[0]; overlay[at + 1] = color[1]; overlay[at + 2] = color[2]; overlay[at + 3] = color[3]; changed++;
    const px = pixel % width, py = (pixel / width) | 0;
    for (const neighbour of [px ? pixel - 1 : -1, px + 1 < width ? pixel + 1 : -1, py ? pixel - width : -1, py + 1 < height ? pixel + width : -1]) {
      if (neighbour >= 0 && !seen[neighbour]) { seen[neighbour] = 1; stack[size++] = neighbour; }
    }
  }
  return changed;
}

export function displayToIntrinsic(clientX, clientY, bounds, width, height) {
  return {
    x: Math.max(0, Math.min(width - 1, (clientX - bounds.left) * width / bounds.width)),
    y: Math.max(0, Math.min(height - 1, (clientY - bounds.top) * height / bounds.height))
  };
}

/** Map a viewport point through the inverse CSS 2D transform around its origin. */
export function transformedDisplayToIntrinsic(clientX, clientY, layout, matrix, origin, intrinsicWidth, intrinsicHeight) {
  const a = Number(matrix?.a ?? 1), b = Number(matrix?.b ?? 0), c = Number(matrix?.c ?? 0), d = Number(matrix?.d ?? 1);
  const e = Number(matrix?.e ?? 0), f = Number(matrix?.f ?? 0), determinant = a * d - b * c;
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) return null;
  const ox = Number(origin?.x || 0), oy = Number(origin?.y || 0);
  const tx = clientX - layout.left - ox - e, ty = clientY - layout.top - oy - f;
  const localX = (d * tx - c * ty) / determinant + ox;
  const localY = (-b * tx + a * ty) / determinant + oy;
  return {
    x: Math.max(0, Math.min(intrinsicWidth - 1, localX * intrinsicWidth / layout.width)),
    y: Math.max(0, Math.min(intrinsicHeight - 1, localY * intrinsicHeight / layout.height))
  };
}

export function serializePaintLayer(bytes, width, height, encodedOverlay = null) {
  let binary = "";
  if (!encodedOverlay) for (let at = 0; at < bytes.length; at += 0x8000) binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
  return { version: PAINT_LAYER_VERSION, width, height, overlay: encodedOverlay, rgbaBase64: encodedOverlay ? null : btoa(binary), sourceMask: null };
}

export function deserializePaintLayer(value) {
  if (!value || value.version !== PAINT_LAYER_VERSION || value.width < 1 || value.height < 1) return null;
  if (value.overlay) return { width: value.width, height: value.height, overlay: value.overlay, bytes: null, sourceMask: value.sourceMask ?? null };
  const binary = atob(value.rgbaBase64 || ""), bytes = new Uint8ClampedArray(binary.length);
  for (let at = 0; at < binary.length; at++) bytes[at] = binary.charCodeAt(at);
  if (bytes.length !== value.width * value.height * 4) return null;
  return { width: value.width, height: value.height, overlay: null, bytes, sourceMask: value.sourceMask ?? null };
}

export function compositeRgba(source, overlay) {
  if (source.length !== overlay.length) throw new RangeError("Composite buffers differ");
  const output = new Uint8ClampedArray(source.length);
  for (let at = 0; at < source.length; at += 4) {
    const oa = overlay[at + 3] / 255, sa = source[at + 3] / 255, alpha = oa + sa * (1 - oa);
    output[at + 3] = Math.round(alpha * 255);
    for (let channel = 0; channel < 3; channel++) output[at + channel] = alpha ? Math.round((overlay[at + channel] * oa + source[at + channel] * sa * (1 - oa)) / alpha) : 0;
  }
  return output;
}
