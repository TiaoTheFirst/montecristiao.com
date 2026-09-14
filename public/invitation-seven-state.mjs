import { restoreGame } from "./seven-core.mjs";
const KEY = "manor-invitation-seven-v1";
const MODES = ["casual", "lesson", "challenge"],
  PHASES = ["loading", "choose", "resolved", "finished", "error"];
// Persist only legal numeric moves and enumerated UI state, never free text or account data.
export function cleanSave(value) {
  const g = restoreGame(value);
  return {
    version: 2,
    deck: [...g.deck],
    bids: g.history.map((r) => [r.player, r.bot]),
    mode: MODES.includes(value.mode) ? value.mode : "casual",
    phase: PHASES.includes(value.phase) ? value.phase : "loading",
    locked: g.bot.includes(value.locked) ? value.locked : null,
  };
}
export function createSessionStore(storage) {
  return {
    read() {
      const raw = storage?.getItem(KEY);
      return raw ? cleanSave(JSON.parse(raw)) : null;
    },
    write(value) {
      if (!storage) throw new Error("Session storage unavailable");
      storage.setItem(KEY, JSON.stringify(cleanSave(value)));
    },
    clear() {
      storage?.removeItem(KEY);
    },
  };
}
export function browserSessionStore() {
  try {
    return createSessionStore(window.localStorage);
  } catch {
    return createSessionStore(null);
  }
}
