import {
  holes,
  initialBoard,
  canMove,
  move,
  moves,
} from "./solitaire-core.mjs";
const $ = (s) => document.querySelector(s),
  history = [];
let board = initialBoard(),
  selected = null;
const buttons = new Map();
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
    if (board.has(i)) selected = selected === i ? null : i;
    else if (selected !== null) {
      const next = move(board, selected, i);
      if (next) {
        history.push(board);
        board = next;
        selected = null;
        $("#game-help").textContent = "已取走跳过的棋子。可以继续落子。";
      } else $("#game-help").textContent = "这里不能落子，请选亮起的空位。";
    }
    render();
  };
  button.onkeydown = (e) => {
    const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(e.key in steps)) return;
    e.preventDefault();
    const step = steps[e.key];
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
function render() {
  const available = moves(board);
  $("#game-status").textContent =
    board.size === 1
      ? "只剩一枚。您解开了这一盘。"
      : available.length
        ? `余下 ${board.size} 枚 · 已走 ${history.length} 步`
        : `余下 ${board.size} 枚 · 已无可走的步数，可以退回再试`;
  for (const [i, b] of buttons) {
    const peg = board.has(i),
      dest = selected !== null && canMove(board, selected, i);
    b.className = [
      peg ? "peg" : "",
      selected === i ? "selected" : "",
      dest ? "destination" : "",
    ].join(" ");
    b.setAttribute(
      "aria-label",
      `第 ${Math.floor(i / 7) + 1} 行第 ${(i % 7) + 1} 列，${peg ? "棋子" : dest ? "可落子空孔" : "空孔"}`,
    );
    b.setAttribute("aria-pressed", String(selected === i));
  }
  $("#undo").disabled = !history.length;
  $("#hint").disabled = !available.length;
}
$("#undo").onclick = () => {
  if (history.length) {
    board = history.pop();
    selected = null;
    $("#game-help").textContent = "退回了上一步。";
    render();
  }
};
$("#restart").onclick = () => {
  if (history.length && !confirm("收起这一局，重新摆棋？")) return;
  board = initialBoard();
  history.length = 0;
  selected = null;
  $("#game-help").textContent = "棋子已摆好，从中间的空孔开始。";
  render();
};
$("#hint").onclick = () => {
  const hint = moves(board)[0];
  if (!hint) return;
  selected = hint.from;
  render();
  $("#game-help").textContent =
    `可以从第 ${Math.floor(hint.from / 7) + 1} 行第 ${(hint.from % 7) + 1} 列，跳到第 ${Math.floor(hint.to / 7) + 1} 行第 ${(hint.to % 7) + 1} 列。`;
  buttons.get(hint.from).focus();
};
render();
