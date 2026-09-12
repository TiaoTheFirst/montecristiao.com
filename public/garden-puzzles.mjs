export const puzzles = [
  {
    title: "最大的牌，先留一下",
    player: [1, 7],
    bot: [2, 6],
    prize: 1,
    next: 7,
    answer: [1],
    explanation:
      "出 1，无论对面出 2 还是 6，你都先让出 1 分；留下的 7 一定能拿到下一轮的 7 分。这次让出眼前的一分，是因为后面确定有更大的收获。",
  },
  {
    title: "这一次，大牌先出",
    player: [1, 4],
    bot: [2, 3],
    prize: 6,
    next: 1,
    answer: [4],
    explanation:
      "出 4 就能拿下眼前的 6 分，最后让出 1 分。这里的大牌不必再留：下一轮已经没有更值得争取的东西。",
  },
  {
    title: "数字更大，就更有用吗",
    player: [2, 6],
    bot: [1, 7],
    prize: 6,
    next: 1,
    answer: [2, 6],
    explanation:
      "这两张都能胜过 1，也都输给 7。两种出法的结果取决于对面怎样安排 1 和 7；只看这些牌，不能说 6 比 2 更有把握。",
  },
];
export function gardenPuzzle(date) {
  const ms = Date.parse(`${date}T00:00:00Z`),
    epoch = Date.UTC(2026, 8, 11);
  if (!Number.isFinite(ms)) return puzzles[0];
  const period = Math.floor((ms - epoch) / 86400000 / 3);
  return puzzles[((period % puzzles.length) + puzzles.length) % puzzles.length];
}
