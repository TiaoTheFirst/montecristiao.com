// Original parlour exercises, not excerpts from the Count's unfinished books.
export const activities = {
  invitation: {
    room: "court",
    title: "请柬上的来路",
    kind: "route",
    intro:
      "把随身请柬翻到背面，试着重新接起那条通向前院的路。这只是可选的小消遣，不会重播初次登门。",
    reward: "来路已记",
    zoom: [50, 50],
    scale: 1,
  },
  ledger: {
    room: "foyer",
    title: "案上的簿册",
    kind: "stamp",
    intro:
      "管家把府中近事夹在簿册前面。后面留着空白页，可以选一个来访图记落印，不用留下姓名。",
    reward: "一页来访",
    zoom: [10, 79],
    scale: 3,
  },
  piano: {
    room: "music",
    title: "窗边的一段琴音",
    kind: "music",
    intro:
      "坐到右侧的琴前，照着亮起的琴键复奏。共三小段；也可自由弹奏四个音，留下琴键草稿。不想开声音时，可以只看键号。",
    reward: "琴音回响",
    zoom: [72, 60],
    scale: 2.5,
  },
  catalogue: {
    room: "library",
    title: "书架的归位小题",
    kind: "order",
    intro:
      "试着依照条件，把四枚卷册标记放回顺序。这是书架旁的排次游戏，不是已开放的书稿正文。",
    reward: "归架有序",
    zoom: [12, 40],
    scale: 2,
  },
  globe: {
    room: "study",
    title: "地球仪旁的航路",
    kind: "network",
    intro:
      "在地球仪旁展开一张消遣用的航路图。用六份补给，经补给岛到灯塔港。港口与距离均为这道游戏虚构。",
    reward: "灯塔归航",
    zoom: [49, 55],
    scale: 2.8,
  },
  place: {
    room: "dining",
    title: "餐桌上的排席小题",
    kind: "seats",
    intro:
      "先试排四位虚构来客的席位，让每个人都坐到合适的位置。这张练习席图不会改变真实用餐安排。",
    reward: "宾客各安",
    zoom: [45, 81],
    scale: 2,
  },
};
export const arrivalOrder = ["侧门", "门房", "小侧院", "前院"];
export const bookLabels = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ"];
export const bookRules = [
  "Ⅲ 紧挨在 Ⅰ 的右边。",
  "Ⅱ 放在最右端。",
  "Ⅳ 不与 Ⅱ 相邻。",
];
export function orderErrors(order) {
  const at = (x) => order.indexOf(x);
  if (
    order.length !== 4 ||
    new Set(order).size !== 4 ||
    order.some((x) => !bookLabels.includes(x))
  )
    return ["四枚卷册标记各放一次。"];
  return [
    at("Ⅲ") === at("Ⅰ") + 1,
    at("Ⅱ") === 3,
    Math.abs(at("Ⅳ") - at("Ⅱ")) !== 1,
  ].flatMap((ok, i) => (ok ? [] : [bookRules[i]]));
}
export const guests = ["画家", "乐师", "旅人", "园丁"];
export const seatRules = [
  "画家坐在左上方靠窗的席位。",
  "乐师与画家相对。",
  "旅人紧挨着画家，坐在同一侧。",
];
// Positions clockwise: upper-left, upper-right, lower-right, lower-left.
export function seatErrors(order) {
  if (
    order.length !== 4 ||
    new Set(order).size !== 4 ||
    order.some((x) => !guests.includes(x))
  )
    return ["四位来客各安排一席。"];
  return [
    order[0] === "画家",
    order[3] === "乐师",
    order[1] === "旅人",
  ].flatMap((ok, i) => (ok ? [] : [seatRules[i]]));
}
export const ports = ["起航港", "近岬", "补给岛", "外海", "灯塔港"];
export const seaEdges = [
  [0, 1, 1],
  [0, 2, 3],
  [1, 2, 1],
  [1, 3, 2],
  [2, 3, 1],
  [2, 4, 5],
  [3, 4, 3],
];
export function voyage(path) {
  if (
    !Array.isArray(path) ||
    path[0] !== 0 ||
    new Set(path).size !== path.length
  )
    return { valid: false, cost: 0, win: false };
  let cost = 0;
  for (let i = 1; i < path.length; i++) {
    const edge = seaEdges.find(
      ([a, b]) =>
        (a === path[i - 1] && b === path[i]) ||
        (b === path[i - 1] && a === path[i]),
    );
    if (!edge) return { valid: false, cost, win: false };
    cost += edge[2];
  }
  return {
    valid: true,
    cost,
    win: path.at(-1) === 4 && path.includes(2) && cost <= 6,
  };
}
export const melodies = [
  [0, 2, 1],
  [2, 0, 3, 1],
  [0, 3, 2, 1, 3],
];
