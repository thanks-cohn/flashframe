function replaceVisibleBranding(root = document.body) {
  if (!root) return;

  const replaceText = (value) => String(value || "")
    .replaceAll("~/flashframe", "~/FrameChute")
    .replaceAll("Flashframe data folder", "FrameChute data folder")
    .replaceAll("Choose ~/flashframe", "Choose ~/FrameChute");

  const applyElement = (element) => {
    if (!(element instanceof Element)) return;
    for (const attr of ["title", "aria-label", "placeholder", "value"]) {
      if (!element.hasAttribute(attr)) continue;
      const oldValue = element.getAttribute(attr) || "";
      const nextValue = replaceText(oldValue);
      if (nextValue !== oldValue) element.setAttribute(attr, nextValue);
    }
  };

  if (root.nodeType === Node.TEXT_NODE) {
    const next = replaceText(root.nodeValue);
    if (next !== root.nodeValue) root.nodeValue = next;
    return;
  }

  applyElement(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node = walker.currentNode;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const next = replaceText(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    } else {
      applyElement(node);
    }
    node = walker.nextNode();
  }
}

replaceVisibleBranding();
queueMicrotask(() => replaceVisibleBranding());

new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) replaceVisibleBranding(node);
  }
}).observe(document.body, { childList: true, subtree: true });
