/* Gallery tools stay inside the existing folio: no separate route, account or timer. */
(() => {
  const D = ManorGalleryData;
  const labelDraft = ["", "", ""];
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };
  const btn = (text, fn) => {
    const n = el("button", "folio-action", text);
    n.type = "button";
    n.onclick = fn;
    return n;
  };
  function mount({ id, canvas, image, side, open }) {
    const work = D.works[id];
    if (!work) return () => {};
    let book;
    try {
      book = D.read(localStorage.getItem(D.key));
    } catch {
      book = D.read(null);
    }
    let active = false,
      disposed = false,
      point = { x: 50, y: 50 },
      light = "natural";
    const found = new Set(book.found);
    const surface = el("div", "gallery-surface");
    image.replaceWith(surface);
    surface.append(image);
    const lens = el("div", "gallery-lens");
    lens.hidden = true;
    lens.setAttribute("aria-hidden", "true");
    surface.append(lens);
    surface.setAttribute(
      "aria-label",
      `${work.title}，观画区域。拿起放大镜后，可用方向键移动，回车查看当前位置。`,
    );
    const toolbar = el("div", "gallery-tools"),
      response = el(
        "p",
        "gallery-response",
        "可以自由看画；拿起放大镜后，点击画面里让您在意的细节。",
      ),
      clues = el("section", "gallery-clues");
    response.setAttribute("role", "status");
    const progress = el("p", "gallery-progress");
    const notebook = el("details", "gallery-notebook"),
      notebookSummary = el("summary", "", "翻开观画册页"),
      pages = el("div");
    notebook.append(notebookSummary, pages);
    function save() {
      book.found = [...found];
      try {
        localStorage.setItem(D.key, JSON.stringify(book));
        return true;
      } catch {
        return false;
      }
    }
    function drawBook() {
      progress.textContent = `这幅画已细看 ${work.spots.filter((s) => found.has(`${id}:${s.id}`)).length} / 3 处 · 画廊共 ${found.size} / 9 处`;
      pages.replaceChildren(
        el("p", "", "册页只记在这个浏览器里，不公开，也不影响账号权益。"),
      );
      for (const key of D.ids) {
        pages.append(el("h3", "", D.works[key].title));
        const list = el("ul");
        const seen = D.works[key].spots.filter((s) =>
          found.has(`${key}:${s.id}`),
        );
        if (!seen.length) list.append(el("li", "", "这一页还没有观察。"));
        for (const spot of seen)
          list.append(el("li", "", `${spot.title}：${spot.text}`));
        pages.append(list);
      }
      if (found.size === 9)
        pages.append(
          el(
            "p",
            "gallery-complete",
            "三幅画的九处细节已收齐。下次来，仍可以从这里接着看。",
          ),
        );
      if (book.labels)
        pages.append(el("p", "gallery-complete", "三张画签已经归位。"));
      pages.append(
        btn("清空这本观画册页…", () => {
          const confirm = el("div", "gallery-confirm");
          confirm.append(
            el("p", "", "只清空本机观画记录？"),
            btn("保留册页", () => confirm.remove()),
            btn("确认清空", () => {
              found.clear();
              book.labels = false;
              const saved = save();
              drawBook();
              drawClues();
              response.textContent = saved
                ? "册页已清空，可以重新观察。"
                : "本次记录已清空，但浏览器无法保存更改。";
              notebookSummary.focus();
            }),
          );
          pages.append(confirm);
          confirm.querySelector("button").focus();
        }),
      );
    }
    function lensAt(x, y) {
      point = {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      };
      if (!active || !image.complete || !image.naturalWidth || disposed) return;
      const r = image.getBoundingClientRect(),
        size = Math.min(170, r.width * 0.52),
        zoom = 2.6;
      lens.style.width = lens.style.height = `${size}px`;
      lens.style.left = `${point.x}%`;
      lens.style.top = `${point.y}%`;
      lens.style.backgroundImage = `url("${work.src}")`;
      lens.style.backgroundSize = `${r.width * zoom}px ${r.height * zoom}px`;
      lens.style.backgroundPosition = `${size / 2 - (point.x / 100) * r.width * zoom}px ${size / 2 - (point.y / 100) * r.height * zoom}px`;
      lens.hidden = false;
    }
    function toggle(on) {
      active = on;
      lens.hidden = !on;
      surface.tabIndex = on ? 0 : -1;
      surface.classList.toggle("is-inspecting", on);
      take.textContent = on ? "放下放大镜" : "拿起放大镜";
      take.setAttribute("aria-pressed", String(on));
      clues.hidden = !on;
      if (on) {
        lensAt(point.x, point.y);
        surface.focus({ preventScroll: true });
      }
    }
    function inspect() {
      if (!active || disposed) return;
      if (!image.complete || !image.naturalWidth) {
        response.textContent = "等画面载入后，再查看这里。";
        return;
      }
      const spot = D.hit(id, point.x, point.y);
      if (!spot) {
        response.textContent =
          "这里也可以停下来细看。若想找册页中的线索，可以展开下面的提示。";
        return;
      }
      const existed = found.has(`${id}:${spot.id}`);
      found.add(`${id}:${spot.id}`);
      const saved = save();
      response.textContent = `${spot.title}。${spot.text}${existed ? " 这是您先前看过的一处。" : " 已记入观画册页。"}${saved ? "" : " 浏览器无法保存，刷新后这次记录可能丢失。"}`;
      drawBook();
      drawClues();
    }
    function pointer(e) {
      const r = image.getBoundingClientRect();
      lensAt(
        ((e.clientX - r.left) / r.width) * 100,
        ((e.clientY - r.top) / r.height) * 100,
      );
    }
    surface.onpointermove = (e) => {
      if (active && e.pointerType === "mouse") pointer(e);
    };
    surface.onclick = (e) => {
      if (active) {
        pointer(e);
        inspect();
      }
    };
    surface.onkeydown = (e) => {
      if (!active) return;
      const moves = {
        ArrowLeft: [-3, 0],
        ArrowRight: [3, 0],
        ArrowUp: [0, -3],
        ArrowDown: [0, 3],
      };
      if (moves[e.key]) {
        e.preventDefault();
        const [x, y] = moves[e.key];
        lensAt(point.x + x, point.y + y);
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        inspect();
      }
    };
    function drawClues() {
      clues.replaceChildren(
        el("h3", "", "慢慢找三处细节"),
        el(
          "p",
          "",
          "鼠标移动放大镜，点击查看；触屏直接点画。键盘用方向键移动、回车查看。",
        ),
      );
      work.spots.forEach((spot) => {
        const detail = el("details"),
          summary = el(
            "summary",
            "",
            `${found.has(`${id}:${spot.id}`) ? "✓ " : ""}${spot.clue}`,
          );
        detail.append(
          summary,
          el("p", "", spot.hint),
          btn("把放大镜移到这里", () => {
            if (!active) toggle(true);
            lensAt(spot.x, spot.y);
            surface.focus({ preventScroll: true });
            response.textContent = "放大镜已经移过去。点击或按回车，看看这里。";
          }),
        );
        clues.append(detail);
      });
    }
    const take = btn("拿起放大镜", () => toggle(!active));
    take.setAttribute("aria-pressed", "false");
    toolbar.append(take);
    const lights = el("div", "gallery-lights");
    lights.setAttribute("role", "group");
    lights.setAttribute("aria-label", "观画光线");
    for (const [key, label] of [
      ["natural", "原色"],
      ["warm", "暖光"],
      ["cool", "冷光"],
    ]) {
      const b = btn(label, () => {
        light = key;
        surface.dataset.light = light;
        for (const child of lights.children)
          child.setAttribute("aria-pressed", String(child === b));
        response.textContent =
          key === "natural"
            ? "回到画作原色。"
            : "换了一种观画光线。看看天空与石头的颜色怎样变；画里的时间没有改变。";
      });
      b.setAttribute("aria-pressed", String(key === light));
      lights.append(b);
    }
    toolbar.append(lights);
    canvas.append(toolbar);
    const gallery = el("nav", "gallery-next");
    gallery.setAttribute("aria-label", "画廊三幅画");
    for (const key of D.ids) {
      const b = btn(D.works[key].title, () => open(key));
      const thumb = el("img");
      thumb.src = D.works[key].src;
      thumb.alt = "";
      b.prepend(thumb);
      b.setAttribute("aria-current", String(key === id));
      gallery.append(b);
    }
    const matching = el("details", "gallery-matching");
    matching.append(el("summary", "", "比较三幅画 · 整理画签"));
    const selects = [];
    for (const key of D.ids) {
      const label = el("label", "", D.works[key].label),
        select = el("select");
      const empty = el("option", "", "这张画签属于……");
      empty.value = "";
      select.append(empty);
      for (const candidate of ["arch", "seascape", "harbor"]) {
        const option = el("option", "", D.works[candidate].title);
        option.value = candidate;
        select.append(option);
      }
      const index = selects.length;
      select.value = labelDraft[index];
      select.onchange = () => {
        labelDraft[index] = select.value;
      };
      label.append(select);
      matching.append(label);
      selects.push(select);
    }
    const matchStatus = el("p");
    matchStatus.setAttribute("role", "status");
    matching.append(
      btn("放好这三张画签", () => {
        if (!D.labelsMatch(selects.map((s) => s.value))) {
          matchStatus.textContent =
            "还有画签没对上。可以切换到另一幅画核对，不必猜。";
          return;
        }
        book.labels = true;
        const saved = save();
        drawBook();
        matchStatus.textContent =
          "画签都归位了：海上的帆、岸上的灯、山间的石拱，各有自己的去处。" +
          (saved ? " 已记入册页。" : " 本次无法保存到浏览器。");
      }),
      matchStatus,
    );
    side.prepend(gallery);
    side.append(progress, response, clues, matching, notebook);
    clues.hidden = true;
    drawClues();
    drawBook();
    const resize = new ResizeObserver(() => lensAt(point.x, point.y));
    resize.observe(image);
    return () => {
      disposed = true;
      resize.disconnect();
      surface.onpointermove = surface.onclick = surface.onkeydown = null;
    };
  }
  window.ManorGallery = { mount };
})();
