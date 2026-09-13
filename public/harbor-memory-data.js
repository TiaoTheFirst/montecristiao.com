/* Authored fiction, told on request. No historical claims or visitor biography. */
var ManorHarborMemoryData = (() => {
  const pages = [
    {
      title: "书铺楼上",
      src: "assets/painted/harbor-memory-bookshop-v1.webp",
      alt: "旧书铺楼上，戴象牙色面具的伯爵坐在左侧读书，罗什坐在右侧，港口画挂在两人身后",
      text: "那时，画还挂在罗什书铺楼上的小室。伯爵去取书，常在那里等他收铺。",
      lines: [
        ["罗什", "楼下还有一位客人。您再坐一会儿？"],
        ["伯爵", "去吧。这一章我还没看完。"],
        ["罗什", "这本先别带走，是我借来的。"],
        ["伯爵", "放心。您回来以前，我还翻不到最后一页。"],
      ],
    },
    {
      title: "搬店那天",
      src: "assets/painted/harbor-memory-gift-v1.webp",
      alt: "书铺里的书已装箱，港口画从墙上取下放在桌上，罗什扶着画框，伯爵站在左边看画",
      text: "后来罗什搬了店。书装进箱子，那幅画也从墙上取了下来。",
      lines: [
        ["罗什", "新铺子要多放一排书架。这幅，您带回去吧。"],
        ["伯爵", "挂了这么多年，您舍得？"],
        ["罗什", "您先挂着。我去看您的时候，也能看看它。"],
        ["伯爵", "好。我让人腾一面墙，别的画挪一挪。"],
      ],
    },
  ];
  function canTell(pinned, current, available = true) {
    return !!(
      available &&
      ManorObjectStories.present(pinned, "gallery") &&
      ManorObjectStories.present(current, "gallery") &&
      !ManorContinuity.endReason(pinned, current)
    );
  }
  return { pages, canTell };
})();
