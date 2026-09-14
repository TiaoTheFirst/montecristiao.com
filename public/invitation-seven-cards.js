import {
  CARDS,
  createGame,
  publicView,
  play,
  restoreGame,
} from "./seven-core.mjs";
import { browserSessionStore } from "./invitation-seven-state.mjs";
import "./motion.js";
import "./invitation-seven-access.js";
const $ = (id) => document.getElementById(id),
  session = browserSessionStore();
const modes = {
  casual: "随便玩一局",
  lesson: "请教一局",
  challenge: "认真较量",
};
let game,
  mode = "casual",
  phase = "welcome",
  selected = null,
  plan = null,
  lockedBid = null,
  worker = null,
  requestId = 0,
  timer = null,
  reviewAnalysis = null;
const analyses = new Map();
const rulesPanel = window.ManorMotion.createPanel($("rules")),
  reviewPanel = window.ManorMotion.createPanel($("review")),
  resetPanel = window.ManorMotion.createPanel($("reset-dialog"));
for (const [id, panel] of [
  ["rules", rulesPanel],
  ["review", reviewPanel],
  ["reset-dialog", resetPanel],
]) {
  $(id)
    .querySelector("form")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      panel.close();
    });
  $(id).addEventListener("cancel", (e) => {
    e.preventDefault();
    panel.close();
  });
}
function text(id, value) {
  $(id).textContent = value;
}
function save() {
  if (!game) return;
  try {
    session.write({
      version: 2,
      deck: game.deck,
      bids: game.history.map((r) => [r.player, r.bot]),
      mode,
      phase,
      locked: ["choose", "loading", "error"].includes(phase) ? lockedBid : null,
    });
  } catch {
    text("save-note", "当前浏览器无法保存进度；刷新会重新开始。");
  }
}
function stopWorker() {
  requestId++;
  worker?.terminate();
  worker = null;
  clearTimeout(timer);
}
function compute(view, callback) {
  stopWorker();
  const id = requestId;
  try {
    worker = new Worker(new URL("./seven-worker.js", import.meta.url), {
      type: "module",
    });
    const fail = () => {
      if (id !== requestId) return;
      stopWorker();
      callback(null);
    };
    worker.onerror = fail;
    worker.onmessage = ({ data }) => {
      if (data.id !== id || id !== requestId) return;
      clearTimeout(timer);
      worker.terminate();
      worker = null;
      callback(data.error ? null : data);
    };
    timer = setTimeout(fail, 45000);
    worker.postMessage({ id, view, mode });
  } catch {
    stopWorker();
    callback(null);
  }
}
function begin(locked = null) {
  if (!window.ManorGameAccess?.allowed()) return;
  phase = "loading";
  selected = null;
  plan = null;
  lockedBid = locked;
  text("hint-text", "");
  render();
  $("status").focus({ preventScroll: true });
  save();
  if (game.player.length === 1) {
    game = play(game, game.player[0], game.bot[0]);
    phase = "finished";
    render();
    save();
    $("review-open").focus();
    return;
  }
  compute(publicView(game), (data) => {
    if (!data) {
      phase = "error";
      render();
      return;
    }
    plan = { ...data, bid: game.bot.includes(locked) ? locked : data.bid };
    lockedBid = plan.bid;
    analyses.set(game.history.length, data.analysis);
    phase = "choose";
    render();
    save();
  });
}
function start() {
  if (!window.ManorGameAccess?.allowed()) return;
  stopWorker();
  mode = $("mode").value;
  game = createGame();
  analyses.clear();
  $("welcome").hidden = true;
  $("play-area").hidden = false;
  window.ManorMotion.reveal($("play-area"));
  begin();
}
function resultText(r) {
  if (r.split)
    return `${r.before.future.length ? "连续两轮平局" : "最后一轮平局"}，${r.before.pot} 分平分，各得 ${r.before.pot / 2} 分。`;
  if (!r.result) return `同为 ${r.player}。${r.before.pot} 分留到下一轮。`;
  return `${r.result > 0 ? "你" : "伯爵"}以 ${Math.max(r.player, r.bot)} 对 ${Math.min(r.player, r.bot)}，拿下 ${r.before.pot} 分。`;
}
function render() {
  const n = game.history.length,
    last = game.history.at(-1),
    revealed = phase === "resolved" || phase === "finished",
    view = revealed ? last.before : publicView(game);
  text(
    "round-label",
    phase === "finished" ? "七轮结束" : `第 ${revealed ? n : n + 1} / 7 轮`,
  );
  text("mode-label", modes[mode]);
  text("bot-score", game.scores[1]);
  text("player-score", game.scores[0]);
  text("pot", view.pot);
  text(
    "carry-note",
    view.pot > view.prize
      ? `新添 ${view.prize} 分 · 累积 ${view.pot - view.prize} 分`
      : "",
  );
  text(
    "opponent-status",
    revealed
      ? "本轮已揭牌"
      : phase === "choose"
        ? "暗牌已落定"
        : phase === "error"
          ? "牌桌暂时中断"
          : "正在考虑余下的牌",
  );
  $("bot-bid").className = revealed ? "face-card" : "card-back";
  text("bot-bid", revealed ? last.bot : "M");
  $("bot-bid").setAttribute(
    "aria-label",
    revealed ? `伯爵出牌 ${last.bot}` : "伯爵的暗牌，尚未揭开",
  );
  $("player-bid").className =
    revealed || selected !== null ? "face-card" : "empty-card";
  text("player-bid", revealed ? last.player : (selected ?? "待选"));
  text(
    "status",
    revealed
      ? resultText(last)
      : phase === "loading"
        ? "正在准备这一轮，你可以先看看余下的牌。"
        : phase === "error"
          ? "牌桌未能完成计算。原局保留，请重试。"
          : selected !== null
            ? `已选 ${selected}。揭牌前，还可以换一张。`
            : "选一张手牌，再同时揭开。",
  );
  $("bot-hand").replaceChildren(
    ...CARDS.map((c) => {
      const e = document.createElement("span");
      e.textContent = c;
      e.className = game.bot.includes(c) ? "" : "used";
      e.setAttribute(
        "aria-label",
        `${c}${game.bot.includes(c) ? " 尚未使用" : " 已用"}`,
      );
      return e;
    }),
  );
  text("hand-count", `${game.player.length} 张可用`);
  $("hand").replaceChildren(
    ...CARDS.map((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = game.player.includes(c) ? "" : "spent";
      b.disabled = phase !== "choose" || !game.player.includes(c);
      b.setAttribute(
        "aria-label",
        `手牌 ${c}${game.player.includes(c) ? "" : "，已用"}`,
      );
      b.setAttribute("aria-pressed", String(selected === c));
      b.innerHTML = `<small aria-hidden="true">${c}</small><b aria-hidden="true">${c}</b><small aria-hidden="true">${c}</small>`;
      b.onclick = () => {
        selected = c;
        render();
        $("hand").children[c - 1].focus();
      };
      return b;
    }),
  );
  $("commit").hidden = revealed || phase === "error";
  $("commit").disabled = phase !== "choose" || selected === null;
  text(
    "commit",
    phase === "loading"
      ? "正在准备…"
      : selected === null
        ? "选一张牌"
        : `揭开 ${selected} · 同时亮牌`,
  );
  $("next").hidden = phase !== "resolved";
  text("next", game.player.length === 1 ? "揭开最后两张牌 →" : "下一轮 →");
  $("retry").hidden = phase !== "error";
  $("hint").hidden = mode !== "lesson" || revealed || phase === "error";
  $("hint").disabled = phase !== "choose";
  $("future-prizes").parentElement.hidden = phase === "finished";
  $("future-prizes").replaceChildren(
    ...(phase === "finished" ? [] : view.future).map((c) => {
      const e = document.createElement("i");
      e.textContent = c;
      return e;
    }),
  );
  $("empty-history").hidden = n > 0;
  $("history").replaceChildren(
    ...game.history.map((r, i) => {
      const li = document.createElement("li");
      const label = document.createElement("span"),
        score = document.createElement("strong"),
        detail = document.createElement("small");
      label.textContent = `${String(i + 1).padStart(2, "0")}　你 ${r.player} · 伯爵 ${r.bot}`;
      score.textContent = r.split
        ? "平分"
        : !r.result
          ? "累积"
          : `${r.result > 0 ? "你" : "伯爵"} +${r.before.pot}`;
      detail.textContent = `本轮 ${r.before.prize} 分${r.before.pot > r.before.prize ? `，连同累积共 ${r.before.pot} 分` : ""}`;
      li.append(label, score, detail);
      return li;
    }),
  );
  $("summary").hidden = phase !== "finished";
  if (phase === "finished") {
    const d = game.scores[0] - game.scores[1];
    text(
      "outcome",
      d > 0
        ? "这一局，你赢了。"
        : d < 0
          ? "这一局，伯爵胜出。"
          : "这一局，平分秋色。",
    );
    text(
      "outcome-detail",
      `${game.scores[0]} : ${game.scores[1]}。七张牌都已落下，可以挑一轮回看。`,
    );
  }
}
$("start").onclick = start;
$("mode").onchange = () =>
  text(
    "mode-description",
    {
      casual: "先熟悉取舍与揭牌的节奏，整局强度保持一致。",
      lesson: "可在出牌前看取舍提示。提示不透露伯爵已锁定的暗牌。",
      challenge: "考虑更多后续局面，不提供局中提示。结束后仍可复盘。",
    }[$("mode").value],
  );
$("commit").onclick = () => {
  if (!window.ManorGameAccess?.allowed()) return;
  if (phase !== "choose" || selected === null || !plan) return;
  game = play(game, selected, plan.bid);
  phase = game.history.length === 7 ? "finished" : "resolved";
  selected = null;
  plan = null;
  lockedBid = null;
  text("hint-text", "");
  render();
  save();
  $("next").focus();
};
$("next").onclick = () => {
  if (phase === "resolved") begin();
};
$("retry").onclick = () => {
  if (phase === "error") begin(lockedBid);
};
$("hint").onclick = () => {
  if (!window.ManorGameAccess?.allowed()) return;
  if (phase !== "choose" || !plan) return;
  const a = plan.analysis,
    values = a.columnValues,
    best = values.indexOf(Math.min(...values)),
    card = a.playerCards[best];
  text(
    "hint-text",
    `可以考虑 ${card}：综合这一轮和余牌，它在当前估算中较有利。提示没有查看伯爵的暗牌，也不保证本轮获胜。`,
  );
};
function restart() {
  if (game.history.length < 7) {
    resetPanel.show();
    return;
  }
  resetDeal();
}
function resetDeal() {
  stopWorker();
  phase = "welcome";
  game = null;
  plan = null;
  selected = null;
  try {
    session.clear();
  } catch {}
  $("welcome").hidden = false;
  $("play-area").hidden = true;
  window.ManorMotion.reveal($("welcome"));
  $("start").focus();
}
$("restart").onclick = restart;
$("again").onclick = restart;
$("reset-confirm").onclick = () => {
  resetPanel.close();
  resetDeal();
};
$("reset-dialog").addEventListener("close", () =>
  (phase === "welcome" ? $("start") : $("restart")).focus(),
);
$("rules-open").onclick = () => rulesPanel.show();
function reviewChoice(card) {
  const i = Number($("review-round").value),
    r = game.history[i],
    win = Math.sign(card - r.bot),
    award =
      win > 0
        ? `你将拿到 ${r.before.pot} 分`
        : win < 0
          ? `伯爵仍将拿到 ${r.before.pot} 分`
          : i === 6 || r.before.pot > r.before.prize
            ? `双方将平分 ${r.before.pot} 分`
            : `${r.before.pot} 分将留到下一轮`;
  for (const b of $("review-hand").children)
    b.setAttribute("aria-pressed", String(Number(b.dataset.card) === card));
  text(
    "review-result",
    `如果改出 ${card}，对上已知的 ${r.bot}，${award}。你的余牌将是 ${r.before.player.filter((c) => c !== card).join("、") || "无"}。`,
  );
  const a = reviewAnalysis;
  if (a) {
    const delta =
      a.columnValues[a.playerCards.indexOf(r.player)] -
      a.columnValues[a.playerCards.indexOf(card)];
    text(
      "review-estimate",
      card === r.player
        ? "这就是你的实际出牌。下方对照只是一种回看方法，不替你决定当时该冒多大风险。"
        : Math.abs(delta) < 0.1
          ? "不看实际暗牌、按对手可能出牌的分布估算，这两张牌的取舍很接近（分差估计相差不足 0.1 分），没有明确的优劣结论。"
          : `不看实际暗牌、按对手可能出牌的分布估算，换这张牌的后续分差约${delta >= 0 ? "改善" : "减少"} ${Math.abs(delta).toFixed(1)} 分。这是有限搜索的估计，不是胜率或保证。`,
    );
  }
}
function showReviewRound() {
  reviewAnalysis = null;
  const i = Number($("review-round").value),
    r = game.history[i];
  text(
    "review-fact",
    `第 ${i + 1} 轮，争夺 ${r.before.pot} 分。你出了 ${r.player}，伯爵出了 ${r.bot}。`,
  );
  $("review-hand").replaceChildren(
    ...r.before.player.map((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.card = c;
      b.textContent = c;
      b.setAttribute("aria-label", `复盘改出 ${c}`);
      b.onclick = () => reviewChoice(c);
      return b;
    }),
  );
  text("review-estimate", "正在估算当时各张牌的取舍…");
  reviewChoice(r.player);
  const ready = (a) => {
    reviewAnalysis = a;
    const chosen = $("review-hand").querySelector("[aria-pressed=true]");
    if (a && chosen) reviewChoice(Number(chosen.dataset.card));
    else text("review-estimate", "暂时无法完成估算；仍可查看实际出牌对照。");
  };
  if (analyses.has(i)) ready(analyses.get(i));
  else compute(r.before, (data) => ready(data?.analysis));
}
$("review-open").onclick = () => {
  if (phase !== "finished") return;
  $("review-round").replaceChildren(
    ...game.history.map((r, i) => {
      const o = document.createElement("option");
      o.value = i;
      o.textContent = `第 ${i + 1} 轮 · 争夺 ${r.before.pot} 分`;
      return o;
    }),
  );
  // Largest contested pot is factual; do not label it a proven blunder.
  const choices = game.history.slice(0, 6);
  $("review-round").value = choices.reduce(
    (best, r, i) => (r.before.pot > choices[best].before.pot ? i : best),
    0,
  );
  reviewPanel.show();
  showReviewRound();
};
$("review-round").onchange = () => {
  stopWorker();
  showReviewRound();
};
$("review").addEventListener("close", () => {
  stopWorker();
  $("review-open").focus();
});
$("rules").addEventListener("close", () => $("rules-open").focus());
try {
  const saved = session.read();
  if (saved) {
    game = restoreGame(saved);
    mode = Object.hasOwn(modes, saved.mode) ? saved.mode : "casual";
    $("mode").value = mode;
    $("mode").onchange();
    $("welcome").hidden = true;
    $("play-area").hidden = false;
    if (game.history.length === 7) {
      phase = "finished";
      render();
    } else if (saved.phase === "resolved" && game.history.length) {
      phase = "resolved";
      render();
    } else {
      lockedBid = saved.locked;
      phase = "loading";
      begin(saved.locked);
    }
  }
} catch {
  try {
    session.clear();
  } catch {}
  game = null;
  phase = "welcome";
  $("welcome").hidden = false;
  $("play-area").hidden = true;
}
window.addEventListener("manor:game-access", ({ detail }) => {
  if (!detail.allowed) {
    stopWorker();
    if (game) save();
    return;
  }
  if (game && ["loading", "choose", "error"].includes(phase)) begin(lockedBid);
});
