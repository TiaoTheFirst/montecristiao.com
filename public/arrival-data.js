var ManorArrivalStory = (() => {
  const choice = (label, to, sound) => ({ label, to, sound });
  const steps = {
    street: {
      art: "street",
      place: "河街 · 赴约",
      title: "过桥，沿河。",
      text: "地址指向这座旧院。修理铺还在旁边，正面的拱门却封着木板。",
      choices: [choice("走近看看", "ruins", "steps")],
    },
    ruins: {
      art: "ruins",
      place: "旧院外",
      title: "正门封住了。",
      text: "残墙后面没有屋顶。沿墙的一条窄路，通向河边。",
      choices: [
        choice("向店家问路", "shop"),
        choice("沿旁边的小路看看", "alley", "steps"),
      ],
    },
    shop: {
      art: "ruins",
      place: "修理铺门口",
      title: "店家",
      text: "“地址没错。这道门封了好多年了。旁边有条小路，你往那边看看。”",
      choices: [choice("道谢，沿小路走", "alley", "steps")],
    },
    alley: {
      art: "alley",
      place: "沿院墙的小路",
      title: "再往前走一点。",
      text: "石墙在左，房屋在右。路的尽头能看见河，却没有看见院门。",
      choices: [choice("走到河边", "river", "steps")],
    },
    river: {
      art: "alley",
      place: "小路尽头",
      title: "已经到河边了。",
      text: "这一路似乎走过了头。来时的街口在身后。",
      choices: [choice("回头看看", "side", "steps")],
    },
    side: {
      art: "side",
      place: "墙垛后",
      title: "这里还有一扇门。",
      text: "从这个方向，才看见墙垛后凹进去的短廊。门槛中央干净些，门环也被磨亮了。",
      choices: [choice("走到门前", "door", "steps")],
    },
    door: {
      art: "door",
      place: "侧门前",
      title: "叩门。",
      text: "窄木门关着。外面的路仍在身后。",
      choices: [choice("轻叩两下", "knock1", "knock")],
    },
    knock1: {
      art: "door",
      place: "侧门前",
      title: "暂时没有回应。",
      text: "敲门声停了。身后仍能听见河风。",
      choices: [choice("再敲一次", "knock2", "knock")],
    },
    knock2: {
      art: "door",
      place: "侧门前",
      title: "门里还是很安静。",
      text: "等了一会儿，仍没有人应门。",
      choices: [choice("转身离开", "leaving", "latch")],
    },
    leaving: {
      art: "side",
      place: "短廊口",
      title: "身后响起门闩声。",
      text: "刚向外走了一步，木门内便传来了脚步。",
      choices: [choice("回头", "butler")],
    },
    butler: {
      art: "butler",
      place: "侧门",
      title: "巴蒂斯坦",
      text: "“您好。让您久等了。”",
      choices: [choice("这里是伯爵府吗？", "welcome")],
    },
    welcome: {
      art: "passage",
      place: "门房入口",
      title: "巴蒂斯坦",
      text: "“是。请进。”\n他侧身让开，门后的通道露了出来。",
      choices: [choice("跟随入内", "passage", "steps")],
    },
    passage: {
      art: "passage",
      place: "穿过门房",
      title: "通道并不长。",
      text: "街上的声音渐渐远了。通道尽头是一方露天的小院。",
      choices: [choice("走出门房", "sidecourt", "steps")],
    },
    sidecourt: {
      art: "sidecourt",
      place: "门房旁的小侧院",
      title: "先到了一方小院。",
      text: "从门房出来，院墙遮着主楼。右手的拱口后面传来水声。",
      choices: [
        choice("穿过右侧拱口", "approach", "steps"),
        choice("回门房看看", "return", "steps"),
      ],
    },
    approach: {
      art: "approach",
      place: "前院侧口",
      title: "绕过院墙。",
      text: "眼前开阔起来，喷泉就在近处。主楼的大门在庭院另一边。",
      choices: [choice("沿前院边走几步", "reveal", "steps")],
    },
    reveal: {
      art: "court",
      place: "蒙特克里斯条府",
      title: "府邸就在眼前。",
      text: "",
      reveal: true,
      choices: [
        choice("沿原路回小侧院", "backtrack", "steps"),
        choice("在前院停步", "threshold"),
      ],
    },
    backtrack: {
      art: "sidecourt",
      place: "回到小侧院",
      title: "门房在这里。",
      text: "沿刚才的拱口走回来，左侧的小门房还开着。来时的路要从这里出去。",
      choices: [
        choice("走到门房口", "return", "steps"),
        choice("回前院", "approach", "steps"),
      ],
    },
    return: {
      art: "return",
      place: "回望来路",
      title: "来时的路还在。",
      text: "门外那段窄路、电箱和排水管，仍是刚才的模样。",
      choices: [
        choice("回去也走这里吗？", "outside"),
        choice("回小侧院", "sidecourt", "steps"),
      ],
    },
    outside: {
      art: "return",
      place: "门槛内外",
      title: "巴蒂斯坦",
      text: "“是，沿原路出去就到了。”\n您向门外走了几步。街口仍在原处，再转身，管家还在门边等着。",
      choices: [choice("穿过门房，回小侧院", "sidecourt", "steps")],
    },
    threshold: {
      art: "court",
      place: "荣誉前院",
      title: "请自便。",
      text: "",
      choices: [choice("在前院看看", "finish")],
    },
  };
  const src = (art, light) =>
    "assets/" +
    (["sidecourt", "approach"].includes(art) ? "arrival-v2/" : "arrival-v1/") +
    art +
    "-" +
    light +
    ".webp";
  return { steps, src };
})();
