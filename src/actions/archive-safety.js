export const ARCHIVE_LIMITS = Object.freeze({ entries: 2000, uncompressedBytes: 250 * 1024 * 1024, entryBytes: 100 * 1024 * 1024 });

export function createArchiveBudget(limits = ARCHIVE_LIMITS) {
  let entries = 0, uncompressedBytes = 0;
  return { inspect(originalSize) { const size=Number(originalSize);if(!Number.isSafeInteger(size)||size<0)throw new Error("Archive contains an invalid entry size.");if(++entries>limits.entries)throw new Error(`Archive contains more than ${limits.entries.toLocaleString()} entries.`);if(size>limits.entryBytes)throw new Error("An archive entry exceeds the 100 MB safety limit.");if((uncompressedBytes+=size)>limits.uncompressedBytes)throw new Error("Archive expands beyond the 250 MB safety limit.");return true; }, snapshot(){return{entries,uncompressedBytes};} };
}

export function archiveEntryKind(name, mimeType = "") {
  const ext=String(name).split(".").pop().toLowerCase();
  if(["png","jpg","jpeg","gif","webp"].includes(ext)||mimeType.startsWith("image/"))return"image";
  if(ext==="csv"||mimeType==="text/csv")return"csv";
  if(["txt","md","markdown"].includes(ext)||mimeType.startsWith("text/"))return"text";
  if(ext==="pdf"||mimeType==="application/pdf")return"pdf";
  if(ext==="docx"||mimeType.includes("wordprocessingml.document"))return"docx";
  if(["mp4","webm"].includes(ext)||mimeType.startsWith("video/"))return"video";
  if(["mp3","wav"].includes(ext)||mimeType.startsWith("audio/"))return"audio";
  return"file";
}
