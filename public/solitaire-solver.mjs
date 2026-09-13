import { holes, jumped } from "./solitaire-core.mjs";
import { allPuzzles, replay, won } from "./solitaire-puzzles.mjs";
const bit = (i) => 1n << BigInt(i);
export const mask = (board) => [...board].reduce((n, i) => n | bit(i), 0n);
const jumps = holes.flatMap((from) =>
  holes.flatMap((to) => {
    const middle = jumped(from, to);
    return middle === null
      ? []
      : [
          {
            from,
            to,
            need: bit(from) | bit(middle),
            empty: bit(to),
            toggle: bit(from) | bit(middle) | bit(to),
          },
        ];
  }),
);
const cache = new Map();
const key = (state, target) => `${target ?? "*"}:${state}`;
export function rememberRoute(start, route, target = null) {
  const end = replay(start, route);
  if (!end || !won(end, target)) return false;
  // Symmetry is useful for solving, but never presented as a new edition.
  for (let flip = 0; flip < 2; flip++)
    for (let turns = 0; turns < 4; turns++) {
      const transform = (i) => {
        let r = Math.floor(i / 7),
          c = i % 7;
        if (flip) c = 6 - c;
        for (let t = 0; t < turns; t++) [r, c] = [c, 6 - r];
        return r * 7 + c;
      };
      let state = mask([...start].map(transform));
      const transformed = route.map((step) => step.map(transform)),
        goal = target === null ? null : transform(target);
      for (let i = 0; i <= transformed.length; i++) {
        cache.set(key(state, goal), transformed.slice(i));
        if (i < transformed.length) {
          const [from, to] = transformed[i];
          state ^= bit(from) | bit(jumped(from, to)) | bit(to);
        }
      }
    }
  return true;
}
for (const puzzle of allPuzzles)
  rememberRoute(puzzle.start, puzzle.route, puzzle.target);
export function knownRoute(board, target = null) {
  return cache.get(key(mask(board), target));
}
export function solve(
  board,
  target = null,
  { maxNodes = 250000, maxMs = 3000 } = {},
) {
  const start = new Set(board),
    startMask = mask(start),
    dead = new Set(),
    path = [];
  const began = Date.now();
  let nodes = 0,
    aborted = false;
  function visit(state, count) {
    const known = cache.get(key(state, target));
    if (known) {
      path.push(...known);
      return true;
    }
    if (
      ++nodes > maxNodes ||
      (nodes % 256 === 0 && Date.now() - began > maxMs)
    ) {
      aborted = true;
      return false;
    }
    if (count === 1) return target === null || state === bit(target);
    if (dead.has(state)) return false;
    for (const jump of jumps)
      if ((state & jump.need) === jump.need && !(state & jump.empty)) {
        path.push([jump.from, jump.to]);
        if (visit(state ^ jump.toggle, count - 1)) return true;
        path.pop();
        if (aborted) return false;
      }
    dead.add(state);
    return false;
  }
  if (visit(startMask, start.size) && rememberRoute(start, path, target))
    return { status: "solved", route: path, nodes };
  return { status: aborted ? "unknown" : "unsolvable", nodes };
}
