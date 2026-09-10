/* One scene-state adapter for paintings, character targets and close-up shots. */
var ManorStaging = (() => {
  const supported = new Set([
    "dining",
    "salon",
    "library",
    "study",
    "gallery",
    "garden",
  ]);
  const art = (key) =>
    typeof ManorPaintings === "object" ? ManorPaintings[key] : null;
  function occupied(room, date, minute) {
    const st = Manor.state(date, minute);
    return (
      supported.has(room) &&
      st.room === room &&
      !st.moving &&
      (room !== "dining" || Manor.meal(date, minute))
    );
  }
  function key(room, date, minute) {
    const k = room + "-occupied-" + Manor.light(minute);
    return occupied(room, date, minute) && art(k)
      ? art(k)
          .src.replace(/^assets\//, "")
          .replace(/\.webp$/, "")
      : Manor.sceneKey(room, date, minute);
  }
  function shot(state, kind = "approach", who = "count") {
    const actor =
      who === "butler"
        ? state.room === "foyer"
          ? "butler"
          : "butler-" + state.room
        : state.room;
    return art(actor + "-" + kind + "-" + Manor.light(state.clock.minute));
  }
  function target(state) {
    return occupied(state.room, state.clock.date, state.clock.minute)
      ? art(state.room + "-occupied-" + Manor.light(state.clock.minute))
      : null;
  }
  return { key, shot, target, occupied };
})();
