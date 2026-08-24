const DONATION_URL = "https://buy.stripe.com/7sI9CD0uQ96mdY43cc";

function installDonationCard() {
  const settingsBody = document.querySelector("#settings-dock .settings-body");
  if (!settingsBody || settingsBody.querySelector(".flashframe-donation-card")) return;

  const card = document.createElement("section");
  card.className = "flashframe-donation-card";
  card.setAttribute("aria-label", "Support Flashframe");

  const copy = document.createElement("div");
  copy.className = "flashframe-donation-copy";

  const title = document.createElement("strong");
  title.textContent = "Please donate <3";

  const note = document.createElement("small");
  note.textContent = "Anything is appreciated!";

  const donate = document.createElement("a");
  donate.className = "flashframe-donation-button";
  donate.href = DONATION_URL;
  donate.target = "_blank";
  donate.rel = "noopener noreferrer";
  donate.textContent = "Donate";
  donate.setAttribute("aria-label", "Donate to support Flashframe");

  copy.append(title, note);
  card.append(copy, donate);
  settingsBody.append(card);
}

installDonationCard();
queueMicrotask(installDonationCard);
setTimeout(installDonationCard, 150);

const settingsBody = document.querySelector("#settings-dock .settings-body");
if (settingsBody) {
  new MutationObserver(() => installDonationCard()).observe(settingsBody, { childList: true });
}
