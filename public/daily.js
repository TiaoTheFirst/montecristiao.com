(() => {
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const button = (label, fn) => {
    const b = el("button", "daily-choice", label);
    b.type = "button";
    b.onclick = fn;
    return b;
  };
  const trigger = button("在这里坐坐", () => open());
  trigger.id = "daily-trigger";
  document.querySelector(".room-dock").append(trigger);
  const dialog = el("dialog", "daily-dialog");
  dialog.id = "daily-dialog";
  dialog.setAttribute("aria-labelledby", "daily-title");
  const top = el("div", "daily-top"),
    place = el("small"),
    back = button("← 回到房间", () => panel.close());
  top.append(place, back);
  const body = el("div", "daily-body"),
    result = el("p", "daily-result");
  result.setAttribute("aria-live", "polite");
  dialog.append(top, body, result);
  document.body.append(dialog);
  const panel = ManorMotion.createPanel(dialog);
  const visit = ManorVisit.create();
  window.ManorVisitSession = visit;
  const veil = el("div", "quiet-veil");
  veil.setAttribute("aria-hidden", "true");
  document.body.append(veil);
  const quietFade = ManorContinuity.createFade(veil, ManorMotion);
  const exit = button("← 继续探索", () => quiet(false));
  exit.id = "quiet-exit";
  exit.hidden = true;
  const mute = button(
    ManorMusic.playing ? "♫ 静音" : "♫ 开启音乐",
    async () => {
      try {
        await ManorMusic.toggle();
      } catch {
        mute.textContent = "♫ 重试音乐";
      }
    },
  );
  mute.id = "quiet-mute";
  mute.hidden = true;
  document.body.append(exit, mute);
  let origin,
    opener,
    quietSequence = 0,
    actionSequence = 0;
  async function quiet(on, immediate = false) {
    const ticket = ++quietSequence;
    quietFade.cancel();
    if (on && dialog.open && !(await panel.close())) return;
    if (ticket !== quietSequence) return;
    if (!immediate) await quietFade.run(0, 1, 180);
    if (ticket !== quietSequence) return;
    veil.style.opacity = "1";
    document.body.classList.toggle("quiet-manor", on);
    exit.hidden = !on;
    mute.hidden = !on;
    document.querySelector("#hotspots").inert =
      on || document.querySelector(".stage").classList.contains("no-markers");
    if (on) exit.focus();
    else trigger.focus({ preventScroll: true });
    if (!immediate) await quietFade.run(1, 0, 320);
    if (ticket === quietSequence) veil.style.opacity = "0";
  }
  window.addEventListener("manor:music", () => {
    mute.textContent = ManorMusic.playing ? "♫ 静音" : "♫ 开启音乐";
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("quiet-manor")) {
      e.preventDefault();
      quiet(false);
    }
  });
  dialog.addEventListener("close", () => {
    if (dialog.open) return;
    window.ManorMusic?.duck("daily", false);
    if (!document.querySelector("dialog[open]"))
      opener?.focus?.({ preventScroll: true });
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    panel.close();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      panel.close();
  });
  function sync() {
    const state = ManorView.snapshot(),
      item = ManorDaily.moment(state);
    const scene = visit.view(state.room);
    trigger.textContent = item
      ? "此刻 · " + (scene?.continued ? scene.title : item.title)
      : "在这里坐坐";
    // Keep a read-open paragraph stable; each action checks current presence again.
  }
  function open() {
    ++actionSequence;
    origin = ManorView.snapshot();
    const item = ManorDaily.moment(origin);
    if (!item) return;
    if (!dialog.open) opener = document.activeElement;
    place.textContent =
      Manor.rooms[origin.room][0] + " · " + Manor.time(origin.clock.minute);
    draw();
    panel.show();
    window.ManorMusic?.duck("daily", true);
  }
  function prop(node) {
    const p = el("div", "daily-prop");
    p.dataset.prop = node.prop;
    p.dataset.step = node.id;
    p.setAttribute("aria-hidden", "true");
    if (node.prop === "frame") {
      const img = el("img");
      img.src = "assets/painted/seascape-distant-sail-v1.webp";
      img.alt = "";
      p.append(img);
    } else if (node.prop === "bookmark") {
      p.append(
        el(
          "span",
          "",
          node.id === "question"
            ? "待想"
            : node.id === "place"
              ? "读到这里"
              : "夹页",
        ),
      );
    } else if (node.prop === "paper" || node.prop === "envelope") {
      p.append(el("i"), el("i"), el("i"));
    } else {
      const paths = {
        gate: '<path d="M18 64V23h44v41M12 64h56M25 64V30h30v34M40 30v34M21 18h38M14 23h52"/>',
        plan: '<path d="M12 16h56v48H12zM12 40h56M38 16v48M38 51h13v13M18 23h12v10H18z"/><path class="prop-route" d="M25 62V49h27V28"/>',
        cup: '<path d="M18 30h39v8c0 18-39 18-39 0zM57 32h5c13 0 6 14-7 14M11 56h54M28 22v-7M42 22v-7"/>',
        music:
          '<path d="M13 38h54v23H13zM13 38l8-20h54l-8 20M21 18v20M48 41v12c-11-5-11 10 0 6M48 41l9 3"/>',
        table:
          '<ellipse cx="40" cy="41" rx="21" ry="15"/><ellipse cx="40" cy="41" rx="15" ry="10"/><path d="M10 26v31M7 26v9h6v-9M69 26v31M67 26v14h3"/>',
        path: '<ellipse cx="39" cy="40" rx="16" ry="10"/><path d="M13 22h54v38H13zM8 40h15M55 40h18"/><path class="prop-route" d="M39 64H13V19h54v45H39"/>',
      };
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 80 80");
      svg.innerHTML = paths[node.prop] || "";
      p.append(svg);
    }
    return p;
  }
  function draw(focus = false) {
    const node = visit.view(origin.room),
      item = ManorDaily.moment(ManorView.snapshot());
    if (!node || !item) return;
    const title = el("h2", "", node.title);
    title.id = "daily-title";
    title.tabIndex = -1;
    const heading = el("div", "daily-heading");
    heading.append(title, prop(node));
    body.replaceChildren(
      el("p", "daily-kicker", "UN MOMENT À SOI"),
      heading,
      el("p", "daily-line", node.text),
    );
    if (node.echo) body.append(el("p", "daily-echo", node.echo));
    const choices = el("div", "daily-choices");
    for (const c of node.choices)
      choices.append(button(c.label + " →", () => step(c.next)));
    if (item.present)
      choices.append(button("伯爵也在这里，过去打个招呼", () => act("count")));
    body.append(choices);
    const more = el("details", "daily-more");
    more.append(el("summary", "", "房间里的其他事"));
    const links = el("div", "daily-choices");
    for (const [label, id] of item.actions)
      links.append(button(label, () => act(id)));
    more.append(links);
    more.addEventListener("toggle", () => {
      if (more.open) ManorMotion.reveal(links);
    });
    body.append(more);
    const foot = el("div", "daily-foot");
    foot.append(
      el("small", "", "只续接本页这次来访；刷新后清空，不写入账号。"),
    );
    if (node.continued)
      foot.append(
        button("从头看看", () => {
          visit.restart(origin.room);
          draw(true);
          sync();
        }),
      );
    body.append(foot);
    result.textContent = "";
    if (dialog.open) ManorMotion.reveal(body);
    if (focus) title.focus({ preventScroll: true });
  }
  function step(next) {
    if (ManorView.snapshot().room !== origin.room) return panel.close();
    const response = visit.choose(origin.room, next);
    if (!response) return;
    if (response.action) return act(response.action);
    draw(true);
    sync();
  }
  async function after(fn) {
    const ticket = ++actionSequence;
    if ((await panel.close()) && ticket === actionSequence) fn();
  }
  function act(id) {
    const state = ManorView.snapshot();
    if (state.room !== origin.room) {
      panel.close();
      return;
    }
    if (id === "count") {
      if (
        state.count.unknown ||
        state.count.moving ||
        state.count.room !== state.room
      ) {
        result.textContent = "伯爵已经动身。您可以请管家问问他的去向。";
        return;
      }
      return after(() => ManorLiving.encounter("count"));
    }
    if (id === "table")
      return after(() =>
        window.dispatchEvent(
          new CustomEvent("manor:interact", { detail: { object: "place" } }),
        ),
      );
    if (id === "butler")
      return after(() => window.dispatchEvent(new CustomEvent("manor:butler")));
    if (id === "map") return after(() => ManorView.open("map"));
    if (id === "preferences") return after(() => Reception.open());
    if (id === "memory") return after(() => ManorMemory.open());
    if (id === "quiet") return quiet(true);
    if (id === "music")
      return after(() =>
        window.dispatchEvent(
          new CustomEvent("manor:interact", { detail: { object: "musicbox" } }),
        ),
      );
    if (id === "art" || id === "read")
      return after(() =>
        ManorObjects.open(id === "art" ? "seascape" : "books"),
      );
    if (id === "conversation")
      return after(() => {
        ManorView.navigate("salon");
      });
    if (id.startsWith("go-"))
      return after(() => ManorView.navigate(id.slice(3)));
    if (id.startsWith("note-"))
      return after(() =>
        ManorMemory.open({
          title: {
            "note-art": "看《远帆》",
            "note-reading": "在藏书室想到的问题",
            "note-study": "还没写完的话",
            "note-letter": "暂不寄出的札记",
          }[id],
          room: state.room,
        }),
      );
    if (id === "board" || id === "pool")
      return after(() =>
        document.querySelector('[data-object="' + id + '"]')?.click(),
      );
    if (id === "walk") {
      visit.restart("garden");
      draw(true);
    }
  }
  window.addEventListener("manor:state", sync);
  window.addEventListener("manor:committed", () => {
    ++actionSequence;
    ++quietSequence;
    quietFade.cancel();
    veil.style.opacity = "0";
    panel.close({ immediate: true });
    if (document.body.classList.contains("quiet-manor")) quiet(false, true);
    sync();
  });
  sync();
})();
