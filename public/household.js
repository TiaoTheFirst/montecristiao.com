(() => {
  const $ = (s) => document.querySelector(s);
  const set = (id, text) => {
    $(id).textContent = text;
  };
  function link(id, url, text) {
    const a = $(id);
    a.removeAttribute("href");
    if (new URL(url).protocol === "https:") a.href = url;
    a.textContent = text;
  }
  fetch("content/household.json", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw Error();
      return r.json();
    })
    .then((data) => {
      const today = new Date(Date.now() + 8 * 3600000)
        .toISOString()
        .slice(0, 10);
      const editions = data.editions
        .filter((e) => e.date <= today)
        .sort((a, b) => b.date.localeCompare(a.date));
      if (!editions.length) throw Error();
      const select = $("#edition-date");
      for (const e of editions)
        select.add(new Option(e.date + " · " + e.title, e.date));
      function render() {
        const e = editions.find((e) => e.date === select.value);
        set(
          "#paper-status",
          e.date === today
            ? e.date + " · 今日选读"
            : e.date + " · 往期选读（不是今日新闻）",
        );
        for (const [id, value] of Object.entries({
          "news-title": e.news_title,
          news: e.news,
          "curiosity-title": e.curiosity.title,
          curiosity: e.curiosity.body,
          "life-title": e.life.title,
          life: e.life.body,
          "life-note": e.life.note,
          lunch: e.lunch,
          dinner: e.dinner,
        }))
          set("#" + id, value);
        link(
          "#source",
          e.source_url,
          e.source_name + " · 发布于 " + e.source_date + " ↗",
        );
        link(
          "#curiosity-source",
          e.curiosity.source_url,
          e.curiosity.source_name + " ↗",
        );
        $("#paper").hidden = false;
      }
      select.onchange = render;
      render();
    })
    .catch(() =>
      set(
        "#paper-status",
        "这份报暂时没取到。稍后刷新再看，也可以先回府里走走。",
      ),
    );
})();
