/* One page-local shared experience. Not an affinity score, account memory or reward. */
var ManorMagicJourney = (() => {
  let carrying = false,
    revealed = false,
    told = false;
  const snapshot = () => ({ carrying, revealed, told });
  function borrow() {
    carrying = true;
    return snapshot();
  }
  function returnLight() {
    carrying = false;
    return snapshot();
  }
  function release() {
    if (!carrying) return false;
    carrying = false;
    if (!revealed) told = false;
    revealed = true;
    return true;
  }
  function clear() {
    carrying = revealed = told = false;
  }
  function decorate(page) {
    if (page.unavailable || told || (!carrying && !revealed)) return page;
    const choices = page.choices.filter((c) => !c.action.startsWith("magic-"));
    choices.unshift(
      revealed
        ? { label: "我把封蜡里的光放进了池里。", action: "magic-pool" }
        : { label: "您看，我带来了一点光。", action: "magic-light" },
    );
    return { ...page, choices };
  }
  function respond(action) {
    const page = (text, choices) => ({
      speaker: "伯爵",
      direction: "",
      text,
      choices,
    });
    if (action === "magic-pool" && revealed) {
      told = true;
      return page("您把它放进水里了？我还没试过。它有没有沉下去？", [
        { label: "没有，像一枚星纹停在水里。", action: "magic-floating" },
        { label: "我想再去看一眼。", action: "go-garden" },
        { label: "我先告辞。", action: "close" },
      ]);
    }
    if (action === "magic-floating" && revealed && told)
      return page("星纹也跟过去了？那光离开封蜡以后，还保留着原来的形状。", [
        { label: "让它在水里待一会儿。", action: "close" },
        { label: "我再去看看。", action: "go-garden" },
      ]);
    if (action === "magic-light" && carrying) {
      told = true;
      return page("拿稳。别攥紧，松着手就好。不想带了，放回封印里就是。", [
        { label: "我去花园试试。", action: "go-garden" },
        { label: "好，我先留着。", action: "close" },
      ]);
    }
    return null;
  }
  window.addEventListener("pagehide", clear);
  document.addEventListener("manor:account", clear);
  return { snapshot, borrow, returnLight, release, decorate, respond };
})();
