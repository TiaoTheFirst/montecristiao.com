export const chapters = {
  welcome: {
    title: "初次会面",
    time: "初访当晚 · 20:30",
    description: "从前院进主楼，与伯爵坐一会儿。",
    image: "arrival-v1/court-night.webp",
  },
  lamps: {
    title: "灯下看画",
    time: "另一个夜晚 · 22:20",
    description: "画廊的灯还亮着。伯爵请您走近看一处细节。",
    image: "painted/gallery-attentive-night-v1.webp",
  },
  cards: {
    title: "睡前的一局",
    time: "赴约当晚 · 23:10",
    description: "茶还温着，纸牌已经备好。",
    image: "props/salon-game-table-night-v2.webp",
  },
};
export function scene(id, progress, gameResult) {
  const { step, choice } = progress;
  const salon = "painted/salon-approach-night-v2.webp",
    gallery = "painted/gallery-attentive-night-v1.webp";
  const base = { image: chapters[id].image, speaker: "", choices: [] };
  const scenes = {
    welcome: {
      court: {
        title: "主楼的灯亮着",
        speaker: "巴蒂斯坦",
        text: "您已经到了前院。主楼正门在对面；我替您通报，请随我来。",
        choices: [["enter", "穿过前院，走向正门"]],
      },
      foyer: {
        image: "foyer-night.webp",
        title: "穿堂",
        speaker: "巴蒂斯坦",
        text: "外衣可以放在这里。伯爵在大客厅，茶刚送进去。",
        choices: [["follow", "跟随管家进入客厅"]],
      },
      greeting: {
        image: salon,
        title: "第一次坐下来",
        speaker: "伯爵",
        text: "请坐。一路找过来，想必费了些工夫。先喝杯茶，还是您想先看看府里？",
        choices: [
          ["tea", "先喝杯茶，歇一会儿"],
          ["art", "我想先看看府里的画"],
        ],
      },
      reply: {
        image: salon,
        title: "椅子就在茶桌旁",
        speaker: "伯爵",
        text:
          choice === "art"
            ? "那些画不急着看完。待会儿我带您去，您挑一幅，我们从那里开始。茶先搁在这里，想喝时随手就能拿到。"
            : "好。您不必急着说话。糖在您手边；等您缓过来，我再告诉您府里有哪些地方可以走走。",
        choices: [["continue", "坐下听他说"]],
      },
      closing: {
        image: salon,
        title: "会面之后",
        speaker: "伯爵",
        text: "我晚上常在楼下。您若喜欢看画，我们可以等灯点起来再去；想玩牌，就来客厅找我。今天先随意看看，不必一次走遍所有房间。",
        choices: [["finish", "起身，去穿堂看看"]],
      },
    },
    lamps: {
      gallery: {
        title: "最后一盏灯",
        speaker: "伯爵",
        text: "您来得正好。我原想再看一眼就走，结果又站了一会儿。这幅白天您也许见过，走近看看。",
        choices: [["approach", "走近《归港灯火》"]],
      },
      painting: {
        image: "painted/gallery-harbor-v1.webp",
        title: "归港灯火",
        speaker: "伯爵",
        text: "试着调一调灯光。您先看见的是塔上的灯，还是岸边那截缆绳？",
        painting: true,
        choices: [
          ["window", "细看塔窗的灯"],
          ["rope", "细看岸边的缆绳"],
        ],
      },
      reply: {
        image: "painted/gallery-harbor-v1.webp",
        title: choice === "window" ? "塔窗的灯" : "岸边的缆绳",
        detail: choice,
        speaker: "伯爵",
        text:
          choice === "window"
            ? "我也先看到了它。这么小的一点光，却把目光从整片海面上拉了回来。奇怪的是，我们看得见灯，却看不清点灯的人。"
            : "这处倒容易漏过去。看见缆绳，船才像是真的停下了。否则只看海面，我总觉得它还要继续往前走。",
        choices: [["continue", "退后一点，再看整幅画"]],
      },
      closing: {
        image: gallery,
        title: "画廊外传来钟声",
        speaker: "伯爵",
        text: "今晚就看到这里吧。我还得上楼读几页东西。您若想再站一会儿，我让巴蒂斯坦留着这盏灯。",
        choices: [["finish", "向伯爵道晚安"]],
      },
    },
    cards: {
      invitation: {
        image: salon,
        title: "还来得及玩一局",
        speaker: "伯爵",
        text: "我还没有上楼。若您也不急着走，我们玩一局？七张牌，打完就收。",
        choices: [["accept", "答应，走向纸牌桌"]],
      },
      table: {
        image: "props/salon-game-table-night-v2.webp",
        title: "桌边空着一把椅子",
        text: "双方各持一至七。每轮同时出一张牌，争取桌面的分数；用掉的牌不能再用。坐下后可以先读规则，也可以请教。",
        choices: [["sit", "拉开椅子，开始这一局"]],
      },
      playing: {
        image: "props/salon-game-table-night-v2.webp",
        title: "牌局留在桌上",
        text: "可以继续上次的出牌。离开和跨过现实中的休息时间，都不会结束这次赴约。",
        choices: [],
      },
      result: {
        image: "games/count-table-smile-v1.webp",
        title: "七张牌都已落下",
        speaker: "伯爵",
        text:
          gameResult?.outcome === "win"
            ? "这一局是您赢了。牌先别收，我们看看分数是从哪一轮拉开的。"
            : gameResult?.outcome === "tie"
              ? "平局。我们把七张牌都打完了，谁也没多拿到一点便宜。您最犹豫的是哪一手？可以翻回去看看。"
              : "这一局我多拿了些分。若您愿意，收牌前可以再看一遍出牌记录，找找从哪一轮开始难以追回。",
        choices: [["continue", "收好纸牌"]],
      },
      closing: {
        image: salon,
        title: "客厅将要熄灯",
        speaker: "伯爵",
        text: "好了，今晚到这里。我也该离开这张桌子了。下回来，再陪您坐坐。",
        choices: [["finish", "结束这次赴约"]],
      },
    },
  };
  return {
    ...base,
    ...(scenes[id]?.[step] || {
      title: "这次会面已经结束",
      text: "请柬已经收好，您可以回府自由参观。",
    }),
  };
}
