(() => {
  const $ = (s) => document.querySelector(s),
    states = {
      received: "已收到",
      reviewing: "查看中",
      planned: "已列入计划",
      done: "已处理",
      declined: "暂不采纳",
    },
    categories = {
      general: "暂不分类",
      usability: "使用不便",
      content: "内容疑问",
      story: "故事建议",
      account: "账号故障",
    };
  let owner = null,
    epoch = 0,
    listTicket = 0,
    detailTicket = 0,
    record = null,
    dirty = false,
    next = null,
    pending = null,
    busy = false;
  const say = (t) => ($("#status").textContent = t),
    date = (t) => new Date(t).toLocaleString("zh-CN");
  const node = (tag, text, cls) => {
    const n = document.createElement(tag);
    n.textContent = text;
    if (cls) n.className = cls;
    return n;
  };
  const api = (p = "", b) =>
    Reception.api("/api/review/feedback" + p, b, undefined, owner);
  const confirmationPanel = window.ManorMotion?.createPanel($("#confirm"));
  const closeConfirmation = (immediate = false) =>
    confirmationPanel
      ? confirmationPanel.close({ immediate })
      : $("#confirm").close();
  function clear() {
    epoch++;
    listTicket++;
    detailTicket++;
    owner = null;
    record = null;
    dirty = false;
    pending = null;
    $("#list").replaceChildren();
    $("#counts").replaceChildren();
    $("#sheet").replaceChildren(node("h2", "请用府主名片进入"));
    $("#more").hidden = true;
    closeConfirmation(true);
  }
  function error(e) {
    if ([401, 403].includes(e.status) || e.code === "ACCOUNT_CHANGED") {
      clear();
      say("名片已失效或没有处理权限，请通过右上角名片重新登录。");
    } else
      say(
        e.code === "REVISION_CONFLICT"
          ? "这张便笺刚被另一处更新。当前文字保留，请先复制，再点“重新载入此笺”核对。"
          : e.message,
      );
  }
  async function guard(fn) {
    if (busy) return;
    busy = true;
    try {
      await fn();
    } catch (e) {
      await closeConfirmation();
      error(e);
    } finally {
      busy = false;
      $("#publish").disabled = false;
    }
  }
  async function keep() {
    return (
      !dirty ||
      (await Reception.confirm(
        "当前处理说明还未提交。放弃这些修改，取另一张或重新载入？",
        "放弃修改",
      ))
    );
  }
  function filters() {
    return new URLSearchParams(new FormData($("#filters")));
  }
  async function rows(append = false) {
    const stamp = epoch,
      ticket = ++listTicket,
      q = filters();
    if (append) q.set("offset", next);
    const data = await api("?" + q);
    if (stamp !== epoch || ticket !== listTicket) return;
    if (!append) $("#list").replaceChildren();
    for (const r of data.feedback) {
      const b = node("button", "");
      b.type = "button";
      b.append(
        node(
          "small",
          `${states[r.status]} · ${categories[r.category]} · ${date(r.created_at)}`,
        ),
        node("span", r.excerpt),
      );
      b.dataset.id = r.id;
      b.setAttribute("aria-current", String(record?.id === r.id));
      b.onclick = () =>
        guard(async () => {
          if (await keep()) await open(r.id);
        });
      $("#list").append(b);
    }
    if (!$("#list").children.length)
      $("#list").append(node("p", "这个筛选下还没有便笺。"));
    next = data.nextOffset;
    $("#more").hidden = next === null;
    $("#counts").replaceChildren(
      ...Object.entries(states).map(([key, label]) =>
        node(
          "span",
          `${label} ${data.counts.find((c) => c.status === key)?.total || 0}`,
        ),
      ),
    );
  }
  async function open(id) {
    const stamp = epoch,
      ticket = ++detailTicket,
      data = await api("/" + id);
    if (stamp !== epoch || ticket !== detailTicket) return;
    record = data.record;
    dirty = false;
    const sheet = $("#sheet");
    sheet.replaceChildren(node("h2", "来访者留下的话"));
    sheet.append(
      node(
        "p",
        `${categories[record.category]} · ${record.room || "未附房间"} · ${date(record.created_at)}`,
        "meta",
      ),
      node("p", record.body, "body"),
      node(
        "p",
        `入口 ${{ butler: "唤管家", tea: "伯爵交谈", footer: "页内入口", direct: "便笺入口" }[record.entry] || "来访便笺"} · 页面 ${record.page || "未附"} · 版本 ${record.page_version || "未附"} · ${record.owned ? "有名片，可在自己的记录中查看" : "匿名递交，仅保留回执，无法查询处理进展"}`,
        "meta",
      ),
      node("h3", "处理经过"),
    );
    const timeline = node("ol", "");
    for (const h of data.history) {
      const li = node("li", "");
      li.append(
        node("strong", states[h.status] + " · " + date(h.created_at)),
        node("p", h.note || "便笺已收到，等待查看。", "event-note"),
      );
      timeline.append(li);
    }
    sheet.append(timeline);
    const form = document.createElement("form");
    form.id = "update-form";
    form.innerHTML =
      '<label>下一步状态<select id="next-status"><option value="reviewing">查看中</option><option value="planned">已列入计划</option><option value="done">已处理</option><option value="declined">暂不采纳</option></select></label><label>给递交者的处理说明<textarea id="note" rows="5" maxlength="1200" required placeholder="写清做了什么、尚未解决什么；列入计划不等于已经完成。"></textarea></label><label id="verification-label">核验结果（标记已处理时必填）<textarea id="verification" rows="3" maxlength="700" placeholder="填写实际复核的步骤、结果和限制。"></textarea></label><div class="actions"><button type="button" id="reload">重新载入此笺</button><button type="submit">核对处理说明 →</button></div>';
    sheet.append(form);
    $("#next-status").value =
      record.status === "received" ? "reviewing" : record.status;
    const sync = () => {
      dirty = true;
      const done = $("#next-status").value === "done";
      $("#verification").required = done;
      $("#verification").minLength = done ? 8 : 0;
    };
    form.oninput = sync;
    form.onchange = sync;
    $("#verification").required = record.status === "done";
    $("#verification").minLength = record.status === "done" ? 8 : 0;
    $("#reload").onclick = () =>
      guard(async () => {
        if (await keep()) await open(id);
      });
    form.onsubmit = (e) => {
      e.preventDefault();
      if (busy) return;
      pending = {
        id: record.id,
        status: $("#next-status").value,
        note: $("#note").value.trim(),
        verification: $("#verification").value.trim(),
        revision: record.revision,
        confirm: "publish-feedback-update-v1",
      };
      if (!pending.note) return say("请先填写处理说明。");
      if (pending.status === "done" && pending.verification.length < 8)
        return say("请写下至少 8 个字符的实际核验结果。");
      $("#confirmation").replaceChildren(
        node("p", record.body, "body"),
        node("strong", states[pending.status]),
        node("p", pending.note, "event-note"),
        node(
          "p",
          pending.verification ? "核验：" + pending.verification : "",
          "event-note",
        ),
      );
      if (confirmationPanel) confirmationPanel.show();
      else $("#confirm").showModal();
      $("#cancel").focus();
    };
    $("#list")
      .querySelectorAll("button")
      .forEach((b) =>
        b.setAttribute("aria-current", String(b.dataset.id === id)),
      );
    sheet.querySelector("h2").tabIndex = -1;
    sheet.querySelector("h2").focus();
    window.ManorMotion?.reveal(sheet);
    say("已打开便笺。处理说明需核对后才写入。");
  }
  $("#cancel").onclick = () => {
    if (busy) return;
    closeConfirmation();
    pending = null;
  };
  $("#publish").onclick = () =>
    guard(async () => {
      if (!pending || !owner) return;
      const stamp = epoch,
        payload = { ...pending };
      delete payload.id;
      $("#publish").disabled = true;
      await api("/" + pending.id, payload);
      if (stamp !== epoch) return;
      const id = pending.id;
      pending = null;
      dirty = false;
      await closeConfirmation();
      if (stamp !== epoch) return;
      await open(id);
      await rows();
      say("处理说明已留下。递交者刷新自己的处理记录即可看到。");
    });
  $("#confirm").addEventListener("cancel", (e) => {
    e.preventDefault();
    if (!busy) {
      pending = null;
      closeConfirmation();
    }
  });
  $("#filters").onsubmit = (e) => {
    e.preventDefault();
    guard(() => rows());
  };
  $("#more").onclick = () => guard(() => rows(true));
  async function connect() {
    const uid = Reception.user?.id;
    if (uid === owner) return;
    clear();
    if (!uid) return say("请通过右上角名片，用府主邮箱登录。");
    owner = uid;
    const stamp = epoch;
    try {
      await rows();
      if (stamp === epoch) {
        $("#sheet").replaceChildren(
          node("h2", "从左侧取一张便笺"),
          node("p", "处理说明核对后才会写入。"),
        );
        say("府主名片已核对。");
      }
    } catch (e) {
      if (stamp === epoch) error(e);
    }
  }
  document.addEventListener("manor:account", connect);
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  window.addEventListener("pagehide", clear);
  window.addEventListener("pageshow", connect);
  connect();
})();
