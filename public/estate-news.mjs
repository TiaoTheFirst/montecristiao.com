import { newsPages, estateArrangements } from "./estate-news-data.mjs";

const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};

export function renderEstateNews(host, { go, stamp }) {
  const pages = newsPages();
  const desk = node("section", undefined, "news-desk");
  desk.setAttribute("aria-label", "管家案台");
  const note = node("button", undefined, "news-feedback-note");
  note.type = "button";
  note.dataset.feedback = "direct";
  note.setAttribute("aria-label", "来访便笺：反馈问题或建议");
  note.append(
    node("span", "致 管 家", "note-address"),
    node("strong", "来访便笺"),
    node("span", "反馈问题或建议 →", "note-action"),
  );
  desk.append(note);
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
  desk.append(folio);
  host.replaceChildren(desk);
  read(0);
}

// The scene's ledger hotspot and room-dock action open this folio.
// Keep edition dates inside the paper, rather than adding a second scene CTA.
