export const holes = Array.from({ length: 49 }, (_, i) => i).filter(
  (i) =>
    (i % 7 >= 2 && i % 7 <= 4) ||
    (Math.floor(i / 7) >= 2 && Math.floor(i / 7) <= 4),
);
export const initialBoard = () => new Set(holes.filter((i) => i !== 24));
export function jumped(from, to) {
  if (!holes.includes(from) || !holes.includes(to)) return null;
  const dr = Math.abs(Math.floor(from / 7) - Math.floor(to / 7)),
    dc = Math.abs((from % 7) - (to % 7));
  return (dr === 2 && dc === 0) || (dr === 0 && dc === 2)
    ? (from + to) / 2
    : null;
}
export function canMove(board, from, to) {
  const middle = jumped(from, to);
  return (
    middle !== null && board.has(from) && board.has(middle) && !board.has(to)
  );
}
export function move(board, from, to) {
  if (!canMove(board, from, to)) return null;
  const next = new Set(board);
  next.delete(from);
  next.delete(jumped(from, to));
  next.add(to);
  return next;
}
export function moves(board) {
  return [...board].flatMap((from) =>
    holes.filter((to) => canMove(board, from, to)).map((to) => ({ from, to })),
  );
}
