const PICKER_BUTTON_IDS = [
  "open-text",
  "open-pdf",
  "open-image",
  "open-gallery",
  "open-video",
  "open-audio",
  "archive-connect"
];

let pickerBusy = false;

function statusNode() {
  return document.querySelector("#status");
}

function pickerButtons() {
  return PICKER_BUTTON_IDS
    .map((id) => document.getElementById(id))
    .filter((node) => node instanceof HTMLButtonElement);
}

function descriptionFor(options, fallback) {
  const descriptions = options?.types
    ?.map((type) => String(type?.description || "").trim())
    .filter(Boolean);
  return descriptions?.[0] || fallback;
}

function busyAbort() {
  return new DOMException("Another FrameChute file picker is already open.", "AbortError");
}

function installGuard(methodName, fallbackLabel) {
  const original = window[methodName];
  if (typeof original !== "function") return;

  const nativePicker = original.bind(window);

  try {
    window[methodName] = async function guardedFrameChutePicker(options = {}) {
      const status = statusNode();
      if (pickerBusy) {
        if (status) status.textContent = "A file picker is already open.";
        throw busyAbort();
      }

      pickerBusy = true;
      const buttons = pickerButtons();
      const disabledBefore = new Map(buttons.map((button) => [button, button.disabled]));
      const previousStatus = status?.textContent || "";
      const label = descriptionFor(options, fallbackLabel);
      const waitingMessage = `Waiting for ${label.toLowerCase()} picker…`;

      for (const button of buttons) button.disabled = true;
      document.body.dataset.framechutePickerBusy = "true";
      if (status) status.textContent = waitingMessage;

      try {
        return await nativePicker(options);
      } finally {
        pickerBusy = false;
        delete document.body.dataset.framechutePickerBusy;
        for (const [button, wasDisabled] of disabledBefore) {
          if (button.isConnected) button.disabled = wasDisabled;
        }
        if (status?.textContent === waitingMessage) status.textContent = previousStatus;
      }
    };
  } catch (error) {
    console.warn(`FrameChute could not guard ${methodName}:`, error);
  }
}

installGuard("showOpenFilePicker", "file");
installGuard("showDirectoryPicker", "folder");
