(() => {
  "use strict";
  const S = ManorArrivalState,
    story = ManorArrivalStory,
    $ = (s) => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const target = S.destination(params.get("to"));
  let stage = "street",
    epoch = 0,
    busy = false,
    leaving = false,
    touched = false,
    light = "",
    uid = null;
  const trail = [],
    main = $(".arrival"),
    art = $("#arrival-image"),
    actions = $("#arrival-actions");
  const clockLight = () => Manor.light(ManorWorld.clock().minute);
  const sound = (() => {
    let ctx,
      master,
      noise,
      filter,
      enabled = false;
    async function toggle() {
      if (enabled) {
        stop();
        return false;
      }
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return false;
        if (!ctx) {
          ctx = new Audio();
          master = ctx.createGain();
          master.gain.value = 0.055;
          master.connect(ctx.destination);
          const buffer = ctx.createBuffer(
              1,
              ctx.sampleRate * 3,
              ctx.sampleRate,
            ),
            data = buffer.getChannelData(0);
          let previous = 0;
          for (let i = 0; i < data.length; i++) {
            previous = 0.97 * previous + 0.03 * (Math.random() * 2 - 1);
            data[i] = previous * 4;
          }
          noise = ctx.createBufferSource();
          noise.buffer = buffer;
          noise.loop = true;
          filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 850;
          noise.connect(filter);
          filter.connect(master);
          noise.start();
        }
        await ctx.resume();
        enabled = ctx.state === "running";
      } catch {
        enabled = false;
      }
      return enabled;
    }
    function stop() {
      enabled = false;
      ctx?.suspend().catch(() => {});
    }
    function cue(kind) {
      if (!kind || !enabled || document.hidden) return;
      const count = kind === "steps" ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const osc = ctx.createOscillator(),
          gain = ctx.createGain(),
          t = ctx.currentTime + i * 0.29;
        osc.type = kind === "latch" ? "triangle" : "sine";
        osc.frequency.setValueAtTime(
          kind === "knock" ? 145 : kind === "latch" ? 590 : 85,
          t,
        );
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        gain.gain.setValueAtTime(0.8, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(master);
        osc.start(t);
        osc.stop(t + 0.17);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
      }
    }
    function room(id) {
      if (filter && ctx)
        filter.frequency.setTargetAtTime(
          ["reveal", "threshold"].includes(id) ? 2200 : 850,
          ctx.currentTime,
          0.8,
        );
    }
    return { toggle, stop, cue, room };
  })();
  function soundOff() {
    sound.stop();
    $("#arrival-sound").textContent = "声音：关";
    $("#arrival-sound").setAttribute("aria-pressed", "false");
  }
  function button(label, handler) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.onclick = handler;
    return b;
  }
  function setBusy(value) {
    busy = value;
    main.setAttribute("aria-busy", String(value));
    actions.querySelectorAll("button").forEach((b) => (b.disabled = value));
    $("#arrival-back").disabled = value;
  }
  function remember() {
    if (!S.write("active", stage))
      $("#arrival-note").textContent =
        "浏览器未允许保存进度；离开后可能再次出现。";
  }
  function thresholdCopy() {
    const st = ManorWorld.snapshot().count;
    if (st.room === "bedroom")
      return "伯爵已经休息了。您可以先在前院看看，图册里标着开放的去处。";
    return "主楼入口就在前面。您可以先在前院看看，需要找路时，打开府邸图册就好。";
  }
  function copy(id) {
    const data = story.steps[id];
    main.dataset.stage = id;
    main.dataset.light = light;
    main.dataset.reveal = String(!!data.reveal);
    $("#arrival-place").textContent = data.place;
    $("#arrival-title").textContent = data.title;
    $("#arrival-text").textContent =
      id === "threshold" ? thresholdCopy() : data.text;
    actions.replaceChildren(
      ...data.choices.map((c) =>
        button(c.label, () => {
          touched = true;
          if (c.to === "finish") finish("done");
          else if (!busy) {
            sound.cue(c.sound);
            show(c.to, true);
          }
        }),
      ),
    );
    $("#arrival-back").hidden = !trail.length;
  }
  async function show(id, push = false, focus = true) {
    if (leaving || !story.steps[id]) return;
    const ticket = ++epoch,
      nextLight = clockLight(),
      data = story.steps[id],
      src = story.src(data.art, nextLight);
    setBusy(true);
    $("#arrival-error").textContent = "";
    try {
      await ManorMotion.prepare(src);
      if (ticket !== epoch || leaving) return;
      const changed = art.getAttribute("src") !== src;
      if (art.getAttribute("src") && changed)
        await ManorMotion.animate(art, [{ opacity: 1 }, { opacity: 0 }], 200);
      if (ticket !== epoch || leaving) return;
      if (push) trail.push(stage);
      stage = id;
      light = nextLight;
      art.src = src;
      art.alt = data.place + "：" + data.title;
      copy(id);
      setBusy(true);
      remember();
      sound.room(id);
      if (focus) $("#arrival-title").focus({ preventScroll: true });
      if (changed)
        await ManorMotion.animate(
          art,
          [{ opacity: 0 }, { opacity: 1 }],
          data.reveal ? 650 : 350,
        );
      if (ticket !== epoch || leaving) return;
      setBusy(false);
      for (const c of data.choices)
        if (story.steps[c.to])
          ManorMotion.prepare(story.src(story.steps[c.to].art, light)).catch(
            () => {},
          );
    } catch {
      if (ticket !== epoch || leaving) return;
      $("#arrival-error").textContent =
        "下一幅画面暂时没有载入。您可以重试，或直接入府。";
      actions.replaceChildren(button("重新载入这一步", () => show(id, push)));
      setBusy(false);
    }
  }
  async function accountRequest(path, options = {}) {
    const r = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
      ...options,
    });
    if (!r.ok) throw new Error("ACCOUNT_UNAVAILABLE");
    return r.json();
  }
  async function accountSync() {
    try {
      const session = await accountRequest("/api/auth/get-session");
      uid = session?.user?.id || null;
      if (!uid) return;
      const [pref, arrival] = await Promise.all([
        accountRequest("/api/me/preferences"),
        accountRequest("/api/me/arrival", {
          headers: { "X-Manor-Account": uid },
        }),
      ]);
      document.documentElement.dataset.motion = pref.motion;
      if (S.terminal(arrival) && !leaving) {
        S.write(arrival.status);
        // Do not interrupt an action the person has already begun.
        if (!touched) {
          leaving = true;
          ++epoch;
          soundOff();
          location.replace(target);
        }
      }
    } catch {
      /* Guest/offline entry remains available. */
    }
  }
  function finish(status) {
    if (leaving) return;
    leaving = true;
    ++epoch;
    soundOff();
    const stored = S.write(status, "threshold");
    if (uid)
      fetch("/api/me/arrival", {
        method: "PUT",
        credentials: "same-origin",
        keepalive: true,
        headers: { "Content-Type": "application/json", "X-Manor-Account": uid },
        body: JSON.stringify({ status }),
      }).catch(() => {});
    let to = target;
    if (status === "done" && (to === "/" || to === "/index.html"))
      to = "/#court";
    if (!stored) {
      // Explicit one-navigation escape hatch avoids loops when all storage is blocked.
      const url = new URL(to, location.origin);
      url.searchParams.set("arrival", "skip");
      to = url.pathname + url.search + url.hash;
    }
    location.replace(to);
  }
  $("#arrival-skip").onclick = () => {
    touched = true;
    finish("skipped");
  };
  $(".arrival-name").onclick = (e) => {
    e.preventDefault();
    finish("skipped");
  };
  $("#arrival-back").onclick = () => {
    if (!busy && trail.length) {
      touched = true;
      show(trail.pop());
    }
  };
  $("#arrival-sound").onclick = async () => {
    touched = true;
    const on = await sound.toggle();
    if (leaving || document.hidden) {
      soundOff();
      return;
    }
    $("#arrival-sound").textContent = on ? "声音：开" : "声音：关";
    $("#arrival-sound").setAttribute("aria-pressed", String(on));
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) soundOff();
    else if (!busy && !leaving && light !== clockLight())
      show(stage, false, false);
  });
  window.addEventListener("pagehide", () => {
    ++epoch;
    soundOff();
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      leaving = false;
      if (S.terminal(S.read())) location.replace(target);
      else show(stage, false, false);
    }
  });
  window.addEventListener("storage", (e) => {
    if (e.key === S.key && S.terminal(S.read())) {
      leaving = true;
      ++epoch;
      soundOff();
      location.replace(target);
    }
  });
  window.addEventListener("manor:world", () => {
    if (!busy && !leaving && light && light !== clockLight())
      show(stage, false, false);
    else if (stage === "threshold" && !busy)
      $("#arrival-text").textContent = thresholdCopy();
  });
  const saved = S.read();
  if (S.terminal(saved)) {
    location.replace(target);
    return;
  }
  if (saved?.status === "active" && saved.stage !== "street") {
    stage = saved.stage;
    light = clockLight();
    ManorMotion.prepare(story.src(story.steps[stage].art, light))
      .then(() => {
        if (!touched && !leaving)
          art.src = story.src(story.steps[stage].art, light);
      })
      .catch(() => {});
    $("#arrival-title").textContent = "接着上次的路。";
    $("#arrival-text").textContent =
      "上次停在“" + story.steps[stage].place + "”。";
    actions.replaceChildren(
      button("从这里继续", () => {
        touched = true;
        show(stage);
      }),
      button("从河街重新走起", () => {
        touched = true;
        show("street");
      }),
    );
  } else show("street", false, false);
  accountSync();
})();
