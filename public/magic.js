/* Visit-local close-ups. No connection to letter delivery or visitor profiling. */
(() => {
  const dialog = document.createElement("dialog");
  dialog.id = "magic-folio";
  dialog.className = "magic-folio";
  dialog.setAttribute("aria-labelledby", "magic-title");
  dialog.innerHTML =
    '<header><button type="button" class="magic-back">← 放回原处</button><span class="magic-place"></span></header><div class="magic-layout"><div class="magic-picture"><img class="magic-base" alt="" width="1672" height="941"><canvas class="magic-canvas" aria-hidden="true"></canvas><span class="magic-cue" aria-hidden="true"></span></div><section class="magic-notes"><div><h2 id="magic-title"></h2><p class="magic-response" role="status"></p></div><div class="magic-actions"><button type="button" class="magic-touch"></button><button type="button" class="magic-reset" hidden></button></div></section></div>';
  document.body.append(dialog);
  const journeyButton = document.createElement("button");
  journeyButton.type = "button";
  journeyButton.className = "magic-journey";
  journeyButton.hidden = true;
  dialog.querySelector(".magic-actions").append(journeyButton);
  const $ = (s) => dialog.querySelector(s),
    panel = ManorMotion.createPanel(dialog);
  const items = {
    seal: {
      room: "letter",
      title: "借一点光",
      first: "碰一下封蜡，再按住拖向信纸。松手，留下一颗星。",
      action: "触碰封蜡",
      next: "再牵出一颗星",
      reset: "把光还回去",
      awake: "亮了。把这点光牵到信纸上试试。",
      drawing: "松手的地方，留住了一点光。",
      constellation: "这封信，还没写字就有了星图。",
    },
    pool: {
      room: "garden",
      title: "水里有另一片天",
      first: "碰一碰水面，或按住慢慢划过。",
      action: "指尖轻点水面",
      next: "再拨一下水",
      reset: "抚平水面",
      drawing: "水里的光留在了您碰过的地方。",
      constellation: "几处灯火，连成了天上没有的星座。",
    },
  };
  let current = null,
    opener = null,
    epoch = 0,
    surface = null,
    ready = false;
  function stop() {
    epoch++;
    surface?.dispose();
    surface = null;
    ready = false;
  }
  const reduceEffect = () => surface?.preferenceChanged();
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
    "change",
    reduceEffect,
  );
  new MutationObserver(reduceEffect).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-motion"],
  });
  async function close(immediate = false) {
    stop();
    await panel.close({ immediate });
  }
  $(".magic-back").onclick = () => close();
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => {
    stop();
    ManorMusic.duck("magic", false);
    if (
      !document.querySelector("dialog[open]") &&
      opener?.isConnected &&
      !opener.hidden
    )
      opener.focus({ preventScroll: true });
  });
  window.addEventListener("hashchange", () => close(true));
  window.addEventListener("manor:committed", () => close(true));
  document.addEventListener("manor:account", () => close(true));
  function reset() {
    surface?.reset();
    if (current === "pool" && window.ManorMagicJourney?.snapshot().revealed)
      surface?.reveal(false);
    dialog.dataset.answered = "false";
    $(".magic-response").textContent = items[current].first;
    $(".magic-touch").textContent = items[current].action;
    $(".magic-reset").hidden = true;
    updateJourney();
  }
  function updateJourney() {
    const state = window.ManorMagicJourney?.snapshot();
    journeyButton.hidden =
      !state ||
      !ready ||
      (current === "seal"
        ? dialog.dataset.answered !== "true" && !state.carrying
        : !state.carrying);
    journeyButton.disabled = !!(current === "seal" && state?.carrying);
    journeyButton.textContent =
      current === "seal"
        ? state?.carrying
          ? "已带上一点光"
          : "把一点光带走"
        : "把带来的光放进池水";
  }
  journeyButton.onclick = () => {
    if (!ready || !window.ManorMagicJourney) return;
    if (current === "seal" && dialog.dataset.answered === "true") {
      ManorMagicJourney.borrow();
      $(".magic-response").textContent =
        "带上了。去花园时，也可以让它碰一碰水。";
    } else if (current === "pool" && ManorMagicJourney.release()) {
      surface.reveal();
      dialog.dataset.answered = "true";
      $(".magic-reset").hidden = false;
      $(".magic-response").textContent =
        "光没沉下去。封印上的星纹，在水里展开了。";
    }
    updateJourney();
    $(".magic-touch").focus({ preventScroll: true });
  };
  $(".magic-reset").onclick = () => {
    if (current === "seal") window.ManorMagicJourney?.returnLight();
    reset();
    $(".magic-touch").focus({ preventScroll: true });
  };
  $(".magic-touch").onclick = () => {
    if (ready) surface?.activate();
  };
  async function open(id) {
    const item = items[id],
      state = ManorView.snapshot();
    if (
      !item ||
      state.room !== item.room ||
      dialog.dataset.panelMotion === "closing"
    )
      return false;
    stop();
    current = id;
    opener = document.activeElement;
    dialog.dataset.magic = id;
    dialog.dataset.ready = "false";
    $(".magic-place").textContent = Manor.rooms[item.room][0];
    $("#magic-title").textContent = item.title;
    $(".magic-reset").textContent = item.reset;
    reset();
    const picture = $(".magic-base"),
      loadEpoch = epoch;
    const enable = () => {
      if (
        loadEpoch !== epoch ||
        !dialog.open ||
        surface ||
        !picture.naturalWidth
      )
        return;
      try {
        surface = ManorMagicSurface({
          canvas: $(".magic-canvas"),
          image: picture,
          kind: id,
          reduced: () => ManorMotion.reduced(),
          onChange: (phase) => {
            dialog.dataset.answered = "true";
            $(".magic-response").textContent = item[phase];
            $(".magic-touch").textContent = item.next;
            $(".magic-reset").hidden = false;
            updateJourney();
          },
        });
        ready = true;
        dialog.dataset.ready = "true";
        $(".magic-touch").disabled = false;
        if (id === "pool" && window.ManorMagicJourney?.snapshot().revealed)
          surface.reveal(false);
        updateJourney();
      } catch {
        $(".magic-response").textContent =
          "这里的光暂时没有回应。您可以先返回房间。";
      }
    };
    picture.onerror = () => {
      if (loadEpoch !== epoch) return;
      ready = false;
      surface?.dispose();
      surface = null;
      dialog.dataset.ready = "false";
      $(".magic-touch").disabled = true;
      updateJourney();
      $(".magic-response").textContent =
        "画面暂未载入，您可以先返回房间，再试一次。";
    };
    picture.onload = enable;
    picture.alt =
      id === "seal"
        ? "信纸上的红色星纹封蜡与黄铜印章"
        : "俯身看向池面，树影与天光映在水中";
    picture.src =
      id === "seal"
        ? "assets/magical-seal-practice-v1.webp"
        : "assets/pool-close-" + Manor.light(state.clock.minute) + "-v2.webp";
    $(".magic-touch").disabled = true;
    const shown = await panel.show();
    if (!shown || !dialog.open || loadEpoch !== epoch) return false;
    if (picture.complete && picture.naturalWidth) enable();
    ManorMusic.duck("magic", true);
    $(".magic-back").focus({ preventScroll: true });
    return true;
  }
  window.ManorMagic = { open, close };
})();
