/* Original visual observations, checked against the actual artwork pixels. */
var ManorGalleryData = (() => {
  const works = {
    seascape: {
      title: "远帆",
      src: "assets/painted/seascape-distant-sail-v1.webp",
      caption: "海面很宽，那点白色却把视线留住了。",
      label: "一片白帆，几乎贴着海天交界。",
      spots: [
        {
          id: "sail",
          x: 68.7,
          y: 71.5,
          rx: 4,
          ry: 5,
          clue: "找一处不属于浪花的白色。",
          hint: "海天交界偏右。",
          title: "一叶白帆",
          text: "两片细小的帆挨着桅杆。它离画面的中心很远，却仍能被看见。",
        },
        {
          id: "cloud",
          x: 41,
          y: 13,
          rx: 12,
          ry: 12,
          clue: "云层哪里被光镶出边缘？",
          hint: "上方偏左，厚云边上的浅金色。",
          title: "云边的光",
          text: "浅金色留在厚云的边缘，云腹仍是灰蓝。亮处很薄，没有把整片天空涂亮。",
        },
        {
          id: "foam",
          x: 62,
          y: 90,
          rx: 13,
          ry: 8,
          clue: "近处的浪和远处有什么不同？",
          hint: "画面下方偏右，较宽的白色浪头。",
          title: "近岸浪头",
          text: "这里能分出宽大的浪脊与细碎白沫。越靠近地平线，这些痕迹越细。",
        },
      ],
    },
    harbor: {
      title: "归港灯火",
      src: "assets/painted/gallery-harbor-v1.webp",
      caption: "船系在岸边。天色还亮着，塔窗里已经有了灯。",
      label: "船没有扬帆，岸上的窗已经亮起。",
      spots: [
        {
          id: "window",
          x: 90,
          y: 31,
          rx: 5,
          ry: 5,
          clue: "除了天光，还有哪里在发亮？",
          hint: "右侧石塔的窗。",
          title: "塔窗灯火",
          text: "石塔大半仍暗着，窄窗透出一小块暖黄。它和水上的天光相隔很远。",
        },
        {
          id: "rope",
          x: 26,
          y: 79,
          rx: 9,
          ry: 7,
          clue: "是什么把船留在了岸边？",
          hint: "左下方石柱上盘着的东西。",
          title: "岸边缆绳",
          text: "缆绳在石柱上绕了几圈，一段绷向船头，另一段贴着岸边垂下。",
        },
        {
          id: "pennant",
          x: 34,
          y: 35,
          rx: 6,
          ry: 5,
          clue: "灰褐色的船上，有一笔颜色很醒目。",
          hint: "左侧桅杆中段的小旗。",
          title: "桅杆红旗",
          text: "红旗朝右垂下。和大块金色天空相比，它只占很小一笔。",
        },
      ],
    },
    arch: {
      title: "石拱之后",
      src: "assets/painted/gallery-arch-v1.webp",
      caption: "路从残墙下穿过去。石拱没有门扇，拱后的山水便成了另一幅画。",
      label: "石墙已经残缺，一条路还从中穿过。",
      spots: [
        {
          id: "birds",
          x: 24,
          y: 15,
          rx: 8,
          ry: 6,
          clue: "天空里有两笔很轻的形状。",
          hint: "左上方，两只浅色飞鸟。",
          title: "两只飞鸟",
          text: "两只鸟一前一后，翅膀方向也不同。它们比石墙轻得多。",
        },
        {
          id: "ivy",
          x: 81,
          y: 19,
          rx: 10,
          ry: 12,
          clue: "墙上有什么仍在生长？",
          hint: "拱顶右侧，沿石缝攀着的叶子。",
          title: "石缝藤叶",
          text: "藤叶顺着裂缝往下长。残墙上没有人物，叶子却让这里不像完全静止。",
        },
        {
          id: "brick",
          x: 32,
          y: 76,
          rx: 7,
          ry: 5,
          clue: "脚下哪块东西的颜色与石头不同？",
          hint: "小路左侧，偏红的一块砖。",
          title: "路边红砖",
          text: "红砖落在灰石与草之间。视线从这里沿小路向上，刚好能穿过石拱。",
        },
      ],
    },
  };
  const ids = Object.keys(works),
    key = "manor-gallery-notebook-v1";
  const valid = new Set(
    ids.flatMap((id) => works[id].spots.map((s) => `${id}:${s.id}`)),
  );
  function read(raw) {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return {
        found: [
          ...new Set(
            (Array.isArray(parsed?.found) ? parsed.found : []).filter((x) =>
              valid.has(x),
            ),
          ),
        ],
        labels: parsed?.labels === true,
      };
    } catch {
      return { found: [], labels: false };
    }
  }
  function hit(id, x, y) {
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 ||
      x > 100 ||
      y < 0 ||
      y > 100
    )
      return null;
    return (
      works[id]?.spots.find(
        (s) => ((x - s.x) / s.rx) ** 2 + ((y - s.y) / s.ry) ** 2 <= 1,
      ) || null
    );
  }
  function labelsMatch(order) {
    return (
      Array.isArray(order) &&
      order.length === ids.length &&
      ids.every((id, i) => order[i] === id)
    );
  }
  return { works, ids, key, read, hit, labelsMatch };
})();
