const workspaceUrl = chrome.runtime.getURL("src/workspace.html");

chrome.action.onClicked.addListener(async () => {
  await chrome.tabs.create({ url: workspaceUrl });
});
