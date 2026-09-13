import { holes, initialBoard, jumped, move } from "./solitaire-core.mjs";

export const classic = {
  id: "classic",
  title: "经典十字盘",
  theme: "全盘",
  target: null,
  start: [...initialBoard()],
  route: [
    [10, 24],
    [15, 17],
    [2, 16],
    [4, 2],
    [17, 15],
    [14, 16],
    [18, 4],
    [20, 18],
    [23, 9],
    [2, 16],
    [21, 23],
    [23, 9],
    [25, 11],
    [4, 18],
    [27, 25],
    [25, 11],
    [37, 23],
    [28, 30],
    [30, 16],
    [9, 23],
    [23, 25],
    [32, 18],
    [11, 25],
    [34, 32],
    [31, 33],
    [46, 32],
    [25, 39],
    [44, 46],
    [46, 32],
    [33, 31],
    [31, 45],
  ],
};
export const won = (board, target = null) =>
  board.size === 1 && (target === null || board.has(target));
export function replay(start, route) {
  let board = new Set(start);
  for (const [from, to] of route) {
    board = move(board, from, to);
    if (!board) return null;
  }
  return board;
}
// Compare all eight board symmetries, so a reflected position is not a new puzzle.
export function signature(start, target) {
  const forms = [];
  for (let flip = 0; flip < 2; flip++)
    for (let turns = 0; turns < 4; turns++) {
      const transform = (i) => {
        let r = Math.floor(i / 7),
          c = i % 7;
        if (flip) c = 6 - c;
        for (let t = 0; t < turns; t++) [r, c] = [c, 6 - r];
        return r * 7 + c;
      };
      forms.push(
        start
          .map(transform)
          .sort((a, b) => a - b)
          .join(",") +
          ":" +
          (target === null ? "*" : transform(target)),
      );
    }
  return forms.sort()[0];
}
function generate(seed, count, target) {
  let n = seed >>> 0;
  const random = () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
  for (let attempt = 0; attempt < 500; attempt++) {
    const board = new Set([target]),
      reverse = [];
    while (board.size < count) {
      const options = [];
      for (const to of board)
        for (const from of holes) {
          const middle = jumped(from, to);
          if (middle !== null && !board.has(from) && !board.has(middle))
            options.push([from, to, middle]);
        }
      if (!options.length) break;
      const [from, to, middle] = options[Math.floor(random() * options.length)];
      board.delete(to);
      board.add(from);
      board.add(middle);
      reverse.unshift([from, to]);
    }
    if (board.size === count)
      return { start: [...board].sort((a, b) => a - b), route: reverse };
  }
  throw new Error("Could not construct a verified endgame");
}
const names = [
  "留一道桥",
  "绕回中心",
  "先收边角",
  "向北归位",
  "连接两翼",
  "侧边的退路",
  "最后的来客",
  "越过中线",
  "远端归途",
  "留住接应",
  "窄处转身",
  "汇入中央",
];
const seen = new Set();
export const puzzles = names.map((title, index) => {
  const theme = ["收束", "归位", "连通"][index % 3];
  const target =
    index % 3 === 1 ? [24, 3, 45, 24][Math.floor(index / 3)] : null;
  let puzzle;
  for (let salt = 0; salt < 1000; salt++) {
    const generated = generate(
      913 + index * 577 + salt * 37,
      6 + index,
      target ?? 24,
    );
    const key = signature(generated.start, target);
    if (!seen.has(key)) {
      seen.add(key);
      puzzle = {
        ...generated,
        id: `endgame-${index + 1}`,
        title,
        theme,
        target,
      };
      break;
    }
  }
  if (!puzzle || !won(replay(puzzle.start, puzzle.route), target))
    throw new Error("Invalid puzzle");
  return puzzle;
});
export function edition(now = Date.now()) {
  const epoch = Date.parse("2026-09-13T00:00:00+08:00"),
    span = 3 * 86400000;
  const period = Math.max(0, Math.floor((Number(now) - epoch) / span));
  return {
    puzzle: puzzles[period % puzzles.length],
    next: new Date(epoch + (period + 1) * span),
    period,
  };
}
export const allPuzzles = [classic, ...puzzles];
