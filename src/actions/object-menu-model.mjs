export function objectMenuItems({ quickActionsHidden = false } = {}) {
  return [
    { id: "open-file", label: "Open File…" },
    { id: "remove", label: "Close Object", danger: true }, { separator: true },
    { id: "quick-actions", label: `${quickActionsHidden ? "Show" : "Hide"} Quick Actions` },
    { id: "edit", label: "Edit" }, { id: "duplicate", label: "Duplicate" },
    { id: "save-as", label: "Save As" }
  ];
}

export function isQuickActionsHidden(object) {
  return object?.dataset?.quickActionsHidden === "true";
}

export function setQuickActionsHidden(object, hidden) {
  if (!object?.dataset) return;
  if (hidden) object.dataset.quickActionsHidden = "true";
  else delete object.dataset.quickActionsHidden;
}
