export function objectMenuItems({ quickActionsHidden = false } = {}) {
  return [
    { id: "quick-actions", label: `${quickActionsHidden ? "Show" : "Hide"} Quick Actions` },
    { id: "edit", label: "Edit Image" }, { id: "duplicate", label: "Duplicate" },
    { id: "save-as", label: "Save As" }, { separator: true },
    { id: "remove", label: "Remove", danger: true }
  ];
}
