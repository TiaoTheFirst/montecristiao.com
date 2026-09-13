import { newsPages, estateArrangements } from "./estate-news-data.mjs";

const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};

export function renderEstateNews(host, { go, stamp }) {
  const pages = newsPages();
  const folio = node("section", undefined, "estate-news-paper");
  folio.setAttribute("aria-label", "府中近事");
  folio.append(
    node("p", "巴蒂斯坦整理 · 案上留阅", "news-byline"),
    node("h3", "府中近事"),
  );
  const article = node("article");
  const turns = node("nav", undefined, "news-turns");
  turns.setAttribute("aria-label", "近事翻页");
  const read = (index, focus = false) => {
    const page = pages[index];
    article.replaceChildren();
    const date = node("time", page.date.replaceAll("-", "."));
    date.dateTime = page.date;
    const title = node("h4", page.title);
    title.tabIndex = -1;
    article.append(date, title, node("p", page.summary, "news-summary"));
    for (const text of page.paragraphs) article.append(node("p", text));
    const link = node("button", page.action.label + " →", "news-go");
    link.type = "button";
    link.onclick = () => go(page.action.room);
    article.append(link);
    [...turns.children].forEach((button, i) =>
      button.setAttribute("aria-current", i === index ? "page" : "false"),
    );
    if (focus) {
      window.ManorMotion?.reveal(article);
      title.focus({ preventScroll: true });
      title.scrollIntoView({
        block: "nearest",
        behavior: window.ManorMotion?.reduced() ? "instant" : "smooth",
      });
    }
  };
  pages.forEach((page, index) => {
    const button = node("button", `${index + 1}. ${page.title}`);
    button.type = "button";
    button.onclick = () => read(index, true);
    turns.append(button);
  });
  folio.append(article, turns);
  if (estateArrangements.length) {
    const details = node("details", undefined, "news-arrangements");
    details.append(node("summary", "正在准备的事"));
    for (const item of estateArrangements)
      details.append(node("h4", item.title), node("p", item.text));
    folio.append(details);
  }
  const mark = node("button", "翻到空白页，留一枚来访图记", "news-stamp");
  mark.type = "button";
  mark.onclick = stamp;
  folio.append(mark);
  host.replaceChildren(folio);
  read(0);
}

// A quiet, discoverable entrance; no automatic modal, badge inflation or new storage.
const entrance = node(
  "button",
  `府中近事 · ${newsPages()[0].date.slice(5).replace("-", ".")}  →`,
  "estate-news-entrance",
);
entrance.type = "button";
entrance.hidden = true;
entrance.onclick = () => window.ManorRoomPlay?.open("ledger");
document.querySelector("#room-line")?.after(entrance);
function syncEntrance() {
  entrance.hidden = window.ManorView?.snapshot().room !== "foyer";
}
for (const event of ["manor:painted", "manor:committed", "manor:state"])
  window.addEventListener(event, syncEntrance);
syncEntrance();
