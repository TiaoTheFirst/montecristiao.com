/* Atlas motion owns visual transitions only; it never changes rooms or world time. */
window.ManorAtlasMotion = (() => {
  const reduced = () => window.ManorMotion.reduced();
  const reveals = new WeakMap();
  function reveal(node, distance = 4, duration = 200) {
    reveals.get(node)?.cancel();
    if (reduced() || !node.animate) return;
    const animation = node.animate(
      [
        { opacity: 0.3, transform: `translateY(${distance}px)` },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration, easing: "cubic-bezier(.22,.61,.36,1)" },
    );
    reveals.set(node, animation);
    animation.finished
      .catch(() => {})
      .finally(() => {
        if (reveals.get(node) === animation) reveals.delete(node);
      });
  }
  function createViewBox(
    node,
    {
      prefersReduced = reduced,
      request = requestAnimationFrame,
      cancel = cancelAnimationFrame,
      now = () => performance.now(),
    } = {},
  ) {
    let frame = 0;
    function stop() {
      cancel(frame);
      frame = 0;
    }
    return {
      stop,
      to(target, immediate = false) {
        stop();
        const source = (node.getAttribute("viewBox") || "")
          .trim()
          .split(/\s+/)
          .map(Number);
        if (
          immediate ||
          prefersReduced() ||
          source.length !== 4 ||
          source.some((n) => !Number.isFinite(n)) ||
          source.every((n, i) => n === target[i])
        ) {
          node.setAttribute("viewBox", target.join(" "));
          return;
        }
        const start = now();
        const tick = (time) => {
          const t = prefersReduced()
            ? 1
            : Math.min(1, Math.max(0, (time - start) / 520));
          const ease = 1 - Math.pow(1 - t, 3);
          node.setAttribute(
            "viewBox",
            target.map((n, i) => source[i] + (n - source[i]) * ease).join(" "),
          );
          frame = t < 1 ? request(tick) : 0;
        };
        frame = request(tick);
      },
    };
  }
  function createPanel(node, { prefersReduced = reduced } = {}) {
    let sequence = 0,
      animation,
      pending;
    function run(opening) {
      if (opening && node.open && node.dataset.atlasMotion !== "closing")
        return Promise.resolve(true);
      if (!opening && (!node.open || node.dataset.atlasMotion === "closing"))
        return pending || Promise.resolve(true);
      const ticket = ++sequence;
      const previous =
        animation && typeof getComputedStyle === "function"
          ? getComputedStyle(node)
          : null;
      const from = previous
        ? { opacity: previous.opacity, transform: previous.transform }
        : null;
      animation?.cancel();
      animation = null;
      if (opening && !node.open) node.showModal();
      node.dataset.atlasMotion = opening ? "opening" : "closing";
      const finish = () => {
        if (ticket !== sequence) return false;
        if (!opening && node.open) node.close();
        animation?.cancel();
        animation = null;
        delete node.dataset.atlasMotion;
        pending = null;
        return true;
      };
      if (prefersReduced() || !node.animate) return Promise.resolve(finish());
      animation = node.animate(
        opening
          ? [
              from || {
                opacity: 0,
                transform: "translateY(24px) scale(.965) rotate(-.5deg)",
              },
              { opacity: 1, transform: "translateY(0) scale(1) rotate(0deg)" },
            ]
          : [
              from || { opacity: 1, transform: "translateY(0) scale(1)" },
              { opacity: 0, transform: "translateY(14px) scale(.98)" },
            ],
        {
          duration: opening ? 420 : 260,
          easing: "cubic-bezier(.22,.61,.36,1)",
          fill: "forwards",
        },
      );
      pending = animation.finished.catch(() => {}).then(finish);
      return pending;
    }
    return { show: () => run(true), close: () => run(false) };
  }
  return { reveal, createViewBox, createPanel };
})();
