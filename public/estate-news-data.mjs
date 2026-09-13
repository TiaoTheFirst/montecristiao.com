// Only approved, public material belongs here. Hidden stories stay outside public/.
export const estateNews = [
  {
    id: "2026-09-14-game-table",
    date: "2026-09-14",
    title: "棋匣搬回了客厅",
    summary: "棋盘和纸牌都收在左侧边桌上。解完一局，记得看看棋匣里的短笺。",
    paragraphs: [
      "两样消遣如今放在同一张边桌上。走近后，可以取出独粒棋，也可以看看纸牌。花园的路空出来了，散步时不必再绕着棋桌走。",
      "独粒棋备了十二盘残局，每三天推荐一盘；旧局仍可随时取出。最后该留在哪个孔位，要看这一盘的说明。通关后能收好短笺和棋谱卡。",
      "想与伯爵对局，请先看牌桌上的时段。他休息的时候，可以自己摆棋。",
    ],
    action: { label: "去大客厅看看棋匣", room: "salon" },
  },
  {
    id: "2026-09-14-paintings",
    date: "2026-09-14",
    title: "看画，可以再靠近一点",
    summary: "《归港灯火》添了两页往事；另两幅画，也各有可以停下来看的地方。",
    paragraphs: [
      "《远帆》适合退后几步，再走近看看。《石拱之后》旁准备了两种画页排法，可以自己挪动取景的位置。放大镜和观画册页也在手边。",
      "伯爵在画廊时，可以问起《归港灯火》。是否翻开那两页往事，由您决定。他不在场时，仍可以独自看画。",
    ],
    action: { label: "去画廊看画", room: "gallery" },
  },
  {
    id: "2026-09-14-piano",
    date: "2026-09-14",
    title: "小会客厅留着一段琴音",
    summary: "照着复奏，或自己试几个音；喜欢的话，可以留一份琴键草稿。",
    paragraphs: [
      "琴边备了三段短旋律。也可以暂且不照着弹，只用四个音试一小段，再听一遍。",
      "保存的琴键草稿留在这台设备，下次来还能接着试。它记得按键的顺序，回听时会用均匀的节奏。",
    ],
    action: { label: "去小会客厅试琴", room: "music" },
  },
];

// An arrangement is not an available activity and never receives a play link.
export const estateArrangements = [
  {
    id: "butler-log",
    title: "管家开始整理府中日志",
    text: "往后的府中小事，将由管家记下见闻，配上几幅画。第一篇尚在准备；完成后，会在这里留下记录。",
  },
];

export function newsPages(entries = estateNews) {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date));
}
