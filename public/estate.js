(() => {
  "use strict";
  const q = (s) => document.querySelector(s),
    el = (tag, cls, text) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text !== undefined) n.textContent = text;
      return n;
    };
  const { rooms, scenes } = Manor,
    ids = Object.keys(scenes),
    journal = new Set();
  let current = "court",
    selected = "court",
    floor = "ground",
    clock = ManorWorld.clock(),
    imageKey = "",
    imageRequest = 0,
    toastTimer,
    renderedCount = "";
  let trail;
  const keyFor = (id) => ManorStaging.key(id, clock.date, clock.minute);
  const initialAt = new URL(location.href).searchParams.get("at");
  if (initialAt) {
    const url = new URL(location.href);
    url.searchParams.delete("at");
    history.replaceState(null, "", url);
  }
  const objects = {
    ledger: { title: "府中近事与来访簿" },
    piano: { title: "窗边的一段琴音" },
    catalogue: { title: "书架的归位小题" },
    globe: { title: "地球仪旁的航路" },
    place: { title: "餐桌上的排席与用餐" },
    games: { title: "沙发前的棋盘与牌具" },
    invitation: {
      title: "随身的请柬",
      kind: "一封请柬",
      text: [
        "请柬上标着过桥、沿河的路线。废墟旁的小路通向侧门，门藏在墙垛后的凹口里。背面写着：",
        "“请由侧门进入。穿过门房，经小侧院的拱口便到前院。若我不在，巴蒂斯坦会接待您。”",
      ],
      links: [
        ["#salon", "先去客厅"],
        ["#garden", "去花园走走"],
      ],
      story: true,
    },
    registry: {
      title: "管家的便笺",
      kind: "穿堂 · 来访指引",
      text: [
        "画廊可以看画，客厅备着茶。伯爵写的东西留在书房案前，还没有写完。",
        "伯爵偶尔会离府。您仍可以在府里走走，或到通信小室看看。",
      ],
      links: [
        ["#gallery", "去画廊"],
        ["#library", "去藏书室坐坐"],
      ],
    },
    conversation: {
      title: "茶桌旁的话题",
      kind: "大客厅 · 预写会谈入口",
      text: [
        "茶桌旁留着空位，乐匣还合着。",
        "伯爵在场时，可以走近聊几句。他不在，您也可以自己坐一会儿。",
      ],
      links: [
        ["#gallery", "去画廊看看"],
        ["letters.html", "去我的通信"],
      ],
      note: "府邸短叙是预写互动，不是即时 AI 聊天。",
    },
    archive: {
      title: "这处尚未开放",
      kind: "画廊",
      text: ["这里还没有向访客开放的作品。您可以先看看墙上的画。"],
      links: [["#gallery", "回到画廊"]],
      note: "来访内容待完成并确认后再开放。",
    },
    harbor: { title: "《归港灯火》" },
    arch: { title: "《石拱之后》" },
    seascape: {
      title: "《远帆》",
    },
    books: {
      title: "《人际关系建模》",
      kind: "书房 · 伯爵的工作案前",
      text: [
        "几页纸压在封面下，笔还搁在一旁。似乎还没写完。",
        "《人际关系建模》还在打磨，暂不开放阅读。",
      ],
      links: [["manuscripts.html", "看看手稿的近况"]],
      note: "手稿暂不开放阅读。",
    },
    tribute: { title: "书里的那张书签" },
    seal: { title: "信封上的封蜡" },
    board: {
      title: "案边的批注",
      kind: "书房 · 魔法白板",
      text: ["纸上的墨迹慢慢显出来，只有一句：“这页还没写完。”"],
      board: false,
      links: [["manuscripts.html", "看看手稿的近况"]],
      note: "手稿内容暂不开放。",
    },
    compass: {
      title: "不指向北的罗盘",
      kind: "书房 · 故事候选",
      text: [
        "针尖指着一页尚未写完的纸。您挪近一点，它仍旧朝着那里。",
        "纸上只有一个日期，末尾的年份被划去了。",
      ],
      story: true,
    },
    letterbox: {
      title: "伯爵关系信箱",
      kind: "通信小室 · 异步回信",
      text: [
        "一件具体的困惑，可以写成一封信。回信会整理已有事实、判断依据、其他解释，以及还不能确定的地方。",
        "来信与回信收在同一只私函匣里，登录后可在自己的账号下查看。",
      ],
      links: [["letters.html", "查看来信安排"]],
      note: "现阶段仅为体验预览，不接收真实隐私材料、不收款。AI 与人工参与、费用、交付时间将在开放前说明。",
    },
    pool: {
      title: "池中的倒影",
      kind: "中央花园 · 故事候选",
      text: [
        "池沿有两道很浅的刻痕，间隔恰好容得下一枚戒指。水中的倒影比天空晚了一瞬才暗下来。",
        "一阵风过后，水面又恢复了平常的样子。",
      ],
      story: true,
    },
    orangery: {
      title: "西侧橘园",
      kind: "中央花园 · 远处的建筑",
      text: [
        "玻璃后面立着几盆很高的树。通往橘园的钥匙还没有交给访客。",
        "门还锁着。可以先沿园路走走。",
      ],
      future: "orangery",
    },
    pavilion: {
      title: "园中小亭",
      kind: "中央花园 · 远处的建筑",
      text: [
        "树后露出小亭的檐角。另一条园径沿东侧绕回来。",
        "通往小亭的门暂时关着。",
      ],
      future: "pavilion",
    },
  };
  const legacyLayouts = {
    ground: {
      orangery: [8, 3, 20, 13],
      garden: [35, 1, 30, 17],
      pavilion: [72, 3, 20, 13],
      westpath: [8, 21, 22, 6],
      terrace: [38, 21, 24, 6],
      eastpath: [72, 21, 20, 6],
      music: [8, 32, 24, 12],
      salon: [37, 32, 26, 13],
      dining: [68, 32, 24, 12],
      gallery: [8, 49, 24, 15],
      foyer: [37, 50, 26, 14],
      ante: [68, 49, 12, 15],
      stair: [84, 49, 10, 15],
      court: [30, 72, 40, 13],
      gate: [40, 90, 20, 8],
    },
    upper: {
      library: [8, 13, 25, 24],
      study: [39, 13, 24, 24],
      workshop: [71, 13, 22, 14],
      letter: [39, 44, 24, 18],
      landing: [70, 43, 12, 22],
      stair: [85, 44, 10, 22],
      privatehall: [71, 72, 23, 7],
      bedroom: [47, 85, 22, 13],
      guest: [20, 85, 21, 13],
      backstair: [80, 85, 14, 13],
    },
    service: {
      coach: [7, 9, 25, 18],
      court: [39, 9, 24, 18],
      yard: [71, 9, 23, 18],
      gatehouse: [7, 37, 25, 15],
      foyer: [39, 37, 24, 15],
      office: [71, 37, 23, 15],
      gate: [7, 64, 25, 14],
      ante: [39, 64, 24, 14],
      pantry: [71, 64, 23, 14],
      sidegate: [71, 1, 23, 6],
      cellar: [71, 86, 23, 12],
      backstair: [40, 86, 23, 12],
      attic: [7, 86, 25, 12],
    },
  };
  const layouts = ManorArchitecture.layouts;
  function toast(message) {
    clearTimeout(toastTimer);
    q("#walk-notice").textContent = message;
    q("#walk-notice").classList.add("visible");
    toastTimer = setTimeout(
      () => q("#walk-notice").classList.remove("visible"),
      5200,
    );
  }
  function remember(id) {
    journal.add(id);
    q("#journal-count").textContent = journal.size;
    document
      .querySelectorAll('[data-object="' + id + '"]')
      .forEach((n) => n.classList.add("viewed"));
  }
  function link(href, label, cls = "") {
    const a = el("a", cls, label);
    a.href = href;
    return a;
  }
  const ownedDialogs = new Set([
    "map-dialog",
    "clock-dialog",
    "count-dialog",
    "journal-dialog",
    "object-dialog",
    "player-dialog",
  ]);
  let panelRequest = 0;
  function closePanel(dialog) {
    if (dialog.id === "map-dialog" && window.ManorAtlas)
      return ManorAtlas.close();
    return ManorMotion.createPanel(dialog).close();
  }
  async function open(name) {
    const d = q("#" + name + "-dialog");
    if (!d) return;
    const ticket = ++panelRequest;
    if (name === "map") {
      selected = current;
      floor = ["library", "study", "letter"].includes(current)
        ? "upper"
        : "ground";
      renderMap();
    }
    if (name === "clock") renderClockDialog();
    if (name === "count") renderCountDialog();
    if (name === "journal") renderJournal();
    await Promise.all(
      [...document.querySelectorAll("dialog[open]")]
        .filter((x) => x !== d && ownedDialogs.has(x.id))
        .map(closePanel),
    );
    if (ticket !== panelRequest) return;
    if (name === "map" && window.ManorAtlas) ManorAtlas.open();
    else ManorMotion.createPanel(d).show();
  }
  function renderObject(id) {
    const objectRoom = Object.entries(scenes).find(([, s]) =>
      s.objects.some((o) => o[0] === id),
    )?.[0];
    if (objectRoom && current !== objectRoom) {
      toast("请先回到" + rooms[objectRoom][0] + "。");
      return;
    }
    if (window.ManorRoomPlay?.has(id)) {
      remember(id);
      ManorRoomPlay.open(id);
      return;
    }
    if (["games", "letterbox"].includes(id)) {
      remember(id);
      window.dispatchEvent(new CustomEvent("manor:prop", { detail: { id } }));
      return;
    }
    if (["pool", "seal"].includes(id) && window.ManorMagic) {
      remember(id);
      ManorMagic.open(id);
      return;
    }
    if (id === "tribute") return;
    if ((id === "books" || id === "board") && current !== "study") return;
    if (
      ["seascape", "harbor", "arch", "books"].includes(id) &&
      window.ManorObjects
    ) {
      remember(id);
      ManorObjects.open(id);
      return;
    }
    if (["musicbox", "place"].includes(id)) {
      window.dispatchEvent(
        new CustomEvent("manor:interact", { detail: { object: id } }),
      );
      return;
    }
    const o = objects[id];
    if (!o) return;
    remember(id);
    if (id === "registry") {
      window.dispatchEvent(new CustomEvent("manor:butler"));
      return;
    }
    const body = q("#object-content");
    body.replaceChildren();
    q("#object-kind").textContent = o.kind;
    const title = el("h2", "", o.title);
    title.id = "object-title";
    body.append(title);
    for (const p of o.text) body.append(el("p", "", p));
    if (Array.isArray(o.board)) {
      const b = el("div", "magic-board");
      for (const [a, v] of o.board) {
        const p = el("p");
        p.append(el("small", "", a), document.createTextNode(v));
        b.append(p);
      }
      body.append(b);
    }
    if (o.links) {
      const box = el("div", "dialog-actions");
      o.links.forEach(([href, label], i) =>
        box.append(link(href, label + " →", i === 0 ? "solid" : "")),
      );
      body.append(box);
    }
    if (o.future) {
      const b = el("button", "text-button", "在全屋地图上查看 →");
      b.onclick = () => {
        open("map");
        selected = o.future;
        floor = "ground";
        renderMap();
      };
      body.append(b);
    }
    if (o.note) body.append(el("p", "fine-print", o.note));
    open("object");
  }
  function renderJournal() {
    const list = q("#journal-items");
    list.replaceChildren();
    if (!journal.size) {
      list.append(el("li", "", "还没有记下物件。可以先看看随身的请柬。"));
      return;
    }
    for (const id of journal) {
      const li = el("li"),
        objectRoom = Object.entries(scenes).find(([, s]) =>
          s.objects.some((o) => o[0] === id),
        )?.[0];
      if (!objectRoom) continue;
      const button = el("a");
      button.href = "#" + objectRoom;
      button.append(
        document.createTextNode(objects[id].title),
        el("small", "", "回" + rooms[objectRoom][0] + "查看 →"),
      );
      li.append(button);
      list.append(li);
    }
  }
  function sceneImage() {
    const key = keyFor(current);
    if (key === imageKey) return;
    imageKey = key;
    window.ManorLiving?.cancelPresence();
    const request = ++imageRequest,
      img = q("#scene-image"),
      pre = new Image();
    img.classList.add("loading");
    pre.onload = async () => {
      if (request !== imageRequest) return;
      const update = {
        room: current,
        fromKey: img.dataset.sceneKey,
        toKey: key,
        isCurrent: () => request === imageRequest,
        commit: () => {
          img.src = pre.src;
          img.dataset.sceneKey = key;
          q(".stage").removeAttribute("data-initializing");
          img.alt =
            rooms[current][0] +
            "，" +
            (Manor.light(clock.minute) === "day"
              ? "日间油画场景"
              : "夜间油画场景");
          img.classList.remove("loading");
          q("#image-notice").hidden = true;
          window.dispatchEvent(new CustomEvent("manor:painted"));
        },
      };
      if (window.ManorLiving) await ManorLiving.paintPresence(update);
      else update.commit();
      if (request === imageRequest)
        window.dispatchEvent(new CustomEvent("manor:painted"));
    };
    pre.onerror = () => {
      if (request !== imageRequest) return;
      img.classList.remove("loading");
      q("#image-notice").hidden = false;
      q("#image-notice").textContent =
        "这幅场景暂未载入。房间导航仍可使用，请刷新重试。";
      imageKey = "";
    };
    pre.src = "assets/" + key + ".webp";
  }
  function renderScene(focus = false) {
    const s = scenes[current];
    document.title = rooms[current][0] + " · 蒙特克里斯条府";
    q(".stage").dataset.room = current;
    q("#location").textContent = rooms[current][1] + " / " + rooms[current][0];
    q("#scene-en").textContent = s.en;
    q("#room-title").textContent = s.title;
    q("#room-line").textContent = s.line;
    q("#room-hint").textContent = s.hint;
    q("#view-label").textContent =
      String(ids.indexOf(current) + 1).padStart(2, "0") +
      " / " +
      String(ids.length).padStart(2, "0");
    const previous = trail?.previous(current);
    q("#room-back").disabled = !previous;
    q("#room-back").textContent = previous
      ? "← 退回" + rooms[previous][0]
      : "已到府门前";
    q("#room-back").setAttribute(
      "aria-label",
      previous ? "退回" + rooms[previous][0] : "已到府门前",
    );
    q("#enter").hidden = !s.primary;
    if (s.primary) {
      q("#enter").href = "#" + s.primary[0];
      q("#enter").replaceChildren(
        document.createTextNode(s.primary[1]),
        el("span", "", "→"),
      );
    }
    const hot = q("#hotspots"),
      doors = q("#door-list"),
      list = q("#object-list");
    hot.replaceChildren();
    doors.replaceChildren();
    list.replaceChildren();
    for (const [to, x, y, label] of s.doors) {
      if (y < 80) {
        const a = link("#" + to, "", "hotspot door");
        a.style.setProperty("--x", x + "%");
        a.style.setProperty("--y", y + "%");
        a.setAttribute("aria-label", label);
        a.append(el("i"), el("span", "", label));
        hot.append(a);
      }
      doors.append(link("#" + to, label));
    }
    for (const [id, x, y, label] of s.objects) {
      const b = el(
        "button",
        "hotspot object" + (journal.has(id) ? " viewed" : ""),
      );
      b.dataset.object = id;
      b.style.setProperty("--x", x + "%");
      b.style.setProperty("--y", y + "%");
      b.setAttribute("aria-label", label);
      b.append(el("i"), el("span", "", id === "games" ? "棋盘与牌具" : label));
      hot.append(b);
      const c = el("button", "", label);
      c.dataset.object = id;
      list.append(c);
    }
    sceneImage();
    positionManuscript();
    renderTime();
    if (focus) q("#room-title").focus({ preventScroll: true });
  }
  function renderTime() {
    clock = ManorWorld.clock();
    const st = Manor.state(clock.date, clock.minute),
      text = rooms[st.room][0] + " · " + st.text;
    q("#clock-label").textContent =
      (ManorWorld.snapshot().preview ? "预览 · " : "") +
      Manor.time(clock.minute) +
      " · " +
      (Manor.light(clock.minute) === "day" ? "日间" : "夜访");
    if (st.unknown) q("#clock-label").textContent = "◷ 等待校时";
    q("#count-status").textContent = st.unknown
      ? "伯爵行踪待确认 · 点击重试校时"
      : "伯爵在" + text;
    q("#count-presence").hidden =
      st.unknown || st.moving || st.room !== current;
    q("#presence-verb").textContent = st.text;
    sceneImage();
    if (q("#clock-dialog").open) renderClockDialog();
    if (q("#count-dialog").open) renderCountDialog();
    const signature = [
      st.room,
      st.moving,
      st.text,
      st.unknown,
      clock.date,
      Manor.light(clock.minute),
    ].join(":");
    if (q("#map-dialog").open && signature !== renderedCount) renderMap();
    renderedCount = signature;
    window.dispatchEvent(new CustomEvent("manor:state"));
  }
  function renderClockDialog() {
    const st = Manor.state(clock.date, clock.minute);
    if (st.unknown) {
      q("#clock-status").textContent = "尚未校时，人物互动暂停。房间仍可参观。";
      return;
    }
    q("#clock-status").textContent =
      (ManorWorld.snapshot().preview
        ? "正在预览 " + Manor.time(clock.minute)
        : ManorWorld.snapshot().ready
          ? "府邸当前时间"
          : "尚未校时，人物互动暂停") +
      (st.unknown ? " · " : " · 伯爵在") +
      rooms[st.room][0] +
      "，" +
      st.text +
      "。";
  }
  function renderCountDialog() {
    const st = Manor.state(clock.date, clock.minute);
    if (st.unknown) {
      q("#count-where").textContent = "行踪待确认";
      q("#count-activity").textContent = "暂未取得府邸时钟。";
      q("#count-note").textContent =
        "您仍可以参观房间、看画。校时恢复后，伯爵的行踪会重新显示。";
      const retry = el("button", "solid", "重新校时");
      retry.onclick = () => ManorWorld.sync();
      q("#count-actions").replaceChildren(retry);
      return;
    }
    q("#count-where").textContent = rooms[st.room][0];
    q("#count-activity").textContent =
      Manor.time(clock.minute) + " · " + st.text;
    const here = st.room === current;
    q("#count-note").textContent =
      here && current === "garden"
        ? "伯爵停下脚步，把小径让出半边。您可以先在园里走走，也可以问起他最近整理的手稿。"
        : here
          ? "伯爵就在这间房里。您可以走近问候，也可以继续看看房间里的物件。"
          : st.room === "outside"
            ? "伯爵出门参加沙龙了。画廊、花园和通信小室仍向您开放。"
            : st.room === "bedroom"
              ? "私人套间已经熄灯。管家还在，您可以在客厅坐坐或到花园走走。"
              : "您可以去找他，也可以先在这里翻看物件。";
    const actions = q("#count-actions");
    actions.replaceChildren();
    if (scenes[st.room] && !here)
      actions.append(
        link("#" + st.room, "前往" + rooms[st.room][0] + " →", "solid"),
      );
    else if (!scenes[st.room]) {
      const b = el("button", "", "查看全屋地图");
      b.dataset.dialog = "map";
      actions.append(b);
    }
    actions.append(link("#study", "去书房 →"));
  }
  function renderMap() {
    if (window.ManorAtlas) {
      ManorAtlas.render({
        current,
        selected,
        floor,
        count: Manor.state(clock.date, clock.minute),
        onSelect(id) {
          selected = id;
          if (!layouts[floor][id])
            floor = Object.keys(layouts).find((f) => layouts[f][id]) || floor;
          renderMap();
        },
      });
      return;
    }
    let picker = q("#map-room-select");
    if (!picker) {
      const label = el("label", "map-mobile-picker", "选择房间");
      picker = el("select");
      picker.id = "map-room-select";
      label.append(picker);
      q("#map-panel").before(label);
      picker.onchange = () => {
        selected = picker.value;
        renderMap();
      };
    }
    picker.replaceChildren();
    for (const id of Object.keys(layouts[floor])) {
      const option = el("option", "", rooms[id][0]);
      option.value = id;
      option.selected = id === selected;
      picker.append(option);
    }
    const plan = q("#floorplan");
    plan.replaceChildren();
    document.querySelectorAll('[role="tab"][data-floor]').forEach((b) => {
      const on = b.dataset.floor === floor;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    q("#map-panel").setAttribute("aria-labelledby", floor + "-tab");
    const layout = layouts[floor],
      st = Manor.state(clock.date, clock.minute),
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const route = Manor.walk(current, selected);
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    for (const [a, b] of Manor.edges) {
      if (!layout[a] || !layout[b]) continue;
      const [x, y, w, h] = layout[a],
        [xx, yy, ww, hh] = layout[b],
        line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      Object.entries({
        x1: x + w / 2,
        y1: y + h / 2,
        x2: xx + ww / 2,
        y2: yy + hh / 2,
      }).forEach(([k, v]) => line.setAttribute(k, v));
      if (
        route.some(
          (n, i) =>
            (n === a && route[i + 1] === b) || (n === b && route[i + 1] === a),
        )
      )
        line.classList.add("route-line");
      svg.append(line);
    }
    plan.append(svg);
    for (const [id, [x, y, w, h]] of Object.entries(layout)) {
      const type = scenes[id]
          ? "open"
          : Manor.transit.has(id)
            ? "transit"
            : "future",
        b = el(
          "button",
          "plan-room " +
            type +
            (current === id ? " current" : "") +
            (selected === id ? " selected" : "") +
            (st.room === id ? " has-count" : ""),
        );
      for (const [k, v] of Object.entries({ x, y, w, h }))
        b.style.setProperty("--" + k, v + "%");
      b.append(
        document.createTextNode(rooms[id][0]),
        el(
          "small",
          "",
          current === id
            ? "您在这里"
            : st.room === id
              ? "伯爵在此"
              : type === "future"
                ? "暂未开放"
                : type === "transit"
                  ? "经过区域"
                  : "可到访",
        ),
      );
      b.setAttribute(
        "aria-label",
        rooms[id][0] +
          "，" +
          (st.room === id ? "伯爵在此，" : "") +
          (type === "future"
            ? "暂未开放"
            : type === "transit"
              ? "经过区域"
              : "可到访"),
      );
      b.setAttribute("aria-pressed", String(selected === id));
      b.onclick = () => {
        selected = id;
        renderMap();
      };
      plan.append(b);
    }
    q("#map-count").textContent = "伯爵在" + rooms[st.room][0];
    q("#map-you").textContent =
      "您在" +
      rooms[current][1] +
      " · " +
      rooms[current][0] +
      "。选择房间，金线标出路线。";
    const detail = q("#map-detail");
    detail.replaceChildren(el("h3", "", rooms[selected][0]));
    const adjacent = Manor.edges.flatMap(([a, b]) =>
      a === selected ? [b] : b === selected ? [a] : [],
    );
    detail.append(
      el(
        "p",
        "",
        "相连：" + adjacent.map((id) => rooms[id][0]).join("、") + "。",
      ),
    );
    if (scenes[selected]) {
      if (selected !== current)
        detail.append(
          el(
            "p",
            "map-route-text",
            "步行路线：" + route.map((id) => rooms[id][0]).join(" → "),
          ),
        );
      const a = link(
        "#" + selected,
        current === selected
          ? "继续探索这里 →"
          : "地图直达 · " + rooms[selected][0] + " →",
        "solid",
      );
      a.dataset.mapJump = "true";
      detail.append(a);
    } else {
      detail.append(
        el(
          "p",
          "",
          Manor.transit.has(selected)
            ? "这一版经过此处时显示通行路线，尚无独立场景。"
            : "此区域已计入全屋结构，暂不开放探索。",
        ),
      );
    }
  }
  let mapJourney = 0;
  document.addEventListener("click", (e) => {
    const close = e.target.closest("[data-close]");
    if (close) {
      const dialog = close.closest("dialog");
      if (dialog && ownedDialogs.has(dialog.id)) closePanel(dialog);
      return;
    }
    const trigger = e.target.closest("[data-dialog]");
    if (trigger) {
      open(trigger.dataset.dialog);
      return;
    }
    const object = e.target.closest("[data-object]");
    if (object) {
      renderObject(object.dataset.object);
      return;
    }
    const a = e.target.closest('a[href^="#"]');
    if (a) {
      const to = a.getAttribute("href").slice(1);
      if (!scenes[to]) return;
      if (a.closest("#map-dialog") && window.ManorAtlas) {
        e.preventDefault();
        const journey = ++mapJourney;
        ManorAtlas.close().then((closed) => {
          if (!closed || journey !== mapJourney) return;
          if (to !== current) {
            toast(
              "途经：" +
                Manor.walk(current, to)
                  .map((id) => rooms[id][0])
                  .join(" → "),
            );
            location.hash = to;
          } else q("#room-title").focus({ preventScroll: true });
        });
        return;
      }
      const parent = a.closest("dialog");
      if (parent && ownedDialogs.has(parent.id)) {
        e.preventDefault();
        closePanel(parent).then((closed) => {
          if (closed) location.hash = to;
        });
        return;
      }
      if (to !== current) {
        const route = Manor.walk(current, to);
        toast("途经：" + route.map((id) => rooms[id][0]).join(" → "));
      } else q("#room-title").focus({ preventScroll: true });
    }
  });
  document.addEventListener("click", (e) => {
    const d = e.target;
    if (d.tagName !== "DIALOG" || !ownedDialogs.has(d.id)) return;
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closePanel(d);
  });
  document.addEventListener(
    "cancel",
    (e) => {
      if (ownedDialogs.has(e.target.id) && e.target.id !== "map-dialog") {
        e.preventDefault();
        closePanel(e.target);
      }
    },
    true,
  );
  document.querySelectorAll('[role="tab"][data-floor]').forEach((b, i, all) => {
    b.onclick = () => {
      floor = b.dataset.floor;
      selected = Object.keys(layouts[floor]).includes(current)
        ? current
        : Object.keys(layouts[floor])[0];
      renderMap();
    };
    b.onkeydown = (e) => {
      let n = i;
      if (e.key === "ArrowRight") n = (i + 1) % all.length;
      else if (e.key === "ArrowLeft") n = (i + all.length - 1) % all.length;
      else if (e.key === "Home") n = 0;
      else if (e.key === "End") n = all.length - 1;
      else return;
      e.preventDefault();
      all[n].click();
      all[n].focus();
    };
  });
  q("#markers").onclick = () => {
    const hide = q("#hotspots").classList.toggle("hide-labels");
    q("#markers").textContent = hide ? "显示标记" : "隐藏标记";
    q("#markers").setAttribute("aria-pressed", String(!hide));
    q("#hotspots").inert = hide;
    q(".stage").classList.toggle("no-markers", hide);
  };
  q("#room-back").onclick = () => {
    const to = trail.previous(current);
    if (to) location.hash = to;
  };
  q("#map-home").onclick = () => open("map");
  q("#live-clock").onclick = () => {
    ManorWorld.resumeLive();
    closePanel(q("#clock-dialog"));
  };
  function previewTime(minute) {
    ManorWorld.setPreview(minute);
    q("#preview-clock-time").value = Manor.time(minute);
    closePanel(q("#clock-dialog"));
  }
  document.querySelectorAll("[data-preview-minute]").forEach((button) => {
    button.onclick = () => previewTime(Number(button.dataset.previewMinute));
  });
  q("#preview-clock-form").onsubmit = (event) => {
    event.preventDefault();
    const value = q("#preview-clock-time").value;
    if (!/^\d{2}:\d{2}$/.test(value)) return;
    const [hour, minute] = value.split(":").map(Number);
    if (hour < 24 && minute < 60) previewTime(hour * 60 + minute);
  };
  q("#clear-journal").onclick = () => {
    journal.clear();
    q("#journal-count").textContent = "0";
    document
      .querySelectorAll(".viewed")
      .forEach((n) => n.classList.remove("viewed"));
    renderJournal();
  };
  const transition = ManorMotion.create({
    stage: q(".stage"),
    srcFor: (id) => "assets/" + keyFor(id) + ".webp",
    labelFor: (id) => rooms[id][0],
    commit(id, src, focus) {
      trail.commit(id);
      current = id;
      imageKey = src.slice(src.indexOf("assets/") + 7).replace(".webp", "");
      imageRequest++;
      q("#scene-image").src = src;
      q("#scene-image").dataset.sceneKey = imageKey;
      q(".stage").removeAttribute("data-initializing");
      q("#scene-image").alt =
        rooms[id][0] +
        "，" +
        (/-day(?:[.-])/.test(src) ? "日间" : "夜间") +
        "油画场景";
      q("#scene-image").classList.remove("loading");
      q("#image-notice").hidden = true;
      renderScene(false);
      window.dispatchEvent(
        new CustomEvent("manor:committed", { detail: { room: current } }),
      );
      document.dispatchEvent(
        new CustomEvent("manor:scene", { detail: { room: current } }),
      );
      if (focus)
        setTimeout(() => q("#room-title").focus({ preventScroll: true }), 450);
    },
    failed() {
      history.replaceState(null, "", "#" + current);
      toast("下一幅场景未能载入，仍留在这里。您可以重试或另选房间。");
    },
  });
  function route(focus) {
    const id = location.hash.slice(1),
      to = scenes[id] ? id : "court";
    if (focus && (to !== current || transition.busy)) {
      transition.go(to, true);
      return;
    }
    current = to;
    trail ||= Manor.createTrail(current);
    renderScene(focus);
    document.dispatchEvent(
      new CustomEvent("manor:scene", { detail: { room: current } }),
    );
  }
  function positionManuscript() {
    for (const target of document.querySelectorAll("#hotspots [data-object]")) {
      const point =
        typeof ManorSpatial === "object"
          ? ManorSpatial.anchor(
              target.dataset.object,
              q("#scene-image").dataset.sceneKey,
            )
          : null;
      target.hidden = !point;
      if (point) {
        target.style.setProperty("--x", point[0] + "%");
        target.style.setProperty("--y", point[1] + "%");
      }
    }
  }
  window.addEventListener("manor:painted", positionManuscript);
  function alignHotspots() {
    const frame = q(".scene-frame"),
      box = frame.getBoundingClientRect(),
      mobile = matchMedia("(max-width:700px)").matches,
      scale = Math.min(box.width / 1672, box.height / 941),
      w = 1672 * scale,
      h = 941 * scale,
      hot = q("#hotspots");
    hot.style.width = w + "px";
    hot.style.height = h + "px";
    hot.style.left = (box.width - w) / 2 + "px";
    hot.style.top = (box.height - h) / 2 + "px";
  }
  new ResizeObserver(alignHotspots).observe(q(".scene-frame"));
  window.addEventListener("hashchange", () => {
    route(true);
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderTime();
  });
  window.addEventListener("pageshow", () => renderTime());
  window.addEventListener("manor:world", () => renderTime());
  window.ManorView = {
    snapshot: () => ({
      room: current,
      world: ManorWorld.snapshot(),
      clock: { ...clock },
      count: Manor.state(clock.date, clock.minute),
      meal: Manor.meal(clock.date, clock.minute),
      imageKey: keyFor(current),
    }),
    open,
    navigate(to) {
      if (scenes[to]) location.hash = to;
    },
  };
  route(false);
  alignHotspots();
  setInterval(renderTime, 15000);
})();
