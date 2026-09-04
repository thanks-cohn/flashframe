export function objectMenuItems({ quickActionsHidden = false } = {}) {
  return [
    { id: "quick-actions", label: `${quickActionsHidden ? "Show" : "Hide"} Quick Actions` },
    { id: "edit", label: "Edit" }, { id: "duplicate", label: "Duplicate" },
    { id: "save-as", label: "Save As" }, { id: "open-file", label: "Open File…" }, { separator: true },
    { id: "remove", label: "Remove", danger: true }
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
