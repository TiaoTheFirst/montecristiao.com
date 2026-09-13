/* Append real releases; dates never manufacture a new story. IDs stay stable. */
var ManorGalleryProgram = (() => {
  const entries = [
    {
      id: "seascape-distance-01",
      painting: "seascape",
      released: "2026-09-13",
      status: "ready",
      title: "换个距离看远帆",
      description:
        "走近看浪头，退后找白帆；伯爵在场时，可以与他聊聊各自的偏好。",
      experience: "distance",
      question: "问问伯爵喜欢这幅画的哪里",
      answer:
        "罗什嫌我挂得远，说船都看不清。我请他退后两步，他反倒又走近了。您也试试，看您愿意站在哪里。",
      responses: [
        {
          label: "我更喜欢近看。",
          reply: "请便，我让开些。近处能看清浪头，我还是愿意退后看云。",
        },
        {
          label: "退后看，那点白帆反而显眼。",
          reply: "是啊。它只占那么一点，周围的海和云倒都留住了。",
        },
        ...ManorObjectStories.works.seascape.choices.map((c) => ({
          label: c.label,
          reply: c.reply,
          relationshipChoice: c.id,
        })),
      ],
    },
    {
      id: "harbor-roche-01",
      painting: "harbor",
      released: "2026-09-13",
      status: "ready",
      title: "一幅画的来历",
      description: "伯爵在画廊时，可以问起《归港灯火》，选择听他讲那段往事。",
      experience: "recollection",
    },
    {
      id: "arch-proof-01",
      painting: "arch",
      released: "2026-09-13",
      status: "ready",
      title: "石拱的两张试排稿",
      description: "比较完整缩图与局部裁图，也可以试试让画独占一页。",
      experience: "proofs",
      question: "问起这幅画最近的事",
      answer:
        "罗什想把它用在路程册里。若排成横图，就得裁掉一些；整幅缩小，又怕看不清。先把两种排法摆在一起看看，印书的事还没定。",
      responses: [
        {
          label: "完整缩图太小了。",
          reply: "确实。罗什担心的也是这个。让它单占一页试试，能看清多少？",
          fullPageReply:
            "所以您把整页都留给它了。现在细处清楚些，正文就得另找地方。这一版可以留着比较。",
        },
        {
          label: "裁开以后，石拱和路接不上了。",
          reply:
            "把取景往下移，路能多留一点，上面的石墙就又少了。原画里这两处，我都想留下。",
        },
        {
          label: "我想先看整页放画的版本。",
          reply: "可以。先把完整画放大，整册要增加多少页，还得请罗什算一算。",
          fullPageReply:
            "眼前就是这一版。画能保全，整册要增加多少页，还得请罗什算一算。",
        },
      ],
    },
  ];
  function visible(date, source = entries) {
    return source
      .filter((e) => e.status === "ready" && e.released <= date)
      .sort(
        (a, b) =>
          b.released.localeCompare(a.released) || a.id.localeCompare(b.id),
      );
  }
  function resolve(painting, date, id, source = entries) {
    return (
      visible(date, source).find(
        (e) => e.painting === painting && (!id || e.id === id),
      ) || null
    );
  }
  return { entries, visible, resolve };
})();
