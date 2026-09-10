/* Public, author-approved selections only. Private diary source is never requested. */
(() => {
  const dialog = document.createElement("dialog");
  dialog.id = "diary-folio";
  dialog.className = "diary-folio";
  dialog.setAttribute("aria-labelledby", "diary-title");
  dialog.innerHTML =
    '<header><button type="button" class="diary-back">← 合上纸夹</button><span>FEUILLETS</span></header><div class="diary-sheet"><p class="diary-kicker">伯爵的日记</p><h2 id="diary-title">日记选页</h2><nav class="diary-tabs" aria-label="日记分类"><button type="button" data-section="public" aria-pressed="true">伯爵选页</button><button type="button" data-section="borrowed" aria-pressed="false">借阅夹</button></nav><div class="diary-body" aria-live="polite"></div><div class="diary-type"><span>字样</span><button type="button" data-face="hand" aria-pressed="true">文楷</button><button type="button" data-face="book" aria-pressed="false">书刊体</button></div></div>';
  document.body.append(dialog);
  const panel = ManorMotion.createPanel(dialog),
    body = dialog.querySelector(".diary-body");
  let epoch = 0,
    controller = null,
    section = "public",
    entries = [];
  dialog.dataset.face = "hand";
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.textContent = "日记选页";
  trigger.className = "diary-trigger";
  // Deliberate navigation, not a floating hotspot over an unrelated pictured object.
  document.querySelector(".room-dock")?.append(trigger);
  function paragraph(text) {
    const p = document.createElement("p");
    p.textContent = text;
    return p;
  }
  function render() {
    body.replaceChildren();
    if (section === "borrowed") {
      body.append(paragraph("夹里还没有伯爵借给您的纸页。"));
      return;
    }
    if (!entries.length) {
      body.append(paragraph("还没有留给访客的选页。"));
      return;
    }
    for (const entry of entries) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "diary-entry";
      b.textContent = entry.title + " · " + entry.date;
      b.onclick = () => {
        body.replaceChildren();
        const title = document.createElement("h3");
        title.textContent = entry.title;
        body.append(title);
        entry.paragraphs.forEach((text) => body.append(paragraph(text)));
        const back = document.createElement("button");
        back.type = "button";
        back.textContent = "回到选页目录";
        back.onclick = () => {
          render();
          body.querySelector("button")?.focus();
        };
        body.append(back);
        ManorMotion.reveal?.(body);
        back.focus();
      };
      body.append(b);
    }
  }
  function cancel() {
    epoch++;
    controller?.abort();
    controller = null;
  }
  const close = () => {
    cancel();
    return panel.close();
  };
  trigger.onclick = async () => {
    cancel();
    section = "public";
    entries = [];
    const token = epoch;
    dialog
      .querySelectorAll("[data-section]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.section === section)),
      );
    body.replaceChildren(paragraph("正在打开纸夹……"));
    controller = new AbortController();
    const signal = controller.signal;
    const opening = panel.show();
    try {
      const response = await fetch("diary-catalog.json", { signal });
      if (!response.ok) throw new Error("LOAD_FAILED");
      const data = await response.json();
      if (token !== epoch) return;
      if (
        !Array.isArray(data.entries) ||
        data.entries.some(
          (e) =>
            typeof e.title !== "string" ||
            !Array.isArray(e.paragraphs) ||
            e.paragraphs.some((p) => typeof p !== "string"),
        )
      )
        throw new Error("CATALOG_INVALID");
      entries = data.entries;
      render();
    } catch (error) {
      if (token === epoch)
        body.replaceChildren(paragraph("日记目录未能载入，请合上后重试。"));
    }
    if ((await opening) && token === epoch)
      dialog.querySelector(".diary-back").focus();
  };
  dialog.querySelector(".diary-back").onclick = close;
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => {
    cancel();
    if (!document.querySelector("dialog[open]")) trigger.focus();
  });
  window.addEventListener("hashchange", () => {
    cancel();
    panel.close({ immediate: true });
  });
  document.addEventListener("manor:account", () => {
    cancel();
    panel.close({ immediate: true });
  });
  dialog.querySelectorAll("[data-section]").forEach(
    (b) =>
      (b.onclick = () => {
        section = b.dataset.section;
        dialog
          .querySelectorAll("[data-section]")
          .forEach((n) => n.setAttribute("aria-pressed", String(n === b)));
        render();
        ManorMotion.reveal?.(body);
      }),
  );
  dialog.querySelectorAll("[data-face]").forEach(
    (b) =>
      (b.onclick = () => {
        dialog.dataset.face = b.dataset.face;
        dialog
          .querySelectorAll("[data-face]")
          .forEach((n) => n.setAttribute("aria-pressed", String(n === b)));
      }),
  );
})();
