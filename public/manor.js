/* Original spatial model. Classic script keeps the preview usable offline. */
var createManor = (architecture, options = {}) => {
  const rooms = {
    gate: ["车道大门", "场地"],
    court: ["荣誉前院", "场地"],
    foyer: ["穿堂", "一层"],
    gallery: ["画廊", "一层"],
    music: ["小会客厅", "一层"],
    salon: ["大客厅", "一层"],
    dining: ["餐厅", "一层"],
    ante: ["前室", "一层"],
    terrace: ["露台", "室外"],
    garden: ["中央花园", "室外"],
    westpath: ["西侧园径", "室外"],
    eastpath: ["东侧园径", "室外"],
    orangery: ["橘园", "室外"],
    pavilion: ["园中小亭", "室外"],
    stair: ["主楼梯", "一层"],
    landing: ["楼上前厅", "二层"],
    library: ["藏书室", "二层"],
    study: ["书房", "二层"],
    letter: ["通信小室", "二层"],
    privatehall: ["楼上回廊", "二层"],
    bedroom: ["卧室套间", "二层"],
    guest: ["客房套间", "二层"],
    workshop: ["实验小室", "二层"],
    attic: ["阁楼", "阁楼"],
    coach: ["车房马厩", "西配楼"],
    gatehouse: ["门房", "西配楼"],
    sidegate: ["服务侧门", "东配楼"],
    yard: ["服务小院", "东配楼"],
    pantry: ["厨房与备餐间", "东配楼"],
    office: ["管事房", "东配楼"],
    backstair: ["服务楼梯", "东配楼"],
    cellar: ["地窖", "地下"],
    outside: ["府外沙龙", "府外"],
  };
  // Room names and access design are maintained alongside the physical plan.
  const program = architecture?.program || {};
  for (const [id, entry] of Object.entries(program))
    if (rooms[id] && entry.label) rooms[id][0] = entry.label;
  const legacyEdges = [
    ["gate", "court"],
    ["gate", "gatehouse"],
    ["gate", "outside"],
    ["court", "coach"],
    ["court", "foyer"],
    ["foyer", "gallery"],
    ["gallery", "music"],
    ["music", "salon"],
    ["salon", "dining"],
    ["dining", "ante"],
    ["ante", "foyer"],
    ["foyer", "salon"],
    ["salon", "terrace"],
    ["terrace", "garden"],
    ["garden", "westpath"],
    ["westpath", "orangery"],
    ["orangery", "pavilion"],
    ["pavilion", "eastpath"],
    ["eastpath", "garden"],
    ["westpath", "terrace"],
    ["eastpath", "terrace"],
    ["foyer", "stair"],
    ["stair", "landing"],
    ["landing", "library"],
    ["library", "study"],
    ["study", "letter"],
    ["letter", "landing"],
    ["landing", "privatehall"],
    ["privatehall", "bedroom"],
    ["privatehall", "guest"],
    ["study", "workshop"],
    ["privatehall", "backstair"],
    ["backstair", "attic"],
    ["sidegate", "yard"],
    ["yard", "pantry"],
    ["yard", "office"],
    ["office", "ante"],
    ["pantry", "dining"],
    ["pantry", "backstair"],
    ["pantry", "cellar"],
  ];
  const edges = architecture
    ? architecture.portals.map(({ a, b }) => [a, b])
    : legacyEdges;
  const phases = options.phases || [
    { at: 0, targets: ["study"], verb: "夜间读写" },
    { at: 90, targets: ["bedroom"], verb: "已经休息" },
    { at: 540, targets: ["garden", "library"], verb: "晨间独处" },
    { at: 600, targets: ["study"], verb: "阅读与写作" },
    { at: 780, targets: ["dining"], verb: "正在用餐" },
    { at: 840, targets: ["salon"], verb: "午餐后小坐" },
    { at: 900, targets: ["garden", "salon", "library"], verb: "午后闲暇" },
    { at: 1080, targets: ["gallery", "salon"], verb: "会客与看画" },
    { at: 1125, targets: ["dining"], verb: "正在用晚餐" },
    { at: 1200, targets: ["salon"], verb: "晚间社交" },
    { at: 1320, targets: ["gallery"], verb: "会客与看画" },
    { at: 1380, targets: ["salon"], verb: "晚间社交" },
  ];
  const hash = (s) => {
    let n = 2166136261;
    for (const c of s) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
    return n >>> 0;
  };
  const target = (date, i) =>
    phases[i].targets[hash(date + ":" + i) % phases[i].targets.length];
  function path(from, to, allowed) {
    const queue = [[from]],
      seen = new Set([from]);
    while (queue.length) {
      const route = queue.shift(),
        last = route.at(-1);
      if (last === to) return route;
      for (const [a, b] of edges) {
        const next = a === last ? b : b === last ? a : null;
        if (next && !seen.has(next) && (!allowed || allowed.has(next))) {
          seen.add(next);
          queue.push([...route, next]);
        }
      }
    }
    return [];
  }
  const previousDate = (date) => {
    const d = new Date(date + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  };
  function validDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const d = new Date(date + "T12:00:00Z");
    return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === date;
  }
  function state(date, minute) {
    if (
      !validDate(date) ||
      !Number.isInteger(minute) ||
      minute < 0 ||
      minute > 1439
    )
      throw new RangeError("Invalid manor date or minute");
    const i = phases.findLastIndex((p) => p.at <= minute),
      dest = target(date, i),
      prev = target(
        i ? date : previousDate(date),
        i ? i - 1 : phases.length - 1,
      ),
      route = path(prev, dest),
      step = Math.floor((minute - phases[i].at) / 2),
      moving = step < route.length - 1;
    return {
      room: moving ? route[step] : dest,
      text: moving ? "正在前往" + rooms[dest][0] : phases[i].verb,
      moving,
      destination: dest,
      route,
    };
  }
  function now() {
    const d = new Date(Date.now() + 8 * 3600000);
    return {
      date: d.toISOString().slice(0, 10),
      minute: d.getUTCHours() * 60 + d.getUTCMinutes(),
    };
  }
  const time = (m) =>
    String(Math.floor(m / 60)).padStart(2, "0") +
    ":" +
    String(m % 60).padStart(2, "0");
  const light = (m) => (m >= 420 && m < 1080 ? "day" : "night");
  const transit = new Set([
    "stair",
    "landing",
    "terrace",
    "westpath",
    "eastpath",
    "ante",
    "privatehall",
  ]);
  const scenes = {
    court: {
      en: "COUR D’HONNEUR",
      title: "蒙特克里斯条府",
      line: "车道在这里回转。主楼后面，还有一座花园。",
      hint: "从正门进入主楼，或先在前院停留。",
      doors: [["foyer", 50, 55, "进入主楼"]],
      objects: [["invitation", 25, 76, "读随身的请柬"]],
      primary: ["foyer", "进入主楼"],
    },
    foyer: {
      en: "LE VESTIBULE",
      title: "穿堂",
      line: "案上夹着管家留下的府中近事。穿堂通向客厅，侧边的楼梯通往二层。",
      hint: "正前方是客厅，右侧楼梯通向藏书室。",
      doors: [
        ["court", 10, 86, "返回前院"],
        ["gallery", 18, 49, "去画廊"],
        ["salon", 52, 48, "去大客厅"],
        ["library", 83, 45, "上楼 · 藏书室"],
      ],
      objects: [
        ["registry", 31, 72, "递上名片"],
        ["ledger", 10, 79, "翻看府中近事与来访簿"],
      ],
    },
    music: {
      en: "LE PETIT SALON",
      title: "小会客厅",
      line: "两把扶手椅围着矮茶桌。右侧的琴，可以坐下来试奏。",
      hint: "右侧的门通往大客厅，身后的门回画廊。北窗朝向花园。",
      doors: [
        ["salon", 89, 48, "去大客厅"],
        ["gallery", 12, 85, "转身 · 回画廊"],
      ],
      objects: [["piano", 72, 60, "坐到琴前，复奏一段"]],
    },
    salon: {
      en: "LE GRAND SALON",
      title: "大客厅",
      line: "左侧沙发前，棋盘与牌具摆在边桌上。近处圆桌上的茶还温着。",
      hint: "点左侧边桌上的棋与牌，可以坐下消遣；穿过落地门便是花园。",
      doors: [
        ["music", 12, 48, "去小会客厅"],
        ["garden", 53, 50, "经露台 · 花园"],
        ["dining", 95, 48, "去餐厅"],
        ["foyer", 89, 84, "回穿堂"],
      ],
      objects: [
        ["games", 32, 64.5, "走近沙发前的游戏桌"],
        ["musicbox", 74, 83, "打开桌上的乐匣"],
      ],
    },
    dining: {
      en: "LA SALLE À MANGER",
      title: "餐厅",
      line: "长桌占了餐厅中央，两侧排着餐椅。",
      hint: "左侧门回客厅。每日十三点与十八点四十五分起，伯爵会动身来用餐。",
      doors: [["salon", 10, 50, "回大客厅"]],
      objects: [["place", 57, 79, "餐桌上的排席与用餐"]],
    },
    gallery: {
      en: "LA GALERIE",
      title: "画廊",
      line: "画框沿着长墙排开，窗下留着一条过道。",
      hint: "前面的门通往小会客厅。去大客厅也可以从身后的穿堂绕行。",
      doors: [
        ["music", 57, 46, "去小会客厅"],
        ["foyer", 88, 85, "回穿堂"],
      ],
      objects: [
        ["seascape", 23, 40, "细看《远帆》"],
        ["harbor", 36, 45, "细看《归港灯火》"],
        ["arch", 41.5, 47, "细看《石拱之后》"],
      ],
    },
    library: {
      en: "LA BIBLIOTHÈQUE",
      title: "藏书室",
      line: "书架沿墙排开。木梯旁有一道归架小题，窗外就是花园。",
      hint: "窗外是后花园；右手边的门通往书房。",
      doors: [
        ["study", 88, 48, "去书房"],
        ["letter", 12, 84, "经回廊 · 通信小室"],
        ["foyer", 30, 87, "下楼 · 穿堂"],
      ],
      objects: [["catalogue", 12, 40, "书架上的归位小题"]],
    },
    study: {
      en: "LE CABINET",
      title: "书房",
      line: "手稿仍摊在案上。椅背后的地球仪旁，可以试着接一条航路。",
      hint: "左边连接藏书室，另一侧经回廊前往通信小室。",
      doors: [
        ["library", 8, 48, "回藏书室"],
        ["letter", 91, 48, "经回廊 · 通信小室"],
      ],
      objects: [
        ["books", 36, 67, "案前未完的手稿"],
        ["globe", 49, 55, "地球仪旁的航路"],
      ],
    },
    letter: {
      en: "LA CORRESPONDANCE",
      title: "通信小室",
      line: "书桌上留着信纸。写到一半的信与收到的回信，都收在您的私函匣里。",
      hint: "走出房门是楼上回廊，可回书房或去藏书室。",
      doors: [
        ["study", 8, 50, "经回廊 · 书房"],
        ["library", 91, 48, "经回廊 · 藏书室"],
      ],
      objects: [
        ["letterbox", 65, 73, "写信与取信"],
        ["seal", 80, 91, "信封上的封蜡"],
      ],
    },
    garden: {
      en: "LE JARDIN",
      title: "中央花园",
      line: "从露台走下去，园路绕过水池。树影在水面上轻轻晃动。",
      hint: "可以走近水池看看倒影，也可以沿园径绕行，再经露台回客厅。",
      doors: [["salon", 16, 86, "经露台 · 客厅"]],
      objects: [["pool", 51, 61, "池中的倒影"]],
    },
  };
  const publicNodes = new Set(
    [...Object.keys(scenes), ...transit].filter(
      (id) => !["private", "service"].includes(program[id]?.access),
    ),
  );
  // Ordinary cross-house walks bypass the room reserved for quiet conversations.
  const routes = {
    "gallery:salon": ["gallery", "foyer", "salon"],
    "salon:gallery": ["salon", "foyer", "gallery"],
    "library:letter": ["library", "privatehall", "letter"],
    "letter:library": ["letter", "privatehall", "library"],
  };
  function walk(from, to) {
    if (!publicNodes.has(from) || !publicNodes.has(to)) return [];
    const allowed = new Set(publicNodes);
    if (from !== "music" && to !== "music") allowed.delete("music");
    return routes[from + ":" + to] || path(from, to, allowed);
  }
  function meal(date, minute) {
    const st = state(date, minute);
    return st.room === "dining" && !st.moving && st.destination === "dining";
  }
  function sceneKey(room, date, minute) {
    return (
      room +
      (room === "dining" && meal(date, minute) ? "-meal" : "") +
      "-" +
      light(minute)
    );
  }
  function createTrail(initial) {
    const stack = [initial];
    return {
      commit(room) {
        if (stack.at(-1) === room) return;
        if (stack.at(-2) === room) stack.pop();
        else stack.push(room);
        if (stack.length > 100) stack.shift();
      },
      previous(room) {
        const parent = {
          foyer: "court",
          salon: "foyer",
          music: "salon",
          gallery: "foyer",
          library: "foyer",
          study: "library",
          letter: "study",
          garden: "salon",
          dining: "salon",
        };
        return stack.at(-2) || parent[room] || null;
      },
    };
  }
  // Coordinates are checked against the generated canvases, not prompt estimates.
  scenes.court.doors[0][1] = 52;
  scenes.court.doors[0][2] = 64;
  scenes.foyer.doors[1][1] = 26;
  scenes.foyer.doors[1][2] = 55;
  scenes.foyer.doors[3][1] = 91;
  scenes.foyer.doors[3][2] = 40;
  // Object identity lives in the scene declaration; never overwrite by array index.
  scenes.library.doors[0][1] = 81;
  scenes.library.doors[0][2] = 50;
  scenes.study.doors[0][1] = 36;
  scenes.study.doors[0][2] = 42;
  scenes.garden.hint = "此处视角在露台边。远处的橘园与凉亭暂未开放。";
  return {
    rooms,
    program,
    edges,
    phases,
    hash,
    path,
    state,
    now,
    time,
    light,
    scenes,
    transit,
    publicNodes,
    walk,
    meal,
    sceneKey,
    createTrail,
    validDate,
  };
};
var Manor = createManor(
  typeof ManorArchitecture === "object" ? ManorArchitecture : null,
);
// Classic-script/Worker bridge: both runtimes instantiate the same pure rules.
globalThis.createManor = createManor;
