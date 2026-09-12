// Presentation only: the rules and the opponent's decision do not depend on images.
import { expressionAfterRound } from "./seven-expression.mjs";
const scene = document.getElementById("count-tableau");
const bid = document.getElementById("bot-bid");
const turn = scene.querySelector(".count-turn");
const tableNext = document.getElementById("table-next"),
  next = document.getElementById("next");
tableNext.onclick = () => {
  next.click();
  document
    .getElementById("hand")
    .scrollIntoView?.({
      behavior: window.ManorMotion?.reduced() ? "instant" : "smooth",
      block: "center",
    });
};
function syncNext() {
  tableNext.hidden = next.hidden;
  tableNext.textContent = next.textContent;
}
new MutationObserver(syncNext).observe(next, {
  attributes: true,
  childList: true,
  characterData: true,
  subtree: true,
});
syncNext();
let timer,
  faceTimer,
  previous = "",
  previousLead = 0;
const faceLabels = {
  rest: "伯爵看着桌上的牌",
  smile: "伯爵露出一丝笑意",
  attentive: "伯爵的神情认真了些",
};
function setExpression(expression) {
  scene.dataset.expression = expression;
  scene.querySelector(".count-rest").alt =
    faceLabels[expression] + "，坐在木桌对面";
}
function settle() {
  clearTimeout(timer);
  scene.classList.remove("turning");
}
function observeReveal() {
  const key = bid.classList.contains("face-card") ? bid.textContent : "";
  if (key === previous) return;
  previous = key;
  settle();
  clearTimeout(faceTimer);
  setExpression("rest");
  if (key) {
    scene.scrollIntoView?.({
      behavior: window.ManorMotion?.reduced() ? "instant" : "smooth",
      block: "center",
    });
    const playerScore = Number(
        document.getElementById("player-score").textContent,
      ),
      botScore = Number(document.getElementById("bot-score").textContent);
    const expression = expressionAfterRound({
      revealed: true,
      playerBid: Number(document.getElementById("player-bid").textContent),
      botBid: Number(key),
      pot: Number(document.getElementById("pot").textContent),
      playerScore,
      botScore,
      previousLead,
      final: !document.getElementById("summary").hidden,
    });
    previousLead = playerScore - botScore;
    setExpression(expression);
    if (expression !== "rest")
      faceTimer = setTimeout(() => setExpression("rest"), 4200);
  }
  if (
    !key ||
    window.ManorMotion?.reduced() ||
    !turn.complete ||
    !turn.naturalWidth
  )
    return;
  scene.classList.add("turning");
  timer = setTimeout(settle, 650);
}
new MutationObserver(observeReveal).observe(bid, {
  attributes: true,
  childList: true,
  characterData: true,
  subtree: true,
});
new MutationObserver(() => {
  if (document.getElementById("play-area").hidden) {
    previous = "";
    previousLead = 0;
    settle();
    clearTimeout(faceTimer);
    setExpression("rest");
  }
}).observe(document.getElementById("play-area"), {
  attributes: true,
  attributeFilter: ["hidden"],
});
matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
  "change",
  settle,
);
new MutationObserver(() => {
  if (window.ManorMotion?.reduced()) settle();
}).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-motion"],
});
window.addEventListener("pagehide", () => {
  settle();
  clearTimeout(faceTimer);
});
