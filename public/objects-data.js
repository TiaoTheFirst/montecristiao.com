/* Original, editable scene candidates. Not biography, AI chat or a visitor profile. */
var ManorObjectStories = (() => {
  const works = {
    seascape: {
      room: "gallery",
      title: "远帆",
      eyebrow: "画廊 · 一幅海景",
      src: "assets/painted/seascape-distant-sail-v1.webp",
      alt: "灰蓝色海面与宽阔云层之间，一叶小小的白帆驶向远处",
      note: "我喜欢云边的亮色。帆画得小，远看却很显眼。",
      opening: "您先看。我站开一点。",
      choices: [
        {
          id: "sky",
          label: "我更喜欢这片灰蓝。",
          reply: "白帆旁边的颜色更灰些。我喜欢那一层。",
        },
        {
          id: "sail",
          label: "那艘船太小了。",
          reply: "是小。我倒喜欢这样，远看还是能找到它，又不至于挡住海面。",
        },
        {
          id: "dislike",
          label: "这幅不是我的趣味。",
          reply:
            "我倒很喜欢，尤其是云边的光。再往前看看吧，港口和石拱那两幅也可以走近看。",
        },
      ],
    },
    harbor: {
      room: "gallery",
      title: "归港灯火",
      eyebrow: "画廊 · 第二幅画",
      src: "assets/painted/gallery-harbor-v1.webp",
      alt: "落日下的石港，左侧停着系缆的帆船，右侧石塔的窄窗亮着灯",
      note: "船系在岸边。天色还亮着，塔窗里已经有了灯。",
    },
    arch: {
      room: "gallery",
      title: "石拱之后",
      eyebrow: "画廊 · 第三幅画",
      src: "assets/painted/gallery-arch-v1.webp",
      alt: "山路穿过破损的石拱，藤叶沿墙生长，远山和水面从拱下露出",
      note: "路从残墙下穿过去。石拱没有门扇，拱后的山水便成了另一幅画。",
    },
    books: {
      // Retained object ID; this is the author's manuscript, never the collection.
      room: "study",
      title: "尚未写完的手稿",
      eyebrow: "书房 · 伯爵的工作案前",
      // Image-space points inspected against each current wide shot, in percent.
      anchors: {
        "study-day": [36, 65],
        "study-night": [36, 65],
        "painted/study-occupied-day-80d8b971": [35, 70],
        "painted/study-occupied-night-71142954": [35, 70],
      },
    },
    tribute: {
      enabled: false,
      room: "library",
      title: "等待与希望",
      eyebrow: "藏书室 · 夹页题字",
    },
  };
  const present = (state, room) =>
    state.room === room &&
    state.count?.room === room &&
    !state.count.moving &&
    !state.count.unknown;
  // A reply requires the visitor's actual choice and the Count's presence in this room.
  function reply(id, choice, state) {
    const work = works[id];
    if (!work || !present(state, work.room)) return null;
    return work.choices?.find((item) => item.id === choice)?.reply || null;
  }
  const anchor = (id, imageKey) => works[id]?.anchors?.[imageKey] || null;
  return { works, present, reply, anchor };
})();
