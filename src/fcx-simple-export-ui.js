const advancedMode = window.frameChuteAdvancedMode === true;
const exportButton = document.querySelector("#export-fcx");

if (exportButton) {
  if (advancedMode) {
    // FCX export is deliberately a Simple/Classic workflow action. Keep the
    // implementation mounted so other code can use it, but do not expose a
    // duplicate control in Advanced mode.
    exportButton.style.display = "none";
  } else {
    const simpleActions = document.querySelector(".classic-toolbar-primary .classic-toolbar-actions:last-child");
    if (simpleActions && !document.querySelector("#classic-export-fcx")) {
      const button = document.createElement("button");
      button.id = "classic-export-fcx";
      button.type = "button";
      button.textContent = "Export Snapshot";
      button.title = "Download a portable FrameChute snapshot";
      button.addEventListener("click", () => exportButton.click());
      simpleActions.append(button);
    }
  }
}
