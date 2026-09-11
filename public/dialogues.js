/* Original staging candidates. No generative chat, relationship scoring or hidden memory. */
var ManorDialogue = (() => {
  const choice = (label, action) => ({ label, action });
  const eveningMeal = (state) => (state.clock?.minute ?? 0) >= 17 * 60;
  const butler = (state, name) => ({
    speaker: "巴蒂斯坦",
    direction: "管家走到您面前，略一欠身。",
    text: name
      ? `${name}，您好。今天想去哪一间？`
      : "请吩咐。若是头一回来，我可以替您指路。",
    choices: [
      choice("我想找伯爵。", "where"),
      choice(name ? "看看我的名片。" : "这是我的名片。", "account"),
      choice("我的信放在哪里？", "letters-help"),
      choice("我有些分不清方向了。", "directions"),
    ],
  });
  function count(state, name) {
    const address = name ? `${name}，` : "";
    if (state.room === "study" && state.clock && state.clock.minute % 60 < 35)
      return {
        speaker: "伯爵",
        direction: "伯爵停笔，抬头看向您。",
        unavailable: true,
        text:
          address +
          "这几行我得先写完，恐怕不能陪您聊了。隔壁可以坐，手稿还不能给您看。",
        choices: [
          choice("好，我去隔壁坐坐。", "go-library"),
          choice("那我先不打扰了。", "close"),
        ],
      };
    if (state.meal)
      return {
        speaker: "伯爵",
        direction: "餐具搁在盘旁。伯爵身边留着一个席位。",
        text: eveningMeal(state)
          ? `${address}晚上好。晚餐刚开始，您若还没吃，就在这儿坐吧。`
          : `${address}午安。还没吃午饭的话，坐这儿一起用吧。`,
        choices: [
          choice("那我就不客气了。", "accept-meal"),
          choice("您先用餐，我改日再来。", "decline-meal"),
          choice("其实，我带了一个问题来。", "question"),
        ],
      };
    const rooms = {
      garden: [
        "伯爵站在露台边，园径从他身旁往下延伸。",
        "这条路走到底，会绕回水池。我刚走过一遍。您要在这儿歇一会儿，还是下去看看？",
      ],
      study: ["笔横放在纸上，伯爵的双手歇在桌边。", "请坐。您找我有什么事？"],
      library: [
        "书摊在伯爵膝上，他还留着刚才那一页。",
        "请坐。等我看完这一行。",
      ],
      gallery: ["伯爵站在画旁，没有挡住那幅海景。", "您也在看这幅？我让开些。"],
      salon: [
        "茶杯已经搁回碟上。伯爵靠在扶手椅里。",
        "茶还温着。先坐一会儿，路上可还顺利？",
      ],
    };
    const [direction, text] = rooms[state.room] || [
      "伯爵停下脚步。",
      "您好。找我有什么事？",
    ];
    return {
      speaker: "伯爵",
      direction,
      text: address + text,
      choices: [
        ...(state.room === "garden"
          ? [
              choice("从这儿往下该怎么走？", "garden-walk"),
              choice("我想自己坐坐。", "close"),
            ]
          : []),
        ...(state.room === "gallery"
          ? [choice("我想仔细看看这幅海景。", "object-seascape")]
          : []),
        ...(state.room === "study"
          ? [choice("看看案前那份手稿。", "object-books")]
          : []),
        choice("想和您随便聊聊。", "smalltalk"),
        choice("想看看您最近写的东西。", "manuscript"),
        choice("我带了一个问题来。", "question"),
      ],
    };
  }
  const pages = {
    "meal-paper": {
      speaker: "伯爵",
      direction: "伯爵暂时放下餐具。",
      text: "今天的消息我还没核实，先不拿来谈。",
      choices: [
        choice("继续用餐。", "quiet"),
        choice("留下对这段餐叙的意见。", "meal-feedback"),
      ],
    },
    "lunch-afternoon": {
      speaker: "伯爵",
      direction: "伯爵放下餐具，答道。",
      text: "午后我通常留在府里。您若想逛逛，花园从客厅那边过去。",
      choices: [
        choice("那我饭后去花园看看。", "go-garden"),
        choice("我想先问您一件事。", "question"),
        choice("先继续吃饭。", "quiet"),
      ],
    },
    "garden-walk": {
      speaker: "伯爵",
      direction: "园径就在露台下，水池后面还有一段路。",
      text: "沿靠树荫的那边走。绕过水池，回头就能看见这处露台，不会走丢。",
      choices: [
        choice("我先回客厅。", "go-salon"),
        choice("就在水池边停一下吧。", "close"),
      ],
    },
    "letters-help": {
      speaker: "巴蒂斯坦",
      direction: "他指了指通往楼上的方向。",
      text: "信放在楼上的通信小室。登记名片后，草稿和回信都收在您自己的私函匣里。",
      choices: [
        choice("带我去通信小室。", "go-letter"),
        choice("先替我登记名片。", "account"),
      ],
    },
    directions: {
      speaker: "巴蒂斯坦",
      direction: "管家展开随身带着的府邸图。",
      text: "先记住穿堂。下楼、出门，都能从那里走。您也可以沿刚才的路退回去。",
      choices: [
        choice("请在图上指给我看。", "map"),
        choice("带我回穿堂。", "go-foyer"),
      ],
    },
    "accept-meal": {
      speaker: "伯爵",
      direction: "您在伯爵身旁坐下。面包和餐盘已经摆在手边。",
      text: "面包在您手边，请用。",
      choices: [
        choice("这屋子平时也这么安静吗？", "dinner-talk"),
        choice("安静地陪他坐一会儿。", "quiet"),
        choice("用完餐，去花园走走。", "go-garden"),
      ],
    },
    "decline-meal": {
      speaker: "伯爵",
      direction: "伯爵点了点头，没有再劝。",
      text: "好，我就不留您了。客厅有茶，您自便。",
      choices: [
        choice("到客厅等一会儿。", "go-salon"),
        choice("向他告辞。", "close"),
      ],
    },
    "dinner-talk": {
      speaker: "伯爵",
      direction: "长桌另一端空着。",
      text: "平常只有我一个人用餐。坐在两头说话得提高嗓门，所以我让人把席位摆近些。",
      choices: [
        choice("坐这边确实方便说话。", "table-ease"),
        choice("用完餐去花园看看。", "go-garden"),
        choice("继续用餐。", "quiet"),
      ],
    },
    "table-ease": {
      speaker: "伯爵",
      direction: "伯爵点了点头。",
      text: "也方便递盘子。请用。",
      choices: [
        choice("好，先用餐。", "quiet"),
        choice("我吃好了，先告辞。", "close"),
      ],
    },
    "chat-salon": {
      speaker: "伯爵",
      direction: "伯爵看向茶桌上的乐匣。",
      text: "要听乐匣吗？开关就在上面。",
      choices: [
        choice("好，我打开听听。", "salon-sound"),
        choice("我更喜欢安静。", "salon-still"),
      ],
    },
    "salon-sound": {
      speaker: "伯爵",
      direction: "他朝乐匣示意。",
      text: "请开吧。音量也能调，别盖过说话声就行。",
      choices: [
        choice("我去打开乐匣。", "close"),
        choice("您写东西时也听吗？", "salon-volume"),
      ],
    },
    "salon-volume": {
      speaker: "伯爵",
      direction: "伯爵笑了一下。",
      text: "写东西时不开。我会跟着曲子走，写到一半，忘了前一句要说什么。",
      choices: [
        choice("那留在客厅听吧。", "close"),
        choice("我想去看看别的房间。", "go-gallery"),
      ],
    },
    "salon-still": {
      speaker: "伯爵",
      direction: "伯爵点头。",
      text: "好。",
      choices: [
        choice("那就先不说话了。", "close"),
        choice("其实，有个小问题想问。", "question"),
      ],
    },
    "chat-library": {
      speaker: "伯爵",
      direction: "伯爵仍留着手边那一页。",
      text: "您看书时，会把没看懂的地方留着，还是非得当场弄明白？",
      choices: [
        choice("我总想当场弄清楚。", "library-stuck"),
        choice("先往下读，也许后面就明白了。", "library-onward"),
      ],
    },
    "library-stuck": {
      speaker: "伯爵",
      direction: "书还摊在他膝上。",
      text: "我会先翻后面，找找作者有没有举例，再回来读这一段。",
      choices: [
        choice("我倒是很少先往后翻。", "close"),
        choice("今天先不较这个劲了。", "close"),
      ],
    },
    "library-onward": {
      speaker: "伯爵",
      direction: "伯爵点了点头。",
      text: "我也这样读。可惜有些书，后面还是一样难懂。",
      choices: [
        choice("那我先不打扰您读书了。", "close"),
        choice("我去别处走走。", "go-gallery"),
      ],
    },
    "chat-study": {
      speaker: "伯爵",
      direction: "那份改过的纸还摊在桌上。",
      text: "我在删重复的解释。有一段删掉了，下一页又碰见同样的意思。",
      choices: [
        choice("那就把下一页那段也删掉？", "study-first"),
        choice("我写东西也容易重复。", "study-long"),
      ],
    },
    "study-first": {
      speaker: "伯爵",
      direction: "伯爵看了一眼稿子。",
      text: "还得看看它后面接的是什么。直接划掉，后面可能就接不上了。",
      choices: [
        choice("那我去隔壁坐坐。", "go-library"),
        choice("那我就不打断您了。", "close"),
      ],
    },
    "study-long": {
      speaker: "伯爵",
      direction: "他把目光从纸上收回来。",
      text: "我写的时候也没察觉。把几页摊在一起看，才发现绕来绕去说的都是同一件事。",
      choices: [
        choice("您继续改，我先不打扰了。", "close"),
        choice("我去通信小室记个札记。", "go-letter"),
      ],
    },
    "chat-gallery": {
      speaker: "伯爵",
      direction: "伯爵仍站在画旁。",
      text: "您刚才先看见了云，还是那条船？",
      choices: [
        choice("先看见了船，云倒没留意。", "gallery-ship"),
        choice("先看见了那片灰蓝。", "gallery-blue"),
      ],
    },
    "gallery-ship": {
      speaker: "伯爵",
      direction: "那幅海景就在他身旁。",
      text: "帆虽然小，颜色倒亮。我也先看见了它。",
      choices: [
        choice("再让我仔细看看。", "object-seascape"),
        choice("我想换个房间。", "close"),
      ],
    },
    "gallery-blue": {
      speaker: "伯爵",
      direction: "画前的位置空着。",
      text: "我喜欢白帆旁边那一层，蓝里掺着灰。近看更清楚些。",
      choices: [
        choice("把近景打开看看。", "object-seascape"),
        choice("不看题笺，我再看一会儿。", "close"),
      ],
    },
    "chat-garden": {
      speaker: "伯爵",
      direction: "伯爵仍站在露台边。",
      text: "从露台下去就是水池。您想往哪边走？",
      choices: [
        choice("给我指一下路吧。", "garden-walk"),
        choice("就在这里停一下。", "garden-rest"),
      ],
    },
    "garden-rest": {
      speaker: "伯爵",
      direction: "露台边留着位置，往下便是园径。",
      text: "那就在这儿歇歇。回客厅走露台那扇门。",
      choices: [
        choice("我自己待一会儿。", "close"),
        choice("我先回客厅。", "go-salon"),
      ],
    },
    quiet: {
      speaker: "伯爵",
      direction: "伯爵重新拿起餐具。",
      text: "请慢用。",
      choices: [
        choice("留在餐厅。", "close"),
        choice("起身告辞。", "go-salon"),
      ],
    },
    question: {
      speaker: "伯爵",
      direction: "伯爵等您说下去。",
      text: "若一时说不清，就写下来。人名可以隐去，把发生过的事交代清楚。楼上的通信小室有信纸。",
      choices: [
        choice("去通信小室写信。", "go-letter"),
        choice("今天先不谈这件事。", "close"),
      ],
    },
    manuscript: {
      speaker: "伯爵",
      direction: "伯爵指向楼上。",
      text: "手稿留在书房的工作案上，还没写完。等我改妥了，再请您看。",
      choices: [
        choice("去书房看看。", "go-study"),
        choice("那就先不打扰了。", "close"),
      ],
    },
    smalltalk: {
      speaker: "伯爵",
      direction: "伯爵听您说完，略带笑意。",
      text: "府里这些房间，您逛到哪儿了？",
      choices: [
        choice("说来惭愧，我确实走错了门。", "lost"),
        choice("我很喜欢这里的花园。", "garden-talk"),
      ],
    },
    lost: {
      speaker: "伯爵",
      direction: "伯爵笑了笑。",
      text: "要去哪里？可以让巴蒂斯坦给您指路。",
      choices: [
        choice("还是请管家指一下路。", "call-butler"),
        choice("我再自己走走。", "close"),
      ],
    },
    "garden-talk": {
      speaker: "伯爵",
      direction: "他朝窗外看去。",
      text: "我常走池边那条路。下午晒，走另一边的树荫会舒服些。",
      choices: [
        choice("去花园坐坐。", "go-garden"),
        choice("留在这里。", "close"),
      ],
    },
    empty: {
      speaker: "巴蒂斯坦",
      direction: "管家看了看已经收好的餐桌。",
      text: "这会儿还没开席。伯爵午后一点、傍晚六点三刻会动身来餐厅。您想先坐坐，还是去找他？",
      choices: [
        choice("伯爵现在在哪里？", "where"),
        choice("回客厅。", "go-salon"),
      ],
    },
  };
  function page(id, state) {
    if (id === "smalltalk" && pages["chat-" + state.room])
      id = "chat-" + state.room;
    const p = { ...pages[id] };
    if (id === "lunch-afternoon" && typeof Manor === "object" && Manor.validDate(state.clock?.date)) {
      const next = Manor.state(state.clock.date, 960);
      const plans = {
        garden: "我下午打算去花园走走。您若想去，从客厅那边过去就是露台。",
        salon: "我下午会在客厅坐一会儿。您若不赶时间，到时过来喝杯茶。",
        library: "我下午想在藏书室看一会儿书。您若有事找我，可以到那边来。",
      };
      p.text = plans[next.destination || next.room] || p.text;
    }
    if (id === "accept-meal") {
      p.text = eveningMeal(state)
        ? "请用。您想聊几句，还是安静吃顿饭？"
        : "请用。您下午还有安排吗？不必陪我坐到散席。";
      p.choices = eveningMeal(state)
        ? [
            choice("今天有什么值得聊的消息？", "meal-paper"),
            choice("这屋子平时也这么安静吗？", "dinner-talk"),
            choice("先安静地吃一会儿。", "quiet"),
          ]
        : [
            choice("您下午打算做什么？", "lunch-afternoon"),
            choice("今天报上有什么消息？", "meal-paper"),
            choice("我先用餐，一会儿还得走。", "quiet"),
          ];
    }
    if (id === "meal-paper") {
      const edition =
        typeof window !== "undefined"
          ? window.ManorDailyPaper?.current(state)
          : null;
      p.text = edition
        ? eveningMeal(state)
          ? edition.dinner
          : edition.lunch
        : eveningMeal(state)
          ? "今晚先不谈新闻了。您若有想谈的事，可以从头说给我听。"
          : "今天的消息我还没核实，先不拿来谈。您下午有什么安排？";
      if (edition)
        p.source = {
          url: edition.source_url,
          title: edition.title,
          date: edition.source_date,
        };
      else
        p.choices = eveningMeal(state)
          ? [
              choice("我带来了一个问题。", "question"),
              choice("那就先吃饭。", "quiet"),
            ]
          : [
              choice("您下午打算做什么？", "lunch-afternoon"),
              choice("我先用餐。", "quiet"),
            ];
    }
    const visit =
      typeof window !== "undefined"
        ? window.ManorVisitSession?.context()
        : null;
    if (id === "chat-salon" && visit?.garden === "walked")
      p.text = "要听乐匣吗？开关就在上面。";
    if (id === "garden-talk" && state.room === "garden")
      p.direction = "他朝水池旁的小径看去。";
    if (id === "question" && state.room === "garden")
      p.direction = "伯爵停下脚步，等您继续。";
    if (id === "manuscript") {
      p.direction =
        state.room === "study"
          ? "伯爵看了看案上的纸页。"
          : "伯爵说起书房里未完的稿子。";
      if (state.room === "study")
        p.choices = [
          choice("看看案前的手稿。", "object-books"),
          choice("那就先不打扰了。", "close"),
        ];
    }
    if (
      id === "letters-help" &&
      ["library", "study", "letter"].includes(state.room)
    )
      p.direction = "管家朝回廊的方向示意。";
    return p;
  }
  return { butler, count, pages, choice, page };
})();
