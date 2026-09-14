// Local story progress. No account, affinity, purchase or real-world clock writes.
import { restoreGame } from "/seven-core.mjs";
export const KEY = "manor-invitations-v1";
export const GAME_KEY = "manor-invitation-seven-v1";
export const phases = [
  { at: 0, targets: ["study"], verb: "夜间读写" },
  { at: 90, targets: ["bedroom"], verb: "已经休息" },
  { at: 540, targets: ["garden", "library"], verb: "晨间独处" },
  { at: 600, targets: ["study"], verb: "阅读与写作" },
  { at: 780, targets: ["dining"], verb: "正在用餐" },
  { at: 840, targets: ["salon"], verb: "午餐后小坐" },
  { at: 900, targets: ["garden", "salon", "library"], verb: "午后闲暇" },
  { at: 1080, targets: ["gallery", "salon"], verb: "会客与看画" },
  { at: 1125, targets: ["dining"], verb: "正在用晚餐" },
  { at: 1200, targets: ["salon"], verb: "晚间社交" },
  { at: 1320, targets: ["gallery"], verb: "会客与看画" },
  { at: 1380, targets: ["salon"], verb: "晚间社交" },
];
export const routes = {
  welcome: {
    court: { enter: "foyer" },
    foyer: { follow: "greeting" },
    greeting: { tea: "reply", art: "reply" },
    reply: { continue: "closing" },
    closing: { finish: "done" },
    done: {},
  },
  lamps: {
    gallery: { approach: "painting" },
    painting: { window: "reply", rope: "reply" },
    reply: { continue: "closing" },
    closing: { finish: "done" },
    done: {},
  },
  cards: {
    invitation: { accept: "table" },
    table: { sit: "playing" },
    playing: {},
    result: { continue: "closing" },
    closing: { finish: "done" },
    done: {},
  },
};
export const first = {
  welcome: "court",
  lamps: "gallery",
  cards: "invitation",
};
export function blank() {
  return { version: 1, chapters: {} };
}
function replay(id, actions = []) {
  if (!routes[id] || !Array.isArray(actions) || actions.length > 12)
    throw new Error("Invalid story");
  let step = first[id],
    choice = null;
  for (const action of actions) {
    if (id === "cards" && step === "playing" && action === "game-finished")
      step = "result";
    else {
      const next = routes[id][step]?.[action];
      if (!next) throw new Error("Invalid story transition");
      step = next;
    }
    if (["tea", "art", "window", "rope"].includes(action)) choice = action;
  }
  return { actions: [...actions], step, choice, done: step === "done" };
}
export function clean(value) {
  const state = blank();
  if (value?.version !== 1) return state;
  for (const id of Object.keys(routes)) {
    try {
      if (value.chapters?.[id]) {
        const item = value.chapters[id];
        const progress = replay(id, item.actions);
        if (id === "cards" && item.actions.includes("game-finished")) {
          if (!result(item.game)) throw new Error("Missing completed game");
          const game = restoreGame(item.game);
          progress.game = {
            version: 2,
            deck: [...game.deck],
            bids: game.history.map((r) => [r.player, r.bot]),
          };
        }
        state.chapters[id] = progress;
      }
    } catch {}
  }
  return state;
}
export function chapter(state, id) {
  if (!routes[id]) throw new Error("Unknown chapter");
  return clean(state).chapters[id] || replay(id);
}
export function advance(state, id, action) {
  if (action === "game-finished") throw new Error("Use a verified game result");
  const next = clean(state),
    current = chapter(next, id);
  next.chapters[id] = replay(id, [...current.actions, action]);
  if (current.game) next.chapters[id].game = current.game;
  return next;
}
export function result(raw) {
  try {
    const game = restoreGame(raw);
    if (game.history.length !== 7) return null;
    return {
      scores: [...game.scores],
      outcome:
        game.scores[0] === game.scores[1]
          ? "tie"
          : game.scores[0] > game.scores[1]
            ? "win"
            : "lose",
    };
  } catch {
    return null;
  }
}
export function finishGame(state, raw) {
  const next = clean(state),
    current = chapter(next, "cards");
  if (current.step === "playing" && result(raw)) {
    next.chapters.cards = replay("cards", [
      ...current.actions,
      "game-finished",
    ]);
    const game = restoreGame(raw);
    next.chapters.cards.game = {
      version: 2,
      deck: [...game.deck],
      bids: game.history.map((r) => [r.player, r.bot]),
    };
  }
  return next;
}
export function store(storage) {
  return {
    read() {
      try {
        return clean(JSON.parse(storage.getItem(KEY)));
      } catch {
        return blank();
      }
    },
    write(state) {
      try {
        storage.setItem(KEY, JSON.stringify(clean(state)));
        return true;
      } catch {
        return false;
      }
    },
    game() {
      try {
        return JSON.parse(storage.getItem(GAME_KEY));
      } catch {
        return null;
      }
    },
  };
}
