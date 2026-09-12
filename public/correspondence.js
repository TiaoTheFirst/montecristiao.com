(() => {
  const $ = (s) => document.querySelector(s),
    sheet = $("#letter-sheet"),
    list = $("#cabinet-list"),
    api = (path, body, method) => Reception.api(path, body, method, owner);
  let active = null,
    dirty = false,
    version = 0,
    busy = false,
    owner = null,
    edit = 0,
    saveTimer,
    autoPaused = false,
    newRequest = null,
    recovery = null;
  function queueSave() {
    clearTimeout(saveTimer);
    if (autoPaused) return;
    saveTimer = setTimeout(() => {
      if (!dirty || active?.status !== "draft" || !owner) return;
      if (busy) {
        queueSave();
        return;
      }
      guarded(save);
    }, 1400);
  }
  const esc = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  function clear() {
    if (dirty && owner && active && $("#letter-body"))
      recovery = {
        owner,
        id: active.id,
        subject: $("#letter-subject").value,
        body: $("#letter-body").value,
      };
    clearTimeout(saveTimer);
    autoPaused = false;
    version++;
    owner = null;
    newRequest = null;
    active = null;
    dirty = false;
    list.replaceChildren();
    $("#cabinet-name").textContent = "尚未登记";
    sheet.innerHTML =
      '<div class="empty-letter"><p class="eyebrow">CORRESPONDANCE PRIVÉE</p><h2>请先登录，打开私函匣。</h2><p>登录后再打开您的通信。私人内容不会保留在这个页面上。</p><button class="primary" data-reception="register">递上名片 →</button></div>';
    if (recovery)
      sheet.insertAdjacentHTML(
        "beforeend",
        '<p role="status">未保存的文字暂留在当前窗口。请用原来的名片重新登录后取回；关闭或刷新窗口会丢失这部分文字。</p>',
      );
  }
  function error(e) {
    if (e.status === 409) autoPaused = true;
    const target = $("#letter-error");
    if (target) target.textContent = e.message;
    else {
      const p = document.createElement("p");
      p.className = "error-line";
      p.role = "alert";
      p.textContent = e.message;
      sheet.append(p);
    }
    const status = $("#save-status");
    if (status && dirty)
      status.textContent = "修改尚未保存 · 请保留文字，检查提示后重试";
  }
  async function mayLeave() {
    return (
      !dirty || (await Reception.confirm("这封信还有未保存的修改。确定离开？"))
    );
  }
  async function guarded(fn) {
    if (busy) return;
    busy = true;
    try {
      await fn();
    } catch (e) {
      if (owner && Reception.user?.id === owner) error(e);
    } finally {
      busy = false;
    }
  }
  async function loadList() {
    const stamp = version,
      uid = Reception.user?.id;
    if (!uid) return;
    const data = await api("/api/letters");
    if (stamp !== version || Reception.user?.id !== uid) return;
    list.replaceChildren();
    for (const letter of data.letters) {
      const b = document.createElement("button");
      b.dataset.letter = letter.id;
      b.setAttribute("aria-current", String(active?.id === letter.id));
      const title = document.createElement("span");
      title.textContent = letter.subject || "尚未题名的草稿";
      const small = document.createElement("small");
      small.textContent = letter.unread
        ? "有一封未拆回信"
        : letter.reply_count
          ? "回信已收入"
          : letter.status === "draft"
            ? "草稿 · 尚未寄出"
            : "已收存 · 等待回信";
      b.append(title, small);
      b.onclick = () => {
        guarded(async () => {
          if (await mayLeave()) await load(letter.id);
        });
      };
      list.append(b);
    }
    if (!data.letters.length) list.textContent = "信匣里还没有来信。";
  }
  async function load(id) {
    clearTimeout(saveTimer);
    const stamp = ++version,
      data = await api("/api/letters/" + id);
    if (stamp !== version || !Reception.user) return;
    active = data.letter;
    dirty = false;
    autoPaused = false;
    render(data);
    await loadList();
  }
  function render(data) {
    const l = data.letter;
    sheet.innerHTML = `<p class="eyebrow">${l.status === "draft" ? "UNE LETTRE EN COURS" : "LETTRE CONSERVÉE"}</p><h2>${l.status === "draft" ? "写信" : "来信已经收存"}</h2><p class="letter-meta">私人来信 · ${esc(new Date(l.created_at).toLocaleDateString("zh-CN"))}</p><p id="letter-error" class="error-line" role="alert"></p>`;
    if (l.status === "draft") {
      sheet.insertAdjacentHTML(
        "beforeend",
        `<form id="letter-form"><label for="letter-subject">这封信想问什么？</label><input id="letter-subject" maxlength="100" required value="${esc(l.subject)}" placeholder="一个具体的问题"><label for="letter-body">信的正文</label><textarea id="letter-body" maxlength="12000" required placeholder="可以从一件具体的事写起：发生了什么，您卡在什么地方，希望讨论什么。请省略真实姓名、住址等无关隐私。">${esc(l.body)}</textarea><p id="save-status" class="status-line">已载入草稿 · 修改后请保存</p><div class="reception-actions"><button class="primary" type="submit">收好草稿</button><button type="button" id="submit-letter">确认并寄出</button><button type="button" id="delete-letter">删除这封信</button></div><label class="consent"><input type="checkbox" id="fictional-consent">我同意将这封信递交给作者阅读，理解回信由本人撰写、在私函匣领取，暂不保证回复时间。</label></form>`,
      );
      $("#letter-form").oninput = (e) => {
        if (e.target.id === "fictional-consent") return;
        edit++;
        dirty = true;
        $("#save-status").textContent = autoPaused
          ? "存在版本冲突 · 请先复制当前文字"
          : "等待自动保存 · 也可以手动收好草稿";
        queueSave();
      };
      if (recovery?.owner === owner && recovery.id === l.id) {
        const restore = document.createElement("button");
        restore.type = "button";
        restore.textContent = "取回这个窗口未保存的文字";
        restore.onclick = async () => {
          if (
            !(await Reception.confirm(
              "用这个窗口保留的文字替换编辑框？请先核对是否有其他设备的新修改。",
            ))
          )
            return;
          $("#letter-subject").value = recovery.subject;
          $("#letter-body").value = recovery.body;
          dirty = true;
          autoPaused = true;
          edit++;
          recovery = null;
          restore.remove();
          $("#save-status").textContent =
            "已取回到编辑框，尚未保存。请核对后手动收好草稿。";
        };
        $("#letter-form").prepend(restore);
      }
      $("#letter-form").onsubmit = (e) => {
        e.preventDefault();
        guarded(save);
      };
      const reload = document.createElement("button");
      reload.type = "button";
      reload.textContent = "重新载入已保存版本";
      reload.onclick = () => {
        guarded(async () => {
          if (await mayLeave()) await load(l.id);
        });
      };
      $("#letter-form .reception-actions").append(reload);
      $("#submit-letter").onclick = () =>
        guarded(async () => {
          if (!$("#letter-form").reportValidity()) return;
          if (!$("#fictional-consent").checked)
            throw new Error("请先确认同意将这封信交给作者阅读。");
          if (
            !(await Reception.confirm(
              "寄出后正文将固定，不能继续修改。是否确认？",
            ))
          )
            return;
          const form = $("#letter-form"),
            stamp = version;
          form
            .querySelectorAll("input,textarea,button")
            .forEach((n) => (n.disabled = true));
          try {
            await save();
            if (stamp !== version || dirty) return;
            await api("/api/letters/" + l.id + "/submit", {
              consent: "correspondence-v1",
              revision: active.revision,
            });
            if (stamp === version) await load(l.id);
          } finally {
            if (form.isConnected)
              form
                .querySelectorAll("input,textarea,button")
                .forEach((n) => (n.disabled = false));
          }
        });
    } else {
      const receipt = document.createElement("section");
      receipt.className = "letter-receipt";
      receipt.setAttribute("aria-label", "寄信回执");
      const statusNames = {
        received: "已收存，等待处理",
        reviewing: "正在处理",
        "reply-draft": "正在整理回信",
        replied: "回信已放入私函匣",
      };
      receipt.innerHTML = `<p class="eyebrow">ACCUSÉ DE RÉCEPTION</p><p>收存编号 <code>${esc(l.id)}</code></p><p>${esc(new Date(l.submitted_at || l.updated_at).toLocaleString("zh-CN"))}</p><strong>${statusNames[data.workflow?.state] || (data.replies.length ? "回信已放入私函匣" : "已收存，等待处理")}</strong><p>回信在私函匣领取；目前不另发邮件提醒。</p>`;
      const refresh = document.createElement("button");
      refresh.type = "button";
      refresh.textContent = "查看最新处理状态";
      refresh.onclick = () => guarded(() => load(l.id));
      receipt.append(refresh);
      sheet.append(receipt);
      const title = document.createElement("h3");
      title.textContent = l.subject;
      sheet.append(title);
      const content = document.createElement("div");
      content.className = "letter-paper-body";
      content.textContent = l.body;
      sheet.append(content);
      sheet.insertAdjacentHTML(
        "beforeend",
        '<div class="reply-section" id="reply-section"><p class="eyebrow">RÉPONSE</p></div>',
      );
      const replies = $("#reply-section");
      if (!data.replies.length) {
        const p = document.createElement("p");
        p.textContent = "回信还没有放进信匣。您可以先回府里走走。";
        replies.append(p);
      } else {
        const button = document.createElement("button");
        button.className = "sealed-letter";
        button.textContent = data.replies.some((r) => !r.read_at)
          ? "一封尚未拆阅的回信 · 打开"
          : "重读这封回信";
        button.onclick = () =>
          guarded(async () => {
            const stamp = version;
            await api("/api/letters/" + l.id + "/read", {});
            if (stamp !== version || Reception.user?.id !== owner) return;
            button.remove();
            for (const r of data.replies) {
              const p = document.createElement("div");
              p.className = "letter-paper-body ink-reveal";
              p.textContent = r.body;
              replies.append(p);
            }
            await loadList();
            document.dispatchEvent(new CustomEvent("manor:mail-read"));
          });
        replies.append(button);
      }
      sheet.insertAdjacentHTML(
        "beforeend",
        '<div class="reception-actions"><button id="delete-letter">删除这封信及回信</button></div>',
      );
    }
    $("#delete-letter").onclick = () =>
      guarded(async () => {
        if (
          !(await Reception.confirm("删除这封信及附带回信？此操作不可撤回。"))
        )
          return;
        await api("/api/letters/" + l.id, undefined, "DELETE");
        active = null;
        dirty = false;
        sheet.innerHTML =
          "<h2>这封信已删除。</h2><p>如需另写一封，请选择“铺开一张信纸”。</p>";
        await loadList();
      });
  }
  async function save() {
    clearTimeout(saveTimer);
    const l = active,
      stamp = version,
      edited = edit;
    const result = await api(
      "/api/letters/" + l.id,
      {
        subject: $("#letter-subject").value,
        body: $("#letter-body").value,
        revision: l.revision,
      },
      "PATCH",
    );
    if (stamp !== version) return;
    active.revision = result.revision;
    autoPaused = false;
    dirty = edited !== edit;
    $("#letter-error").textContent = "";
    $("#save-status").textContent = dirty
      ? "前一版已保存 · 正在等候保存新补充的文字"
      : "草稿已保存 · " + new Date().toLocaleTimeString("zh-CN");
    if (dirty) queueSave();
    await loadList();
  }
  $("#new-letter").onclick = () =>
    Reception.needLogin(async () => {
      if (!(await mayLeave())) return;
      guarded(async () => {
        const stamp = version,
          data = await api("/api/letters", {
            requestId: (newRequest ||= crypto.randomUUID()),
          });
        newRequest = null;
        if (stamp === version) await load(data.id);
      });
    });
  document.addEventListener("manor:account", (e) => {
    if (!e.detail) {
      clear();
      return;
    }
    const changed = owner !== e.detail.id;
    if (recovery && recovery.owner !== e.detail.id) recovery = null;
    owner = e.detail.id;
    $("#cabinet-name").textContent = e.detail.name + " · 私函匣";
    if (changed) {
      newRequest = null;
      version++;
      active = null;
      dirty = false;
      sheet.innerHTML =
        '<div class="empty-letter"><p class="eyebrow">CORRESPONDANCE PRIVÉE</p><h2>信纸已经备好。</h2><p>可以从左边继续一封信，或者铺开新的信纸。</p><p id="letter-error" class="error-line" role="alert"></p></div>';
      if (recovery?.owner === owner) {
        const resume = document.createElement("button");
        resume.textContent = "继续刚才未保存的信";
        resume.onclick = () => guarded(() => load(recovery.id));
        sheet.append(resume);
      }
    }
    guarded(loadList);
  });
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  window.addEventListener("pagehide", clear);
  $("#cabinet-retry").onclick = () => guarded(loadList);
})();
