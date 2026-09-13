import { props, tableGames, propAction } from "./scene-props-data.mjs";
import { holes } from "./solitaire-core.mjs";
import { gardenPuzzle } from "./garden-puzzles.mjs";

const dialog = document.createElement("dialog");
dialog.className = "prop-dialog";
dialog.setAttribute("aria-labelledby", "prop-title");
dialog.innerHTML = `<header class="prop-bar"><button type="button" class="prop-back">← 放回原处</button><span class="prop-place"></span><span class="prop-step">走近 · 看看物件</span></header><div class="prop-layout"><div class="prop-shot"><img class="prop-background" alt=""><div class="prop-table-objects"><button type="button" class="prop-board" data-game="solitaire" aria-label="拿起桌上的棋盘"><span class="peg-board" aria-hidden="true"></span></button><button type="button" class="prop-cards" data-game="cards" aria-label="拿起桌上的暗牌"><img src="assets/props/seven-card-fan-v1.webp" alt=""></button></div><span class="prop-caption"></span></div><section class="prop-notes"><p class="eyebrow"></p><h2 id="prop-title"></h2><p class="prop-description"></p><p class="prop-aside"></p><div class="prop-choices" role="group" aria-label="选择桌上的消遣"><button type="button" data-game="solitaire">独自摆棋</button><button type="button" data-game="cards">七张暗牌</button></div><p class="prop-status" role="status"></p><a class="prop-start"></a><details class="table-puzzle"><summary>牌盒旁的小题</summary><h3></h3><p class="puzzle-question"></p><div class="puzzle-choices"></div><p class="puzzle-result" role="status"></p><p class="fine-print">每三天换一道。随时可以放下，不必答对才开始游玩。</p></details></section></div>`;
document.body.append(dialog);
const panel = ManorMotion.createPanel(dialog);
const q = (selector) => dialog.querySelector(selector);
let active = null,
  selected = null,
  opener = null,
  puzzleDate = "";
for (let cell = 0; cell < 49; cell++) {
  const peg = document.createElement("span");
  if (holes.includes(cell))
    peg.className = "peg-hole" + (cell === 24 ? "" : " peg");
  q(".peg-board").append(peg);
}
function renderPuzzle(date) {
  if (puzzleDate === date) return;
  puzzleDate = date;
  const puzzle = gardenPuzzle(date);
  q(".table-puzzle h3").textContent = puzzle.title;
  q(".puzzle-question").textContent =
    `只剩两轮。你有 ${puzzle.player.join("、")}，对面有 ${puzzle.bot.join("、")}。这一轮 ${puzzle.prize} 分，下一轮 ${puzzle.next} 分。先出哪张？`;
  q(".puzzle-result").textContent = "";
  const choices = puzzle.player.map((card) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `先出 ${card}`;
    button.onclick = () => {
      q(".puzzle-result").textContent = puzzle.explanation;
      for (const choice of choices)
        choice.setAttribute("aria-pressed", String(choice === button));
    };
    return button;
  });
  q(".puzzle-choices").replaceChildren(...choices);
}
function syncAction() {
  if (!active) return;
  const state = ManorView.snapshot();
  if (state.room !== props[active].room) {
    panel.close({ immediate: true });
    return;
  }
  const light = Manor.light(state.clock.minute);
  const action = propAction(
    active === "games" ? selected || "cards" : active,
    ManorWorld.snapshot(),
    light,
  );
  q(".prop-status").textContent = action.message;
  const start = q(".prop-start");
  start.hidden = active === "games" && !selected;
  start.textContent = action.allowed
    ? action.label + " →"
    : "等伯爵闲坐时再邀请";
  start.setAttribute("aria-disabled", String(!action.allowed));
  if (action.allowed) start.href = action.href;
  else start.removeAttribute("href");
  dialog.dataset.light = light;
  const source =
    active === "games"
      ? `assets/props/salon-game-table-${light}-v2.webp`
      : `assets/${state.imageKey}.webp`;
  if (q(".prop-background").getAttribute("src") !== source)
    q(".prop-background").src = source;
  if (active === "games") renderPuzzle(state.clock.date);
}
function describe() {
  const info =
    active === "games" && selected ? tableGames[selected] : props[active];
  q("#prop-title").textContent = info.title;
  q(".prop-description").textContent = info.description;
  q(".prop-aside").textContent = info.aside;
  dialog.dataset.game = selected || "";
  for (const button of dialog.querySelectorAll("[data-game]"))
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.game === selected),
    );
  q(".prop-caption").textContent =
    active === "games" ? "左手边是棋盘，右手边是暗牌" : "信纸、羽毛笔与封蜡";
  syncAction();
}
function open(id) {
  const prop = props[id],
    state = ManorView.snapshot();
  if (!prop || state.room !== prop.room) return;
  opener = document.activeElement;
  active = id;
  selected = null;
  dialog.dataset.prop = id;
  q(".prop-place").textContent = prop.place;
  q(".prop-back").textContent = "← 返回" + Manor.rooms[prop.room][0];
  q(".eyebrow").textContent = id === "games" ? "拉过一把椅子" : "一封私人来信";
  q(".prop-background").alt =
    id === "games" ? "在大客厅左侧沙发前坐下，面前是胡桃木游戏桌" : prop.alt;
  q(".table-puzzle").open = false;
  q(".prop-shot").classList.remove("prop-image-failed");
  describe();
  panel.show();
  ManorMotion.animate(
    q(".prop-shot"),
    [
      { opacity: 0.2, transform: "scale(.96)" },
      { opacity: 1, transform: "scale(1)" },
    ],
    400,
  );
  ManorMusic.duck("prop", true);
  q(".prop-back").focus({ preventScroll: true });
}
q(".prop-background").onerror = () => {
  q(".prop-shot").classList.add("prop-image-failed");
  q(".prop-caption").textContent = "桌面画面暂未载入，仍可从文字入口选择。";
};
q(".prop-background").onload = () =>
  q(".prop-shot").classList.remove("prop-image-failed");
for (const button of dialog.querySelectorAll("[data-game]"))
  button.onclick = () => {
    if (active !== "games") return;
    selected = button.dataset.game;
    describe();
  };
q(".prop-start").onclick = (event) => {
  // A close-up is not an invitation token: recheck the real schedule at departure.
  syncAction();
  if (q(".prop-start").getAttribute("aria-disabled") === "true")
    event.preventDefault();
};
q(".prop-back").onclick = () => panel.close();
dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  panel.close();
});
dialog.addEventListener("close", () => {
  active = null;
  ManorMusic.duck("prop", false);
  if (opener?.isConnected) opener.focus({ preventScroll: true });
});
window.addEventListener("hashchange", () => panel.close({ immediate: true }));
window.addEventListener("manor:prop", (event) => open(event.detail.id));
for (const event of ["manor:painted", "manor:committed", "manor:state"])
  window.addEventListener(event, syncAction);
