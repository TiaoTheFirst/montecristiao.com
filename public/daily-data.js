/* Editable fictional moments. Objects and account notes never imply telepathy. */
var ManorDaily = (() => {
  const rooms = {
    court: {
      title: "刚到府门前",
      lines: [
        "门还开着。车道另一头是穿堂，您不必在这里等人通报。",
        "廊下亮着灯，穿堂的门还开着。",
      ],
      actions: [
        ["请管家来接一下", "butler"],
        ["先认一认路", "map"],
        ["在门前待片刻", "quiet"],
      ],
    },
    foyer: {
      title: "穿堂的去处",
      lines: [
        "从穿堂出发，左边可以看画，前面有茶。要安静些，就沿右边的楼梯上去。",
        "楼上亮着灯。沿侧边楼梯可去藏书室和书房。",
      ],
      actions: [
        ["问管家哪里适合坐坐", "butler"],
        ["整理名片上的来访偏好", "preferences"],
        ["看看我留下的札记", "memory"],
      ],
    },
    music: {
      title: "小厅里的座位",
      lines: [
        "这里也用来弹琴。需要单独谈话时，两边的门都可以关上。",
        "窗外已经暗了，两把椅子旁还留着灯。",
      ],
      actions: [
        ["坐一会儿", "quiet"],
        ["去大客厅", "go-salon"],
        ["回画廊", "go-gallery"],
      ],
    },
    salon: {
      title: "茶桌旁的空位",
      lines: [
        "茶桌旁是扶手椅，乐匣放在桌上。",
        "夜里客厅安静下来。若开乐匣，把声音调轻一些就好。",
      ],
      actions: [
        ["去画廊看看", "go-gallery"],
        ["打开乐匣", "music"],
        ["暂时不说话，坐一会儿", "quiet"],
      ],
    },
    dining: {
      title: "留出的席位",
      lines: [
        "餐具已经摆好。是不是开席的时候，可以先问问管家。",
        "从客厅进来就是餐厅，不必绕到备餐间。若还没开席，先去隔壁坐坐。",
      ],
      actions: [
        ["看看现在能否入席", "table"],
        ["去客厅等一会儿", "go-salon"],
        ["请管家过来", "butler"],
      ],
    },
    gallery: {
      title: "退开两步看画",
      lines: [
        "《远帆》不大。先看那片灰蓝，再找云边的一点亮。您也可以只看画，不读题笺。",
        "夜里窗外暗了，画廊由室内灯火照明。",
      ],
      actions: [
        ["细看《远帆》", "art"],
        ["记下一点自己的看法", "note-art"],
        ["经穿堂去客厅", "go-salon"],
      ],
    },
    library: {
      title: "在藏书室坐一会儿",
      lines: [
        "书架沿墙排开。这里安静，可以先坐一会儿。",
        "窗外暗了下来，书架旁亮着灯。",
      ],
      actions: [
        ["安静坐一会儿", "quiet"],
        ["看看自己的札记", "memory"],
        ["去书房", "go-study"],
      ],
    },
    study: {
      title: "工作案前",
      lines: [
        "伯爵的手稿摊在工作案上，似乎还没有写完。您自己的话，可以另记在札记里。",
        "书房的灯还亮着，手稿留在工作案上。",
      ],
      actions: [
        ["看看案前的手稿", "read"],
        ["写在自己的札记里", "note-study"],
        ["去藏书室坐坐", "go-library"],
      ],
    },
    letter: {
      title: "这页先留给自己",
      lines: [
        "通信和札记分开放。还不打算给任何人看的话，可以先写在自己的那一页。",
        "札记保存后可再次打开修改，不会被寄出。",
      ],
      actions: [
        ["写一页不寄出的札记", "note-letter"],
        ["取出自己的札记", "memory"],
        ["暂时搁笔，回藏书室", "go-library"],
      ],
    },
    garden: {
      title: "沿水池慢慢走",
      lines: [
        "露台下面的路分向两边。树荫里有一段看不见主楼，绕过水池就能望见了。",
        "窗里的灯映在水面上。此刻不想看文字，可以把札记合上，只在园里待一会儿。",
      ],
      actions: [
        ["沿园径走半圈", "walk"],
        ["看看池沿的刻痕", "pool"],
        ["收起文字，在园里待着", "quiet"],
      ],
    },
  };
  const scraps = [
    "地图上可以查看房间之间的路线。",
    "需要指路，可以唤管家。",
    "房间左上角可以返回来路。",
  ];
  function moment(state) {
    const room = rooms[state.room];
    if (!room) return null;
    const line =
      room.lines[Manor.light(state.clock.minute) === "night" ? 1 : 0];
    const present =
      !state.count.unknown &&
      !state.count.moving &&
      state.count.room === state.room;
    return {
      ...room,
      line,
      present,
      scrap: scraps[Manor.hash(state.clock.date + state.room) % scraps.length],
    };
  }
  return { rooms, moment };
})();
