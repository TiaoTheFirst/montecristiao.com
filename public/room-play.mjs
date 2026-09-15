import {
  activities,
  arrivalOrder,
  bookLabels,
  bookRules,
  orderErrors,
  guests,
  seatRules,
  seatErrors,
  ports,
  seaEdges,
  voyage,
  melodies,
} from "./room-play-data.mjs";
import { recognition, rewardKey } from "./solitaire-rewards.mjs";
import { renderEstateNews } from "./estate-news.mjs";
let discussedKeepsake = false;
function keepsakePage() {
  try {
    return recognition(
      JSON.parse(localStorage.getItem(rewardKey)),
      ManorWorld.snapshot(),
      ManorView.snapshot().room,
    );
  } catch {
    return null;
  }
}
window.ManorGameKeepsakes = {
  decorate(page) {
    if (page.unavailable || discussedKeepsake || !keepsakePage()) return page;
    return {
      ...page,
      choices: [
        {
          label: "我解开了一局独粒棋，带来了棋谱卡。",
          action: "keepsake-show",
        },
        ...page.choices.filter((c) => !c.action.startsWith("keepsake-")),
      ],
    };
  },
  respond(action) {
    const page = keepsakePage();
    if (!page) return null;
    if (action === "keepsake-show") {
      discussedKeepsake = true;
      return page;
    }
    if (
      !discussedKeepsake ||
      !["keepsake-backward", "keepsake-return"].includes(action)
    )
      return null;
    return {
      speaker: "伯爵",
      direction: "他拉近棋匣。",
      text:
        action === "keepsake-backward"
          ? "最后那一跳，得有人留在那里接应。您把那枚棋子留下来了。"
          : "折回来也好。比起一路走下去，我更想看您在哪儿决定退回。",
      choices: [{ label: "我去棋桌再试一盘。", action: "close" }],
    };
  },
};
const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
const button = (text, fn, cls) => {
  const b = el("button", text, cls);
  b.type = "button";
  b.onclick = fn;
  return b;
};
const dialog = el("dialog", undefined, "room-play");
dialog.id = "room-play";
dialog.setAttribute("aria-labelledby", "room-play-title");
dialog.innerHTML =
  '<header><button class="play-back">← 放回原处</button><span class="play-room"></span></header><div class="play-layout"><div class="play-photo"><img alt=""><span></span></div><section class="play-copy"><p class="eyebrow">走近 · 看看物件</p><h2 id="room-play-title"></h2><p class="play-intro"></p><div class="play-entry"></div><div class="play-space" hidden></div><p class="play-response" role="status" aria-live="polite"></p><div class="play-finish" hidden></div></section></div>';
document.body.append(dialog);
const q = (s) => dialog.querySelector(s),
  panel = ManorMotion.createPanel(dialog);
let active = null,
  opener = null,
  epoch = 0,
  audio = null,
  done = new Set(),
  stage = 0;
try {
  const saved = JSON.parse(localStorage.getItem("manor-room-discoveries-v1"));
  if (Array.isArray(saved))
    done = new Set(saved.filter((id) => Object.hasOwn(activities, id)));
} catch {}
function stop() {
  epoch++;
  audio?.close().catch(() => {});
  audio = null;
}
function close(immediate = false) {
  stop();
  return panel.close({ immediate });
}
q(".play-back").onclick = () => close();
dialog.addEventListener("cancel", (e) => {
  e.preventDefault();
  close();
});
dialog.addEventListener("close", () => {
  stop();
  active = null;
  ManorMusic.duck("room-play", false);
  if (!document.querySelector("dialog[open]") && opener?.isConnected)
    opener.focus({ preventScroll: true });
});
window.addEventListener("hashchange", () => close(true));
function sync() {
  if (!active || !dialog.open) return;
  const state = ManorView.snapshot();
  if (state.room !== activities[active].room) {
    close(true);
    return;
  }
  paint(state);
}
for (const event of ["manor:painted", "manor:committed", "manor:state"])
  window.addEventListener(event, sync);
function paint(state) {
  const info = activities[active],
    point = ManorSpatial.anchor(active, state.imageKey) || info.zoom;
  const src = `assets/${state.imageKey}.webp`;
  if (q(".play-photo img").getAttribute("src") !== src)
    q(".play-photo img").src = src;
  q(".play-photo img").style.width = `${info.scale * 100}%`;
  q(".play-photo img").style.transform =
    `translate(-${point[0]}%, -${point[1]}%)`;
  q(".play-photo img").alt = Manor.rooms[info.room][0] + " · " + info.title;
  q(".play-photo span").textContent = info.title;
}
q(".play-photo img").onerror = () => {
  q(".play-photo span").textContent = "近景暂未载入，仍可使用右侧文字与游戏。";
};
function win(message) {
  done.add(active);
  let stored = true;
  try {
    localStorage.setItem(
      "manor-room-discoveries-v1",
      JSON.stringify([...done]),
    );
  } catch {
    stored = false;
  }
  q(".play-response").textContent = message;
  q(".play-finish").hidden = false;
  q(".play-finish").replaceChildren(
    el("strong", "◇ " + activities[active].reward),
    el(
      "p",
      stored
        ? "这次发现已记在本机游历簿中。重复完成不会多记。"
        : "浏览器未允许保存，这次发现暂留本页。",
    ),
    button("再试一次", start),
    button("收好，回到房间", () => close()),
    button("反馈这次体验", () => window.ManorFeedback?.open("direct")),
  );
  window.dispatchEvent(new CustomEvent("manor:discovery"));
  q(".play-finish strong").tabIndex = -1;
  q(".play-finish strong").focus({ preventScroll: true });
  q(".play-finish").scrollIntoView({
    block: "nearest",
    behavior: ManorMotion.reduced() ? "instant" : "smooth",
  });
}
function start() {
  stop();
  stage = 0;
  q(".play-entry").hidden = true;
  q(".play-space").hidden = false;
  q(".play-space").replaceChildren();
  q(".play-finish").hidden = true;
  q(".play-response").textContent = "";
  dialog.dataset.playing = "true";
  ({
    route: routeGame,
    stamp: stampGame,
    music: musicGame,
    order: () => arrange(false),
    seats: () => arrange(true),
    network: networkGame,
  })[activities[active].kind]();
  panel.reveal(q(".play-space"));
  q(".play-space").querySelector("button")?.focus({ preventScroll: true });
  q(".play-space").scrollIntoView({
    block: "start",
    behavior: ManorMotion.reduced() ? "instant" : "smooth",
  });
}
function readNews() {
  stop();
  q(".play-entry").hidden = true;
  q(".play-space").hidden = false;
  q(".play-finish").hidden = true;
  q(".play-response").textContent = "";
  dialog.dataset.playing = "true";
  renderEstateNews(q(".play-space"), {
    stamp: start,
    go: async (room) => {
      if (
        !(await close()) ||
        dialog.open ||
        ManorView.snapshot().room !== "foyer"
      )
        return;
      location.hash = room;
    },
  });
  panel.reveal(q(".play-space"));
}
function routeGame() {
  let picked = [];
  const space = q(".play-space"),
    line = el("p", ""),
    choices = el("div", undefined, "play-controls");
  space.append(
    el("p", "请柬背面：请由侧门进入。穿过门房，经小侧院的拱口便到前院。"),
    line,
    choices,
  );
  function draw() {
    line.textContent = picked.length ? picked.join(" → ") : "从哪一道门开始？";
    choices.replaceChildren(
      ...["前院", "门房", "侧门", "小侧院"].map((name) => {
        const b = button(name, () => {
          picked.push(name);
          draw();
        });
        b.disabled = picked.includes(name);
        return b;
      }),
    );
    if (picked.length === 4) {
      if (picked.every((name, i) => name === arrivalOrder[i]))
        win("来路接上了。府界的侧门通向门房，前院之后才是主楼正门。");
      else
        q(".play-response").textContent =
          "有一段接反了。再看看请柬中的“穿过”与“经由”。";
    }
  }
  space.append(
    button("重新排列", () => {
      picked = [];
      q(".play-finish").hidden = true;
      q(".play-response").textContent = "";
      draw();
    }),
  );
  draw();
}
function stampGame() {
  const space = q(".play-space"),
    paper = el("div", undefined, "visit-paper"),
    mark = el("span", "◇", "visit-mark"),
    line = el("p", "今日来访，暂坐片刻。");
  let chosen = "◇",
    color = "wine";
  try {
    const saved = JSON.parse(localStorage.getItem("manor-visit-mark-v1"));
    if (
      ["◇", "❧", "✶"].includes(saved?.shape) &&
      ["wine", "green", "gold"].includes(saved?.color)
    ) {
      chosen = saved.shape;
      color = saved.color;
      mark.textContent = chosen;
      paper.dataset.wax = color;
      line.textContent = "上次留下的图记。可以继续沿用，也可以换一个。";
    }
  } catch {}
  paper.append(el("small", "蒙特克里斯条府 · 来访图记"), mark, line);
  space.append(paper);
  space.append(button("翻回府中近事", readNews));
  const choices = el("div", undefined, "play-controls");
  for (const [shape, label] of [
    ["◇", "方钻"],
    ["❧", "枝叶"],
    ["✶", "星芒"],
  ])
    choices.append(
      button(label, () => {
        chosen = shape;
        mark.textContent = chosen;
      }),
    );
  for (const [value, label] of [
    ["wine", "暗红封蜡"],
    ["green", "深绿封蜡"],
    ["gold", "旧金封蜡"],
  ])
    choices.append(
      button(label, () => {
        color = value;
        paper.dataset.wax = color;
      }),
    );
  space.append(
    choices,
    button("落印留页", () => {
      paper.classList.add("is-stamped");
      try {
        localStorage.setItem(
          "manor-visit-mark-v1",
          JSON.stringify({ shape: chosen, color }),
        );
      } catch {}
      win("印记留在了空白页上。府里多了一个曾经来过的痕迹。");
    }),
  );
}
function arrange(seats) {
  const names = seats ? guests : bookLabels,
    rules = seats ? seatRules : bookRules,
    space = q(".play-space"),
    slots = el("div", undefined, seats ? "seat-layout" : "book-layout"),
    tray = el("div", undefined, "play-controls");
  let chosen = null,
    order = Array(4).fill(null);
  const ruleList = el("ul");
  for (const rule of rules) ruleList.append(el("li", rule));
  space.append(
    ruleList,
    el("p", "先选下方的标记，再点位置。选已放好的标记，可以移到另一个位置。"),
    slots,
    tray,
  );
  function draw() {
    slots.replaceChildren(
      ...order.map((name, i) => {
        const label = seats
          ? ["左上 · 窗边", "右上", "右下", "左下"][i]
          : `第 ${i + 1} 格`;
        const b = button(`${label}：${name || "空位"}`, () => {
          if (!chosen) {
            q(".play-response").textContent = "先从下方选一枚标记。";
            return;
          }
          const previous = order.indexOf(chosen);
          if (previous >= 0) order[previous] = order[i];
          order[i] = chosen;
          chosen = null;
          draw();
        });
        b.style.gridArea = seats ? ["1 / 1", "1 / 2", "3 / 2", "3 / 1"][i] : "";
        return b;
      }),
    );
    if (seats) {
      const table = el("div", "长桌", "seat-table");
      slots.append(table);
    }
    tray.replaceChildren(
      ...names.map((name) => {
        const b = button(name, () => {
          chosen = name;
          draw();
        });
        b.setAttribute("aria-pressed", String(chosen === name));
        return b;
      }),
    );
  }
  space.append(
    button("核对安排", () => {
      const errors = (seats ? seatErrors : orderErrors)(order);
      if (errors.length)
        q(".play-response").textContent = "还需要调整：" + errors.join(" ");
      else
        win(
          seats
            ? "四位来客各得其所。这只是排席练习；用餐时仍照伯爵的实际作息入席。"
            : "四枚卷册标记已经归位。先找到确定的端点，其余位置就渐渐清楚了。",
        );
    }),
  );
  draw();
}
function networkGame() {
  const space = q(".play-space"),
    chart = el("div", undefined, "voyage-chart"),
    summary = el("p"),
    controls = el("div", undefined, "play-controls");
  let path = [0];
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 440 240");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "航路示意，下面列出每条航段的补给消耗");
  const points = [
    [35, 120],
    [150, 45],
    [190, 190],
    [290, 65],
    [405, 130],
  ];
  for (const [a, b, cost] of seaEdges) {
    const line = document.createElementNS(svg.namespaceURI, "line");
    line.setAttribute("x1", points[a][0]);
    line.setAttribute("y1", points[a][1]);
    line.setAttribute("x2", points[b][0]);
    line.setAttribute("y2", points[b][1]);
    svg.append(line);
    const text = document.createElementNS(svg.namespaceURI, "text");
    text.setAttribute("x", (points[a][0] + points[b][0]) / 2);
    text.setAttribute("y", (points[a][1] + points[b][1]) / 2 - 6);
    text.textContent = cost;
    svg.append(text);
  }
  points.forEach(([x, y], i) => {
    const circle = document.createElementNS(svg.namespaceURI, "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", 7);
    svg.append(circle);
    const t = document.createElementNS(svg.namespaceURI, "text");
    t.setAttribute("x", x);
    t.setAttribute("y", y + 24);
    t.setAttribute("text-anchor", "middle");
    t.textContent = ports[i];
    svg.append(t);
  });
  chart.append(svg);
  space.append(chart);
  const edgeList = el("details");
  edgeList.append(el("summary", "查看航段与消耗"));
  for (const [a, b, c] of seaEdges)
    edgeList.append(el("p", `${ports[a]} ↔ ${ports[b]}：${c} 份`));
  space.append(edgeList, summary, controls);
  function draw() {
    const result = voyage(path);
    summary.textContent = `${path.map((i) => ports[i]).join(" → ")} · 已用 ${result.cost}/6 份补给`;
    controls.replaceChildren(
      ...seaEdges.flatMap(([a, b, c]) => {
        const here = path.at(-1),
          next = a === here ? b : b === here ? a : null;
        if (next === null || path.includes(next)) return [];
        const option = button(`去${ports[next]} · ${c} 份`, () => {
          path.push(next);
          draw();
        });
        option.disabled = result.cost + c > 6 || here === 4;
        return [option];
      }),
    );
    if (result.win)
      win("补给够用，灯塔也到了。最近的一段，不一定能接成最省的一条路。");
    else if (path.at(-1) === 4)
      q(".play-response").textContent =
        "到了灯塔，却还没有经过补给岛。退回一段再试。";
    else
      q(".play-response").textContent = "各港只经过一次；补给不足时可以退回。";
  }
  space.append(
    button("退回一段", () => {
      if (path.length > 1) path.pop();
      q(".play-finish").hidden = true;
      draw();
    }),
  );
  draw();
}
function musicGame() {
  const space = q(".play-space"),
    keys = el("div", undefined, "piano-keys"),
    heading = el("p"),
    controls = el("div", undefined, "play-controls");
  let input = [],
    playing = false,
    sound = false,
    free = false,
    sketch = [];
  const sketchLine = el("p", "", "piano-sketch");
  try {
    const saved = JSON.parse(localStorage.getItem("manor-piano-sketch-v1"));
    if (Array.isArray(saved))
      sketch = saved
        .filter((n) => Number.isInteger(n) && n >= 0 && n < 4)
        .slice(0, 16);
  } catch {}
  const keyButtons = [];
  function tone(i) {
    if (!sound) return;
    try {
      audio ||= new AudioContext();
      audio.resume().catch(() => {});
      const oscillator = audio.createOscillator(),
        gain = audio.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = [261.63, 293.66, 329.63, 392][i];
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.1, audio.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.35);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.4);
    } catch {
      sound = false;
      q(".play-response").textContent = "声音暂不可用，仍可照着键号复奏。";
    }
  }
  function press(i) {
    if (playing) return;
    if (free) {
      tone(i);
      sketch.push(i);
      sketch = sketch.slice(-16);
      showSketch();
      q(".play-response").textContent =
        "这一音留在草稿里了。最多保留最近十六音，可以回听或保存。";
      return;
    }
    if (stage >= melodies.length) return;
    tone(i);
    input.push(i);
    const expected = melodies[stage];
    if (i !== expected[input.length - 1]) {
      input = [];
      q(".play-response").textContent =
        "这一音没有接上。可以重看这一段，再从头弹。";
      return;
    }
    q(".play-response").textContent =
      `已接上 ${input.length}/${expected.length} 音。`;
    if (input.length === expected.length) {
      stage++;
      input = [];
      if (stage === melodies.length) {
        win("三小段都接上了。可以让琴音停在这里，也可以再奏一遍。");
        keyButtons.forEach((b) => (b.disabled = true));
      } else {
        heading.textContent = `第 ${stage + 1} 段 · ${melodies[stage].length} 音`;
        q(".play-response").textContent =
          "这一段接上了。点“看一遍琴键”开始下一段。";
      }
    }
  }
  for (let i = 0; i < 4; i++) {
    const b = button(`${i + 1}`, () => press(i), "piano-key");
    b.setAttribute("aria-label", `琴键 ${i + 1}`);
    keys.append(b);
    keyButtons.push(b);
  }
  async function demo() {
    if (free || playing || stage >= melodies.length) return;
    const token = ++epoch;
    playing = true;
    input = [];
    keyButtons.forEach((b) => (b.disabled = true));
    q(".play-response").textContent = "留意亮起的键号。";
    for (const i of melodies[stage]) {
      if (token !== epoch) return;
      keyButtons[i].classList.add("sounding");
      tone(i);
      heading.textContent = `第 ${stage + 1} 段 · 键 ${i + 1}`;
      await new Promise((r) => setTimeout(r, 600));
      if (token !== epoch) return;
      keyButtons[i].classList.remove("sounding");
      await new Promise((r) => setTimeout(r, 180));
    }
    if (token !== epoch) return;
    playing = false;
    keyButtons.forEach((b) => (b.disabled = false));
    heading.textContent = `第 ${stage + 1} 段 · 请复奏`;
    q(".play-response").textContent = "按刚才的顺序弹奏。不必抢时间。";
  }
  heading.textContent = "第 1 段 · 3 音";
  controls.append(
    button("看一遍琴键", demo),
    button("开启琴音", (e) => {
      sound = !sound;
      e.currentTarget.textContent = sound ? "关闭琴音" : "开启琴音";
      if (sound) tone(0);
    }),
  );
  const alternative = el("details");
  alternative.append(el("summary", "用文字键号练习"));
  melodies.forEach((m, i) =>
    alternative.append(
      el("p", `第 ${i + 1} 段：${m.map((n) => n + 1).join(" → ")}`),
    ),
  );
  function showSketch() {
    sketchLine.textContent = sketch.length
      ? "琴键草稿：" + sketch.map((n) => n + 1).join(" · ")
      : "还没有落下第一音。";
  }
  const freeTools = el("div", undefined, "play-controls");
  freeTools.hidden = true;
  const mode = button("自由弹奏，留一段琴音", () => {
    epoch++;
    playing = false;
    free = !free;
    input = [];
    keyButtons.forEach((b) => {
      b.classList.remove("sounding");
      b.disabled = !free && stage >= melodies.length;
    });
    mode.textContent = free ? "回到复奏练习" : "自由弹奏，留一段琴音";
    mode.setAttribute("aria-pressed", String(free));
    heading.textContent = free
      ? "随意弹四个音，没有对错。"
      : stage >= melodies.length
        ? "三段已完成"
        : `第 ${stage + 1} 段 · 请复奏`;
    freeTools.hidden = sketchLine.hidden = !free;
    alternative.hidden = free;
    controls.firstChild.disabled = free;
    q(".play-finish").hidden = free || stage < melodies.length;
    q(".play-response").textContent = free
      ? "可以开启琴音，自己试一段。保存的是键号，回听按均匀节奏播放。"
      : "继续原来的复奏进度。";
    showSketch();
  });
  mode.setAttribute("aria-pressed", "false");
  freeTools.append(
    button("回听这段琴音", async () => {
      if (playing) return;
      if (!sketch.length) {
        q(".play-response").textContent = "先弹几个音，再回听。";
        return;
      }
      const token = ++epoch,
        phrase = [...sketch];
      playing = true;
      keyButtons.forEach((b) => (b.disabled = true));
      q(".play-response").textContent = sound
        ? "正在回听琴键草稿。"
        : "正在无声演示键号；可以开启琴音再听。";
      for (const i of phrase) {
        if (token !== epoch) return;
        keyButtons[i].classList.add("sounding");
        tone(i);
        await new Promise((r) => setTimeout(r, 400));
        if (token !== epoch) return;
        keyButtons[i].classList.remove("sounding");
        await new Promise((r) => setTimeout(r, 100));
      }
      if (token !== epoch) return;
      playing = false;
      keyButtons.forEach((b) => (b.disabled = false));
      q(".play-response").textContent = "这一段放完了。还可以接着弹。";
    }),
    button("把琴键草稿留在这里", () => {
      if (!sketch.length) {
        q(".play-response").textContent = "先弹几个音，再留下草稿。";
        return;
      }
      try {
        localStorage.setItem("manor-piano-sketch-v1", JSON.stringify(sketch));
        q(".play-response").textContent =
          "草稿保存在本机。下次坐到琴前，仍能回听这十六音以内的片段。";
      } catch {
        q(".play-response").textContent =
          "浏览器无法保存草稿，这次仍可以继续弹。";
      }
    }),
    button("另起一段", () => {
      epoch++;
      playing = false;
      sketch = [];
      keyButtons.forEach((b) => {
        b.disabled = false;
        b.classList.remove("sounding");
      });
      showSketch();
      q(".play-response").textContent =
        "从第一音重新开始；先前保存的草稿要到再次保存才会替换。";
    }),
  );
  sketchLine.hidden = true;
  space.append(
    heading,
    keys,
    controls,
    mode,
    sketchLine,
    freeTools,
    alternative,
  );
}
function open(id) {
  const info = activities[id],
    state = ManorView.snapshot();
  if (!info || info.room !== state.room) return;
  stop();
  active = id;
  opener = document.activeElement;
  dialog.dataset.playing = "false";
  q(".play-room").textContent = Manor.rooms[info.room][0];
  q("#room-play-title").textContent = info.title;
  q(".play-intro").textContent = info.intro;
  q(".play-back").textContent = "← 返回" + Manor.rooms[info.room][0];
  q(".play-entry").hidden = false;
  q(".play-space").hidden = true;
  q(".play-space").replaceChildren();
  q(".play-finish").hidden = true;
  q(".play-response").textContent = done.has(id)
    ? "您已在这里留下一次发现，也可以再玩。"
    : "";
  q(".play-entry").replaceChildren(button("坐下来，试一试", start));
  if (id === "invitation") {
      q("#room-play-title").textContent = "随身的请柬";
      q(".play-intro").textContent = "正面记着伯爵留下的邀请，背面还画着来路。可以继续一次赴约，也可以在背面试着拼起那条通向前院的路。";
      q(".play-entry").prepend(button("展开伯爵留下的请柬", async () => {
        await close();
        location.href = "/invitations.html";
      }));
    }
    if (id === "ledger") readNews();
  if (id === "place")
    q(".play-entry").append(
      button("查看此刻的用餐安排", async () => {
        await close();
        if (ManorView.snapshot().room === "dining")
          window.dispatchEvent(
            new CustomEvent("manor:interact", { detail: { object: "place" } }),
          );
      }),
    );
  paint(state);
  panel.show();
  dialog.scrollTop = 0;
  ManorMusic.duck("room-play", true);
  q(".play-back").focus({ preventScroll: true });
}
window.ManorRoomPlay = {
  has: (id) => Object.hasOwn(activities, id),
  open,
  completed: () => [...done],
};
