const MASCOT_MODE_KEY = "framechute.mascot-mode.v1";
const DONATION_URL = "https://buy.stripe.com/7sI9CD0uQ96mdY43cc";
const DEFAULT_IMAGE = chrome.runtime.getURL("assets/images/default.png");
const HOVER_IMAGE = chrome.runtime.getURL("assets/images/hover.png");

function readMode() {
  const stored = localStorage.getItem(MASCOT_MODE_KEY);
  return ["always", "hover", "hidden"].includes(stored) ? stored : "hover";
}

function writeMode(mode) {
  const next = ["always", "hover", "hidden"].includes(mode) ? mode : "hover";
  localStorage.setItem(MASCOT_MODE_KEY, next);
  return next;
}

function ensureStyles() {
  const href = new URL("./mascot.css", import.meta.url).href;
  if ([...document.styleSheets].some((sheet) => sheet.href === href)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
}

function makeMascot() {
  let zone = document.querySelector("#framechute-mascot-zone");
  if (zone) return zone;

  zone = document.createElement("aside");
  zone.id = "framechute-mascot-zone";
  zone.className = "framechute-mascot-zone";
  zone.setAttribute("aria-label", "FrameChute mascot and support link");

  const hitArea = document.createElement("div");
  hitArea.className = "framechute-mascot-hit-area";
  hitArea.setAttribute("aria-hidden", "true");

  const mascot = document.createElement("button");
  mascot.type = "button";
  mascot.className = "framechute-mascot-button";
  mascot.title = "Support FrameChute";
  mascot.setAttribute("aria-label", "Support FrameChute");

  const image = document.createElement("img");
  image.alt = "";
  image.src = DEFAULT_IMAGE;
  image.draggable = false;
  image.addEventListener("load", () => { image.style.visibility = "visible"; });
  image.addEventListener("error", () => { image.style.visibility = "hidden"; });
  mascot.append(image);

  const donation = document.createElement("section");
  donation.className = "framechute-mascot-donation";
  donation.setAttribute("aria-label", "Support FrameChute");

  const title = document.createElement("strong");
  title.textContent = "If you like this app, pls donate <3";

  const note = document.createElement("small");
  note.textContent = "Anything helps!";

  const donate = document.createElement("a");
  donate.href = DONATION_URL;
  donate.target = "_blank";
  donate.rel = "noopener noreferrer";
  donate.textContent = "Donate";
  donate.setAttribute("aria-label", "Donate to support FrameChute");

  donation.append(title, note, donate);
  zone.append(hitArea, donation, mascot);
  document.body.append(zone);

  function setMascotImage(src) {
    if (image.src === src) return;
    image.style.visibility = "visible";
    image.src = src;
  }

  function setHovered(hovered) {
    zone.classList.toggle("is-mascot-hovered", hovered);
    setMascotImage(hovered ? HOVER_IMAGE : DEFAULT_IMAGE);
  }

  mascot.addEventListener("pointerenter", () => setHovered(true));
  mascot.addEventListener("focus", () => setHovered(true));
  zone.addEventListener("pointerleave", () => setHovered(false));
  zone.addEventListener("focusout", (event) => {
    if (!zone.contains(event.relatedTarget)) setHovered(false);
  });

  mascot.addEventListener("click", () => {
    donate.focus({ preventScroll: true });
  });

  return zone;
}

function applyMode(mode = readMode()) {
  const zone = makeMascot();
  const next = ["always", "hover", "hidden"].includes(mode) ? mode : "hover";
  zone.dataset.mode = next;
  document.body.classList.toggle("framechute-mascot-reserved", next !== "hidden");

  const select = document.querySelector("#setting-mascot-mode");
  if (select && select.value !== next) select.value = next;
}

function installSetting() {
  const settingsBody = document.querySelector("#settings-dock .settings-body");
  if (!settingsBody) return false;

  let row = settingsBody.querySelector(".mascot-mode-row");
  if (!row) {
    row = document.createElement("label");
    row.className = "mascot-mode-row";

    const copy = document.createElement("span");
    copy.innerHTML = "<strong>Mascot</strong><small>Show the top-right mascot, reveal it only when you approach the corner, or hide it completely.</small>";

    const select = document.createElement("select");
    select.id = "setting-mascot-mode";
    select.setAttribute("aria-label", "Mascot visibility");

    for (const [value, label] of [
      ["hover", "Reveal on hover"],
      ["always", "Always visible"],
      ["hidden", "Hidden"]
    ]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.append(option);
    }

    select.value = readMode();
    select.addEventListener("change", () => {
      applyMode(writeMode(select.value));
    });

    row.append(copy, select);

    const donationCard = settingsBody.querySelector(".flashframe-donation-card");
    if (donationCard) settingsBody.insertBefore(row, donationCard);
    else settingsBody.append(row);
  }

  applyMode();
  return true;
}

function install() {
  ensureStyles();
  makeMascot();
  applyMode();
  installSetting();
}

install();
queueMicrotask(install);
setTimeout(install, 150);

const settingsBody = document.querySelector("#settings-dock .settings-body");
if (settingsBody) {
  new MutationObserver(() => queueMicrotask(installSetting)).observe(settingsBody, {
    childList: true,
    subtree: true
  });
}
