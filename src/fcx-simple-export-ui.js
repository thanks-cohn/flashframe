const exportButton = document.querySelector("#export-fcx");
const simpleActions = document.querySelector(".classic-toolbar-primary .classic-toolbar-actions:last-child");

// Advanced keeps the native Export Snapshot control. Classic gets a proxy to
// the exact same FCX export flow so both modes can export without duplicating
// implementation or semantics.
if (exportButton && simpleActions && !document.querySelector("#classic-export-fcx")) {
  const button = document.createElement("button");
  button.id = "classic-export-fcx";
  button.type = "button";
  button.textContent = "Export Snapshot";
  button.title = "Download a portable FrameChute snapshot";
  button.addEventListener("click", () => exportButton.click());
  simpleActions.append(button);
}
