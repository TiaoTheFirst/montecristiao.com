/* Atlas shell remains available even when WebGL or the model cannot load. */
window.ManorAtlas = (() => {
  const A = ManorArchitecture,
    ns = "http://www.w3.org/2000/svg";
  let state,
    ui,
    loaded,
    engine,
    expanded = false,
    zoom = 1,
    selectionHandler;
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const svgEl = (tag, attrs = {}) => {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    return n;
  };
  const center = (id) => {
    const [x, y, w, h] = A.rooms[id].rect;
    return [x + w / 2, y + h / 2];
  };
  const preview = ManorAtlasPreview.create({
    valid: (id) => !!state && !!A.layouts[state.floor][id],
    onChange: () => {
      if (!ui || !state) return;
      ui.drawing
        .querySelectorAll("[data-room]")
        .forEach((node) =>
          node.classList.toggle(
            "is-previewed",
            node.dataset.room === preview.active,
          ),
        );
      detail();
    },
  });
  function selectRoom(id, event) {
    preview.reset();
    selectionHandler(id);
    if (event?.pointerType === "touch")
      document.querySelector("#map-detail").scrollIntoView({ block: "start" });
  }
  function inspectable(node, id) {
    node.addEventListener("pointerenter", (e) =>
      preview.enter(id, e.pointerType),
    );
    node.addEventListener("pointerleave", () => preview.leave());
    node.addEventListener("focus", () => {
      // A tap may focus a button too; only keyboard focus starts inspection.
      if (node.matches(":focus-visible")) preview.enter(id, "keyboard");
    });
    node.addEventListener("blur", () => preview.leave());
    node.setAttribute("aria-controls", "map-detail");
  }
  function init() {
    const host = document.querySelector("#floorplan");
    const guide = el("details", "atlas-play-guide");
    guide.open = false;
    guide.append(el("summary", "", "此刻可以去做什么 · 10 处停留"));
    const stops = el("nav", "");
    stops.setAttribute("aria-label", "府中可玩的物件与去处");
    for (const [id, activity] of Object.entries(
      window.ManorRoomActivities || {},
    )) {
      if (!Manor.scenes[id]) continue;
      const link = el("a", "", Manor.rooms[id][0] + " · " + activity.title);
      link.href = "#" + id;
      link.append(el("small", "", activity.map));
      stops.append(link);
    }
    guide.append(
      stops,
      el(
        "p",
        "fine-print",
        "走进房间，再点画面中的物件。未开放的门与通道仍按建筑关系保留。",
      ),
    );
    const discovery = el("p", "atlas-discoveries", "");
    const updateDiscoveries = () => {
      const completed = window.ManorRoomPlay?.completed() || [];
      discovery.textContent =
        "本机游历记录：" +
        (completed.length
          ? completed
              .map(
                (id) =>
                  Object.values(window.ManorRoomActivities).find(
                    (a) => a.object === id,
                  )?.title,
              )
              .filter(Boolean)
              .join("、")
          : "还没有留下新的图记。") +
        "。";
    };
    updateDiscoveries();
    guide.append(discovery);
    window.addEventListener("manor:discovery", updateDiscoveries);
    host.className = "atlas-surface";
    host.replaceChildren();
    const toolbar = el("div", "atlas-tools");
    const fold = el("button", "atlas-fold", "展开宅邸");
    fold.type = "button";
    fold.setAttribute("aria-pressed", "false");
    const status = el("span", "atlas-state", "");
    status.setAttribute("role", "status");
    const reset = el("button", "atlas-reset", "复位视角");
    reset.hidden = true;
    const picker = el("div", "atlas-directory"),
      select = el("button", "atlas-picker", "房间目录"),
      directory = el("section", "atlas-directory-sheet");
    select.type = "button";
    select.setAttribute("aria-expanded", "false");
    select.setAttribute("aria-controls", "atlas-directory-sheet");
    directory.id = "atlas-directory-sheet";
    directory.setAttribute("aria-label", "房间目录");
    directory.hidden = true;
    picker.append(select, directory);
    toolbar.append(fold, reset, picker, status);
    const findPlay = el("button", "atlas-reset", "找些事情做");
    findPlay.onclick = () => {
      guide.open = true;
      guide.scrollIntoView({ block: "start" });
      guide.querySelector("summary").focus();
    };
    toolbar.append(findPlay);
    const zoomIn = el("button", "atlas-reset", "放大平面"),
      fit = el("button", "atlas-reset", "看全图");
    zoomIn.onclick = () => {
      zoom = zoom === 1 ? 1.7 : 2.5;
      drawing();
    };
    fit.onclick = () => {
      zoom = 1;
      drawing();
    };
    toolbar.append(zoomIn, fit);
    document.querySelector("#map-panel").before(toolbar);
    const planSvg = svgEl("svg", {
        "aria-label": "宅邸建筑平面图",
        role: "group",
      }),
      canvas = el("div", "atlas-canvas");
    canvas.setAttribute("aria-hidden", "true");
    const labels = el("div", "atlas-labels");
    labels.setAttribute("aria-hidden", "true");
    host.append(planSvg, canvas, labels);
    ui = {
      host,
      drawing: planSvg,
      canvas,
      labels,
      fold,
      status,
      reset,
      select,
      directory,
      zoomIn,
      fit,
      guide,
      updateDiscoveries,
    };
    fold.onclick = toggle;
    reset.onclick = () => engine?.reset();
    const closeDirectory = (focus = false, keepPreview = false) => {
      directory.hidden = true;
      select.setAttribute("aria-expanded", "false");
      if (!keepPreview) preview.reset();
      if (focus) select.focus({ preventScroll: true });
    };
    select.onclick = () => {
      const open = directory.hidden;
      directory.hidden = !open;
      select.setAttribute("aria-expanded", String(open));
      if (open)
        (
          directory.querySelector('[aria-pressed="true"]') ||
          directory.querySelector("button")
        )?.focus();
    };
    picker.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !directory.hidden) {
        e.preventDefault();
        e.stopPropagation();
        closeDirectory(true);
      }
    });
    document.addEventListener("pointerdown", (e) => {
      if (!directory.hidden && !picker.contains(e.target))
        closeDirectory(false, !!e.target.closest("#map-detail"));
    });
    picker.addEventListener("focusout", (e) => {
      if (e.relatedTarget && !picker.contains(e.relatedTarget))
        closeDirectory(false, !!e.relatedTarget.closest("#map-detail"));
    });
    ui.closeDirectory = closeDirectory;
    const pane = document.querySelector("#map-detail"),
      dialog = document.querySelector("#map-dialog");
    ui.panelMotion = ManorAtlasMotion.createPanel(dialog);
    ui.viewMotion = ManorAtlasMotion.createViewBox(planSvg);
    pane.addEventListener("pointerenter", () => preview.hold());
    pane.addEventListener("pointerleave", () => {
      if (!pane.contains(document.activeElement)) preview.leave();
    });
    pane.addEventListener("focusin", () => preview.hold());
    pane.addEventListener("focusout", (e) => {
      if (!pane.contains(e.relatedTarget)) preview.leave();
    });
    dialog.addEventListener("cancel", (e) => {
      if (!directory.hidden) {
        e.preventDefault();
        closeDirectory(true);
      } else if (preview.active) {
        e.preventDefault();
        preview.reset();
      } else {
        e.preventDefault();
        ui.panelMotion.close();
      }
    });
    dialog.addEventListener("close", () => {
      closeDirectory();
      preview.reset();
      ui.viewMotion.stop();
      engine?.pause();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) engine?.pause();
      else if (document.querySelector("#map-dialog").open) engine?.resume();
    });
    ui.wide = matchMedia("(min-width:850px)").matches;
    new ResizeObserver(() => {
      engine?.resize();
      const wide = matchMedia("(min-width:850px)").matches;
      if (wide !== ui.wide) {
        ui.wide = wide;
        if (state) drawing();
      }
    }).observe(host);
  }
  function portalPath(route) {
    if (route.length < 2) return "";
    const pts = [center(route[0])];
    route.slice(1).forEach((b, i) => {
      const a = route[i],
        p = A.portals.find(
          (p) => (p.a === a && p.b === b) || (p.a === b && p.b === a),
        );
      if (p) {
        const through = [...(p.via || []), p.at];
        pts.push(...(p.a === a ? through : through.reverse()));
      }
      pts.push(center(b));
    });
    return pts.map((p, i) => (i ? "L" : "M") + p.join(" ")).join(" ");
  }
  function drawing() {
    const { drawing: s } = ui;
    s.replaceChildren();
    ui.host.dataset.floor = state.floor;
    const ids = Object.keys(A.layouts[state.floor]);
    const bounds =
      state.floor === "upper"
        ? [6, 20, 32, 24]
        : state.floor === "service"
          ? [-1, 20, 43, 40]
          : [-2, -2, 46, 64];
    let targetBounds = bounds;
    if (zoom > 1) {
      const [cx, cy] = center(state.selected),
        w = bounds[2] / zoom,
        h = bounds[3] / zoom;
      const x = Math.max(
        bounds[0],
        Math.min(cx - w / 2, bounds[0] + bounds[2] - w),
      );
      const y = Math.max(
        bounds[1],
        Math.min(cy - h / 2, bounds[1] + bounds[3] - h),
      );
      targetBounds = [x, y, w, h];
    }
    const changedFloor = ui.drawnFloor !== state.floor;
    ui.drawnFloor = state.floor;
    ui.viewMotion.to(
      targetBounds,
      changedFloor || !document.querySelector("#map-dialog").open,
    );
    const defs = svgEl("defs");
    const hatch = svgEl("pattern", {
      id: "atlas-hatch",
      width: 0.7,
      height: 0.7,
      patternUnits: "userSpaceOnUse",
      patternTransform: "rotate(45)",
    });
    hatch.append(
      svgEl("line", {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0.7,
        stroke: "#8c8b6d",
        "stroke-width": 0.12,
      }),
    );
    defs.append(hatch);
    const parquet = svgEl("pattern", {
      id: "atlas-parquet",
      width: 1.2,
      height: 1.2,
      patternUnits: "userSpaceOnUse",
    });
    parquet.append(
      svgEl("path", {
        d: "M0 0 .6.6 0 1.2M.6 0 1.2.6 .6 1.2",
        fill: "none",
        stroke: "#b6a786",
        "stroke-width": 0.035,
      }),
    );
    const paving = svgEl("pattern", {
      id: "atlas-paving",
      width: 1.5,
      height: 1.5,
      patternUnits: "userSpaceOnUse",
    });
    paving.append(
      svgEl("path", {
        d: "M0 0H1.5V1.5",
        fill: "none",
        stroke: "#b6a786",
        "stroke-width": 0.04,
      }),
    );
    defs.append(parquet, paving);
    s.append(defs);
    if (state.floor === "ground") {
      s.append(
        svgEl("rect", {
          x: -1,
          y: -1,
          width: 44,
          height: 62,
          rx: 0.2,
          fill: "none",
          stroke: "#b8aa88",
          "stroke-width": 0.09,
        }),
      );
      s.append(
        svgEl("path", {
          d: "M8 42H0V56H8M32 42H40V56H32",
          fill: "none",
          stroke: "#a09678",
          "stroke-width": 0.2,
        }),
      );
    }
    for (const id of ids) {
      const r = A.rooms[id],
        [x, y, w, h] = r.rect;
      if (state.floor === "service" && ["attic", "cellar"].includes(id))
        continue;
      const g = svgEl("g", {
        "data-room": id,
        tabindex: 0,
        role: "button",
        "aria-label":
          Manor.rooms[id][0] +
          (id === state.current ? "，您在这里" : "") +
          (id === state.count.room && !state.count.unknown
            ? "，伯爵在此"
            : "") +
          (!Manor.publicNodes.has(id) ? "，暂未开放" : ""),
        "aria-pressed": String(id === state.selected),
        class:
          "atlas-room " +
          r.kind +
          (id === state.current ? " is-current" : "") +
          (id === state.selected ? " is-selected" : "") +
          (id === preview.active ? " is-previewed" : "") +
          (!Manor.publicNodes.has(id) ? " is-closed" : ""),
      });
      const rect = svgEl("rect", { x, y, width: w, height: h });
      g.append(rect);
      if (["room", "hall", "court", "terrace", "pavilion"].includes(r.kind)) {
        g.append(
          svgEl("rect", {
            x: x + 0.35,
            y: y + 0.35,
            width: w - 0.7,
            height: h - 0.7,
            class: "atlas-floor-finish",
            fill:
              r.kind === "room" ? "url(#atlas-parquet)" : "url(#atlas-paving)",
          }),
        );
      }
      if (r.extra) {
        const [ex, ey, ew, eh] = r.extra;
        g.append(svgEl("rect", { x: ex, y: ey, width: ew, height: eh }));
      }
      if (r.kind === "garden") {
        g.append(svgEl("path", { d: "M20 0V18M8 9H32", class: "garden-path" }));
        g.append(
          svgEl("circle", { cx: 20, cy: 9, r: 2.6, class: "garden-pool" }),
        );
        for (const xx of [10, 25])
          for (const yy of [2, 11]) {
            g.append(
              svgEl("rect", {
                x: xx,
                y: yy,
                width: 5,
                height: 5,
                rx: 0.3,
                class: "garden-bed",
              }),
            );
            g.append(
              svgEl("rect", {
                x: xx + 0.42,
                y: yy + 0.42,
                width: 4.16,
                height: 4.16,
                class: "garden-bed-inner",
              }),
            );
            g.append(
              svgEl("path", {
                d: `M${xx + 0.6} ${yy + 0.6}l3.8 3.8m-3.8 0 3.8-3.8`,
                class: "garden-bed-axes",
              }),
            );
          }
        for (const radius of [2.25, 1.75, 0.35])
          g.append(
            svgEl("circle", { cx: 20, cy: 9, r: radius, class: "pool-ring" }),
          );
        // Parterre borders and pool rings are plan symbols, not new navigable spaces.
        g.append(
          svgEl("path", {
            d: "M8.5 .5H31.5V17.5H8.5Z",
            class: "garden-boundary",
          }),
        );
      }
      if (r.kind === "stair")
        for (let i = 1; i < 14; i++)
          g.append(
            svgEl("line", {
              x1: x + 0.2,
              y1: y + (h * i) / 14,
              x2: x + w - 0.2,
              y2: y + (h * i) / 14,
              class: "stair-tread",
            }),
          );
      if (r.furniture === "dining") {
        g.append(
          svgEl("rect", {
            x: x + w / 2 - 1,
            y: y + 1.5,
            width: 2,
            height: h - 3,
            rx: 0.35,
            class: "furniture",
          }),
        );
        for (const yy of [y + 2, y + 4, y + 6])
          for (const xx of [x + 2, x + w - 2])
            g.append(
              svgEl("rect", {
                x: xx - 0.35,
                y: yy - 0.35,
                width: 0.7,
                height: 0.7,
                rx: 0.1,
                class: "furniture",
              }),
            );
      }
      if (r.furniture === "library")
        for (const xx of [x + 0.35, x + w - 0.8])
          g.append(
            svgEl("rect", {
              x: xx,
              y: y + 0.4,
              width: 0.45,
              height: h - 0.8,
              class: "furniture",
            }),
          );
      if (r.furniture === "library") {
        for (let row = 0.85; row < h - 0.6; row += 0.48)
          for (const xx of [x + 0.35, x + w - 0.8])
            g.append(
              svgEl("path", {
                d: `M${xx} ${y + row}h.45`,
                class: "cabinet-rule",
              }),
            );
      }
      if (r.furniture === "salon") {
        for (const yy of [y + 1.15, y + h - 1.8])
          g.append(
            svgEl("rect", {
              x: x + 2,
              y: yy,
              width: w - 4,
              height: 0.65,
              rx: 0.18,
              class: "furniture",
            }),
          );
      }
      if (r.furniture === "gallery") {
        for (const yy of [y + 2, y + 5, y + 8])
          for (const xx of [x + 0.5, x + w - 0.8])
            g.append(
              svgEl("rect", {
                x: xx,
                y: yy,
                width: 0.3,
                height: 1.15,
                class: "furniture",
              }),
            );
      }
      if (["study", "letter", "salon", "gallery"].includes(r.furniture))
        g.append(
          svgEl("rect", {
            x: x + w * 0.3,
            y: y + h * 0.4,
            width: w * 0.4,
            height: h * 0.22,
            rx: 0.15,
            class: "furniture",
          }),
        );
      // Building lines are measured geometry, not generated decorative imagery.
      inspectable(g, id);
      g.onclick = (e) => selectRoom(id, e);
      g.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectRoom(id);
          ui.drawing
            .querySelector('[data-room="' + id + '"]')
            ?.focus({ preventScroll: true });
        }
      };
      s.append(g);
    }
    const onFloor = (id) => ids.includes(id);
    for (const p of A.portals) {
      if (p.kind !== "door" || (!onFloor(p.a) && !onFloor(p.b))) continue;
      const ra = A.rooms[p.a],
        rb = A.rooms[p.b];
      if (
        state.floor === "upper" &&
        !["upper"].includes(ra.floor) &&
        !["upper"].includes(rb.floor)
      )
        continue;
      if (
        state.floor === "ground" &&
        ra.floor === "upper" &&
        rb.floor === "upper"
      )
        continue;
      const [x, y] = p.at,
        vertical =
          Math.abs(x - ra.rect[0]) < 0.1 ||
          Math.abs(x - (ra.rect[0] + ra.rect[2])) < 0.1;
      s.append(
        svgEl("path", {
          d: vertical ? `M${x} ${y - 0.64}v1.28` : `M${x - 0.64} ${y}h1.28`,
          class: "door-cut",
        }),
      );
      s.append(
        svgEl("path", {
          d: vertical
            ? `M${x} ${y - 0.6}h1.2A1.2 1.2 0 0 1 ${x} ${y + 0.6}`
            : `M${x - 0.6} ${y}v-1.2A1.2 1.2 0 0 1 ${x + 0.6} ${y}`,
          class: "door-swing",
        }),
      );
    }
    const route = Manor.walk(state.current, state.selected);
    // Draw only the contiguous part on this floor; never draw a route through a wall between floors.
    let run = [];
    const drawRun = () => {
      if (run.length > 1)
        s.append(svgEl("path", { d: portalPath(run), class: "atlas-route" }));
      run = [];
    };
    for (const id of route) {
      if (onFloor(id)) run.push(id);
      else drawRun();
    }
    drawRun();
    for (const id of ids) {
      if (state.floor === "service" && ["attic", "cellar"].includes(id))
        continue;
      const [x, y, w, h] = A.rooms[id].rect;
      if (w < 3 || (h < 3 && w < 7)) continue;
      const label = svgEl("text", {
        x: x + w / 2,
        y: y + h / 2 + 0.28,
        "text-anchor": "middle",
        class: "atlas-room-name",
      });
      const name = Manor.rooms[id][0];
      const wrap = w < 6 && name.length > 2;
      if (wrap) {
        const lineHeight = state.floor === "ground" ? 2.1 : 1.65;
        label.setAttribute(
          "y",
          y + h / 2 - ((Math.ceil(name.length / 2) - 1) * lineHeight) / 2 + 0.3,
        );
        for (let at = 0; at < name.length; at += 2) {
          const t = svgEl("tspan", { x: x + w / 2, dy: at ? lineHeight : 0 });
          t.textContent = name.slice(at, at + 2);
          label.append(t);
        }
      } else label.textContent = name;
      if (state.floor !== "ground" || Manor.scenes[id]) {
        const lines = wrap ? Math.ceil(name.length / 2) : 1;
        const plateWidth = wrap
          ? 3.5
          : Math.min(
              w - 0.4,
              name.length * (state.floor === "ground" ? 2.05 : 1.65) + 0.65,
            );
        s.append(
          svgEl("rect", {
            x: x + (w - plateWidth) / 2,
            y: y + h / 2 - lines * 0.9,
            width: plateWidth,
            height: lines * 1.8,
            rx: 0.08,
            class: "atlas-label-plate",
          }),
        );
        s.append(label);
      }
      if (id === state.current) {
        const marker = svgEl("circle", {
          cx: x + w / 2,
          cy:
            y + h / 2 - (wrap ? Math.ceil(name.length / 2) * 0.9 : 0.9) - 0.55,
          r: 0.3,
          class: "you-dot",
        });
        s.append(marker);
      }
      if (id === state.count.room && !state.count.unknown) {
        s.append(
          svgEl("circle", {
            cx: x + w / 2 + (id === state.current ? 0.9 : 0),
            cy:
              y +
              h / 2 -
              (wrap ? Math.ceil(name.length / 2) * 0.9 : 0.9) -
              0.55,
            r: 0.34,
            class: "count-dot",
          }),
        );
      }
    }
    if (state.floor === "ground") {
      const north = svgEl("text", {
        x: 40,
        y: 1.5,
        "text-anchor": "middle",
        class: "atlas-north",
      });
      north.textContent = "N";
      s.append(north);
      s.append(
        svgEl("path", {
          d: "M40 3V6M39.5 3.7 40 3l.5.7",
          class: "north-arrow",
        }),
      );
    }
    // Keep north up on desktop and mobile. A device resize must not turn the house.
    const [bx, by, , bh] = bounds;
    s.append(
      svgEl("path", {
        d: `M${bx + 2} ${by + bh - 1.5}h5m-5-.35v.7m5-.7v.7`,
        class: "atlas-scale",
      }),
    );
    const scale = svgEl("text", {
      x: bx + 2,
      y: by + bh - 2.2,
      class: "atlas-scale-label",
    });
    scale.textContent = "5 m · 设计尺度";
    s.append(scale);
    if (changedFloor && document.querySelector("#map-dialog").open)
      ManorAtlasMotion.reveal(ui.host, 10, 280);
  }
  function detail() {
    const { current, count } = state,
      selected = preview.active || state.selected,
      inspecting = !!preview.active && selected !== state.selected;
    document.querySelector("#map-you").textContent =
      "您在 " + Manor.rooms[current][0];
    document.querySelector("#map-count").textContent = count.unknown
      ? "伯爵行踪待确认"
      : "伯爵" + (count.moving ? "正经过" : "在") + Manor.rooms[count.room][0];
    const pane = document.querySelector("#map-detail");
    const clock = ManorWorld.clock(),
      scene = Manor.scenes[selected],
      inventory = ManorAtlasPreview.describe(selected, {
        manor: Manor,
        daily: window.ManorDaily,
        clock,
        count,
      }),
      artKey = scene
        ? ManorStaging.key(selected, clock.date, clock.minute)
        : null;
    const key = JSON.stringify([
      selected,
      inspecting,
      current,
      artKey,
      inventory?.present,
    ]);
    if (ui.detailKey === key) return;
    ui.detailKey = key;
    pane.replaceChildren();
    ui.updateDiscoveries();
    pane.append(ui.guide);
    pane.dataset.room = selected;
    pane.dataset.mode = inspecting ? "preview" : "selected";
    pane.scrollTop = 0;
    const heading = el("h3", "", Manor.rooms[selected][0]);
    pane.append(
      el(
        "p",
        "atlas-detail-kicker",
        Manor.rooms[selected][1] + (inspecting ? " · 正在预览" : " · 已选房间"),
      ),
      heading,
    );
    const purpose = Manor.program[selected]?.purpose;
    if (purpose) pane.append(el("p", "atlas-room-description", purpose));
    if (scene) {
      const frame = el("div", "atlas-preview-frame"),
        picture = el("img", "atlas-room-preview"),
        fallback = el("span", "atlas-preview-fallback", "绘景载入中…");
      picture.alt = Manor.rooms[selected][0] + " · 此刻的房间";
      picture.width = 720;
      picture.height = 405;
      picture.decoding = "async";
      picture.onload = () => {
        frame.classList.add("is-ready");
        fallback.hidden = true;
      };
      picture.onerror = () => {
        picture.hidden = true;
        fallback.textContent = "绘景暂未载入，仍可查看物件与路线。";
      };
      picture.src = "assets/" + artKey + ".webp";
      frame.append(fallback, picture);
      pane.append(frame);
      if (inventory.present)
        pane.append(el("p", "atlas-presence", "伯爵此刻在这里"));
      if (inventory.objects.length) {
        const section = el("section", "atlas-inventory"),
          list = el("ul", "");
        section.append(el("h4", "", "可查看"));
        for (const item of inventory.objects)
          list.append(el("li", "", item.label));
        section.append(list);
        pane.append(section);
      }
      pane.append(el("p", "atlas-room-description", scene.hint));
      const activity = window.ManorRoomActivities?.[selected];
      if (activity)
        pane.append(
          el("p", "atlas-room-description", "可在这里：" + activity.map),
        );
    } else {
      pane.append(
        el(
          "div",
          "atlas-preview-empty",
          Manor.transit.has(selected)
            ? "通行区域，尚无独立绘景。"
            : "此处暂未开放，也没有可预览的绘景。",
        ),
      );
    }
    const route = Manor.walk(current, selected);
    if (scene) {
      const names = route.map((id) => Manor.rooms[id][0]);
      pane.append(
        el(
          "p",
          "atlas-route-copy",
          current === selected
            ? "您正站在这里。"
            : (inspecting ? "若前往：" : "沿途：") + names.join(" → "),
        ),
      );
      const go = el(
        "a",
        "solid",
        current === selected
          ? "收起图册，继续探索"
          : "前往" + Manor.rooms[selected][0] + " →",
      );
      go.href = "#" + selected;
      go.dataset.mapJump = "true";
      pane.append(go);
    } else
      pane.append(
        el(
          "p",
          "",
          Manor.transit.has(selected)
            ? "这是通行区域，沿途会经过这里。"
            : "此处暂不接待访客。",
        ),
      );
    const list = el("div", "atlas-nearby");
    for (const [a, b] of Manor.edges) {
      const id = a === selected ? b : b === selected ? a : null;
      if (!id) continue;
      const button = el("button", "", Manor.rooms[id][0]);
      button.onclick = (e) => selectRoom(id, e);
      list.append(button);
    }
    if (list.childElementCount) {
      pane.append(el("p", "atlas-nearby-title", "相邻空间"), list);
    }
    if (["cellar", "attic"].includes(selected))
      pane.append(
        el(
          "p",
          "atlas-route-copy",
          "地窖与阁楼保留在建筑源模型中，此处显示分区入口。",
        ),
      );
    pane.append(
      el(
        "p",
        "atlas-inspect-help",
        inspecting
          ? "点击地图可固定此房间；移开鼠标，回到原先所选。"
          : "悬停看房间，点击定去处。触屏可点选房间，再向下查看。",
      ),
    );
    if (document.querySelector("#map-dialog").open)
      ManorAtlasMotion.reveal(pane);
  }
  async function toggle() {
    preview.reset();
    if (expanded) {
      expanded = false;
      ui.fold.textContent = "展开宅邸";
      ui.fold.setAttribute("aria-pressed", "false");
      ui.reset.hidden = true;
      ui.zoomIn.hidden = ui.fit.hidden = false;
      ui.status.textContent = "";
      ui.host.classList.remove("is-expanded");
      engine?.setExpanded(false);
      return;
    }
    const dialog = document.querySelector("#map-dialog");
    ui.fold.disabled = true;
    ui.status.textContent = "正在展开图册…";
    try {
      loaded ||= new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "atlas-engine.js";
        script.onload = resolve;
        script.onerror = () => {
          loaded = null;
          script.remove();
          reject(new Error("ENGINE_LOAD"));
        };
        document.head.append(script);
      });
      await loaded;
      if (!engine)
        engine = await window.createManorAtlasEngine(ui.canvas, A, {
          onSelect: (id, event) => selectRoom(id, event),
          onHover: (id) => (id ? preview.enter(id) : preview.leave()),
          onError: () => {
            engine = null;
            expanded = false;
            ui.reset.hidden = true;
            ui.zoomIn.hidden = ui.fit.hidden = false;
            ui.host.classList.remove("is-expanded");
            ui.fold.textContent = "展开宅邸";
            ui.fold.setAttribute("aria-pressed", "false");
            ui.status.textContent = "立体视图暂不可用，平面图仍可找路。";
          },
        });
      if (!dialog.open) return;
      expanded = true;
      engine.update(state);
      engine.setExpanded(true);
      ui.host.classList.add("is-expanded");
      ui.fold.textContent = "收回平面图";
      ui.fold.setAttribute("aria-pressed", "true");
      ui.reset.hidden = false;
      ui.zoomIn.hidden = ui.fit.hidden = true;
      ui.status.textContent = "悬停预览，点选房间；轻拖可转动。";
    } catch (e) {
      ui.status.textContent =
        "立体视图暂未载入，平面图仍可使用；可再次点击重试。";
    } finally {
      ui.fold.disabled = false;
    }
  }
  function render(next) {
    if (
      state &&
      (state.floor !== next.floor || state.selected !== next.selected)
    )
      preview.reset();
    if (state && state.floor !== next.floor) {
      zoom = 1;
      ui?.closeDirectory();
    }
    state = next;
    selectionHandler = next.onSelect;
    if (!ui) init();
    document.querySelectorAll('[role="tab"][data-floor]').forEach((b) => {
      const on = b.dataset.floor === state.floor;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    document
      .querySelector("#map-panel")
      .setAttribute("aria-labelledby", state.floor + "-tab");
    ui.select.textContent =
      "房间目录 · " + Manor.rooms[state.selected][0] + " ⌄";
    const directoryKey = state.floor + ":" + state.selected;
    if (ui.directoryKey !== directoryKey) {
      ui.directoryKey = directoryKey;
      ui.directory.replaceChildren();
      for (const [title, accepts] of [
        ["可以到访", (id) => !!Manor.scenes[id]],
        ["沿途经过", (id) => !Manor.scenes[id] && Manor.transit.has(id)],
        ["暂未开放", (id) => !Manor.scenes[id] && !Manor.transit.has(id)],
      ]) {
        const ids = Object.keys(A.layouts[state.floor]).filter(accepts);
        if (!ids.length) continue;
        const group = el("div", "atlas-directory-group");
        group.append(el("p", "", title));
        for (const id of ids) {
          const item = el("button", "", Manor.rooms[id][0]);
          item.type = "button";
          item.setAttribute("aria-pressed", String(id === state.selected));
          inspectable(item, id);
          item.onclick = (e) => {
            ui.closeDirectory(true);
            selectRoom(id, e);
          };
          group.append(item);
        }
        ui.directory.append(group);
      }
    }
    const drawingKey = JSON.stringify([
      state.floor,
      state.selected,
      state.current,
      state.count.room,
      state.count.unknown,
      state.count.moving,
      zoom,
    ]);
    if (ui.drawingKey !== drawingKey) {
      ui.drawingKey = drawingKey;
      const focused = ui.drawing.contains(document.activeElement)
        ? document.activeElement.dataset.room
        : null;
      drawing();
      if (focused)
        ui.drawing
          .querySelector('[data-room="' + focused + '"]')
          ?.focus({ preventScroll: true });
    }
    detail();
    engine?.update(state);
    if (expanded) engine?.resume();
  }
  return {
    render,
    open: () => ui.panelMotion.show(),
    close: () => ui.panelMotion.close(),
    get expanded() {
      return expanded;
    },
    get snapshot() {
      return { floor: state?.floor, selected: state?.selected, expanded };
    },
  };
})();
