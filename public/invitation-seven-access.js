// Only served beneath /invitations/. Normal free-roam access remains schedule-bound.
window.ManorGameAccess = { allowed: () => true };
document.documentElement.dataset.gameAccess = "open";
document.getElementById("game-access").hidden = true;
for (const id of ["welcome", "play-area"]) {
  const element = document.getElementById(id);
  if (element) element.inert = false;
}
document.getElementById("game-schedule").textContent =
  "赴约当晚 · 23:10（剧情时间）｜本局不会因现实钟点结束；进度仅保存在此浏览器，不影响账号关系。";
window.dispatchEvent(
  new CustomEvent("manor:game-access", { detail: { allowed: true } }),
);
