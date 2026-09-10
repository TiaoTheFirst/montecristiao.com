/* Task-motivated stills, never a timed stare/blink loop. No itinerary authority. */
var ManorPerformance = (() => {
  "use strict";
  const rooms = {
    study: {
      label: "在旁边坐一会儿",
      caption: "书房 · 小坐",
      direction: "笔搁在纸上。他低头读那份稿子。",
    },
    library: {
      label: "陪他坐一会儿",
      caption: "藏书室 · 小坐",
      direction: "他继续读手中的书。",
    },
    salon: {
      label: "安静地坐一会儿",
      caption: "大客厅 · 小坐",
      direction: "茶杯搁回碟上。他望向园里。",
    },
    gallery: {
      label: "一起看一会儿画",
      caption: "画廊 · 同看一幅画",
      direction: "他也望向那幅海景，画前的位置留给您。",
    },
    garden: {
      label: "一起看看花园",
      caption: "中央花园 · 停一停",
      direction: "他望向水池。园径还在您面前。",
    },
    dining: {
      label: "先安静地用餐",
      caption: "餐厅 · 同席",
      direction: "他拿起餐具，低头看向自己的餐盘。",
    },
  };
  function quietShot(state) {
    const key = state.room + "-quiet-" + Manor.light(state.clock.minute);
    return typeof ManorPerformanceArt === "object"
      ? ManorPerformanceArt[key]
      : null;
  }
  function canRest(state, seated) {
    return !!(
      rooms[state?.room] &&
      quietShot(state) &&
      (state.room !== "dining" || (seated && state.meal))
    );
  }
  // Preload while retaining the current frame. Every close/world-change/new
  // request invalidates pending work; the bridge owns just its own animation.
  function createPlayer({
    prepare,
    bridge,
    display,
    isCurrent,
    onBusy = () => {},
    onError = () => {},
  }) {
    let serial = 0;
    function cancel() {
      ++serial;
      bridge.cancel();
      onBusy(false);
    }
    async function show(shot, commit = () => {}) {
      cancel();
      const token = serial;
      const valid = () => token === serial && isCurrent();
      if (!shot || !valid()) return false;
      onBusy(true);
      try {
        await prepare(shot.src);
        if (!valid()) return false;
        return await bridge.run({
          isCurrent: valid,
          commit() {
            display(shot);
            commit();
          },
        });
      } catch (error) {
        if (valid()) onError(error);
        return false;
      } finally {
        if (token === serial) onBusy(false);
      }
    }
    return { show, cancel };
  }
  return { rooms, quietShot, canRest, createPlayer };
})();
