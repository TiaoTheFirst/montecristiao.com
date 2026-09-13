/* Reversible object viewer. Gallery observations stay in browser-local storage. */
(() => {
  "use strict";
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  const dialog = el("dialog", "object-folio");
  dialog.id = "folio-dialog";
  dialog.setAttribute("aria-labelledby", "folio-title");
  dialog.innerHTML =
    '<header class="folio-bar"><button type="button" class="folio-back">← 放回原处</button><span class="folio-place"></span><button type="button" class="folio-sound" aria-pressed="false">♫ 开启音乐</button></header><div class="folio-body"></div>';
  document.body.append(dialog);
  const body = dialog.querySelector(".folio-body");
  let opener,
    request = 0,
    abort,
    state,
    closing = false,
    disposePainting;
  const button = (label, fn, cls = "folio-action") => {
    const node = el("button", cls, label);
    node.type = "button";
    node.onclick = fn;
    return node;
  };
  const link = (href, label) => {
    const node = el("a", "folio-action", label);
    node.href = href;
    return node;
  };
  const sound = dialog.querySelector(".folio-sound");
  const syncMusic = () => {
    sound.textContent = ManorMusic.playing ? "♫ 静音" : "♫ 开启音乐";
    sound.setAttribute("aria-pressed", String(ManorMusic.playing));
  };
  sound.onclick = async () => {
    try {
      await ManorMusic.toggle();
      syncMusic();
    } catch {
      sound.textContent = "♫ 重试音乐";
    }
  };
  window.addEventListener("manor:music", syncMusic);
  async function close(immediate = false) {
    if (closing || !dialog.open) return;
    closing = true;
    ++request;
    abort?.abort();
    disposePainting?.();
    disposePainting = null;
    if (!immediate)
      await ManorMotion.animate(dialog, [{ opacity: 1 }, { opacity: 0 }], 210);
    dialog.close();
    closing = false;
  }
  dialog.addEventListener("close", () => {
    if (dialog.open) return;
    disposePainting?.();
    disposePainting = null;
    ++request;
    abort?.abort();
    ManorMusic.duck("folio", false);
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  dialog.querySelector(".folio-back").onclick = () => close();
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  window.addEventListener("hashchange", () => close(true));
  window.addEventListener("manor:committed", () => close(true));
  const heading = (work) => {
    const head = el("div", "folio-heading");
    head.append(el("p", "folio-kicker", work.eyebrow));
    const title = el("h2", "", work.title);
    title.id = "folio-title";
    head.append(title);
    return head;
  };
  function renderPainting(work, token, episode) {
    const canvas = el("div", "folio-canvas");
    const image = el("img");
    image.alt = work.alt;
    image.width = 1536;
    image.height = 1024;
    canvas.append(image);
    const notice = el("p", "folio-load", "画面正在载入……");
    notice.setAttribute("role", "status");
    canvas.append(notice);
    const retry = button("重新载入画面", () => load(), "folio-retry");
    retry.hidden = true;
    canvas.append(retry);
    const load = async () => {
      notice.hidden = false;
      retry.hidden = true;
      notice.textContent = "画面正在载入……";
      try {
        await ManorMotion.prepare(work.src);
        if (token !== request || !dialog.open) return;
        image.src = work.src;
        await image.decode();
        if (token !== request) return;
        notice.hidden = true;
      } catch {
        if (token !== request) return;
        notice.textContent = "画面暂未载入。您可以重试，或先读画旁的短笺。";
        retry.hidden = false;
      }
    };
    const side = el("section", "folio-notes");
    side.append(heading(work));
    const note = el("blockquote", "folio-inscription", work.note);
    side.append(
      note,
      el("p", "folio-sign", work.choices ? "—— 画旁短笺 · 伯爵" : "画作简介"),
    );
    const actions = el("div", "folio-links");
    actions.append(
      button("只看画", () => {
        const quiet = dialog.classList.toggle("folio-art-only");
        actions.firstChild.textContent = quiet ? "展开短笺与交谈" : "只看画";
        actions.firstChild.setAttribute("aria-pressed", String(quiet));
      }),
    );
    side.append(
      actions,
      el("p", "folio-provenance", "本站原创绘景 · AI 辅助制作"),
    );
    body.append(canvas, side);
    const disposeGallery = window.ManorGallery?.mount({
      id: dialog.dataset.folio,
      canvas,
      image,
      side,
      open,
    });
    window.ManorGalleryScenes?.arrange({ side, body, open });
    const disposeScene = window.ManorGalleryScenes?.mount({
      id: dialog.dataset.folio,
      side,
      body,
      dialog,
      pinned: state,
      open,
      episode,
    });
    const disposeMemory =
      dialog.dataset.folio === "harbor"
        ? window.ManorHarborMemory?.mount({ side, body, dialog, pinned: state })
        : null;
    disposePainting = () => {
      disposeScene?.();
      disposeMemory?.();
      disposeGallery?.();
    };
    load();
  }
  async function renderReading(work, token) {
    if (
      typeof ManorAvailability === "undefined" ||
      !ManorAvailability.manuscripts
    ) {
      const paper = el("article", "folio-paper tribute-paper");
      paper.append(
        heading(work),
        el("h3", "", "似乎还没写完。"),
        el("p", "", "《人际关系建模》的手稿还在打磨，暂不开放阅读。"),
        el("p", "", "未定稿，请勿传阅。"),
        el("p", "folio-sign", "—— 伯爵"),
        link("manuscripts.html", "看看手稿的近况 ↗"),
      );
      body.append(paper);
      return;
    }
    const paper = el("article", "folio-paper");
    paper.append(heading(work));
    const content = el("div", "folio-reading");
    const status = el("p", "folio-reading-status", "正在翻开手稿……");
    status.setAttribute("role", "status");
    content.append(status);
    paper.append(content);
    const side = el("aside", "folio-reading-side");
    const here = ManorObjectStories.present(state, work.room);
    side.append(
      el("p", "folio-kicker", here ? "伯爵在一旁" : "页边短笺"),
      el("p", "", here ? "您先读。有想问的，可以记下来。" : "这份是手稿选段。"),
      el("p", "folio-sign", "—— 伯爵"),
    );
    side.append(
      button("放大字号", function enlarge() {
        const large = dialog.classList.toggle("folio-large");
        this.textContent = large ? "恢复字号" : "放大字号";
        this.setAttribute("aria-pressed", String(large));
      }),
    );
    side.append(
      button("记住这一页", () =>
        window.ManorMemory?.open({
          kind: "bookmark",
          resource: "introduction",
          anchor: "section-1",
          room: "study",
          title: "引言 · 我想把关系讲清楚",
        }),
      ),
    );
    side.append(
      link("reading/introduction.html", "继续读完整引言 ↗"),
      link("manuscripts.html", "查看两版手稿目录 ↗"),
    );
    side.append(
      el(
        "p",
        "folio-provenance",
        "选段读取自站内引言，不另存正文副本。未出版、未开售；只有主动确认保存的书签会进入账号。",
      ),
    );
    body.append(paper, side);
    abort = new AbortController();
    try {
      const res = await fetch("reading/introduction.html", {
        signal: abort.signal,
      });
      if (!res.ok) throw new Error("READING_UNAVAILABLE");
      const doc = new DOMParser().parseFromString(
        await res.text(),
        "text/html",
      );
      if (request !== token || !dialog.open) return;
      const article = doc.querySelector(".reader");
      const first = article?.querySelector("h2");
      if (!first) throw new Error("READING_SECTION_MISSING");
      content.replaceChildren(
        el("p", "folio-source", "《人际关系建模》 · 专业版引言 · 原文选段"),
        el("h3", "", first.textContent),
      );
      let node = first.nextElementSibling;
      while (node && node.tagName !== "H2") {
        if (node.tagName === "P")
          content.append(el("p", "", node.textContent.trim()));
        node = node.nextElementSibling;
      }
    } catch (error) {
      if (error.name === "AbortError" || token !== request) return;
      status.textContent = "这一页暂未载入。可以重试，或打开完整引言。";
      content.append(button("再翻开一次", () => open("books", state)));
    }
  }
  function renderTribute(work) {
    const paper = el("article", "folio-paper tribute-paper");
    paper.append(
      heading(work),
      el("p", "tribute-source", "《基督山伯爵》 · 大仲马"),
      el("p", "", "书页里夹着一张窄笺，边角已经磨软了。"),
      button("放回书签", () => close()),
    );
    body.append(paper);
  }
  function open(id, pinnedState, episodeId) {
    const work = ManorObjectStories.works[id];
    const currentState = ManorView.snapshot();
    if (
      !work ||
      work.enabled === false ||
      closing ||
      currentState.room !== work.room
    )
      return false;
    const date = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
    const episode = window.ManorGalleryProgram?.resolve(id, date, episodeId);
    if (episodeId && !episode) return false;
    abort?.abort();
    disposePainting?.();
    disposePainting = null;
    const token = ++request;
    state = { ...(pinnedState || currentState), room: currentState.room };
    if (!dialog.open) {
      opener = document.activeElement;
      // Leave a Count encounter underneath intact so closing the folio returns to it.
      document.querySelectorAll("dialog[open]").forEach((d) => {
        if (d.id !== "encounter") d.close();
      });
    }
    dialog.classList.remove("folio-art-only", "folio-large");
    // data-object belongs to the estate's delegated click targets, not this container.
    dialog.dataset.folio = id;
    body.replaceChildren();
    dialog.querySelector(".folio-place").textContent = work.eyebrow;
    dialog.querySelector(".folio-back").textContent = document.querySelector(
      "#encounter[open]",
    )
      ? "← 返回交谈"
      : "← 返回" + Manor.rooms[state.room][0];
    if (["seascape", "harbor", "arch"].includes(id))
      renderPainting(work, token, episode);
    else if (id === "books") renderReading(work, token);
    else renderTribute(work);
    const entering = !dialog.open;
    if (entering) dialog.showModal();
    dialog.scrollTop = 0;
    ManorMotion.animate(
      entering ? dialog : body,
      [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      entering ? 380 : 220,
    );
    ManorMusic.duck("folio", true);
    syncMusic();
    dialog.querySelector(".folio-back").focus({ preventScroll: true });
  }
  window.ManorObjects = { open, close };
})();
