export function fittedImageSize(naturalWidth, naturalHeight, availableWidth, availableHeight, mode = "contain") {
  if (![naturalWidth, naturalHeight, availableWidth, availableHeight].every(value => Number.isFinite(value) && value > 0)) return null;
  let scale;
  if (mode === "actual") scale = 1;
  else if (mode === "width") scale = availableWidth / naturalWidth;
  else if (mode === "height") scale = availableHeight / naturalHeight;
  else scale = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight);
  if (mode === "shrink") scale = Math.min(1, scale);
  return { width: Math.max(1, Math.round(naturalWidth * scale)), height: Math.max(1, Math.round(naturalHeight * scale)), scale };
}
