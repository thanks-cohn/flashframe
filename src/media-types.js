const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "svg", "ico", "apng"]);
const AUDIO_EXTENSIONS = new Set([
  "mp3", "wav", "wave", "ogg", "oga", "opus", "flac", "aac", "m4a", "weba",
  "aif", "aiff", "aifc", "alac", "wma", "amr", "mid", "midi", "caf", "ac3", "eac3"
]);
const VIDEO_EXTENSIONS = new Set([
  "mp4", "m4v", "webm", "ogv", "ogg", "mov", "mkv", "avi", "mpeg", "mpg",
  "wmv", "flv", "ts", "m2ts", "mts", "3gp", "3g2", "vob", "mxf", "f4v"
]);

export function extensionOf(name = "") {
  const index = name.lastIndexOf(".");
  return index < 0 ? "" : name.slice(index + 1).toLowerCase();
}

export function classifyLocalFile(file) {
  const mime = String(file?.type || "").toLowerCase();
  const extension = extensionOf(file?.name || "");
  if (mime === "application/pdf" || extension === "pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (AUDIO_EXTENSIONS.has(extension)) return "audio";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  return "generic";
}

export function isNativeImageName(name) {
  return IMAGE_EXTENSIONS.has(extensionOf(name));
}

export function looksLikeImageUrl(url) {
  return IMAGE_EXTENSIONS.has(extensionOf(url.pathname));
}

export function looksLikeDirectVideoUrl(url) {
  return VIDEO_EXTENSIONS.has(extensionOf(url.pathname));
}

export const nativeImagePickerExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".bmp", ".svg", ".ico", ".apng"];
