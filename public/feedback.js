/* Feedback is separate from private correspondence. No private browser persistence. */
(() => {
  "use strict";
  const base = location.pathname.includes("/reading/") ? "../" : "";
  const statusNames = {
    received: "已收到",
    reviewing: "查看中",
    planned: "待安排",
    done: "已处理",
    declined: "暂不安排",
  };
  const roomNames = {
    court: "荣誉前院",
    foyer: "穿堂",
    salon: "大客厅",
    dining: "餐厅",
    gallery: "画廊",
    garden: "中央花园",
    library: "藏书室",
    study: "书房",
    letter: "通信小室",
    music: "小会客厅",
    terrace: "露台",
    westpath: "西侧园径",
    eastpath: "东侧园径",
    orangery: "橘园",
    pavilion: "园中小亭",
  };
  const pageNames = {
    "/": "府邸",
    "/index.html": "府邸",
    "/feedback.html": "来访便笺",
    "/letters.html": "我的通信",
    "/visits.html": "来访档案",
    "/manuscripts.html": "伯爵手稿",
    "/privacy.html": "隐私说明",
    "/about.html": "预览说明",
    "/reading/reply.html": "回信样例",
    "/reading/introduction.html": "创作引言",
    "/reading/friendship.html": "纯友谊原稿",
    "/games.html": "府中消遣",
    "/solitaire.html": "独粒棋",
    "/seven-cards.html": "七张暗牌",
    "/household.html": "府邸近况",
  };
  const standalone = !!document.querySelector("#feedback-page");
  const host = standalone
    ? document.querySelector("#feedback-page")
    : document.createElement("dialog");
  host.classList.add("feedback-surface");
  if (!standalone) {
    host.id = "feedback-dialog";
    host.setAttribute("aria-labelledby", "feedback-title");
    document.body.append(host);
  }
  const titleTag = standalone ? "h1" : "h2";
  host.innerHTML = `<div class="feedback-heading"><div><p class="feedback-eyebrow">BILLET DE VISITE</p><${titleTag} id="feedback-title" tabindex="-1">留一张来访便笺</${titleTag}></div>${standalone ? `<a class="feedback-close" href="${base}index.html#salon">回府邸 →</a>` : '<button class="feedback-close" type="button" data-fb-close aria-label="收起来访便笺">收起 ×</button>'}</div>
  <p class="feedback-lead">来访时有哪里不方便，或有什么想告诉我们，可以写在这里。</p>
  <div class="feedback-tabs" role="tablist" aria-label="来访便笺"><button type="button" id="fb-compose-tab" role="tab" aria-controls="fb-compose" aria-selected="true">写便笺</button><button type="button" id="fb-history-tab" role="tab" aria-controls="fb-history" aria-selected="false" tabindex="-1">我的处理记录<span id="fb-count"></span></button></div>
  <section id="fb-compose" role="tabpanel" aria-labelledby="fb-compose-tab"><form id="feedback-form">
  <label class="feedback-body-label" for="fb-body">你遇到了什么，或希望改进什么？</label><textarea id="fb-body" name="body" rows="4" maxlength="3000" required placeholder="例如：刚才那局的规则没看懂，或某个按钮点不开。也欢迎写下喜欢的地方。"></textarea>
  <div class="feedback-count"><span>不必写成正式的信。</span><span id="fb-length">0 / 3000</span></div>
  <details class="feedback-options"><summary>分类与页面信息（选填）</summary><label class="feedback-category" for="fb-category">便笺内容 <span>可不分类</span><select id="fb-category"><option value="general">暂不分类</option><option value="usability">使用不便</option><option value="content">内容疑问</option><option value="story">故事建议</option><option value="account">账号故障</option></select></label>
  <label class="feedback-check"><input id="fb-context" type="checkbox"><span>附上当前房间和页面版本 <small id="fb-context-label"></small></span></label></details>
  <label class="feedback-trap" aria-hidden="true">Website<input id="fb-website" tabindex="-1" autocomplete="off"></label>
  <div class="feedback-disclosure"><p>意见由网站作者或运营查看，免费且不公开。收到不等于已读或采纳。私人关系来信请走通信入口。</p><p>不会附带聊天全文、私函或截图。<a href="${base}privacy.html" target="_blank" rel="noopener">查看隐私说明 ↗</a></p></div>
  <label class="feedback-check"><input id="fb-consent" type="checkbox" required><span>我已阅读隐私说明，同意将这张便笺交给网站作者处理。<small>请勿填写自己或他人的可识别隐私；便笺保留最长 180 天。</small></span></label>
  <p id="fb-identity" class="feedback-muted"></p><div class="feedback-actions"><button class="feedback-primary" id="fb-submit" type="submit">递交便笺 →</button><span id="fb-save-state">未寄出的文字仅在本页暂留。</span></div>
  </form><section id="fb-receipt" class="feedback-receipt" hidden aria-labelledby="fb-receipt-title"><p class="feedback-eyebrow">REÇU</p><h3 id="fb-receipt-title">便笺已收好</h3><p>已经送达，等待作者查看。</p><p id="fb-receipt-id" class="feedback-receipt-id"></p><p id="fb-receipt-owner"></p><div class="feedback-actions"><button type="button" class="feedback-primary" id="fb-new">再写一张</button><button type="button" id="fb-receipt-history" hidden>查看处理记录 →</button></div></section></section>
  <section id="fb-history" role="tabpanel" aria-labelledby="fb-history-tab" hidden><p class="feedback-muted">只有您提交的便笺会列在这里，最多显示最近 100 张。处理说明由网站作者填写；便笺保留最长 180 天。</p><div id="fb-history-list"></div><button id="fb-refresh" type="button" class="feedback-secondary">刷新记录</button></section><p id="fb-message" role="status" aria-live="polite"></p>`;
  const q = (s) => host.querySelector(s),
    form = q("#feedback-form");
  if (!standalone) {
    const resume = document.createElement("button");
    resume.type = "button";
    resume.className = "feedback-primary";
    resume.textContent = "收好便笺，继续刚才的体验";
    resume.addEventListener("click", dismiss);
    q("#fb-receipt .feedback-actions").prepend(resume);
  }
  const panel = standalone ? null : window.ManorMotion?.createPanel(host);
  function reveal(target) {
    if (target.closest("[hidden]")) return;
    if (panel) return panel.reveal(target);
    if (standalone) return window.ManorMotion?.reveal(target);
  }
  function replace(render, target) {
    if (panel) return panel.replace(render, { target });
    render();
    reveal(target);
  }
  let context = null,
    payload = null,
    busy = false,
    opener = null,
    owner = window.Reception?.user?.id || null,
    identitySeen = !!window.Reception?.user,
    epoch = 0,
    historyEpoch = 0,
    controller = null;
  const errors = {
    ACCOUNT_CHANGED: "名片已改变，请重新登录后查看或递交便笺。",
    FEEDBACK_INVALID: "请填写 1 至 3000 个字符，检查是否含有不可见控制字符。",
    FEEDBACK_CONSENT: "请确认同意递交便笺并阅读隐私说明。",
    FEEDBACK_CONTEXT: "页面信息不正确，请取消附带房间信息后重试。",
    FEEDBACK_LIMIT: "本小时便笺已达上限，请稍后再来。您写的内容仍在这里。",
    FEEDBACK_RETRY_CHANGED:
      "这次递交的内容与此前不同。请刷新处理记录，确认是否已经收到，再写新便笺。",
    SERVICE_NOT_OPEN: "便笺服务暂时不可用，请保留文字后稍候重试。",
    LOGIN_REQUIRED: "请先登录，查看属于自己的处理记录。",
    REVISION_CONFLICT: "记录刚刚有变化，请刷新后再试。",
  };
  async function api(path, data, method, signal) {
    const r = await fetch(path, {
      method: method || (data ? "POST" : "GET"),
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        ...(data ? { "content-type": "application/json" } : {}),
        ...(owner ? { "x-manor-account": owner } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
      signal,
    });
    let json;
    try {
      json = await r.json();
    } catch {
      throw new TypeError("Invalid feedback response");
    }
    if (!r.ok)
      throw Object.assign(
        new Error(errors[json.error] || "暂时无法完成，请保留文字后重试。"),
        { status: r.status },
      );
    return json;
  }
  function message(text = "") {
    q("#fb-message").textContent = text;
  }
  function identity() {
    q("#fb-identity").textContent = owner
      ? "这张名片下的便笺可查看处理记录；可自行删除，也会在删除账号时一并删除；最长保留 180 天。"
      : "可以匿名递交；匿名便笺无法查询进展。需要处理记录，请先通过名片入口登录。";
  }
  function updateMarkers(unread = 0) {
    q("#fb-count").textContent = unread ? " · " + unread + " 条新说明" : "";
    document.querySelectorAll("a.feedback-link").forEach((link) => {
      link.textContent = unread ? "来访意见 · 有新说明" : "来访意见";
    });
  }
  async function checkUpdates() {
    const token = epoch;
    if (!owner) {
      updateMarkers();
      return;
    }
    try {
      const data = await api("/api/feedback");
      if (token === epoch)
        updateMarkers(
          data.feedback.filter((x) => x.revision > x.seen_revision).length,
        );
    } catch {
      /* Keep feedback entry available when private records cannot load. */
    }
  }
  function capture(entry = "direct") {
    const state = window.ManorView?.snapshot();
    const from = new URLSearchParams(location.search).get("from");
    let room =
      state?.room && roomNames[state.room]
        ? state.room
        : roomNames[from]
          ? from
          : "";
    let page = location.pathname;
    if (page.endsWith("/") && page !== "/") page = page.slice(0, -1) + ".html";
    if (!pageNames[page] && pageNames[page + ".html"]) page += ".html";
    if (!pageNames[page]) page = "";
    if (["/solitaire.html", "/seven-cards.html"].includes(page)) room = "salon";
    return { entry, room, page, pageVersion: "feedback-v1" };
  }
  function contextLabel() {
    q("#fb-context-label").textContent = [
      roomNames[context?.room],
      pageNames[context?.page],
      "feedback-v1",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  function showTab(name) {
    const history = name === "history";
    ++historyEpoch;
    replace(
      () => {
        q("#fb-compose").hidden = history;
        q("#fb-history").hidden = !history;
        for (const [id, selected] of [
          ["#fb-compose-tab", !history],
          ["#fb-history-tab", history],
        ]) {
          q(id).setAttribute("aria-selected", String(selected));
          q(id).tabIndex = selected ? 0 : -1;
        }
      },
      q(history ? "#fb-history" : "#fb-compose"),
    );
    message();
    if (history) loadHistory();
  }
  q("#fb-compose-tab").onclick = () => showTab("compose");
  q("#fb-history-tab").onclick = () => showTab("history");
  host.querySelector("[role=tablist]").onkeydown = (e) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const h =
        e.key === "End" || (e.key !== "Home" && q("#fb-history").hidden);
      showTab(h ? "history" : "compose");
      q(h ? "#fb-history-tab" : "#fb-compose-tab").focus();
    }
  };
  function open(entry = "direct", tab = "compose") {
    if (!host.open) opener = document.activeElement;
    if (!q("#fb-body").value && !payload) {
      context = capture(entry);
      contextLabel();
    }
    identity();
    if (panel) panel.show();
    else if (!standalone && !host.open) host.showModal();
    showTab(tab);
    q("#feedback-title").focus();
  }
  function dismiss() {
    if (busy) {
      message("正在确认是否收到，请稍候。");
      return Promise.resolve(false);
    }
    ++historyEpoch;
    if (panel) return panel.close();
    if (!standalone) host.close();
    return Promise.resolve(true);
  }
  q("[data-fb-close]")?.addEventListener("click", dismiss);
  host.addEventListener("cancel", (e) => {
    e.preventDefault();
    dismiss();
  });
  host.addEventListener("close", () => {
    if (host.open) return;
    ++historyEpoch;
    q("#fb-refresh").disabled = false;
    opener?.focus?.({ preventScroll: true });
  });
  host.addEventListener("click", (e) => {
    if (standalone || e.target !== host) return;
    const r = host.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dismiss();
  });
  function reset() {
    payload = null;
    form.reset();
    form.hidden = false;
    q("#fb-receipt").hidden = true;
    q("#fb-length").textContent = "0 / 3000";
    context = capture();
    contextLabel();
  }
  q("#fb-new").onclick = () => {
    replace(reset, q("#fb-compose"));
    message();
    q("#fb-body").focus();
  };
  q("#fb-receipt-history").onclick = () => showTab("history");
  q("#fb-body").oninput = () => {
    q("#fb-length").textContent = q("#fb-body").value.length + " / 3000";
    payload = null;
  };
  for (const id of ["#fb-category", "#fb-context"])
    q(id).onchange = () => {
      payload = null;
    };
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (busy || !form.reportValidity()) return;
    if (!q("#fb-body").value.trim()) {
      message("先写下一件想告诉我们的事。");
      q("#fb-body").focus();
      return;
    }
    const token = epoch;
    busy = true;
    message("正在递交便笺……");
    q("#fb-submit").disabled = true;
    form.setAttribute("aria-busy", "true");
    for (const el of form.elements) el.disabled = true;
    const c = q("#fb-context").checked
      ? context
      : { entry: context.entry, room: "", page: "", pageVersion: "" };
    payload ||= {
      requestId: crypto.randomUUID(),
      body: q("#fb-body").value,
      category: q("#fb-category").value,
      ...c,
      consent: q("#fb-consent").checked ? "feedback-v1" : "",
      website: q("#fb-website").value,
    };
    controller = new AbortController();
    const requestController = controller;
    const timeout = setTimeout(() => requestController.abort(), 15000);
    try {
      const result = await api(
        "/api/feedback",
        payload,
        "POST",
        controller.signal,
      );
      if (token !== epoch) return;
      form.hidden = true;
      q("#fb-receipt").hidden = false;
      q("#fb-receipt-id").textContent = "收件编号：" + result.id;
      q("#fb-receipt-owner").textContent = result.owned
        ? "处理说明会留在您的记录中。此版不发送邮件提醒。"
        : "这是匿名便笺。请自行留存编号；本页关闭后不提供匿名查询，也不发送通知。";
      q("#fb-receipt-history").hidden = !result.owned;
      reveal(q("#fb-receipt"));
      message("已收到。尚不表示已经阅读或采纳。");
      q("#fb-body").value = "";
      payload = null;
      q("#fb-receipt-title").setAttribute("tabindex", "-1");
      if (!q("#fb-compose").hidden && (standalone || host.open))
        q("#fb-receipt-title").focus();
    } catch (err) {
      if (token === epoch)
        message(
          err.name === "AbortError" || err instanceof TypeError
            ? "暂未确认是否收到。文字仍保留，重试同一份便笺不会重复收存。"
            : err.message,
        );
    } finally {
      clearTimeout(timeout);
      if (token === epoch) {
        busy = false;
        form.removeAttribute("aria-busy");
        for (const el of form.elements) el.disabled = false;
      }
    }
  };
  function node(tag, text, cls) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (cls) el.className = cls;
    return el;
  }
  async function loadHistory() {
    const list = q("#fb-history-list"),
      token = epoch,
      ticket = ++historyEpoch;
    const current = () => token === epoch && ticket === historyEpoch;
    q("#fb-refresh").disabled = false;
    replace(() => list.replaceChildren(), list);
    if (!owner) {
      list.append(
        node("p", "请先通过名片入口登录。匿名提交的便笺不会自动关联到新账号。"),
      );
      const login = node("button", "递上名片 →", "feedback-primary");
      login.type = "button";
      login.onclick = async () => {
        if (await dismiss())
          window.Reception?.open("register", () => open("direct", "history"));
      };
      list.append(login);
      reveal(list);
      return;
    }
    list.append(node("p", "正在取出记录……"));
    q("#fb-refresh").disabled = true;
    try {
      const data = await api("/api/feedback");
      if (!current()) return;
      const renderHistory = () => {
        list.replaceChildren();
        if (!data.feedback.length)
          list.append(node("p", "还没有以这张名片递交的便笺。"));
        const unread = data.feedback.filter(
          (x) => x.revision > x.seen_revision,
        ).length;
        updateMarkers(unread);
        for (const record of data.feedback) {
          const card = node("article", undefined, "feedback-record");
          const header = node("div", undefined, "feedback-record-head");
          header.append(
            node("strong", statusNames[record.status]),
            node("time", new Date(record.created_at).toLocaleString("zh-CN")),
          );
          card.append(header, node("p", record.body, "feedback-original"));
          if (record.operator_note) {
            card.append(
              node(
                "h3",
                record.revision > record.seen_revision
                  ? "新的处理说明"
                  : "处理说明",
              ),
              node("p", record.operator_note),
            );
            if (record.revision > record.seen_revision) {
              const read = node("button", "记为已读", "feedback-secondary");
              read.onclick = async () => {
                read.disabled = true;
                try {
                  await api("/api/feedback/" + record.id + "/read", {
                    revision: record.revision,
                  });
                  if (token === epoch) loadHistory();
                } catch (err) {
                  if (token === epoch) {
                    message(err.message);
                    read.disabled = false;
                  }
                }
              };
              card.append(read);
            }
          } else card.append(node("p", "尚未留下处理说明。", "feedback-muted"));
          card.append(node("p", "编号：" + record.id, "feedback-record-id"));
          const history = node("details"),
            heading = node("summary", "查看完整处理经过"),
            historyBody = node("div");
          history.append(heading, historyBody);
          card.append(history);
          let loaded = false;
          history.ontoggle = async () => {
            if (!history.open || loaded) return;
            loaded = true;
            historyBody.textContent = "正在读取处理经过……";
            try {
              const result = await api(
                "/api/feedback/" + record.id + "/history",
              );
              if (!current()) return;
              historyBody.replaceChildren();
              if (!result.history.length)
                historyBody.append(node("p", "便笺已收到，尚无处理说明。"));
              for (const event of result.history) {
                const item = node("article");
                item.append(
                  node(
                    "strong",
                    statusNames[event.status] +
                      " · " +
                      new Date(event.created_at).toLocaleString("zh-CN"),
                  ),
                  node("p", event.note),
                );
                historyBody.append(item);
              }
            } catch (err) {
              if (current()) {
                loaded = false;
                historyBody.textContent = "暂未读到处理经过，可收起后重试。";
              }
            }
          };
          const remove = node("button", "删除这张便笺", "feedback-delete"),
            confirm = node("div", undefined, "feedback-delete-confirm");
          remove.type = "button";
          confirm.hidden = true;
          confirm.append(node("p", "将删除这张便笺和处理记录，无法恢复。"));
          const yes = node("button", "确认删除"),
            no = node("button", "保留");
          yes.type = no.type = "button";
          confirm.append(yes, no);
          remove.onclick = () => {
            confirm.hidden = false;
            reveal(confirm);
            yes.focus();
          };
          no.onclick = () => {
            confirm.hidden = true;
            reveal(card);
            remove.focus();
          };
          yes.onclick = async () => {
            yes.disabled = true;
            try {
              await api("/api/feedback/" + record.id, undefined, "DELETE");
              if (token === epoch) loadHistory();
            } catch (err) {
              if (token === epoch) {
                message(err.message);
                yes.disabled = false;
              }
            }
          };
          card.append(remove, confirm);
          list.append(card);
        }
      };
      replace(renderHistory, list);
    } catch (err) {
      if (current()) {
        list.replaceChildren(node("p", err.message));
      }
    } finally {
      if (current()) q("#fb-refresh").disabled = false;
    }
  }
  q("#fb-refresh").onclick = loadHistory;
  document.addEventListener("manor:account", (e) => {
    const next = e.detail?.id || null;
    const firstResolution = !identitySeen;
    identitySeen = true;
    if (next !== owner) {
      // The first session response must not erase a note typed while loading.
      // Later identity changes still discard all previous-account content.
      const keepInitialDraft = firstResolution && !owner && !busy && !payload;
      owner = next;
      ++epoch;
      ++historyEpoch;
      if (host.dataset.panelMotion !== "closing") panel?.cancel();
      controller?.abort();
      busy = false;
      form.removeAttribute("aria-busy");
      for (const el of form.elements) el.disabled = false;
      if (!keepInitialDraft) reset();
      q("#fb-history-list").replaceChildren();
      updateMarkers();
      identity();
      if (!q("#fb-history").hidden) loadHistory();
    }
    checkUpdates();
  });
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-feedback]");
    if (trigger) {
      e.preventDefault();
      open(trigger.dataset.feedback || "footer");
    }
  });
  window.addEventListener("manor:feedback", (e) =>
    open(e.detail?.entry || "direct"),
  );
  window.addEventListener("beforeunload", (e) => {
    if (q("#fb-body").value.trim() || busy) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  window.addEventListener("pagehide", () => {
    ++epoch;
    ++historyEpoch;
    panel?.close({ immediate: true });
    controller?.abort();
    reset();
    q("#fb-history-list").replaceChildren();
  });
  window.ManorFeedback = { open };
  // Non-scene pages still have a steward service menu.
  const services = document.querySelector(".service-menu");
  if (services) {
    const link = node("a", "反馈问题／建议");
    link.href = base + "feedback.html";
    link.dataset.feedback = "butler";
    link.append(node("small", "留给管家的来访便笺 · 可匿名"));
    services.prepend(link);
  }
  context = capture();
  contextLabel();
  identity();
  checkUpdates();
  if (standalone && location.hash === "#history") showTab("history");
})();

window.ManorMemory={open:()=>window.Reception?.open("services")};
