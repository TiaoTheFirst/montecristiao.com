import { invitationStatus } from "./game-hours.mjs";

// Props are painted into inspected wide shots, not pasted over the room.
export const props = {
  games: {
    room: "salon",
    title: "沙发前的游戏桌",
    place: "大客厅 · 左侧沙发前",
    description:
      "棋盘摆在左手边，牌具收在右边。拉过一把椅子，可以独自摆棋；伯爵在客厅闲坐时，也可以请他过来玩牌。",
    aside: "茶具与乐匣仍在近处的圆桌上。这里留给棋与牌。",
    frames: {
      "salon-day": [32, 64.5],
      "salon-night": [32, 64.5],
      "painted/salon-occupied-day-471b8d81": [32, 64.5],
      "painted/salon-occupied-night-725b9384": [32, 64.5],
    },
  },
  letterbox: {
    room: "letter",
    title: "案前的信纸",
    place: "通信小室 · 写字台前",
    description:
      "信纸与羽毛笔都放在手边。坐下来写一封信，或打开自己的私函匣，看看有没有回信。",
    aside: "登录后，草稿、已寄出的信和回信都收在你的账号里。",
    alt: "通信小室写字台上的信纸、羽毛笔与封蜡",
    frames: { "letter-day": [73, 82], "letter-night": [73, 82] },
  },
};
export const tableGames = {
  solitaire: {
    title: "独粒棋",
    description:
      "棋盘中央空着一格。让一枚棋子跳过相邻棋子，落进空位，再取走被跳过的那一枚。最后只留一枚，就算完成。",
    aside: "一个人也能慢慢下。走错可以悔棋，不必等伯爵有空。",
  },
  cards: {
    title: "七张暗牌",
    description:
      "你和伯爵各持一到七，同时揭牌争取桌上的分数。用过的牌，这一局便不能再用；最大的牌，该留给哪一轮？",
    aside: "先看看玩法，再邀请伯爵坐到对面。闲暇之外，牌桌仍留给你自己琢磨。",
  },
};
export function propPlacement(id, room, imageKey) {
  const prop = props[id];
  return prop?.room === room ? prop.frames[imageKey] || null : null;
}
export function propAction(id, world, light) {
  if (id === "cards")
    return {
      ...invitationStatus(world),
      label: "邀请伯爵，坐下来玩一局",
      href: "seven-cards.html?from=salon",
    };
  if (id === "solitaire")
    return {
      allowed: true,
      label: "坐下来，摆一局",
      message: "随时可以独自摆棋。",
      href: `solitaire.html?from=salon&light=${light === "day" ? "day" : "night"}`,
    };
  if (id === "letterbox")
    return {
      allowed: true,
      label: "打开我的私函匣",
      message: "",
      href: "letters.html",
    };
  return { allowed: false, message: "这件物品暂不能使用。" };
}
