import {
  holes,
  initialBoard,
  canMove,
  move,
  moves,
} from "./solitaire-core.mjs";
import {
  classic,
  allPuzzles,
  edition,
  replay,
  won,
} from "./solitaire-puzzles.mjs";
import { knownRoute, rememberRoute } from "./solitaire-solver.mjs";
import {
  rewardKey,
  cleanRecords,
  award,
  themes,
  keepsakeSVG,
} from "./solitaire-rewards.mjs";
const $ = (s) => document.querySelector(s),
  history = [],
  trace = [],
  buttons = new Map();
const sessionKey = "manor-solitaire-game-v2";
let puzzle = classic,
  board = initialBoard(),
  selected = null,
  assisted = false,
  records = [],
  worker = null,
  revision = 0,
  awarded = false;
try {
  records = cleanRecords(JSON.parse(localStorage.getItem(rewardKey)));
} catch {}
try {
  const saved = JSON.parse(localStorage.getItem(sessionKey));
  const found = allPuzzles.find((p) => p.id === saved?.id);
  if (
    found &&
    Array.isArray(saved.trace) &&
    saved.trace.length <= 31 &&
    saved.trace.every(
      (m) => Array.isArray(m) && m.length === 2 && m.every(Number.isInteger),
    )
  ) {
    const restored = replay(found.start, saved.trace);
    if (restored) {
      puzzle = found;
      board = new Set(found.start);
      assisted = !!saved.assisted;
      for (const step of saved.trace) {
        history.push(board);
        board = move(board, ...step);
        trace.push(step);
      }
    }
  }
} catch {}
function cancelSearch() {
  revision++;
  worker?.terminate();
  worker = null;
  $("#hint").textContent = "看一步提示";
}
function save() {
  try {
    localStorage.setItem(
      sessionKey,
      JSON.stringify({ id: puzzle.id, trace, assisted }),
    );
  } catch {
    $("#storage-note").textContent =
      "浏览器未允许保存；离开后棋局与纪念可能丢失。";
  }
}
const coordinate = (i) => `第 ${Math.floor(i / 7) + 1} 行第 ${(i % 7) + 1} 列`;
for (let i = 0; i < 49; i++) {
  if (!holes.includes(i)) {
    const blank = document.createElement("span");
    blank.setAttribute("aria-hidden", "true");
    $("#board").append(blank);
    continue;
  }
  const button = document.createElement("button");
  button.type = "button";
  buttons.set(i, button);
  $("#board").append(button);
  button.onclick = () => {
    if (won(board, puzzle.target)) return;
    if (board.has(i)) selected = selected === i ? null : i;
    else if (selected !== null) {
      const next = move(board, selected, i);
      if (next) {
        cancelSearch();
        history.push(board);
        trace.push([selected, i]);
        board = next;
        selected = null;
        $("#game-help").textContent = "已取走跳过的棋子。";
      } else $("#game-help").textContent = "这里不能落子，请选亮起的空位。";
    }
    render();
    save();
  };
  button.onkeydown = (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[
      e.key
    ];
    if (!step) return;
    e.preventDefault();
    for (let j = i + step; j >= 0 && j < 49; j += step) {
      if (Math.abs(step) === 1 && Math.floor(j / 7) !== Math.floor(i / 7))
        break;
      if (buttons.has(j)) {
        buttons.get(j).focus();
        break;
      }
    }
  };
}
function collection() {
  $("#keepsakes").textContent = records.length
    ? `一子留桌 · 已收 ${records.length} 张棋谱卡，其中 ${records.filter((r) => !r.assisted).length} 局独立完成。`
    : "第一局完成后，收下「一子留桌」纪念与这一局的棋谱卡。";
  $("#theme-reward").hidden = themes(records).size < 3;
}
function victory() {
  if (awarded) return;
  awarded = true;
  records = award(records, puzzle, trace, assisted);
  try {
    localStorage.setItem(rewardKey, JSON.stringify(records));
  } catch {
    $("#storage-note").textContent = "纪念暂留本页，浏览器未允许保存。";
  }
  $("#victory-title").textContent = `${puzzle.title} · 一子留桌`;
  $("#victory-detail").textContent =
    `${trace.length} 次跳跃，最后一枚留在${coordinate([...board][0])}。${assisted ? "这局借助过提示。" : "这局未使用提示。"}`;
  $("#victory-note").textContent =
    "棋匣里的短笺写着：“留到最后的那一枚，往往要靠早先留下的路。棋谱请带走；下次再来，可以挑一步重新摆出来。”";
  $("#victory").hidden = false;
  $("#victory-title").focus({ preventScroll: true });
  $("#victory").scrollIntoView({
    behavior: window.ManorMotion?.reduced() ? "instant" : "smooth",
    block: "nearest",
  });
  collection();
}
function render() {
  const available = moves(board),
    win = won(board, puzzle.target);
  $("#puzzle-title").textContent = puzzle.title;
  $("#puzzle-goal").textContent =
    puzzle.target === null
      ? "最后只留一枚，停在哪个孔都可以。"
      : `最后只留一枚，并停在${coordinate(puzzle.target)}的金圈孔。`;
  $("#game-status").textContent = win
    ? "只剩一枚。您解开了这一盘。"
    : board.size === 1
      ? "剩下一枚，但没有到达指定孔；退回再试。"
      : available.length
        ? `余下 ${board.size} 枚 · 已走 ${trace.length} 步`
        : `余下 ${board.size} 枚 · 已无可走的步数，可以退回再试`;
  for (const [i, b] of buttons) {
    const peg = board.has(i),
      dest = selected !== null && canMove(board, selected, i);
    b.className = [
      peg ? "peg" : "",
      selected === i ? "selected" : "",
      dest ? "destination" : "",
      puzzle.target === i ? "target-hole" : "",
      win && peg ? "winning-peg" : "",
    ].join(" ");
    b.setAttribute(
      "aria-label",
      `${coordinate(i)}，${peg ? "棋子" : dest ? "可落子空孔" : "空孔"}${puzzle.target === i ? "，目标孔" : ""}`,
    );
    b.setAttribute("aria-pressed", String(selected === i));
  }
  $("#undo").disabled = !history.length;
  $("#hint").disabled = win || !!worker;
  $("#recover").hidden = !history.some((state) =>
    knownRoute(state, puzzle.target),
  );
  if (win) victory();
  else {
    $("#victory").hidden = true;
    awarded = false;
  }
}
$("#undo").onclick = () => {
  if (!history.length) return;
  cancelSearch();
  board = history.pop();
  trace.pop();
  selected = null;
  $("#game-help").textContent = "退回了上一步。";
  render();
  save();
};
$("#recover").onclick = () => {
  const at = history.findLastIndex((state) => knownRoute(state, puzzle.target));
  if (at < 0) return;
  cancelSearch();
  board = history[at];
  history.length = at;
  trace.length = at;
  selected = null;
  assisted = true;
  $("#game-help").textContent = "已退回最近一个有完整解法的位置。";
  render();
  save();
};
function start(next) {
  cancelSearch();
  puzzle = next;
  board = new Set(puzzle.start);
  history.length = 0;
  trace.length = 0;
  selected = null;
  assisted = false;
  awarded = false;
  $("#route-review").hidden = true;
  $("#change-board").hidden = true;
  $("#game-help").textContent = "棋子已摆好。";
  render();
  save();
}
let pending = classic;
function requestStart(next) {
  pending = next;
  if (!trace.length || won(board, puzzle.target)) start(next);
  else {
    $("#change-board").hidden = false;
    $("#change-description").textContent =
      `收起当前进度，摆上「${next.title}」？`;
    $("#confirm-board").focus();
  }
}
$("#restart").onclick = () => requestStart(puzzle);
$("#confirm-board").onclick = () => start(pending);
$("#cancel-board").onclick = () => {
  $("#change-board").hidden = true;
  $("#restart").focus();
};
$("#classic").onclick = () => requestStart(classic);
const current = edition();
$("#edition").textContent = `本期三日棋 · ${current.puzzle.title}`;
$("#edition").onclick = () => requestStart(current.puzzle);
$("#next-edition").textContent =
  `下次推荐：${current.next.toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" })}。按北京时间轮换；正在下的棋局会保留。12 局为一轮，轮末会再次推荐旧局。`;
for (const p of allPuzzles.slice(1)) {
  const b = document.createElement("button");
  b.textContent = `${p.title} · ${p.start.length} 枚 · ${p.theme}`;
  b.onclick = () => requestStart(p);
  $("#archive").append(b);
}
function present(result) {
  worker?.terminate();
  worker = null;
  if (
    result.status === "solved" &&
    result.route.length &&
    rememberRoute(board, result.route, puzzle.target)
  ) {
    const [from, to] = result.route[0];
    selected = from;
    assisted = true;
    $("#game-help").textContent =
      `已验证能走到终局：从${coordinate(from)}跳到${coordinate(to)}。后面还有 ${result.route.length - 1} 步。`;
    buttons.get(from).focus();
    save();
  } else
    $("#game-help").textContent =
      result.status === "unsolvable"
        ? "这一步之后已无法达到本局目标。可以退回到有解的位置，再找另一条路。"
        : "暂时未能在搜索时限内确认完整解法。不会把猜测当提示；可以继续尝试，或退回已验证的位置。";
  $("#hint").textContent = "看一步提示";
  render();
}
$("#hint").onclick = () => {
  cancelSearch();
  const route = knownRoute(board, puzzle.target);
  if (route) {
    present({ status: "solved", route });
    return;
  }
  const id = revision;
  try {
    worker = new Worker(new URL("./solitaire-worker.mjs", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }) => {
      if (data.id === revision) present(data);
    };
    worker.onerror = () => {
      if (id === revision) present({ status: "unknown" });
    };
    worker.postMessage({ id, board: [...board], target: puzzle.target });
    $("#hint").textContent = "正在核对整条棋路…";
    render();
  } catch {
    present({ status: "unknown" });
  }
};
$("#review-route").onclick = () => {
  $("#route-list").replaceChildren(
    ...trace.map(([from, to], i) => {
      const li = document.createElement("li");
      li.textContent = `${i + 1}. ${coordinate(from)} → ${coordinate(to)}`;
      return li;
    }),
  );
  $("#route-review").hidden = false;
};
$("#download-note").onclick = () => {
  const content = keepsakeSVG(puzzle.id, trace, assisted);
  if (!content) return;
  const url = URL.createObjectURL(
    new Blob([content], { type: "image/svg+xml;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `棋谱卡-${puzzle.id}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
window.addEventListener("pagehide", () => {
  cancelSearch();
  save();
});
collection();
render();
