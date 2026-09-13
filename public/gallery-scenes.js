/* Voluntary, authored painting activities. No account writes or scheduled events. */
(() => {
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  const button = (text, fn) => {
    const node = el("button", "folio-action", text);
    node.type = "button";
    node.onclick = fn;
    return node;
  };
  function arrange({ side, body, open }) {
    const details = el("details", "harbor-observation");
    details.append(el("summary", "", "细看画面与观画册页"));
    const toolbar = body.querySelector(".gallery-tools");
    if (toolbar) details.append(toolbar);
    for (const node of [...side.children]) {
      if (
        node.matches(
          ".gallery-next,.gallery-progress,.gallery-response,.gallery-clues,.gallery-matching,.gallery-notebook",
        )
      )
        details.append(node);
    }
    side.append(details);
    window.ManorGalleryProgramUI?.mount({ side, open });
  }
  function mount({ id, side, body, dialog, pinned, open, episode }) {
    if (!episode || !["distance", "proofs"].includes(episode.experience))
      return () => {};
    const sea = episode.experience === "distance",
      work = ManorObjectStories.works[id];
    const exchange = el("section", "folio-exchange harbor-exchange");
    exchange.setAttribute("aria-label", "画旁交谈");
    const host = el("div", "harbor-host");
    const portrait = el("img", "harbor-host-portrait");
    portrait.src = "assets/count.webp";
    portrait.alt = "";
    const label = el("p", "folio-kicker");
    host.append(portrait, label);
    const response = el("p", "folio-response");
    response.setAttribute("role", "status");
    const choices = el("div", "folio-choices");
    exchange.append(host, response, choices);
    side.querySelector(".folio-links").before(exchange);
    let disposed = false,
      ended = false,
      stage = null,
      stageReply,
      stageChoices;
    let originals = [],
      serial = 0,
      savedScroll = 0,
      returnFocus,
      fade;
    const back = dialog.querySelector(".folio-back"),
      place = dialog.querySelector(".folio-place");
    const backText = back.textContent,
      backAction = back.onclick,
      placeText = place.textContent;
    const available = () =>
      !disposed &&
      !ended &&
      ManorHarborMemoryData.canTell(
        pinned,
        ManorView.snapshot(),
        window.ManorLiving?.available() !== false,
      );
    const eligibleAtOpen = available();
    function tell(text, target = response) {
      if (!available()) {
        check();
        return false;
      }
      target.hidden = false;
      target.textContent = "—— 伯爵：" + text;
      return true;
    }
    function check() {
      if (!eligibleAtOpen || available() || ended || disposed) return;
      ended = true;
      portrait.hidden = true;
      label.textContent = "独自看画";
      response.hidden = false;
      response.textContent = "交谈已告一段落。您仍可以继续看画、比较画面。";
      drawChoices();
      if (stageReply)
        stageReply.textContent =
          "伯爵此刻不便继续交谈。您可以独自比较，也可以回到原画。";
      stageChoices?.replaceChildren();
    }
    const startLabel = sea ? "走近，再退后看看 →" : "摊开两张试排稿 →";
    function drawChoices() {
      choices.replaceChildren(
        button(startLabel, function () {
          enter(this);
        }),
      );
      if (available())
        choices.append(button(episode.question, () => tell(episode.answer)));
    }

    function restore(focus = true) {
      ++serial;
      fade?.cancel();
      stage?.remove();
      stage = stageReply = stageChoices = null;
      for (const [node, hidden, inert] of originals) {
        node.hidden = hidden;
        node.inert = inert;
      }
      originals = [];
      delete dialog.dataset.galleryScene;
      dialog.setAttribute("aria-labelledby", "folio-title");
      back.textContent = backText;
      back.onclick = backAction;
      place.textContent = placeText;
      dialog.querySelector(".gallery-scene-close")?.remove();
      dialog.scrollTop = savedScroll;
      if (focus)
        (returnFocus?.isConnected
          ? returnFocus
          : choices.firstElementChild
        )?.focus({ preventScroll: true });
    }
    async function leave() {
      if (!stage) return;
      const token = ++serial;
      await fade.run(1, 0, 160);
      if (!disposed && token === serial) restore();
    }
    function picture(cls) {
      const img = el("img", cls);
      img.src = work.src;
      img.alt = work.alt;
      return img;
    }
    async function enter(trigger) {
      if (stage || disposed) return;
      const token = ++serial;
      response.hidden = false;
      response.textContent = "正在展开画面……";
      try {
        await ManorMotion.prepare(work.src);
      } catch {
        if (!disposed && token === serial)
          response.textContent = "画面暂未载入。可以再试一次，或继续看画。";
        return;
      }
      if (disposed || token !== serial) return;
      returnFocus = trigger;
      response.hidden = true;
      savedScroll = dialog.scrollTop;
      originals = [...body.children].map((n) => [n, n.hidden, n.inert]);
      for (const [n] of originals) {
        n.hidden = true;
        n.inert = true;
      }
      stage = el("section", "gallery-scene");
      dialog.dataset.galleryScene = id;
      dialog.setAttribute("aria-labelledby", "gallery-scene-title");
      back.textContent = "← 回到这幅画";
      back.onclick = leave;
      place.textContent = sea ? "远帆 · 换个距离" : "石拱之后 · 书页试排";
      const close = button("×", () => window.ManorObjects.close());
      close.classList.add("gallery-scene-close");
      close.setAttribute("aria-label", "结束观画，返回画廊");
      dialog.querySelector(".folio-bar").append(close);
      const visual = el("div", "gallery-scene-visual");
      const notes = el("div", "gallery-scene-notes");
      const title = el(
        "h2",
        "",
        sea ? "您愿意站在哪里？" : "同一幅画，放进一页书",
      );
      title.id = "gallery-scene-title";
      title.tabIndex = -1;
      notes.append(el("p", "folio-kicker", sea ? "远帆" : "石拱之后"), title);
      stageReply = el("p", "folio-response");
      stageReply.setAttribute("role", "status");
      stageChoices = el("div", "folio-choices");
      if (sea) makeDistance(visual, notes);
      else makeProofs(visual, notes);
      notes.append(stageReply, stageChoices);
      if (!available())
        stageReply.textContent = "可以独自比较画面，伯爵此刻不在这里交谈。";
      const nav = el("nav", "gallery-scene-nav");
      nav.setAttribute("aria-label", "继续观画");
      nav.append(
        button("回到原画 →", leave),
        button("去看《归港灯火》 →", () => open("harbor")),
      );
      stage.append(visual, notes, nav);
      body.append(stage);
      fade = ManorContinuity.createFade(stage);
      dialog.scrollTop = 0;
      title.focus({ preventScroll: true });
      await fade.run(0, 1, 220);
    }
    function makeDistance(visual, notes) {
      const wall = el("div", "gallery-distance-wall"),
        frame = el("div", "gallery-distance-frame");
      frame.append(picture(""));
      wall.append(frame);
      visual.append(wall);
      const controls = el("div", "gallery-scene-controls");
      controls.setAttribute("role", "group");
      controls.setAttribute("aria-label", "观画距离");
      const status = el("p", "gallery-scene-caption");
      status.setAttribute("role", "status");
      const options = [
        ["near", "走近看", "走近了，可以分辨海面上的浪头与那两片小帆。"],
        [
          "far",
          "退后两步",
          "整幅画在视野里变小了。试着找找，那点白帆还显眼吗？",
        ],
      ];
      for (const [mode, text, caption] of options) {
        const b = button(text, () => {
          wall.dataset.distance = mode;
          status.textContent = caption;
          for (const child of controls.children)
            child.setAttribute("aria-pressed", String(child === b));
        });
        b.setAttribute("aria-pressed", String(mode === "near"));
        controls.append(b);
      }
      wall.dataset.distance = "near";
      status.textContent = options[0][2];
      visual.append(controls, status);
      notes.append(
        el(
          "p",
          "gallery-scene-intro",
          "走近看细处，再退后看看整片海。画不会被裁掉，改变的只是眼前的大小。",
        ),
      );
      if (available()) {
        stageReply.textContent = "伯爵在一旁，等您看完。";
        for (const item of episode.responses)
          stageChoices.append(
            button(item.label, () => {
              if (tell(item.reply, stageReply) && item.relationshipChoice)
                window.ManorRelationship?.painting(
                  item.relationshipChoice,
                  ManorView.snapshot(),
                );
            }),
          );
      }
    }
    function makeProofs(visual, notes) {
      const spread = el("div", "gallery-proof-spread");
      const mockLines = () => {
        const lines = el("div", "gallery-proof-lines");
        lines.setAttribute("aria-hidden", "true");
        for (let i = 0; i < 7; i++) lines.append(el("i"));
        return lines;
      };
      function sheet(kind, heading) {
        const paper = el("figure", "gallery-proof-sheet");
        paper.dataset.proof = kind;
        paper.append(el("figcaption", "", heading));
        const aperture = el("div", "gallery-proof-aperture");
        const img = picture("");
        aperture.append(img);
        paper.append(aperture, mockLines());
        spread.append(paper);
        return { paper, img };
      }
      const whole = sheet("whole", "Ⅰ · 完整缩图"),
        crop = sheet("crop", "Ⅱ · 局部裁图");
      visual.append(
        spread,
        el(
          "p",
          "gallery-scene-caption",
          "构图试排 · 直接使用原画比较，尚非线描样张或已出版书页。",
        ),
      );
      const sliderLabel = el(
        "label",
        "gallery-crop-label",
        "移动右页的取景位置",
      );
      const slider = el("input");
      slider.type = "range";
      slider.min = "0";
      slider.max = "100";
      slider.value = "50";
      slider.setAttribute("aria-label", "裁图取景位置");
      slider.oninput = () => {
        crop.img.style.objectPosition = `50% ${slider.value}%`;
      };
      sliderLabel.append(slider);
      visual.append(sliderLabel);
      notes.append(
        el(
          "p",
          "gallery-scene-intro",
          "两张纸留出同样大的图位。左边保留整幅，右边用局部铺满。您可以移动右页的取景，看看要留下什么。",
        ),
      );
      const full = button("让完整画独占一页", () => {
        const on = whole.paper.classList.toggle("is-full-page");
        full.textContent = on ? "恢复图文同页" : "让完整画独占一页";
        full.setAttribute("aria-pressed", String(on));
      });
      full.setAttribute("aria-pressed", "false");
      notes.append(full);
      if (available()) {
        stageReply.textContent =
          "—— 伯爵：先别急着选。哪一张让您愿意再看一眼？";
        for (const item of episode.responses)
          stageChoices.append(
            button(item.label, () => {
              const reply =
                whole.paper.classList.contains("is-full-page") &&
                item.fullPageReply
                  ? item.fullPageReply
                  : item.reply;
              tell(reply, stageReply);
            }),
          );
      }
    }
    function keyboard(e) {
      if (stage && e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        leave();
      }
    }
    portrait.hidden = !eligibleAtOpen;
    label.textContent = eligibleAtOpen ? "伯爵在身旁" : "独自看画";
    response.hidden = eligibleAtOpen;
    if (!eligibleAtOpen)
      response.textContent = "可以先自己看看。伯爵在画廊时，再与他聊这幅画。";
    drawChoices();
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
  window.ManorGalleryScenes = { arrange, mount };
})();
