/* Public free-roam time follows the server. Manual time controls exist only in preview. */
var ManorWorld = (() => {
  let value = null,
    received = 0,
    pending = null,
    failed = false,
    clockRevision = 0;
  const original = {
    state: Manor.state,
    meal: Manor.meal,
    sceneKey: Manor.sceneKey,
  };
  const empty = () => ({
    room: "outside",
    destination: "outside",
    route: [],
    moving: false,
    text: "行踪待确认",
    unknown: true,
  });
  const age = () => performance.now() - received;
  const fresh = () => !!value && age() < 90000;
  function clock() {
    if (!value) return Manor.now(); // Background lighting only, never a fabricated character.
    const d = new Date(value.timestamp + Math.min(age(), 90000) + 8 * 3600000);
    return {
      date: d.toISOString().slice(0, 10),
      minute: d.getUTCHours() * 60 + d.getUTCMinutes(),
    };
  }
  const count = () =>
    fresh() ? original.state(clock().date, clock().minute) : empty();
  const meal = () => {
    const st = count();
    return !st.unknown && st.room === "dining" && !st.moving;
  };
  // All existing map, paintings, hot spots and encounters consume this adapter.
  Manor.state = count;
  Manor.meal = meal;
  Manor.sceneKey = (room, _date, minute) =>
    room +
    (room === "dining" && meal() ? "-meal" : "") +
    "-" +
    Manor.light(minute);
  function sync() {
    if (pending) return pending;
    pending = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      try {
        const response = await fetch("/api/world", {
          cache: "no-store",
          credentials: "omit",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("WORLD_UNAVAILABLE");
        const next = await response.json();
        if (
          next.version !== "manor-world-v1" ||
          !Number.isFinite(next.timestamp) ||
          !Manor.validDate(next.clock?.date)
        )
          throw new Error("WORLD_INVALID");
        value = next;
        received = performance.now();
        failed = false;
      } catch {
        failed = true;
      } finally {
        clearTimeout(timeout);
        pending = null;
        window.dispatchEvent(new CustomEvent("manor:world"));
      }
    })();
    return pending;
  }
  const snapshot = () => ({
    clock: clock(),
    count: count(),
    meal: meal(),
    ready: fresh(),
    degraded: failed,
    preview: false,
    clockRevision,
    timestamp: value
        ? value.timestamp + age()
        : null,
    encounterUntil: value?.encounterUntil || 0,
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) sync();
  });
  window.addEventListener("online", sync);
  setInterval(() => {
    if (!document.hidden) sync();
  }, 30000);
  sync();
  return { snapshot, sync, clock };
})();
