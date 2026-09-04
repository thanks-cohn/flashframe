const workspace = document.querySelector("#workspace");
const status = document.querySelector("#status");
const exportButton = document.querySelector("#export-fcx");

function isEditing(target) {
  return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable="true"], .text-editor, .docx-editor, .pdf-text-layer'));
}

function point() {
  const rect = workspace.getBoundingClientRect();
  return { x: Math.max(40, innerWidth / 2 - rect.left), y: Math.max(40, innerHeight / 2 - rect.top) };
}

async function openFiles() {
  try {
    if (typeof showOpenFilePicker === "function") {
      const handles = await showOpenFilePicker({ multiple: true });
      const files = await Promise.all(handles.map(handle => handle.getFile()));
      await window.FrameChuteIngest?.addFiles(files, point());
      return;
    }
    const picker = document.createElement("input");
    picker.type = "file"; picker.multiple = true;
    picker.addEventListener("change", () => void window.FrameChuteIngest?.addFiles([...picker.files], point()), { once: true });
    picker.click();
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error(error);
      if (status) status.textContent = "FrameChute could not open that file.";
    }
  }
}

const menu = document.createElement("div");
menu.className = "workspace-file-menu";
menu.hidden = true;
menu.innerHTML = '<button type="button">Open File…</button>';
document.body.append(menu);
menu.querySelector("button").addEventListener("click", () => { menu.hidden = true; void openFiles(); });

workspace.addEventListener("contextmenu", event => {
  if (event.target.closest(".block")) return;
  event.preventDefault();
  menu.style.left = `${Math.min(event.clientX, innerWidth - 150)}px`;
  menu.style.top = `${Math.min(event.clientY, innerHeight - 45)}px`;
  menu.hidden = false;
  menu.querySelector("button").focus();
});
document.addEventListener("pointerdown", event => { if (!menu.contains(event.target)) menu.hidden = true; });

window.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "e") {
    event.preventDefault();
    exportButton?.click();
  }
});

window.addEventListener("paste", async event => {
  if (isEditing(event.target)) return;
  const data = event.clipboardData;
  if (!data) return;
  const files = [...data.files];
  const text = data.getData("text/plain").trim();
  if (!files.length && !text) return;
  event.preventDefault();
  if (files.length) await window.FrameChuteIngest?.addFiles(files, point());
  if (text) {
    try {
      const url = new URL(text);
      if (["http:", "https:"].includes(url.protocol)) window.FrameChuteIngest?.addUrl(text, point());
      else await window.FrameChuteIngest?.addText(text, point());
    } catch { await window.FrameChuteIngest?.addText(text, point()); }
  }
});
