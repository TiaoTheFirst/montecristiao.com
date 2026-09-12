// Activities are room actions, not unverified pins on painted objects.
window.ManorRoomActivities = {
  letter: {
    title: "写信与取信",
    description:
      "自己的来信、草稿和伯爵的回信，都从私函匣进入。封蜡是另一处小互动。",
    map: "写信、取回信与查看草稿",
    links: [["打开我的私函匣", "letters.html"]],
  },
  salon: {
    title: "大客厅的纸牌桌",
    description:
      "坐到纸牌桌前，用同样的七张牌较量。也可以先请教，再认真玩一局。",
    map: "七张暗牌 · 伯爵在此闲坐时可邀请",
    links: [
      ["坐到纸牌桌前", "seven-cards.html?from=salon"],
      ["看看两种消遣", "games.html"],
    ],
  },
  garden: {
    title: "在花园停一会儿",
    description: "露台边可以摆独粒棋，也可以带着一道小题慢慢想。",
    map: "花园小坐、露台小题与独粒棋",
    links: [["摆开独粒棋", "solitaire.html?from=garden"]],
  },
};
