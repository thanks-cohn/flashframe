export function classifyOpenFileSelection(files) {
  const selected = [...files];
  const snapshots = selected.filter(file => file.name.toLowerCase().endsWith(".fcx"));
  const ordinary = selected.filter(file => !file.name.toLowerCase().endsWith(".fcx"));

  if (snapshots.length > 1) return { kind: "multiple-snapshots", files: [] };
  if (snapshots.length === 1 && ordinary.length) return { kind: "mixed-snapshot", files: [] };
  if (snapshots.length === 1) return { kind: "snapshot", files: snapshots };
  return { kind: "ordinary", files: ordinary };
}

export function routeOpenFileSelection(files, { openSnapshot, ingestFiles, announce }) {
  const result = classifyOpenFileSelection(files);
  if (result.kind === "snapshot") openSnapshot(result.files[0]);
  else if (result.kind === "ordinary" && result.files.length) ingestFiles(result.files);
  else if (result.kind === "multiple-snapshots") announce("Choose one FrameChute snapshot to open.");
  else if (result.kind === "mixed-snapshot") announce("Open the FrameChute snapshot separately from ordinary files.");
  return result.kind;
}
