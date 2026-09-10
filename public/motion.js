/* One owner for scene transitions. Latest request wins; the old scene stays usable on load failure. */
window.ManorMotion = (() => {
  const cache = new Map();
  const reduced = () =>
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.dataset.motion === "reduce";
  function prepare(src) {
    if (cache.has(src)) return cache.get(src);
    const task = new Promise((resolve, reject) => {
      const img = new Image(),
        timer = setTimeout(() => reject(new Error("IMAGE_TIMEOUT")), 9000);
      img.onload = async () => {
        try {
          if (img.decode) await img.decode();
          clearTimeout(timer);
          resolve(src);
        } catch (e) {
          clearTimeout(timer);
          reject(e);
        }
      };
      img.onerror = () => {
        clearTimeout(timer);
        reject(new Error("IMAGE_FAILED"));
      };
      img.src = src;
    }).catch((e) => {
      cache.delete(src);
      throw e;
    });
    cache.set(src, task);
    return task;
  }
  async function animate(node, keyframes, duration) {
    if (reduced() || !node.animate) return;
    const a = node.animate(keyframes, {
      duration,
      easing: "cubic-bezier(.22,.61,.36,1)",
      fill: "forwards",
    });
    try {
      await a.finished;
    } catch {
    } finally {
      a.cancel();
    }
  }
  function create({ stage, commit, failed, srcFor, labelFor }) {
    let pending = null,
      running = false,
      sequence = 0;
    const veil = document.createElement("div");
    veil.className = "scene-veil";
    veil.setAttribute("aria-hidden", "true");
    stage.append(veil);
    const caption = document.createElement("span");
    veil.append(caption);
    async function drain() {
      if (running) return;
      running = true;
      while (pending) {
        const job = pending;
        pending = null;
        stage.dataset.transition = "preparing";
        try {
          const src = srcFor(job.id);
          await prepare(src);
          if (job.sequence !== sequence) continue;
          stage.dataset.transition = "leaving";
          stage.inert = true;
          stage.setAttribute("aria-busy", "true");
          caption.textContent = labelFor(job.id);
          await animate(veil, [{ opacity: 0 }, { opacity: 1 }], 240);
          veil.style.opacity = "1";
          if (job.sequence !== sequence) {
            veil.style.opacity = "0";
            continue;
          }
          commit(job.id, src, job.focus);
          stage.dataset.transition = "arriving";
          // A gentle approach is clipped to the scene frame; hotspots and text stay stationary.
          const img = stage.querySelector("#scene-image");
          const zoom = reduced()
            ? Promise.resolve()
            : animate(img, [{ scale: 1.035 }, { scale: 1 }], 700);
          await animate(veil, [{ opacity: 1 }, { opacity: 0 }], 380);
          veil.style.opacity = "0";
          await zoom;
        } catch (e) {
          if (job.sequence === sequence) failed(job.id, e);
        } finally {
          stage.inert = false;
          stage.removeAttribute("aria-busy");
          veil.style.opacity = "0";
          stage.dataset.transition = "idle";
        }
      }
      running = false;
      stage.dataset.transition = "idle";
    }
    return {
      go(id, focus = true) {
        pending = { id, focus, sequence: ++sequence };
        drain();
      },
      get busy() {
        return running;
      },
    };
  }
  // Panel motion owns only animations started here; native dialogs and guards stay local.
  const effects = new WeakMap(),
    activeEffects = new Set(),
    panels = new WeakMap();
  let watchingPreferences = false;
  function watchPreferences() {
    if (watchingPreferences) return;
    watchingPreferences = true;
    const settleReduced = () => {
      for (const effect of [...activeEffects])
        if (effect.prefersReduced()) effect.finish();
    };
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.(
      "change",
      settleReduced,
    );
    if (typeof MutationObserver === "function")
      new MutationObserver(settleReduced).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-motion"],
      });
  }
  function frame(node) {
    if (!effects.has(node) || typeof getComputedStyle !== "function")
      return null;
    const style = getComputedStyle(node);
    return { opacity: style.opacity, translate: style.translate || "none" };
  }
  function effect(node, frames, duration, prefersReduced = reduced) {
    effects.get(node)?.cancel();
    if (!node || prefersReduced() || !node.animate)
      return { finished: Promise.resolve(true), cancel() {} };
    watchPreferences();
    let animation,
      resolve,
      settled = false;
    const finished = new Promise((done) => (resolve = done));
    const settle = (completed) => {
      if (settled) return;
      settled = true;
      if (effects.get(node) === task) effects.delete(node);
      activeEffects.delete(task);
      animation?.cancel();
      resolve(completed);
    };
    const task = {
      finished,
      prefersReduced,
      cancel: () => settle(false),
      finish: () => settle(true),
    };
    effects.set(node, task);
    activeEffects.add(task);
    try {
      animation = node.animate(frames, {
        duration,
        easing: "cubic-bezier(.22,.61,.36,1)",
        fill: "both",
      });
      animation.finished.then(task.finish, task.cancel);
    } catch {
      // Animation support must never prevent the requested native operation.
      task.finish();
    }
    return task;
  }
  function reveal(node) {
    return effect(
      node,
      [
        frame(node) || { opacity: 0.25, translate: "0 5px" },
        { opacity: 1, translate: "0 0" },
      ],
      180,
    ).finished;
  }
  // show/close -> Promise<boolean>; false means superseded. Render is synchronous.
  // Callers must run their unsaved/busy guards BEFORE close; no global handlers.
  function createPanel(node, { prefersReduced = reduced } = {}) {
    if (panels.has(node)) return panels.get(node);
    node.dataset.panelManaged = "true";
    let sequence = 0,
      pending = null,
      lifetime = null,
      restoreInert = null;
    const children = new Map();
    function stopChildren() {
      for (const task of children.values()) task.cancel();
      children.clear();
    }
    function cancel() {
      ++sequence;
      lifetime?.cancel();
      lifetime = null;
      pending = null;
      stopChildren();
      if (restoreInert !== null) node.inert = restoreInert;
      restoreInert = null;
      delete node.dataset.panelMotion;
    }
    function run(opening, { immediate = false, returnValue } = {}) {
      if (opening && node.open && node.dataset.panelMotion !== "closing")
        return pending || Promise.resolve(true);
      if (!opening && !node.open) {
        cancel();
        return Promise.resolve(true);
      }
      if (!opening && node.dataset.panelMotion === "closing" && !immediate)
        return pending;
      const from = frame(node);
      cancel();
      const ticket = sequence;
      if (opening && !node.open) node.showModal();
      node.dataset.panelMotion = opening ? "opening" : "closing";
      if (!opening) {
        restoreInert = node.inert;
        node.inert = true;
      }
      const finish = () => {
        if (ticket !== sequence) return false;
        if (restoreInert !== null) node.inert = restoreInert;
        restoreInert = null;
        delete node.dataset.panelMotion;
        lifetime = null;
        pending = null;
        if (!opening && node.open) node.close(returnValue);
        return true;
      };
      if (immediate || prefersReduced() || !node.animate)
        return Promise.resolve(finish());
      lifetime = effect(
        node,
        opening
          ? [
              from || { opacity: 0, translate: "0 10px" },
              { opacity: 1, translate: "0 0" },
            ]
          : [
              from || { opacity: 1, translate: "0 0" },
              { opacity: 0, translate: "0 6px" },
            ],
        opening ? 240 : 160,
        prefersReduced,
      );
      pending = lifetime.finished.then(finish);
      return pending;
    }
    function revealContent(target = node) {
      if (!node.open || node.dataset.panelMotion === "closing" || target.hidden)
        return Promise.resolve(false);
      if (target === node && lifetime) return pending;
      const task = effect(
        target,
        [
          frame(target) || { opacity: 0.25, translate: "0 5px" },
          { opacity: 1, translate: "0 0" },
        ],
        180,
        prefersReduced,
      );
      children.set(target, task);
      task.finished.then(() => {
        if (children.get(target) === task) children.delete(target);
      });
      return task.finished;
    }
    const panel = {
      show: () => run(true),
      close: (options) => run(false, options),
      cancel,
      reveal: revealContent,
      replace(render, { target = node, focus } = {}) {
        if (node.dataset.panelMotion === "closing")
          return Promise.resolve(false);
        stopChildren();
        const previous = document.activeElement;
        const ownedFocus = node.contains(previous);
        render();
        if (node.open) {
          const destination = typeof focus === "function" ? focus() : focus;
          if (destination) destination.focus?.({ preventScroll: true });
          else if (
            ownedFocus &&
            (!previous.isConnected || previous.closest?.("[hidden]"))
          ) {
            if (!target.hasAttribute("tabindex"))
              target.setAttribute("tabindex", "-1");
            target.focus?.({ preventScroll: true });
          }
        }
        return revealContent(target);
      },
    };
    node.addEventListener("close", () => {
      if (!node.open) cancel();
    });
    panels.set(node, panel);
    return panel;
  }
  return { prepare, create, reduced, animate, createPanel, reveal };
})();
