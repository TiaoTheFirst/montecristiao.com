/* Only navigation progress, never visitor identity or relationship history. */
var ManorArrivalState = (() => {
  const key = "manor-arrival-v1";
  const stages = [
    "street",
    "ruins",
    "shop",
    "alley",
    "river",
    "side",
    "door",
    "knock1",
    "knock2",
    "leaving",
    "butler",
    "welcome",
    "passage",
    "sidecourt",
    "approach",
    "reveal",
    "backtrack",
    "return",
    "outside",
    "threshold",
  ];
  let memory = null;
  const terminal = (value) => ["done", "skipped"].includes(value?.status);
  function clean(value) {
    if (
      !value ||
      value.version !== 1 ||
      !["active", "done", "skipped"].includes(value.status)
    )
      return null;
    return {
      version: 1,
      status: value.status,
      stage: stages.includes(value.stage) ? value.stage : "street",
    };
  }
  function read() {
    try {
      return clean(JSON.parse(localStorage.getItem(key))) || memory;
    } catch {
      return memory;
    }
  }
  function write(status, stage = "street") {
    const next = clean({ version: 1, status, stage });
    if (!next) return false;
    if (terminal(read()) && !terminal(next)) return true;
    memory = next;
    try {
      localStorage.setItem(key, JSON.stringify(next));
      return true;
    } catch {
      return false;
    }
  }
  function destination(raw) {
    try {
      const url = new URL(raw || "/", location.origin);
      if (
        url.origin !== location.origin ||
        url.username ||
        url.password ||
        ![
          "/",
          "/index.html",
          "/letters.html",
          "/memory.html",
          "/manuscripts.html",
          "/feedback.html",
          "/about.html",
          "/privacy.html",
          "/letters",
          "/memory",
          "/manuscripts",
          "/feedback",
          "/about",
          "/privacy",
        ].includes(url.pathname)
      )
        return "/";
      url.searchParams.delete("arrival");
      return url.pathname + url.search + url.hash;
    } catch {
      return "/";
    }
  }
  return { key, stages, read, write, terminal, destination };
})();
