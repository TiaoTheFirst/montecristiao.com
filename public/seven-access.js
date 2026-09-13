import { invitationStatus } from "./game-hours.mjs";
let last;
function current() {
  return invitationStatus(window.ManorWorld?.snapshot());
}
window.ManorGameAccess = { allowed: () => current().allowed };
function refresh() {
  const status = current(),
    gate = document.getElementById("game-access");
  const clock = window.ManorWorld?.clock();
  if (clock)
    document.getElementById("after-hours-chess").href =
      `solitaire.html?from=salon&light=${Manor.light(clock.minute)}`;
  const visible = gate && !gate.hidden;
  document.documentElement.dataset.gameAccess = status.allowed
    ? "open"
    : "closed";
  if (gate) {
    gate.hidden = status.allowed;
    document.getElementById("game-access-message").textContent = status.message;
  }
  for (const id of ["welcome", "play-area"]) {
    const n = document.getElementById(id);
    if (n) n.inert = !status.allowed;
  }
  if (last !== status.allowed) {
    last = status.allowed;
    window.dispatchEvent(
      new CustomEvent("manor:game-access", {
        detail: { allowed: status.allowed },
      }),
    );
    if (!status.allowed && gate) {
      for (const d of document.querySelectorAll("dialog[open]")) d.close();
      gate.focus({ preventScroll: true });
    }
    if (status.allowed && visible)
      document.getElementById("start")?.focus({ preventScroll: true });
  }
}
window.addEventListener("manor:world", refresh);
document.addEventListener("visibilitychange", refresh);
setInterval(refresh, 2000);
refresh();
