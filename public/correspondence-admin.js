(() => {
  const $ = (s) => document.querySelector(s),
    list = $("#admin-list"),
    sheet = $("#admin-sheet"),
    status = $("#admin-status");
  const names = {
    received: "新来信",
    reviewing: "正在阅读",
    "reply-draft": "回信草稿",
    replied: "已回信",
  };
  let owner = null,
    epoch = 0,
    active = null,
    revision = 0,
    dirty = false,
    busy = false,
    next = null;
  const api = (p, b, m) => Reception.api("/api/admin/" + p, b, m, owner);
  const say = (text) => {
    status.textContent = text;
  };
  const keep = async () =>
    !dirty ||
    (await Reception.confirm("回信还有未保存的文字。确定放下这张信纸？"));
  function clear() {
    ++epoch;
    owner = null;
    active = null;
    dirty = false;
    next = null;
    list.replaceChildren();
    sheet.innerHTML =
      '<h2>请用府主的邮箱登录</h2><p>来信与回信草稿已从页面收起。</p><button class="primary" data-reception="register">递上名片 →</button>';
    $("#admin-more").hidden = true;
  }
  function error(e) {
    say(
      e.code === "OWNER_ONLY"
        ? "这张名片没有回信案的权限。"
        : e.code === "REPLY_CONFLICT"
          ? "另一处已经保存过回信。请先复制当前文字，再刷新核对。"
          : e.message,
    );
  }
  async function guard(fn) {
    if (busy) return;
    busy = true;
    try {
      await fn();
    } catch (e) {
      error(e);
    } finally {
      busy = false;
    }
  }
  async function rows(append = false) {
    const stamp = epoch,
      result = await api("letters" + (append ? "?offset=" + next : ""));
    if (stamp !== epoch) return;
    if (!append) list.replaceChildren();
    for (const l of result.letters) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.id = l.id;
      b.append(document.createTextNode(l.subject));
      const small = document.createElement("small");
      small.textContent = l.name + " · " + names[l.state];
      b.append(small);
      b.onclick = () =>
        guard(async () => {
          if (await keep()) await open(l.id);
        });
      list.append(b);
    }
    if (!list.children.length) list.textContent = "尚无已递交的来信。";
    next = result.nextOffset;
    $("#admin-more").hidden = next === null;
  }
  async function open(id) {
    const stamp = ++epoch,
      result = await api("letters/" + id);
    if (stamp !== epoch) return;
    active = id;
    revision = result.workflow.revision;
    dirty = false;
    sheet.innerHTML =
      '<p class="eyebrow">CORRESPONDANCE PRIVÉE</p><h2 id="admin-subject" tabindex="-1"></h2><p id="admin-sender" class="admin-time"></p><div class="admin-letter-body"></div><div id="admin-history"></div><label for="admin-reply">给来访者的回信</label><textarea id="admin-reply" maxlength="20000" placeholder="写下您的回信。保存草稿不会发给来访者。"></textarea><div class="admin-actions"><button class="primary" id="admin-save">收好回信草稿</button><button id="admin-preview">核对并发出 →</button></div><section class="admin-preview" id="admin-preview-panel" hidden><h3>发出前核对</h3><p>这份回信将放入当前来访者的私函匣，发出后无法修改。不会另发邮件提醒。</p><div class="admin-reply-body"></div><div class="admin-actions"><button class="primary" id="admin-publish">确认发出这封回信</button><button id="admin-cancel">继续修改</button></div></section>';
    $("#admin-subject").textContent = result.letter.subject;
    $("#admin-sender").textContent =
      result.letter.name +
      " · " +
      new Date(result.letter.submitted_at).toLocaleString("zh-CN");
    $(".admin-letter-body").textContent = result.letter.body;
    for (const r of result.replies) {
      const d = document.createElement("details");
      d.className = "admin-reply-history";
      const s = document.createElement("summary");
      s.textContent =
        "已发回信 · " + new Date(r.created_at).toLocaleString("zh-CN");
      const p = document.createElement("div");
      p.className = "admin-reply-body";
      p.textContent = r.body;
      d.append(s, p);
      $("#admin-history").append(d);
    }
    $("#admin-reply").value =
      result.workflow.state === "replied" ? "" : result.workflow.reply_body;
    $("#admin-reply").oninput = () => {
      dirty = true;
      $("#admin-preview-panel").hidden = true;
    };
    $("#admin-save").onclick = () => guard(save);
    $("#admin-preview").onclick = () =>
      guard(async () => {
        await save();
        if (stamp !== epoch) return;
        if (dirty) throw Error("保存期间又修改了文字，请重新核对。");
        $(".admin-preview .admin-reply-body").textContent =
          $("#admin-reply").value;
        $("#admin-preview-panel").hidden = false;
        $("#admin-publish").focus();
      });
    $("#admin-cancel").onclick = () => {
      $("#admin-preview-panel").hidden = true;
      $("#admin-reply").focus();
    };
    $("#admin-publish").onclick = () =>
      guard(async () => {
        if (dirty) throw Error("文字已修改，请重新核对后发出。");
        await api("letters/" + id + "/publish", {
          revision,
          confirm: "publish-reply-v1",
        });
        if (stamp !== epoch) return;
        await open(id);
        await rows();
        say("回信已经放入对方的私函匣。");
      });
    list
      .querySelectorAll("button")
      .forEach((b) => b.classList.toggle("admin-picked", b.dataset.id === id));
    $("#admin-subject").focus();
    say("已打开来信。");
    if (result.workflow.state === "received") {
      await api("letters/" + id + "/review", {});
      if (stamp === epoch) await rows();
    }
  }
  async function save() {
    const text = $("#admin-reply")?.value,
      stamp = epoch,
      id = active;
    if (!text?.trim()) throw Error("请先写下回信。");
    const result = await api("letters/" + id + "/draft", { text, revision });
    if (stamp !== epoch) return;
    revision = result.revision;
    dirty = $("#admin-reply").value !== text;
    say(
      dirty
        ? "已保存上一版；新写的文字还未保存。"
        : "回信草稿已保存，来访者还看不到。",
    );
  }
  async function connect() {
    const uid = Reception.user?.id;
    if (uid === owner) return;
    clear();
    if (!uid) {
      say("请先登录。");
      return;
    }
    owner = uid;
    const stamp = epoch;
    try {
      await api("session");
      if (stamp !== epoch) return;
      sheet.innerHTML =
        "<h2>来信已经摆好</h2><p>从信匣里选一封信，开始阅读与回信。</p>";
      await rows();
      say("府主名片已核对。");
    } catch (e) {
      if (stamp === epoch) {
        clear();
        error(e);
      }
    }
  }
  $("#admin-refresh").onclick = () =>
    guard(async () => {
      if (!owner) {
        await connect();
        return;
      }
      if (!(await keep())) return;
      const id = active;
      await rows();
      if (id) await open(id);
    });
  $("#admin-more").onclick = () => guard(() => rows(true));
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
