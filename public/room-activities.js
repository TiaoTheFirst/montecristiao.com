import { gardenPuzzle } from "./garden-puzzles.mjs";
import { invitationStatus } from "./game-hours.mjs";
const section = document.getElementById("room-activities"),
  dialog = document.getElementById("garden-sit"),
  panel = window.ManorMotion.createPanel(dialog);
const el = (tag, text) => {
  const n = document.createElement(tag);
  if (text) n.textContent = text;
  return n;
};
let state,
  key = "",
  opener;
dialog.querySelector("form").onsubmit = (e) => {
  e.preventDefault();
  panel.close();
};
dialog.addEventListener("cancel", (e) => {
  e.preventDefault();
  panel.close();
});
dialog.addEventListener("close", () => {
  if (opener?.isConnected) opener.focus({ preventScroll: true });
});
function openGarden(button) {
  state = ManorView.snapshot();
  if (state.room !== "garden") return;
  opener = button;
  const light = Manor.light(state.clock.minute),
    puzzle = gardenPuzzle(state.clock.date);
  document.getElementById("garden-sit-image").src =
    `assets/garden-${light}.webp`;
  document.getElementById("garden-puzzle-title").textContent = puzzle.title;
  document.getElementById("garden-puzzle-question").textContent =
    `只剩两轮。你有 ${puzzle.player.join("、")}，对面有 ${puzzle.bot.join("、")}。这一轮 ${puzzle.prize} 分，下一轮 ${puzzle.next} 分。先出哪张？`;
  const result = document.getElementById("garden-puzzle-result");
  result.textContent = "";
  const choices = puzzle.player.map((c) => {
    const b = el("button", `先出 ${c}`);
    b.type = "button";
    b.onclick = () => {
      result.textContent = puzzle.explanation;
      for (const n of choices) n.setAttribute("aria-pressed", String(n === b));
    };
    return b;
  });
  document.getElementById("garden-puzzle-choices").replaceChildren(...choices);
  const links = document.getElementById("garden-sit-links");
  links.replaceChildren();
  for (const [label, href] of [
    ["在露台摆独粒棋", `solitaire.html?from=garden&light=${light}`],
    ["读府邸近况", "household.html"],
  ]) {
    const a = el("a", label + " →");
    a.href = href;
    links.append(a);
  }
  const note = document.getElementById("garden-presence");
  note.textContent =
    state.count.room === "garden" && !state.count.moving
      ? "伯爵也在园中。想问候他，可以回到园中走近。"
      : "伯爵此刻不在园中。棋盘和这道小题，可以自己慢慢试。";
  panel.show();
}
function sync() {
  state = window.ManorView?.snapshot();
  if (!state) return;
  if (state.room !== "garden" && dialog.open) panel.close({ immediate: true });
  if (dialog.open) {
    document.getElementById("garden-presence").textContent =
      state.count.room === "garden" && !state.count.moving
        ? "伯爵也在园中。想问候他，可以回到园中走近。"
        : "伯爵此刻不在园中。棋盘和这道小题，可以自己慢慢试。";
  }
  const invitation = invitationStatus(window.ManorWorld?.snapshot());
  const signature = [
    state.room,
    Manor.light(state.clock.minute),
    invitation.allowed,
    invitation.message,
  ].join("|");
  if (signature === key) return;
  key = signature;
  const item = window.ManorRoomActivities[state.room];
  section.hidden = !item;
  section.replaceChildren();
  if (!item) return;
  const copy = el("div");
  copy.append(
    el("h2", item.title),
    el("p", state.room === "salon" ? invitation.message : item.description),
  );
  const actions = el("nav");
  actions.setAttribute("aria-label", item.title);
  for (const [label, href] of item.links) {
    if (
      state.room === "salon" &&
      href.startsWith("seven-cards") &&
      !invitation.allowed
    )
      continue;
    const a = el(
      "a",
      (state.room === "salon" && href.startsWith("seven-cards")
        ? "邀请伯爵玩一局"
        : label) + " →",
    );
    a.href =
      href +
      (state.room === "garden"
        ? `&light=${Manor.light(state.clock.minute)}`
        : "");
    actions.append(a);
  }
  if (state.room === "garden") {
    const b = el("button", "花园小坐 · 看一道小题");
    b.type = "button";
    b.onclick = () => openGarden(b);
    actions.append(b);
  }
  section.append(copy, actions);
}
window.addEventListener("manor:state", sync);
window.addEventListener("manor:committed", sync);
sync();
