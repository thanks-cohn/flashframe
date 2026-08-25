// Chromium gives operating-system drags a FileSystemFileHandle, but files
// created by another extension (such as FileChute) can arrive as perfectly
// valid File objects with no filesystem handle. FrameChute's local-source
// pipeline expects a handle, so provide a cloneable file-backed handle only
// when Chromium has no native one to give us.

const prototype = globalThis.DataTransferItem?.prototype;

if (prototype && !prototype.__framechuteSyntheticHandlePatched) {
  const nativeGetAsFileSystemHandle = prototype.getAsFileSystemHandle;

  const getAsFileSystemHandle = async function (...args) {
    if (typeof nativeGetAsFileSystemHandle === "function") {
      try {
        const nativeHandle = await nativeGetAsFileSystemHandle.apply(this, args);
        if (nativeHandle) return nativeHandle;
      } catch (error) {
        // A synthetic/browser-created file has no native handle. Fall through
        // to the File-backed representation instead of discarding the drop.
        console.debug("FrameChute native file handle unavailable; using File fallback", error);
      }
    }

    if (this.kind !== "file") return null;
    const file = this.getAsFile?.();
    if (!(file instanceof File)) return null;

    return {
      kind: "file",
      name: file.name || "Dropped file",
      __framechuteSyntheticFile: file
    };
  };

  try {
    Object.defineProperty(prototype, "getAsFileSystemHandle", {
      configurable: true,
      writable: true,
      value: getAsFileSystemHandle
    });
    Object.defineProperty(prototype, "__framechuteSyntheticHandlePatched", {
      configurable: true,
      value: true
    });
  } catch (error) {
    console.warn("FrameChute could not install synthetic File drop support", error);
  }
}
