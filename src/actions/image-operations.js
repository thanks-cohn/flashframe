export const IMAGE_FORMATS = Object.freeze({ png: "image/png", jpeg: "image/jpeg", webp: "image/webp" });

export function outputDimensions(width, height, requestedWidth, requestedHeight, lockAspect = true) {
  let w = Math.max(1, Math.round(Number(requestedWidth) || width));
  let h = Math.max(1, Math.round(Number(requestedHeight) || height));
  if (lockAspect) h = Math.max(1, Math.round(w * height / width));
  return { width: w, height: h };
}

export function alphaBounds(data, width, height) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3]) {
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  return right < left ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

export async function imageElementToBlob(image, options = {}) {
  const sourceWidth = image.naturalWidth || image.videoWidth || image.width;
  const sourceHeight = image.naturalHeight || image.videoHeight || image.height;
  const crop = options.crop || { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
  const dimensions = outputDimensions(crop.width, crop.height, options.width || crop.width, options.height || crop.height, options.lockAspect !== false);
  const quarterTurns = ((Number(options.rotate) || 0) / 90 % 4 + 4) % 4;
  const canvas = document.createElement("canvas");
  canvas.width = quarterTurns % 2 ? dimensions.height : dimensions.width;
  canvas.height = quarterTurns % 2 ? dimensions.width : dimensions.height;
  const context = canvas.getContext("2d", { alpha: true });
  if (options.background) { context.fillStyle = options.background; context.fillRect(0, 0, canvas.width, canvas.height); }
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(quarterTurns * Math.PI / 2 + (Number(options.straighten) || 0) * Math.PI / 180);
  context.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, -dimensions.width / 2, -dimensions.height / 2, dimensions.width, dimensions.height);
  const type = IMAGE_FORMATS[options.format] || options.type || "image/png";
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(`${type} encoding is unavailable`)), type, options.quality ?? .86));
}
