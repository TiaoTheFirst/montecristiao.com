/* In-scene cast and conversations consume the same clock as maps and room art. */
(() => {
  "use strict";
  const q = (s) => document.querySelector(s);
  const stage = q(".stage");
  const conversations = ManorContinuity.createConversationMemory();
  let active = null,
    serial = 0,
    seated = false,
    opener;
  let pinned = null,
    closing = false,
    departed = false,
    endedVisual = null,
    resting = false,
    currentPage = null,
    closeReady = false;
  const mealTarget = document.createElement("button");
  mealTarget.className = "count-target";
  mealTarget.type = "button";
  mealTarget.hidden = true;
  mealTarget.innerHTML = '<i aria-hidden="true"></i><span>走近伯爵 →</span>';
  mealTarget.setAttribute("aria-label", "走近伯爵");
  const mealLayer = document.createElement("div");
  mealLayer.className = "cast-overlay";
  mealLayer.append(mealTarget);
  q("#hotspots").after(mealLayer);
  function alignMeal() {
    const hot = q("#hotspots");
    for (const key of ["width", "height", "left", "top"])
      mealLayer.style[key] = hot.style[key];
  }
  new ResizeObserver(alignMeal).observe(q("#hotspots"));
  alignMeal();
  const dialog = document.createElement("dialog");
  dialog.id = "encounter";
  dialog.setAttribute("aria-labelledby", "speaker");
  dialog.innerHTML =
    '<div class="encounter-shot"><img class="shot-current" alt=""><img class="shot-next" alt="" aria-hidden="true"><div class="shot-matte"></div><span id="shot-caption"></span><button id="shot-back" aria-label="结束交谈，退回房间">← 退回房间</button></div><section class="speech"><div class="speech-head"><span id="speaker"></span><small>府邸短叙 · 预写对话</small><button id="encounter-music" aria-pressed="false">♫ 开启音乐</button><button id="speech-close" aria-label="结束交谈">告辞 ×</button></div><p id="speech-direction"></p><p id="speech-text" aria-live="polite"></p><div id="speech-choices"></div><p id="shot-notice" role="status" hidden></p></section>';
  document.body.append(dialog);
  const restButton = document.createElement("button");
  restButton.id = "encounter-rest";
  restButton.type = "button";
  restButton.hidden = true;
  q(".speech-head").append(restButton);
  const restDock = document.createElement("div");
  restDock.id = "encounter-rest-dock";
  restDock.hidden = true;
  const restLine = document.createElement("p");
  const resumeButton = document.createElement("button");
  resumeButton.type = "button";
  resumeButton.textContent = "继续交谈";
  restDock.append(restLine, resumeButton);
  dialog.append(restDock);
  const closeFade = ManorContinuity.createFade(dialog, ManorMotion);
  const makeCover = (parent, className) => {
    const cover = document.createElement("div");
    cover.className = "continuity-cover " + className;
    cover.setAttribute("aria-hidden", "true");
    parent.append(cover);
    return cover;
  };
  const shotBridge = ManorContinuity.createBridge({
    cover: makeCover(q(".encounter-shot"), "shot-continuity-cover"),
    motion: ManorMotion,
    onPhase: (phase) => {
      dialog.dataset.phase = phase;
    },
  });
  const presenceBridge = ManorContinuity.createBridge({
    cover: makeCover(q(".scene-frame"), "presence-continuity-cover"),
    motion: ManorMotion,
    onPhase: (phase) => {
      stage.dataset.presencePhase = phase;
    },
  });
  const performance = ManorPerformance.createPlayer({
    prepare: (src) => ManorMotion.prepare(src),
    bridge: shotBridge,
    display(shot) {
      q(".shot-current").src = shot.src;
      q(".shot-current").alt =
        shot.alt || "伯爵在" + Manor.rooms[pinned.room][0];
      q(".shot-current").dataset.framing = "close";
    },
    isCurrent: () =>
      active === "count" &&
      !departed &&
      !closing &&
      dialog.open &&
      !document.hidden &&
      !expired(),
    onBusy: (busy) => setBusy(busy),
    onError() {
      q("#shot-notice").textContent =
        "这一幕暂未载入，保留当前画面。您可以重试，或直接告辞。";
      q("#shot-notice").hidden = false;
      if (resting)
        restLine.textContent =
          "交谈画面暂未载入。可以再试一次，也可以退回房间。";
    },
  });
  function restingUI(value) {
    resting = value;
    dialog.dataset.resting = String(value);
    q(".speech").hidden = value;
    q(".speech").inert = value;
    restDock.hidden = !value;
    if (value)
      restLine.textContent = ManorPerformance.rooms[pinned.room].direction;
  }
  function restAvailability() {
    restButton.hidden = !(
      active === "count" &&
      !departed &&
      closeReady &&
      ManorPerformance.canRest(pinned, seated) &&
      !currentPage?.unavailable
    );
    if (!restButton.hidden)
      restButton.textContent = ManorPerformance.rooms[pinned.room].label;
  }
  async function setRest(value) {
    if (
      value === resting ||
      !closeReady ||
      active !== "count" ||
      closing ||
      departed
    )
      return;
    if (expired()) {
      endEncounter();
      return;
    }
    if (
      value &&
      (currentPage?.unavailable || !ManorPerformance.canRest(pinned, seated))
    )
      return;
    if (dialog.getAttribute("aria-busy") === "true") return;
    const shot = value
      ? ManorPerformance.quietShot(pinned)
      : ManorStaging.shot(pinned, seated ? "seated" : "approach");
    q("#shot-notice").hidden = true;
    const token = serial;
    const done = await performance.show(shot, () => {
      restingUI(value);
      q("#shot-caption").textContent = value
        ? ManorPerformance.rooms[pinned.room].caption
        : Manor.rooms[pinned.room][0] + (seated ? " · 与伯爵同席" : " · 交谈");
    });
    if (done && token === serial) {
      // The player releases disabled controls before returning. Focusing while
      // busy silently fails in a real browser even if a DOM stub accepts it.
      (value ? resumeButton : restButton).focus({ preventScroll: true });
      ManorMotion.reveal?.(value ? restDock : q(".speech"));
    }
  }
  restButton.onclick = () => setRest(true);
  resumeButton.onclick = () => setRest(false);
  const presenceNote = document.createElement("p");
  presenceNote.id = "presence-continuity";
  presenceNote.setAttribute("role", "status");
  presenceNote.hidden = true;
  q(".room-dock").after(presenceNote);
  let observed = null;
  async function paintPresence({ room, fromKey, toKey, commit, isCurrent }) {
    const change = ManorContinuity.presenceChange(room, fromKey, toKey);
    try {
      return await presenceBridge.run({
        commit,
        isCurrent,
        bridge: !!change && !dialog.open,
      });
    } finally {
      sync();
    }
  }
  const approach = document.createElement("button");
  approach.id = "approach-count";
  approach.type = "button";
  approach.hidden = true;
  approach.textContent = "走近伯爵 →";
  q(".room-dock").append(approach);
  const musicTrigger = document.createElement("button");
  musicTrigger.id = "music-toggle";
  musicTrigger.type = "button";
  musicTrigger.textContent = "♫ 开启音乐";
  musicTrigger.setAttribute("aria-pressed", "false");
  q(".map-trigger").before(musicTrigger);
  const player = document.createElement("dialog");
  player.id = "player-dialog";
  player.className = "small-dialog";
  player.setAttribute("aria-labelledby", "player-title");
  player.innerHTML =
    '<div class="dialog-heading"><div><p class="eyebrow">LA BOÎTE À MUSIQUE</p><h2 id="player-title">茶桌上的乐匣</h2></div><button data-close aria-label="关闭乐匣界面">关闭 ×</button></div><div class="dialog-body"><p>用下方按钮播放或停止，关闭这个面板不会停止音乐。</p><p class="music-title">《树影经过午后》</p><button id="player-power" class="solid">打开乐匣，播放</button><label class="volume-label">音量<input id="music-volume" type="range" min="0" max="50" value="20" step="1"></label><p id="music-state" role="status"></p><p class="fine-print">为本地预览编写的合成器小曲，非历史录音。音乐会随您走过房间；顶部也可随时静音。</p></div>';
  document.body.append(player);
  function musicUI() {
    const on = ManorMusic.playing;
    musicTrigger.textContent = on ? "♫ 静音" : "♫ 开启音乐";
    musicTrigger.setAttribute("aria-pressed", String(on));
    q("#encounter-music").textContent = musicTrigger.textContent;
    q("#encounter-music").setAttribute("aria-pressed", String(on));
    q("#player-power").textContent = on ? "合上乐匣，停止" : "打开乐匣，播放";
    q("#music-state").textContent = on ? "乐匣正在播放。" : "乐匣已停。";
  }
  async function toggleMusic() {
    try {
      await ManorMusic.toggle();
      musicUI();
    } catch {
      musicTrigger.textContent = "♫ 重试音乐";
      q("#music-state").textContent = "声音暂未开启，请再点一次播放。";
    }
  }
  musicTrigger.onclick = toggleMusic;
  q("#encounter-music").onclick = toggleMusic;
  q("#player-power").onclick = toggleMusic;
  q("#music-volume").oninput = (e) => {
    ManorMusic.volume(Number(e.target.value) / 100);
    musicUI();
  };
  window.addEventListener("manor:music", musicUI);
  async function close(immediate = false) {
    if (closing) {
      if (immediate) {
        closeFade.cancel();
        if (dialog.open) dialog.close();
      }
      return;
    }
    closing = true;
    ++serial;
    performance.cancel();
    shotBridge.cancel();
    if (dialog.open && !immediate) await closeFade.run(1, 0, 240);
    if (dialog.open) dialog.close();
    closing = false;
  }
  dialog.addEventListener("close", () => {
    if (dialog.open) return;
    closeFade.cancel();
    ++serial;
    active = null;
    pinned = null;
    departed = false;
    endedVisual = null;
    seated = false;
    closeReady = false;
    restingUI(false);
    performance.cancel();
    stage.dataset.seated = "false";
    shotBridge.cancel();
    q(".shot-current").style.visibility = "visible";
    q(".shot-next").style.opacity = "0";
    dialog.removeAttribute("aria-busy");
    stage.classList.remove("in-conversation");
    ManorMusic.duck("encounter", false);
    sync();
    if (!document.querySelector("dialog[open]")) {
      const target =
        opener?.isConnected && !opener.hidden ? opener : q("#room-title");
      target?.focus?.({ preventScroll: true });
    }
  });
  q("#speech-close").onclick = q("#shot-back").onclick = () => close();
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.onclick = (e) => {
    if (e.target === dialog) close();
  };
  function paint(page) {
    currentPage = page;
    if (active === "count" && !departed)
      conversations.save(pinned, page, seated);
    q("#speaker").textContent = page.speaker;
    q("#speech-direction").textContent = page.direction;
    q("#speech-text").textContent = page.text;
    q("#speech-choices").replaceChildren();
    for (const c of page.choices) {
      const b = document.createElement("button");
      b.textContent = c.label;
      b.onclick = () => choose(c.action);
      q("#speech-choices").append(b);
    }
    if (
      active === "butler" ||
      (active === "count" && !departed && pinned?.room === "salon")
    ) {
      const feedback = document.createElement("button");
      feedback.className = "feedback-prompt";
      feedback.textContent =
        active === "count" ? "谈谈这次来访" : "我想留一张意见便笺";
      feedback.onclick = () =>
        window.dispatchEvent(
          new CustomEvent("manor:feedback", {
            detail: { entry: active === "count" ? "tea" : "butler" },
          }),
        );
      q("#speech-choices").append(feedback);
    }
    restAvailability();
  }
  function setBusy(value) {
    if (value) dialog.setAttribute("aria-busy", "true");
    else dialog.removeAttribute("aria-busy");
    dialog.querySelectorAll("#speech-choices button").forEach((b) => {
      b.disabled = value;
    });
    restButton.disabled = resumeButton.disabled = value;
  }
  async function encounter(who, page) {
    if (stage.inert || closing) return;
    const state = ManorView.snapshot();
    if (
      who === "count" &&
      (!ManorContinuity.present(state) ||
        presenceBridge.busy ||
        q("#scene-image").dataset.sceneKey !== state.imageKey)
    )
      return;
    // Repeated approach events preserve the current branch, seat and time limit.
    if (dialog.open && active === who && pinned?.room === state.room) {
      if (who === "count" && !departed && expired()) endEncounter();
      return;
    }
    const token = ++serial;
    performance.cancel();
    closeReady = false;
    restingUI(false);
    shotBridge.cancel();
    opener = document.activeElement;
    active = who;
    const resumed = who === "count" && !page ? conversations.load(state) : null;
    pinned = resumed?.state || state;
    departed = false;
    endedVisual = null;
    seated = !!resumed?.seated;
    stage.dataset.seated = String(seated);
    // Other modal owners preserve their own unsaved guards and close themselves.
    const img = q(".shot-current");
    const shot = ManorStaging.shot(pinned, seated ? "seated" : "approach", who);
    // The old room stays visible while the close-up loads; a failed load never invents a new pose.
    const fallback = q("#scene-image").src;
    img.src = fallback;
    img.alt = Manor.rooms[state.room][0];
    img.style.visibility = "visible";
    img.style.opacity = "1";
    img.dataset.framing = "room";
    q(".shot-next").style.opacity = "0";
    q("#shot-notice").hidden = true;
    dialog.dataset.actor = who;
    dialog.dataset.room = state.room;
    dialog.dataset.shot = seated ? "seated" : "approach";
    q("#shot-caption").textContent =
      Manor.rooms[state.room][0] +
      " · " +
      (seated ? "与伯爵同席" : who === "count" ? "走近伯爵" : "管家来应声");
    const introduction =
      page ||
      resumed?.page ||
      (who === "butler"
        ? ManorDialogue.butler(state, Reception.user?.name)
        : ManorDialogue.count(state, Reception.user?.name));
    paint(
      who === "count" && !page && window.ManorMagicJourney
        ? ManorMagicJourney.decorate(introduction)
        : introduction,
    );
    if (!dialog.open) dialog.showModal();
    if (who === "count" && !page && !resumed && !currentPage?.unavailable) {
      const original = currentPage;
      window.ManorRelationship?.meet(state).then((known) => {
        if (
          known &&
          token === serial &&
          dialog.open &&
          currentPage === original &&
          !expired()
        )
          paint(
            window.ManorMagicJourney
              ? ManorMagicJourney.decorate(
                  ManorRelationship.decorate(original, state, known),
                )
              : ManorRelationship.decorate(original, state, known),
          );
      });
    }
    ManorMusic.duck("encounter", true);
    stage.classList.add("in-conversation");
    setBusy(true);
    q("#shot-back").focus({ preventScroll: true });
    try {
      // No invented close-up: a newly opened room may use an intentional wide shot.
      if (!shot) return;
      await ManorMotion.prepare(shot.src);
      if (!validEncounter(token)) return;
      await shotBridge.run({
        isCurrent: () => validEncounter(token),
        commit() {
          img.src = shot.src;
          img.dataset.framing = "close";
          closeReady = true;
          img.alt =
            (who === "count" ? "伯爵" : "巴蒂斯坦") +
            "在" +
            Manor.rooms[state.room][0] +
            "，交谈近景";
        },
      });
    } catch {
      if (token !== serial || !dialog.open) return;
      q("#shot-notice").textContent =
        "近景暂未载入，保留房间视角。可以告辞后重新走近。";
      q("#shot-notice").hidden = false;
    } finally {
      if (token === serial) {
        setBusy(false);
        restAvailability();
      }
    }
  }
  function where() {
    const s = ManorView.snapshot(),
      st = s.count;
    const accessible = !!Manor.scenes[st.room];
    if (st.unknown) {
      paint({
        speaker: "巴蒂斯坦",
        direction: "他在门边等候。",
        text: "我还没确认伯爵的去向。您可以先到客厅，或去画廊看看。",
        choices: [ManorDialogue.choice("先回房间。", "close")],
      });
      ManorWorld.sync();
      return;
    }
    paint({
      speaker: "巴蒂斯坦",
      direction: "管家略微侧身，望向走廊。",
      text:
        `伯爵${st.moving ? "正经过" : "在"}${Manor.rooms[st.room][0]}，${st.text}。` +
        (accessible
          ? "我可以替您指路。"
          : "那一带眼下不接待访客，您可以先在客厅歇一歇。"),
      choices: [
        ManorDialogue.choice(
          accessible ? "请带我过去。" : "带我去客厅。",
          accessible ? "find-count" : "go-salon",
        ),
        ManorDialogue.choice("我先自己走走。", "close"),
      ],
    });
  }
  async function choose(action) {
    if (action === "close") return close();
    if (active === "count" && (departed || expired())) endEncounter();
    if (departed && action !== "call-butler") return;
    if (dialog.getAttribute("aria-busy") === "true") return;
    if (active === "count" && action.startsWith("magic-")) {
      const page = window.ManorMagicJourney?.respond(action);
      if (page) {
        paint(page);
        ManorMotion.reveal?.(q(".speech"));
        q("#speech-choices button")?.focus({ preventScroll: true });
      }
      return;
    }
    if (action === "familiar-unhurried") {
      paint({
        speaker: "伯爵",
        direction: "他点了点头。",
        text: "请坐。",
        choices: [
          { label: "先在这里待一会儿。", action: "close" },
          { label: "看看附近的房间。", action: "map" },
        ],
      });
      ManorMotion.reveal?.(q(".speech"));
      q("#speech-choices button")?.focus({ preventScroll: true });
      return;
    }
    if (action === "familiar-painting") {
      paint({
        speaker: "伯爵",
        direction: "他望向画框的下沿。",
        text: "框子太亮了。我换过一回，新的更糟，只好又挂回这个。您若认识手艺好的装裱师，倒可以替我留意。",
        choices: [
          { label: "我倒觉得这个挺合适。", action: "familiar-frame-keep" },
          {
            label: "也许可以试试暗一点的木框。",
            action: "familiar-frame-dark",
          },
        ],
      });
      ManorMotion.reveal?.(q(".speech"));
      q("#speech-choices button")?.focus({ preventScroll: true });
      return;
    }
    if (action === "familiar-frame-keep" || action === "familiar-frame-dark") {
      paint({
        speaker: "伯爵",
        direction: "伯爵又退开一步看了看。",
        text:
          action === "familiar-frame-keep"
            ? "您觉得合适？我还是嫌它亮了些，尤其是画的下沿。"
            : "可以试。先找一截木料来比，不急着拆画。",
        choices: [
          { label: "再看看画。", action: "object-seascape" },
          { label: "我先告辞。", action: "close" },
        ],
      });
      ManorMotion.reveal?.(q(".speech"));
      q("#speech-choices button")?.focus({ preventScroll: true });
      return;
    }
    if (action === "quiet") return setRest(true);
    if (action.startsWith("object-")) {
      window.ManorObjects?.open(action.slice(7), pinned);
      return;
    }
    if (action === "where") return where();
    if (action === "account") {
      await close();
      Reception.open();
      return;
    }
    if (action === "map") {
      await close();
      ManorView.open("map");
      return;
    }
    if (action === "call-butler") {
      await close();
      encounter("butler");
      return;
    }
    if (action === "find-count") {
      await close();
      const s = ManorView.snapshot();
      if (!s.count.unknown && Manor.scenes[s.count.room])
        ManorView.navigate(s.count.room);
      return;
    }
    if (action.startsWith("go-")) {
      await close();
      ManorView.navigate(action.slice(3));
      return;
    }
    const links = {
      "reply-example": "letters.html",
      archive: "index.html#gallery",
    };
    if (links[action]) {
      location.href = links[action];
      return;
    }
    if (action === "accept-meal") {
      if (!pinned?.meal || active !== "count") return;
      if (seated) return;
      performance.cancel();
      const token = ++serial,
        shot = ManorStaging.shot(pinned, "seated");
      setBusy(true);
      q("#shot-notice").hidden = true;
      try {
        if (!shot) throw new Error("SHOT_NOT_READY");
        await ManorMotion.prepare(shot.src);
        if (!validEncounter(token)) return;
        const committed = await shotBridge.run({
          isCurrent: () => validEncounter(token),
          commit() {
            q(".shot-current").src = shot.src;
            q(".shot-current").alt = "坐在伯爵身旁用餐，平视近景";
            q(".shot-current").dataset.framing = "close";
          },
        });
        if (!committed || !validEncounter(token)) return;
      } catch {
        if (token === serial) {
          q("#shot-notice").textContent = "入座视角暂未载入，请稍后再试。";
          q("#shot-notice").hidden = false;
        }
        return;
      } finally {
        if (token === serial) setBusy(false);
      }
      seated = true;
      stage.dataset.seated = "true";
      dialog.dataset.shot = "seated";
      q("#shot-caption").textContent = "餐厅 · 与伯爵同席";
      sync();
    }
    if (ManorDialogue.pages[action]) {
      paint(ManorDialogue.page(action, pinned || ManorView.snapshot()));
      ManorMotion.reveal?.(q(".speech"));
      q("#speech-choices button")?.focus({ preventScroll: true });
    }
  }
  approach.onclick = mealTarget.onclick = () => encounter("count");
  q("#count-presence").addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      encounter("count");
    },
    true,
  );
  window.addEventListener("manor:butler", () => encounter("butler"));
  window.addEventListener("manor:interact", (e) => {
    if (e.detail.object === "musicbox") {
      close(true).then(() => {
        ManorView.open("player");
        musicUI();
      });
    }
    if (e.detail.object === "place") {
      const s = ManorView.snapshot();
      if (s.meal) encounter("count");
      else encounter("butler", ManorDialogue.pages.empty);
    }
  });
  function sync() {
    const s = ManorView.snapshot();
    const displayedKey = q("#scene-image").dataset.sceneKey;
    const painted = displayedKey === s.imageKey;
    const target = ManorStaging.target(s);
    const present = painted && !!target && !presenceBridge.busy;
    mealTarget.hidden = approach.hidden = !present;
    if (target?.hotspot) {
      mealTarget.style.left = target.hotspot[0] * 100 - 9 + "%";
      mealTarget.style.top = Math.min(66, target.hotspot[1] * 100 - 18) + "%";
    }
    stage.dataset.meal = String(s.meal && s.room === "dining");
    const here = ManorContinuity.present(s);
    // The old resident must disappear even if the replacement image is offline.
    stage.dataset.presenceStale = String(
      !here &&
        ManorContinuity.presenceChange(
          s.room,
          displayedKey,
          s.room + "-day",
        ) === "departing",
    );
    if (observed?.room !== s.room) {
      presenceNote.hidden = true;
      presenceNote.textContent = "";
    } else if (observed) {
      const wasHere = ManorContinuity.present(observed);
      if (s.count.unknown && !observed.count.unknown) {
        presenceNote.textContent = "伯爵的行踪暂待确认，房间仍可参观。";
        presenceNote.hidden = false;
      } else if (here && (!wasHere || observed.count.unknown)) {
        presenceNote.textContent = "伯爵已到这里。待画面安定，便可走近。";
        presenceNote.hidden = false;
      } else if (wasHere && !here && !s.count.unknown) {
        presenceNote.textContent = "伯爵已结束在这里的停留，您可以继续参观。";
        presenceNote.hidden = false;
      } else if (observed.count.unknown && !s.count.unknown) {
        presenceNote.hidden = true;
      }
    }
    const settledNotice = "伯爵此刻在这里，可以走近交谈。";
    if (
      here &&
      present &&
      !presenceNote.hidden &&
      presenceNote.textContent !== settledNotice
    )
      presenceNote.textContent = settledNotice;
    observed = s;
    if (active === "count" && (departed || expired())) endEncounter();
    if (s.room === "dining") {
      q("#room-line").textContent = s.meal
        ? seated
          ? "您在伯爵身旁落了座。"
          : "伯爵还在用餐。身旁的椅子空着，餐具已经摆好。"
        : Manor.scenes.dining.line;
    }
  }
  function expired() {
    return (
      !!pinned && !!ManorContinuity.endReason(pinned, ManorView.snapshot())
    );
  }
  function validEncounter(token) {
    if (token !== serial || !dialog.open || closing) return false;
    if (active === "count" && !departed && expired()) {
      endEncounter();
      return false;
    }
    return !departed;
  }
  async function endEncounter() {
    if (!pinned || closing || !dialog.open) return;
    const state = ManorView.snapshot(),
      reason = ManorContinuity.endReason(pinned, state) || "elapsed",
      room = pinned.room,
      keepFocus = dialog.contains(document.activeElement);
    const resident = reason === "elapsed" && ManorStaging.target(state);
    const shot = resident
      ? { src: resident.src, alt: Manor.rooms[room][0] + "，伯爵仍在房间里" }
      : ManorContinuity.neutralShot(room, state.clock.minute);
    const visualKey = reason + ":" + shot.src;
    if (endedVisual === visualKey) return;
    endedVisual = visualKey;
    departed = true;
    performance.cancel();
    closeReady = false;
    restingUI(false);
    const token = ++serial;
    seated = false;
    stage.dataset.seated = "false";
    dialog.dataset.shot = "ended";
    shotBridge.cancel();
    dialog.removeAttribute("aria-busy");
    q(".shot-next").style.opacity = "0";
    q("#shot-caption").textContent = Manor.rooms[room][0] + " · 交谈告一段落";
    q("#shot-notice").hidden = true;
    paint({
      speaker: "片刻之后",
      direction: "这一段交谈已经结束，您仍可留在房间。",
      text:
        reason === "unknown"
          ? "府邸时钟暂未同步，人物互动已暂停。您可以退回房间继续参观。"
          : reason === "elapsed"
            ? "这次交谈已结束。您可以继续看画，或退回房间。"
            : "伯爵已转去下一项安排。您可以留在房间，也可以请管家指路。",
      choices: [
        ManorDialogue.choice("留在这个房间。", "close"),
        ManorDialogue.choice("请管家过来。", "call-butler"),
      ],
    });
    if (keepFocus) q("#speech-choices button")?.focus({ preventScroll: true });
    let ready = false;
    // Begin loading at once, but hide the expired portrait before waiting on IO.
    const prepared = ManorMotion.prepare(shot.src).then(
      () => {
        ready = true;
      },
      () => {},
    );
    const img = q(".shot-current");
    await shotBridge.run({
      isCurrent: () => token === serial && dialog.open && !closing,
      prepare: async () => {
        img.style.visibility = "hidden";
        img.alt = "";
        await prepared;
      },
      commit() {
        img.dataset.framing = "room";
        if (ready) {
          img.src = shot.src;
          img.alt = shot.alt;
          img.style.visibility = "visible";
        } else {
          q("#shot-notice").textContent =
            "房间画面暂未载入，可以直接退回房间。";
          q("#shot-notice").hidden = false;
        }
      },
    });
  }
  window.addEventListener("manor:state", sync);
  window.addEventListener("manor:painted", sync);
  window.addEventListener("manor:committed", () => {
    presenceBridge.cancel();
    close(true);
    seated = false;
    stage.dataset.seated = "false";
    sync();
  });
  window.addEventListener("hashchange", () => {
    presenceBridge.cancel();
    close(true);
  });
  document.addEventListener(
    "click",
    (e) => {
      if (
        e.target.closest("[data-dialog], [data-reception]") &&
        !e.target.closest(".butler-bell")
      )
        close(true);
    },
    true,
  );
  window.addEventListener("pagehide", () => {
    conversations.clear();
    close(true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) performance.cancel();
    else sync();
  });
  document.addEventListener("manor:account", () => {
    conversations.clear();
    close(true);
  });
  window.ManorLiving = {
    encounter,
    close,
    paintPresence,
    cancelPresence: () => presenceBridge.cancel(),
    available: () => !departed && !(active === "count" && expired()),
  };
  // One updated portrait is used by both the in-scene steward and the account form.
  const portrait = q(".butler-portrait img");
  if (portrait) {
    portrait.src = ManorCast.butler.image;
    portrait.alt = "接待管家巴蒂斯坦";
  }
  sync();
})();
