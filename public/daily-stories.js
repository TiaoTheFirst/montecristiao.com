/* Original miniature scenes. Only this page's in-memory choices are retained.
   No account profile, clock changes, completion score or daily reward. */
var ManorVisit = (() => {
  const pick = (label, next) => ({ label, next });
  const stories = {
    music: {
      start: "seats",
      nodes: {
        seats: {
          title: "小厅里的座位",
          prop: "cup",
          text: "两把椅子斜对着，中间是一张矮茶桌。客人来得少时，在这里坐就够了。",
          choices: [
            pick("坐一会儿", "@quiet"),
            pick("去大客厅", "@go-salon"),
            pick("回画廊看看", "@go-gallery"),
          ],
        },
      },
    },
    court: {
      start: "threshold",
      nodes: {
        threshold: {
          title: "前院的门",
          prop: "gate",
          text: "从这里能看见穿堂的门。您可以径直进去，也可以沿前院走几步，认一认这幢房子。",
          choices: [
            pick("沿前院看看两边的门", "doors"),
            pick("我想先进去坐坐", "@go-foyer"),
          ],
        },
        doors: {
          title: "认一认正门",
          prop: "gate",
          text: "两侧还有通往配楼的门。正对前院的这一扇才是穿堂：下次想出去，沿它走回来就行。",
          choices: [
            pick("记住这条进出的路", "remember"),
            pick("还是展开图册看看", "@map"),
          ],
        },
        remember: {
          title: "前院与穿堂",
          prop: "gate",
          mark: "entrance",
          text: "穿堂的门正对前院。沿这条路返回，就能出府。",
          choices: [
            pick("从正门进穿堂", "@go-foyer"),
            pick("在门前再待片刻", "@quiet"),
          ],
        },
      },
    },
    foyer: {
      start: "landmark",
      nodes: {
        landmark: {
          title: "穿堂的几个出口",
          prop: "plan",
          text: "穿堂一头连着前院，另一头通客厅，侧边是楼梯。",
          choices: [
            pick("我先记住穿堂", "hall"),
            pick("我想把客厅当作落脚处", "tea"),
          ],
        },
        hall: {
          title: "从穿堂认路",
          prop: "plan",
          mark: "hall",
          text: "画廊与穿堂相连；去藏书室，要沿楼梯上二层。",
          choices: [
            pick("先去看看画", "@go-gallery"),
            pick("请管家在图上指一下", "@map"),
          ],
        },
        tea: {
          title: "客厅就在前面",
          prop: "plan",
          mark: "salon",
          text: "先去客厅。那里还通着餐厅和花园，逛过一圈，仍可以回去坐。",
          choices: [
            pick("去客厅落脚", "@go-salon"),
            pick("先看看全屋图册", "@map"),
          ],
        },
      },
    },
    salon: {
      start: "pause",
      nodes: {
        pause: {
          title: "茶桌旁",
          prop: "cup",
          text: "乐匣在茶桌上。您可以坐一会儿，也可以经穿堂去看画。",
          choices: [
            pick("先不要声音", "still"),
            pick("我想听一小段曲子", "tune"),
            pick("去画廊看看", "@go-gallery"),
          ],
        },
        still: {
          title: "在客厅小坐",
          prop: "cup",
          mark: "quiet",
          text: "选择“收起文字”后可只看房间。音乐需另行关闭，静音按钮会保留。",
          choices: [
            pick("收起文字，坐一会儿", "@quiet"),
            pick("我又想听听乐匣了", "tune"),
          ],
        },
        tune: {
          title: "茶桌上的乐匣",
          prop: "music",
          mark: "music",
          text: "掀开盒盖，曲子才会响。离开客厅后仍能听见，随时可以停。",
          choices: [
            pick("打开乐匣的播放器", "@music"),
            pick("今天还是安静些", "still"),
          ],
        },
      },
    },
    dining: {
      start: "place",
      nodes: {
        place: {
          title: "先看看席间",
          prop: "table",
          text: "长桌旁摆着餐椅。开席时，伯爵会在这里用餐。",
          choices: [
            pick("我想一起用餐", "@table"),
            pick("今天不吃，看看就好", "passing"),
            pick("饭后想往哪边走？", "after"),
          ],
        },
        passing: {
          title: "餐厅外的去处",
          prop: "table",
          mark: "passing",
          text: "那就不入席。旁边是客厅，从那里还可以走到露台。下次想用餐，再来看看伯爵在不在。",
          choices: [
            pick("回客厅坐坐", "@go-salon"),
            pick("问问管家伯爵的去向", "@butler"),
          ],
        },
        after: {
          title: "餐后的一小段路",
          prop: "plan",
          mark: "garden",
          text: "去花园要经过客厅和露台，不必从备餐间绕。您现在也可以走这条路。",
          choices: [
            pick("沿这条路去花园", "@go-garden"),
            pick("先看看能否入席", "@table"),
          ],
        },
      },
    },
    gallery: {
      start: "distance",
      nodes: {
        distance: {
          title: "先从哪里看《远帆》？",
          prop: "frame",
          text: "题笺先不读。您可以先看海面，也可以顺着云层找那一点亮，再打开画面的近景。",
          choices: [
            pick("先看那片灰蓝", "blue"),
            pick("我想找云边的亮色", "light"),
            pick("直接把画打开", "@art"),
          ],
        },
        blue: {
          title: "从海面往上看",
          prop: "frame",
          mark: "blue",
          text: "先把目光留在海面。打开近景以后，再看看白帆有没有把您的目光带走。伯爵若在画廊，可以当面说说看法。",
          choices: [
            pick("打开《远帆》近景", "@art"),
            pick("换个地方看：从云边开始", "light"),
          ],
        },
        light: {
          title: "云层边缘的那一点",
          prop: "frame",
          mark: "light",
          text: "云边有一小片亮色，往下是海面和白帆。近景里能看得更清楚。",
          choices: [
            pick("打开近景找一找", "@art"),
            pick("留一条自己的看法", "@note-art"),
          ],
        },
      },
    },
    library: {
      start: "bookmark",
      nodes: {
        bookmark: {
          title: "书架之间",
          prop: "plan",
          text: "两面书架之间留着过道。这里安静，往右走就是书房。",
          choices: [
            pick("先在这里歇一会儿", "place"),
            pick("想记下一个问题", "question"),
            pick("去书房看看", "@go-study"),
          ],
        },
        place: {
          title: "先不说话",
          prop: "plan",
          mark: "place",
          text: "两面书架之间是过道，通向隔壁书房。",
          choices: [
            pick("安静坐着", "@quiet"),
            pick("去书房看看", "@go-study"),
          ],
        },
        question: {
          title: "给自己留一句话",
          prop: "paper",
          mark: "question",
          text: "自己的札记可以随时打开，保存后归在您的账号下。",
          choices: [
            pick("去书房理一理问题", "@go-study"),
            pick("现在就写一页札记", "@note-reading"),
          ],
        },
      },
    },
    study: {
      start: "draft",
      nodes: {
        draft: {
          title: "动笔之前",
          prop: "paper",
          text: "案上放着伯爵的手稿，暂不开放阅读。要记自己的事，可以另开一页札记。",
          choices: [
            pick("我想把一个问题说清楚", "question"),
            pick("看看案前的手稿", "@read"),
            pick("还没想好，先不写", "unwritten"),
          ],
        },
        question: {
          title: "先写真正卡住的地方",
          prop: "paper",
          mark: "question",
          text: "先写您不明白什么，再记是哪句话、哪件事让您停了下来。札记由您亲手保存，不会因为打开这张纸就留下记录。",
          choices: [
            pick("打开自己的札记", "@note-study"),
            pick("先去藏书室歇一会儿", "@go-library"),
          ],
        },
        unwritten: {
          title: "纸先空着",
          prop: "paper",
          mark: "later",
          text: "工作案旁通向藏书室。去花园则要下楼，经过客厅。",
          choices: [
            pick("去花园走一段", "@go-garden"),
            pick("在书房静坐片刻", "@quiet"),
          ],
        },
      },
    },
    letter: {
      start: "unsent",
      nodes: {
        unsent: {
          title: "先别封口",
          prop: "envelope",
          text: "写信请打开“我的通信”；只想记几句话，可以使用私人札记。",
          choices: [
            pick("有句话想说，但现在不想寄", "keep"),
            pick("我只是来看看，今天不写", "leave"),
          ],
        },
        keep: {
          title: "先放进自己的札记",
          prop: "envelope",
          mark: "private",
          text: "那就不写收件人。在札记里记下那句话，保存后只收在您自己的名片下；这里不会替您投递。",
          choices: [
            pick("打开一页不寄出的札记", "@note-letter"),
            pick("还是先搁一搁", "leave"),
          ],
        },
        leave: {
          title: "信纸仍是空白",
          prop: "envelope",
          mark: "blank",
          text: "出门沿回廊可回藏书室；书房在另一侧。",
          choices: [
            pick("回藏书室", "@go-library"),
            pick("我改主意了，想记几句", "keep"),
          ],
        },
      },
    },
    garden: {
      start: "path",
      nodes: {
        path: {
          title: "水池的两边",
          prop: "path",
          text: "沿池边走，能一直望见主楼；往树荫里走，窗子会被枝叶挡住一阵。两条路都会回到露台。",
          choices: [
            pick("沿着看得见主楼的这一边", "water"),
            pick("到树荫里走走", "shade"),
            pick("只想看风景", "@quiet"),
          ],
        },
        water: {
          title: "沿池边走",
          prop: "path",
          text: "您顺着池沿走。换了一个位置，窗里的亮色也在水面上挪开。露台始终在视线里。",
          choices: [
            pick("绕到露台前停下", "return"),
            pick("去看看池沿的刻痕", "@pool"),
          ],
        },
        shade: {
          title: "走进树影里",
          prop: "path",
          text: "枝叶挡住了几扇窗。再往前一点，露台会从另一边露出来。园中小亭还没有开放，今天不从那里穿过去。",
          choices: [
            pick("沿原路绕回露台", "return"),
            pick("先在这里待片刻", "@quiet"),
          ],
        },
        return: {
          title: "露台又在眼前",
          prop: "path",
          mark: "walked",
          text: "您绕回露台，通往客厅的门就在前面。",
          choices: [
            pick("进客厅坐坐", "@go-salon"),
            pick("留在园里看一会儿", "@quiet"),
          ],
        },
      },
    },
  };
  function create() {
    const positions = new Map(),
      marks = new Map();
    function view(room) {
      const story = stories[room];
      if (!story) return null;
      const id = positions.get(room) || story.start;
      const node = story.nodes[id];
      let echo = "";
      if (room === "study" && marks.get("library") === "question")
        echo = "刚才在藏书室想到的那个问题，要记在自己的札记里吗？";
      if (room === "salon" && marks.get("garden") === "walked")
        echo = "刚才那条园径走完，您又回到了客厅。";
      if (room === "garden" && marks.get("foyer") === "salon")
        echo = "您在穿堂选了客厅作落脚处。回去的门就在露台那边。";
      if (room === "foyer" && marks.get("court") === "entrance")
        echo = "前院认过的那扇门，现在就在身后。";
      return { ...node, id, room, echo, continued: positions.has(room) };
    }
    function choose(room, next) {
      const node = view(room);
      if (!node?.choices.some((c) => c.next === next)) return null;
      if (next.startsWith("@")) return { action: next.slice(1) };
      const target = stories[room].nodes[next];
      if (!target) return null;
      positions.set(room, next);
      if (target.mark) marks.set(room, target.mark);
      return { node: view(room) };
    }
    return {
      view,
      choose,
      restart(room) {
        positions.delete(room);
        return view(room);
      },
      context: () => Object.fromEntries(marks),
    };
  }
  return { stories, create };
})();
