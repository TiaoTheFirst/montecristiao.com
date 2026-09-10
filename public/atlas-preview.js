/* Transient inspection never changes the selected destination or public world. */
window.ManorAtlasPreview = (() => {
  function create({
    onChange,
    valid,
    schedule = setTimeout,
    cancel = clearTimeout,
  }) {
    let active = null,
      pending = null,
      enterTimer,
      leaveTimer;
    const stopEnter = () => {
      cancel(enterTimer);
      enterTimer = undefined;
      pending = null;
    };
    const stopLeave = () => {
      cancel(leaveTimer);
      leaveTimer = undefined;
    };
    const show = (id) => {
      if (active === id) return;
      active = id;
      onChange(id);
    };
    return {
      get active() {
        return active;
      },
      enter(id, input = "mouse") {
        if (input === "touch" || !valid(id)) return;
        stopLeave();
        if (active === id) {
          stopEnter();
          return;
        }
        if (pending === id) return;
        stopEnter();
        if (input === "keyboard") {
          show(id);
          return;
        }
        pending = id;
        enterTimer = schedule(() => {
          pending = null;
          show(id);
        }, 160);
      },
      leave() {
        stopEnter();
        stopLeave();
        leaveTimer = schedule(() => {
          leaveTimer = undefined;
          show(null);
        }, 240);
      },
      hold() {
        stopLeave();
      },
      reset() {
        stopEnter();
        stopLeave();
        show(null);
      },
    };
  }
  function describe(id, { manor, daily, clock, count }) {
    const scene = manor.scenes[id];
    if (!scene) return null;
    const moment = daily?.moment({ room: id, clock, count });
    return {
      objects: scene.objects.map(([key, , , label]) => ({ key, label })),
      actions: (moment?.actions || []).map(([label, key]) => ({ key, label })),
      present: !!moment?.present,
    };
  }
  return { create, describe };
})();
