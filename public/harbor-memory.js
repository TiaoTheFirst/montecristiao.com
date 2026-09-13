/* A voluntary illustrated recollection inside the existing painting folio. */
(() => {
  const D = ManorHarborMemoryData;
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };
  const button = (text, fn) => {
    const n = el("button", "folio-action", text);
    n.type = "button";
    n.onclick = fn;
    return n;
  };
  function mount({ side, body, dialog, pinned }) {
    const exchange = el("section", "folio-exchange harbor-exchange");
    exchange.setAttribute("aria-label", "问起这幅画");
    const label = el("p", "folio-kicker");
    const response = el("p", "folio-response");
    response.setAttribute("role", "status");
    const choices = el("div", "folio-choices");
    const host = el("div", "harbor-host");
    const portrait = el("img", "harbor-host-portrait");
    portrait.src = "assets/count.webp";
    portrait.alt = "";
    portrait.width = portrait.height = 46;
    host.append(portrait, label);
    exchange.append(host, response, choices);
    side.querySelector(".folio-links").before(exchange);
    let disposed = false,
      asked = false,
      ended = false,
      serial = 0;
    let stage = null,
      content,
      feedback,
      returnFocus,
      savedScroll = 0;
    let originals = [],
      fade;
    const place = dialog.querySelector(".folio-place");
    const placeText = place.textContent;
    const back = dialog.querySelector(".folio-back");
    const backText = back.textContent;
    const backAction = back.onclick;
    const canTell = () =>
      !disposed &&
      !ended &&
      D.canTell(
        pinned,
        ManorView.snapshot(),
        window.ManorLiving?.available() !== false,
      );
    const eligibleAtOpen = canTell();
    function restore(focus = true) {
      ++serial;

      fade?.cancel();
      stage?.remove();
      stage = null;
      for (const [node, hidden, inert] of originals) {
        node.hidden = hidden;
        node.inert = inert;
      }
      originals = [];
      dialog.removeAttribute("data-recollection");
      dialog.setAttribute("aria-labelledby", "folio-title");
      place.textContent = placeText;
      back.textContent = backText;
      back.onclick = backAction;
      dialog.querySelector(".harbor-close")?.remove();
      dialog.scrollTop = savedScroll;
      if (focus && returnFocus?.isConnected)
        returnFocus.focus({ preventScroll: true });
    }
    function expire() {
      if (disposed || ended) return;
      ended = true;
      const wasOpen = !!stage;
      restore(false);
      label.textContent = "交谈已告一段落";
      portrait.hidden = true;
      response.hidden = false;
      response.textContent = "这段交谈已告一段落。您可以继续看画，或回到画廊。";
      choices.replaceChildren();
      if (wasOpen) {
        response.tabIndex = -1;
        response.focus({ preventScroll: true });
      }
    }
    function check() {
      if (eligibleAtOpen && !canTell()) expire();
    }
    async function returnToArt(complete = false) {
      if (!stage) return;
      const token = ++serial;

      await fade.run(1, 0, 180);
      if (disposed || token !== serial) return;
      restore();
      if (complete && canTell()) {
        response.textContent =
          "—— 伯爵：后来他来府里，总要顺路看看。画就一直挂在这里了。";
      }
    }
    function draw(index) {
      const entry = D.pages[index];
      content.replaceChildren();
      const img = el("img", "harbor-memory-image");
      img.src = entry.src;
      img.alt = entry.alt;
      img.width = 1672;
      img.height = 941;
      const copy = el("div", "harbor-memory-copy");
      const title = el("h2", "", entry.title);
      title.id = "harbor-memory-title";
      title.tabIndex = -1;
      const lines = el("div", "harbor-memory-lines");
      for (const [name, text] of entry.lines) {
        const line = el("p");
        line.append(
          el("span", "harbor-speaker", name),
          document.createTextNode(text),
        );
        lines.append(line);
      }
      copy.append(
        el(
          "p",
          "harbor-chapter",
          index === 0 ? "Ⅰ  /  伯爵忆起" : "Ⅱ  /  伯爵忆起",
        ),
        title,
        el("p", "harbor-memory-narration", entry.text),
        lines,
      );
      content.append(img, copy);
      const nav = el("nav", "harbor-memory-nav");
      nav.setAttribute("aria-label", "往事翻页");
      if (index > 0) nav.append(button("← 上一页", () => go(index - 1)));
      nav.append(
        el(
          "span",
          "harbor-memory-progress",
          `${index + 1} / ${D.pages.length}`,
        ),
      );
      nav.append(
        index < D.pages.length - 1
          ? button("后来呢 →", () => go(index + 1))
          : button("回到眼前的画 →", () => returnToArt(true)),
      );
      content.append(nav);

      dialog.scrollTop = 0;
      title.focus({ preventScroll: true });
    }
    function makeStage() {
      savedScroll = dialog.scrollTop;
      originals = [...body.children].map((node) => [
        node,
        node.hidden,
        node.inert,
      ]);
      for (const [node] of originals) {
        node.hidden = true;
        node.inert = true;
      }
      stage = el("section", "harbor-memory");
      content = el("div", "harbor-memory-content");
      feedback = el("p", "harbor-memory-feedback");
      feedback.setAttribute("role", "status");
      stage.append(content, feedback);
      body.append(stage);
      dialog.dataset.recollection = "harbor";
      dialog.setAttribute("aria-labelledby", "harbor-memory-title");
      place.textContent = "伯爵的回忆 · 罗什的旧书铺";
      back.textContent = "← 回到这幅画";
      back.onclick = () => returnToArt();
      const leave = button("×", () => window.ManorObjects.close());
      leave.classList.add("harbor-close");
      leave.setAttribute("aria-label", "结束观画，返回画廊");
      dialog.querySelector(".folio-bar").append(leave);
      fade = ManorContinuity.createFade(content);
    }
    async function go(index) {
      if (!canTell()) {
        portrait.hidden = true;
        expire();
        return;
      }
      if (!asked || !D.pages[index]) return;
      const token = ++serial;

      const status = stage ? feedback : response;
      status.textContent = "正在展开那一幕……";
      // Preparing never hides the current page; failure leaves return controls usable.
      try {
        await ManorMotion.prepare(D.pages[index].src);
        if (disposed || token !== serial) return;
        if (!canTell()) {
          expire();
          return;
        }
        if (stage) await fade.run(1, 0, 150);
        if (disposed || token !== serial) return;
        if (!canTell()) {
          expire();
          return;
        }
        if (!stage) makeStage();
        draw(index);
        feedback.replaceChildren();
        response.textContent =
          "罗什先生送的。以前挂在他的书铺楼上，我去取书时常在那里坐。";

        await fade.run(0, 1, 250);
      } catch {
        if (disposed || token !== serial) return;

        status.replaceChildren(
          document.createTextNode("这一幕暂未载入。可以重试，或继续看画。"),
          button("重试这一幕", () => go(index)),
        );
      }
    }
    function render() {
      if (!canTell()) {
        portrait.hidden = true;
        label.textContent = "独自看画";
        response.textContent =
          "伯爵此刻不便在画旁交谈。您可以先看看画里的细节。";
        return;
      }
      label.textContent = "伯爵在身旁";
      response.hidden = true;
      choices.append(
        button("问起这幅画的来历 →", () => {
          if (!canTell()) {
            expire();
            return;
          }
          asked = true;
          response.hidden = false;
          response.textContent =
            "—— 伯爵：罗什先生送的。以前挂在他的书铺楼上，我去取书时常在那里坐。";
          choices.replaceChildren();
          const listen = button("听伯爵讲这段往事 →", () => {
            returnFocus = listen;
            go(0);
          });
          choices.append(
            listen,
            button("我再看看这幅画。", () => {
              ++serial;

              response.textContent = "—— 伯爵：请便。我站开一点。";
            }),
          );
          listen.focus({ preventScroll: true });
        }),
      );
    }
    function keyboard(e) {
      if (!stage || e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      returnToArt();
    }
    render();
    // Invalidate on every clock/presence refresh, including preview revisions.
    window.addEventListener("manor:state", check);
    window.addEventListener("manor:world", check);
    const timer = setInterval(check, 1000);
    dialog.addEventListener("keydown", keyboard, true);
    return () => {
      disposed = true;
      restore(false);
      clearInterval(timer);
      window.removeEventListener("manor:state", check);
      window.removeEventListener("manor:world", check);
      dialog.removeEventListener("keydown", keyboard, true);
    };
  }
  window.ManorHarborMemory = { mount };
})();
