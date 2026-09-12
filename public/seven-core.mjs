// Pure rules. The opponent receives publicView(), never the shuffled deck.
export const CARDS = Object.freeze([1, 2, 3, 4, 5, 6, 7]);
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffled(random = Math.random) {
  const a = [...CARDS];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function createGame(deck = shuffled()) {
  if (
    deck.length !== 7 ||
    [...deck].sort((a, b) => a - b).join() !== CARDS.join()
  )
    throw new Error("Invalid deck");
  return {
    deck: [...deck],
    player: [...CARDS],
    bot: [...CARDS],
    scores: [0, 0],
    carry: 0,
    history: [],
  };
}
export function publicView(game) {
  const round = game.history.length;
  if (round >= 7) throw new Error("Game finished");
  return {
    player: [...game.player],
    bot: [...game.bot],
    prize: game.deck[round],
    pot: game.carry + game.deck[round],
    future: game.deck.slice(round + 1).sort((a, b) => a - b),
    observations: game.history.map((r) => ({
      cards: [...r.before.player],
      pot: r.before.pot,
      bid: r.player,
    })),
  };
}
export function play(game, player, bot) {
  if (
    game.history.length >= 7 ||
    !game.player.includes(player) ||
    !game.bot.includes(bot)
  )
    throw new Error("Illegal bid");
  const before = publicView(game),
    result = Math.sign(player - bot),
    final = game.player.length === 1,
    split = !result && (final || game.carry > 0);
  const scores = [...game.scores];
  if (result > 0) scores[0] += before.pot;
  if (result < 0) scores[1] += before.pot;
  if (split) {
    scores[0] += before.pot / 2;
    scores[1] += before.pot / 2;
  }
  return {
    ...game,
    player: game.player.filter((c) => c !== player),
    bot: game.bot.filter((c) => c !== bot),
    scores,
    carry: result || split ? 0 : before.pot,
    history: [
      ...game.history,
      { before, player, bot, result, split, scores: [...scores] },
    ],
  };
}
export function restoreGame(saved) {
  if (
    !saved ||
    saved.version !== 2 ||
    !Array.isArray(saved.bids) ||
    saved.bids.length > 7
  )
    throw new Error("Invalid save");
  let game = createGame(saved.deck);
  for (const bid of saved.bids) game = play(game, bid[0], bid[1]);
  return game;
}
