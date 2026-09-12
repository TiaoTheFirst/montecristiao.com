// Bounded simultaneous-move search, not a language model or a solved-game claim.
const sum = (a) => a.reduce((x, y) => x + y, 0);
const without = (a, c) => a.filter((x) => x !== c);
export function sample(policy, random = Math.random) {
  let x = random();
  for (let i = 0; i < policy.length; i++) {
    x -= policy[i];
    if (x <= 0) return i;
  }
  return policy.length - 1;
}
// Regret matching for a zero-sum matrix. Rows maximize; columns minimize.
export function solveMatrix(matrix, iterations = 320) {
  const n = matrix.length,
    m = matrix[0].length,
    rr = Array(n).fill(0),
    cr = Array(m).fill(0),
    rs = Array(n).fill(0),
    cs = Array(m).fill(0);
  const policy = (r) => {
    const p = r.map((v) => Math.max(0, v)),
      total = sum(p);
    return p.map((v) => (total ? v / total : 1 / p.length));
  };
  for (let t = 0; t < iterations; t++) {
    const p = policy(rr),
      q = policy(cr),
      rv = matrix.map((row) => sum(row.map((v, j) => v * q[j]))),
      cv = Array.from({ length: m }, (_, j) =>
        sum(matrix.map((row, i) => row[j] * p[i])),
      ),
      v = sum(rv.map((x, i) => x * p[i]));
    for (let i = 0; i < n; i++) {
      rr[i] += rv[i] - v;
      rs[i] += p[i];
    }
    for (let j = 0; j < m; j++) {
      cr[j] += v - cv[j];
      cs[j] += q[j];
    }
  }
  const p = rs.map((v) => v / iterations),
    q = cs.map((v) => v / iterations);
  const rowValues = matrix.map((row) => sum(row.map((v, j) => v * q[j]))),
    columnValues = Array.from({ length: m }, (_, j) =>
      sum(matrix.map((row, i) => row[j] * p[i])),
    );
  return {
    policy: p,
    opponent: q,
    value: sum(rowValues.map((v, i) => v * p[i])),
    gap: Math.max(...rowValues) - Math.min(...columnValues),
    rowValues,
    columnValues,
  };
}
function horizon(bot, player, future, carry) {
  if (!bot.length) return 0;
  const edge =
    sum(bot.map((b) => sum(player.map((p) => Math.sign(b - p))))) /
    (bot.length * player.length);
  return edge * (sum(future) + carry);
}
// Small, explicit public-action models. This is not a personality assessment.
// A broad random model competes with each repeated pattern, and exploitation is capped.
export function observedPolicy(view) {
  const models = [
    (cards) => cards.at(-1),
    (cards) => cards[0],
    (cards, pot) =>
      [...cards].sort(
        (a, b) => Math.abs(a - pot) - Math.abs(b - pot) || a - b,
      )[0],
    () => null,
  ];
  let weights = [0.2, 0.2, 0.2, 0.4];
  for (const o of view.observations || []) {
    weights = weights.map(
      (w, i) =>
        w *
        (i === 3
          ? 1 / o.cards.length
          : (models[i](o.cards, o.pot) === o.bid ? 0.9 : 0) +
            0.1 / o.cards.length),
    );
    const total = sum(weights);
    weights = weights.map((w) => w / total);
  }
  const probabilities = view.player.map((c) =>
    sum(
      weights.map(
        (w, i) =>
          w *
          (i === 3
            ? 1 / view.player.length
            : (models[i](view.player, view.pot) === c ? 0.9 : 0) +
              0.1 / view.player.length),
      ),
    ),
  );
  return { probabilities, confidence: Math.max(...weights.slice(0, 3)) };
}
export function analyze(view, mode = "challenge") {
  const memo = new Map(),
    depth = mode === "casual" ? 1 : 2;
  function search(bot, player, prize, future, pot, remaining, root = false) {
    const key = [
      bot.join(""),
      player.join(""),
      prize,
      future.join(""),
      pot,
      remaining,
    ].join("|");
    if (memo.has(key)) return memo.get(key);
    const matrix = bot.map((b) =>
      player.map((p) => {
        const sign = Math.sign(b - p),
          immediate = sign * pot;
        if (!future.length) return immediate;
        const bs = without(bot, b),
          ps = without(player, p),
          carry = sign || pot > prize ? 0 : pot;
        if (remaining <= 1 && bs.length > 3)
          return immediate + horizon(bs, ps, future, carry);
        return (
          immediate +
          sum(
            future.map(
              (next) =>
                search(
                  bs,
                  ps,
                  next,
                  without(future, next),
                  carry + next,
                  Math.max(1, remaining - 1),
                ).value,
            ),
          ) /
            future.length
        );
      }),
    );
    const result = { ...solveMatrix(matrix, root ? 1600 : 100), matrix };
    memo.set(key, result);
    return result;
  }
  const result = search(
    view.bot,
    view.player,
    view.prize,
    view.future,
    view.pot,
    depth,
    true,
  );
  const observed = observedPolicy(view),
    adaptation =
      (view.observations?.length || 0) < 2
        ? 0
        : (Math.max(0, observed.confidence - 0.65) / 0.35) *
          (mode === "casual" ? 0.15 : 0.3);
  const payoffs = result.matrix.map((row) =>
      sum(row.map((v, j) => v * observed.probabilities[j])),
    ),
    best = Math.max(...payoffs),
    weights = payoffs.map((v) => Math.exp((v - best) / 0.4)),
    total = sum(weights);
  const policy = result.policy.map(
    (p, i) => p * (1 - adaptation) + (adaptation * weights[i]) / total,
  );
  const columnValues = view.player.map((_, j) =>
    sum(result.matrix.map((row, i) => row[j] * policy[i])),
  );
  return {
    ...result,
    policy,
    columnValues,
    adaptation,
    cards: [...view.bot],
    playerCards: [...view.player],
    nodes: memo.size,
  };
}
