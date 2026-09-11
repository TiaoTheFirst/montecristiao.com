/* Reviewed local editions only; absence of today's edition is an ordinary state. */
(() => {
  let edition = null,
    pending = false,
    lastSuccess = 0;
  async function refresh() {
    if (pending) return;
    pending = true;
    try {
      const response = await fetch("/api/daily", {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw Error("EDITION_UNAVAILABLE");
      const data = await response.json();
      edition = data.edition;
      lastSuccess = Date.now();
    } catch {
      edition = null;
    } finally {
      pending = false;
    }
  }
  window.ManorDailyPaper = {
    current(state) {
      return edition &&
        lastSuccess > Date.now() - 90000 &&
        edition.date === state.clock?.date
        ? { ...edition }
        : null;
    },
  };
  refresh();
  setInterval(refresh, 60000);
})();
