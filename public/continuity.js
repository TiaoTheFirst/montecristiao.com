/* Presentation only. The server clock and Manor itinerary remain authoritative. */
var ManorContinuity = (() => {
  "use strict";
  function present(state, room = state?.room) {
    return !!(
      state?.count &&
      !state.count.unknown &&
      !state.count.moving &&
      state.count.room === room
    );
  }
  function endReason(pinned, state) {
    if (
      (pinned?.world?.clockRevision || 0) !== (state?.world?.clockRevision || 0)
    )
      return "elapsed";
    if (state?.count?.unknown) return "unknown";
    if (!present(state, pinned?.room) || state.room !== pinned?.room)
      return "departed";
    if (
      pinned?.world?.encounterUntil &&
      state.world?.timestamp >= pinned.world.encounterUntil
    )
      return "elapsed";
    return null;
  }
  // Explicit empty-room art: sceneKey() can select a meal picture with the Count.
  function neutralShot(room, minute) {
    return {
      src: "assets/" + room + "-" + Manor.light(minute) + ".webp",
      alt: Manor.rooms[room][0] + "，房间远景",
    };
  }
  function presenceChange(room, fromKey, toKey) {
    const normalize = (key) =>
      String(key || "")
        .replace(/^https?:\/\/[^/]+\//, "")
        .split(/[?#]/)[0]
        .replace(/^\.?\//, "")
        .replace(/^assets\//, "")
        .replace(/\.webp$/, "");
    const classify = (key) => {
      const name = normalize(key);
      if (!name) return null;
      for (const light of ["day", "night"]) {
        const artKey = room + "-occupied-" + light;
        const painting =
          typeof ManorPaintings === "object" && ManorPaintings[artKey];
        if (painting && (name === artKey || name === normalize(painting.src)))
          return "present";
        if (room === "dining" && name === "dining-meal-" + light)
          return "present";
        if (name === room + "-" + light) return "empty";
      }
      // Unknown art and close-ups are not evidence of an empty room.
      return null;
    };
    const from = classify(fromKey),
      to = classify(toKey);
    if (!from || !to || from === to) return null;
    return to === "present" ? "arriving" : "departing";
  }
  // One owner, one WAAPI handle. Cancellation settles our promise even when a
  // DOM adapter does not reject animation.finished after animation.cancel().
  function createFade(node, motion = globalThis.ManorMotion) {
    let active = null;
    const cancel = () => active?.cancel();
    function run(from, to, duration) {
      cancel();
      if (motion?.reduced?.() || typeof node.animate !== "function")
        return Promise.resolve(true);
      let animation,
        resolve,
        settled = false;
      const finished = new Promise((done) => {
        resolve = done;
      });
      const settle = (completed) => {
        if (settled) return;
        settled = true;
        if (active === task) active = null;
        animation?.cancel();
        resolve(completed);
      };
      const task = { cancel: () => settle(false) };
      active = task;
      try {
        animation = node.animate([{ opacity: from }, { opacity: to }], {
          duration,
          easing: "cubic-bezier(.22,.61,.36,1)",
          fill: "forwards",
        });
        animation.finished.then(
          () => settle(true),
          () => settle(false),
        );
      } catch {
        // Unsupported animation cannot prevent the requested visual state.
        settle(true);
      }
      return finished;
    }
    return { run, cancel };
  }
  // A short editorial cut, not a walking animation or a dissolve between poses.
  // commit is synchronous; prepare, if supplied, runs behind the opaque cover.
  function createBridge({
    cover,
    motion = globalThis.ManorMotion,
    onPhase,
    phase: phaseCallback,
  }) {
    const notifyPhase = onPhase || phaseCallback || (() => {});
    const fade = createFade(cover, motion);
    let serial = 0,
      phase = "idle";
    const setPhase = (next) => {
      phase = next;
      notifyPhase(next);
    };
    function cancel() {
      ++serial;
      fade.cancel();
      cover.style.opacity = "0";
      setPhase("idle");
    }
    async function run({
      commit,
      isCurrent = () => true,
      prepare,
      bridge = true,
    }) {
      cancel();
      const token = serial,
        valid = () => token === serial && isCurrent();
      try {
        if (!valid()) return false;
        if (bridge) {
          setPhase("leaving");
          await fade.run(0, 1, 180);
          if (!valid()) return false;
          cover.style.opacity = "1";
          setPhase("neutral");
        }
        if (prepare) await prepare();
        if (!valid()) return false;
        commit();
        if (!valid()) return false;
        if (bridge) {
          setPhase("arriving");
          await fade.run(1, 0, 260);
        }
        return valid();
      } finally {
        // An older cancelled job must not clear the newer job's cover or phase.
        if (token === serial) {
          cover.style.opacity = "0";
          setPhase("idle");
        }
      }
    }
    return {
      run,
      cancel,
      get busy() {
        return phase !== "idle";
      },
    };
  }
  function createConversationMemory() {
    const entries = new Map();
    return {
      save(state, page, seated) {
        if (!state?.world?.encounterUntil) return;
        entries.set(state.room, {
          state: { ...state, world: { ...state.world } },
          page,
          seated,
        });
      },
      load(state) {
        const entry = entries.get(state.room);
        if (!entry) return null;
        if (endReason(entry.state, state)) {
          entries.delete(state.room);
          return null;
        }
        return entry;
      },
      clear() {
        entries.clear();
      },
    };
  }
  return {
    createConversationMemory,
    present,
    endReason,
    neutralShot,
    presenceChange,
    createFade,
    createBridge,
  };
})();
