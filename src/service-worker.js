const workspaceUrl = chrome.runtime.getURL("src/workspace.html");

chrome.action.onClicked.addListener(async () => {
  try {
    const matches = await chrome.tabs.query({ url: workspaceUrl });
    const existing = matches[0];

    if (existing?.id != null) {
      await chrome.tabs.update(existing.id, { active: true });
      if (existing.windowId != null) {
        await chrome.windows.update(existing.windowId, { focused: true });
      }
      return;
    }
  } catch (error) {
    console.warn("Could not locate an existing Flashframe tab:", error);
  }

  await chrome.tabs.create({ url: workspaceUrl });
});
