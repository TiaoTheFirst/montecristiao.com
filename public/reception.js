(() => {
  "use strict";
  // Interrupted cross-document transitions are normal navigation, not failed data writes.
  for (const event of ["pageswap", "pagereveal"])
    window.addEventListener(event, (e) => {
      if (!e.viewTransition) return;
      const fallback = (error) => {
        if (error.name !== "AbortError")
          console.warn("Page transition unavailable:", error.name);
      };
      e.viewTransition.ready.catch(fallback);
      e.viewTransition.finished.catch(fallback);
      if (
        matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.documentElement.dataset.motion === "reduce"
      )
        e.viewTransition.skipTransition();
    });
  const $ = (s) => document.querySelector(s),
    base = location.pathname.includes("/reading/") ? "../" : "";
  let session = null,
    afterLogin = null,
    mode = "register",
    pane = "entry",
    viewEpoch = 0,
    epoch = 0,
    cooldown = 0,
    timer,
    busy = false;
  const channel =
    typeof BroadcastChannel === "function"
      ? new BroadcastChannel("manor-account")
      : null;
  const errors = {
    TEST_EMAIL_ONLY: "请填写有效邮箱。",
    NAME_INVALID: "称呼请填写 1 至 40 个字符。",
    WAIT_BEFORE_RESEND: "请稍等片刻再发送，避免重复邮件。",
    LOGIN_REQUIRED: "登录已失效，请重新验证邮箱。",
    INVALID_OTP: "验证码不正确或已经失效。",
    OTP_EXPIRED: "验证码已过期，请重新获取。",
    TOO_MANY_ATTEMPTS: "尝试次数已用完，请重新获取验证码。",
    REVISION_CONFLICT:
      "另一处已经修改这封信。当前文字仍保留，请先复制，再重新载入。",
    CONFIRM_REQUIRED: "请填写“删除账号”以确认。",
    SESSION_NOT_FRESH: "请先重新验证邮箱，再执行此操作。",
    SERVICE_NOT_OPEN: "真实服务尚未开放。",
    ACCOUNT_CHANGED: "当前名片已改变。请重新载入，避免把内容存入另一账号。",
    COUNT_NOT_HERE: "伯爵已经换了地方。这次未记作共同交谈。",
    ENCOUNTER_EXPIRED: "这段会面已经结束，未记录新的共同经历。",
    TEMPORARILY_UNAVAILABLE: "暂时未能完成，请稍后重试。",
    DRAFT_LIMIT: "每张名片最多保留 30 封信，请先整理旧信。",
    EMAIL_INVALID: "请填写可以接收验证码的有效邮箱。",
    OWNER_ONLY: "这张名片没有处理来信的权限。",
    OWNER_ACCOUNT_PROTECTED:
      "这是府主账号。更换管理邮箱或删除前，需要先迁移后台权限。",
    MEMORY_CONFLICT: "另一处已修改这页札记。请先保留当前文字，再重新载入。",
    MEMORY_LIMIT_OR_CONFLICT:
      "札记最多保留一百页，或这页刚被另一处保存。请重新载入核对。",
  };
  async function api(path, body, method, accountId) {
    if (
      !accountId &&
      (path.startsWith("/api/me/") || path.startsWith("/api/auth/"))
    )
      accountId = session?.user?.id;
    let response;
    try {
      response = await fetch(path, {
        method: method || (body ? "POST" : "GET"),
        credentials: "same-origin",
        cache: "no-store",
        signal:
          typeof AbortSignal !== "undefined" && AbortSignal.timeout
            ? AbortSignal.timeout(15000)
            : undefined,
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(accountId ? { "X-Manor-Account": accountId } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error(
        "尚未收到完成确认。请保留当前内容，恢复连接后重新查看状态。",
      );
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = data.error || data.code;
      const e = new Error(
        errors[code] ||
          (response.status === 429
            ? "操作过于频繁，请稍后再试。"
            : response.status === 409
              ? "记录已改变，请重新载入后再试。"
              : response.status === 400
                ? "请检查填写内容或重新获取验证码。"
                : "暂时未能完成，请重试。"),
      );
      e.status = response.status;
      e.code = code;
      if (response.status === 401) {
        clear();
      }
      throw e;
    }
    return data;
  }
  const dialog = document.createElement("dialog");
  dialog.id = "reception-dialog";
  dialog.className = "reception-dialog";
  dialog.setAttribute("aria-labelledby", "reception-title");
  dialog.innerHTML = `<div class="reception-layout"><aside class="butler-portrait"><img src="${base}assets/baptistin.png" alt="巴蒂斯坦托着一只银色名片盘" width="1024" height="1536"><div class="portrait-caption"><span>MONTECRISTIAO · RÉCEPTION</span><strong>巴蒂斯坦</strong></div></aside><div class="reception-content"><div class="reception-top"><p class="eyebrow">LA MAISON VOUS ACCUEILLE</p><button class="reception-close" data-action="close" aria-label="关闭接待界面">关闭 ×</button></div><h2 id="reception-title" tabindex="-1">留一张名片</h2><p id="reception-lead">登记以后，您可以在通信室保存来信，回来取信。</p>
  <section data-pane="entry"><form id="calling-form"><div class="calling-card" id="name-card"><label for="calling-name">希望我们怎样称呼您？</label><input id="calling-name" name="name" maxlength="40" autocomplete="nickname" placeholder="您的称呼" required><small>CARTE DE VISITE</small></div><div class="address-slip"><label for="calling-email">通信地址 · 邮箱</label><input id="calling-email" name="email" type="email" autocomplete="email" placeholder="您的常用邮箱" required maxlength="254"><small>用于登录验证，不印在名片上；回信在府中领取。</small></div><label class="consent"><input type="checkbox" required>我已阅读并同意按<a href="${base}privacy.html">隐私说明</a>处理登录资料。</label><button type="submit" class="primary">发送邮箱验证码 <span>→</span></button><div class="reception-actions"><button type="button" class="secondary" data-action="toggle-login">已有名片，直接登录</button><button type="button" class="secondary" data-action="close">先参观</button></div><p class="fine-print">创建或登录账号前，请阅读<a href="${base}privacy.html">隐私与通信说明</a>。不订阅宣传邮件。</p></form></section>
  <section data-pane="code" hidden><p>确认邮件的收件地址：<strong id="code-address"></strong></p><form id="code-form"><label for="calling-otp">邮箱中的六位验证码</label><input class="code-field" id="calling-otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required placeholder="000000"><p class="fine-print">五分钟内有效。整段粘贴即可。</p><button class="primary" type="submit">确认名片 <span>→</span></button><div class="reception-actions"><button type="button" class="secondary" data-action="resend">重新发送</button><button type="button" class="secondary" data-action="edit-email">修改邮箱</button></div></form></section>
  <section data-pane="welcome" hidden><div class="return-card ink-reveal"><span class="monogram">M</span><div class="return-name" id="return-name"></div><p>蒙特克里斯条府 · 回访笺</p><span class="return-date" id="return-date"></span></div><button class="primary" data-action="continue">收好回访笺，继续 <span>→</span></button><p class="fine-print">回访笺记录您的称呼。私人通信仍需登录后查看。</p></section>
  <section data-pane="services" hidden><div class="service-menu"><button data-action="register">名片与账号<small>登记、称呼与登录</small></button><a href="${base}letters.html">我的通信<small>来信、回信与草稿</small></a><a href="${base}index.html#study">去书房<small>看看案前的手稿</small></a><a href="${base}index.html#garden">到花园走走<small>经客厅与露台</small></a></div><p>伯爵外出时，这些地方仍然开放。</p></section>
  <section data-pane="settings" hidden><form id="settings-form" class="settings-fields"><label>称呼<input id="profile-name" maxlength="40" required autocomplete="nickname"></label><label>喜欢的阅读位置<select id="reading-place"><option value="">不记录偏好</option><option value="library">藏书室</option><option value="study">书房</option><option value="garden">花园</option></select></label><label>场景动态效果<select id="motion-choice"><option value="system">跟随设备设置</option><option value="reduce">减少动态效果</option></select></label><button class="primary" type="submit">保存名片</button></form><div class="reception-actions"><button class="secondary" data-action="change-email">更换邮箱</button><button class="secondary" data-action="export">导出资料</button><button class="secondary" data-action="logout">退出登录</button><button class="secondary" data-action="revoke">退出其他设备</button><button class="secondary danger-link" data-action="delete-start">删除账号</button></div></section>
  <section data-pane="change" hidden><p>先验证原邮箱，再验证新邮箱。两次确认完成后，通信仍属于同一账号。</p><form id="email-change-form"><label for="new-email">新邮箱</label><input id="new-email" type="email" autocomplete="email" placeholder="新的常用邮箱" required><button class="secondary" type="button" data-action="old-code">向原邮箱发送验证码</button><label for="old-otp">原邮箱验证码</label><input id="old-otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required><button class="primary" type="submit">验证原邮箱，向新邮箱发信</button></form><form id="email-confirm-form" hidden><label for="new-otp">新邮箱验证码</label><input id="new-otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required><button class="primary" type="submit">确认更换邮箱</button></form></section>
  <section data-pane="delete" hidden><p>这会删除账号及其来信、回信、反馈便笺和偏好。退出登录不会删除这些内容。</p><form id="delete-form"><label for="delete-confirm">输入“删除账号”确认</label><input id="delete-confirm" required autocomplete="off"><div class="reception-actions"><button class="primary" type="submit">确认删除</button><button class="secondary" type="button" data-action="register">取消</button></div></form><p class="fine-print">为保护通信，需要五分钟内的登录验证。提示过期时，请退出后重新登录。</p></section>
  <p id="reception-message" class="reception-message" role="status" aria-live="polite"></p></div></div>`;
  document.body.append(dialog);
  const panel = window.ManorMotion?.createPanel(dialog);
  function close(options) {
    ++viewEpoch;
    if (panel) return panel.close(options);
    dialog.close();
    return Promise.resolve(true);
  }

  dialog.querySelector('[data-pane="delete"] > p').textContent =
    "这会删除账号及其来信、回信、反馈便笺和偏好。退出登录不会删除这些内容。";
  if (
    typeof ManorPaintings === "object" &&
    ManorPaintings["butler-approach-day"]
  ) {
    const portrait = dialog.querySelector(".butler-portrait img");
    portrait.src = base + ManorPaintings["butler-approach-day"].src;
    portrait.alt = "接待管家巴蒂斯坦";
    portrait.style.objectPosition = "70% center";
  }
  const bell = document.createElement("button");
  bell.className = "butler-bell";
  bell.dataset.reception = "services";
  bell.innerHTML =
    '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 17h16M6 17v-2a6 6 0 0 1 12 0v2M3 20h18M12 9V5M10 5h4"/></svg>唤管家';
  document.body.append(bell);
  const nav = $(".quick-nav") || $("header nav");
  if (nav) {
    const b = document.createElement("button");
    b.className = "account-link";
    b.dataset.reception = "register";
    b.textContent = "递上名片";
    nav.append(b);
  }

  function message(text = "") {
    $("#reception-message").textContent = text;
  }
  function show(next) {
    if (dialog.dataset.panelMotion === "closing") return;
    ++viewEpoch;
    const render = () => {
      pane = next;
      dialog
        .querySelectorAll("[data-pane]")
        .forEach((n) => (n.hidden = n.dataset.pane !== next));
      const labels = {
        entry: mode === "register" ? "留一张名片" : "取回您的名片",
        code: "确认通信地址",
        welcome: "名片已经收妥",
        services: "可以留张便笺，也可以请管家指路。反馈问题无需登记。",
        settings: "整理您的名片",
        change: "更换通信地址",
        delete: "删除账号",
      };
      $("#reception-title").textContent = labels[next];
      $("#reception-lead").hidden = !["entry", "services"].includes(next);
      message();
    };
    if (panel)
      panel.replace(render, {
        target: dialog.querySelector(`[data-pane="${next}"]`),
      });
    else render();
  }
  function clear() {
    epoch++;
    session = null;
    document.documentElement.removeAttribute("data-motion");
    dialog.querySelectorAll("input").forEach((n) => (n.value = ""));
    $("#return-name").textContent = "";
    $("#return-date").textContent = "";
    document
      .querySelectorAll(".account-link")
      .forEach((n) => (n.textContent = "递上名片"));
    document.dispatchEvent(new CustomEvent("manor:account", { detail: null }));
  }
  async function refresh() {
    const ticket = ++epoch;
    try {
      const result = await api("/api/auth/get-session");
      if (ticket !== epoch) return;
      if (!result?.user) {
        clear();
        if (dialog.open && pane !== "services") show("entry");
        return;
      }
      session = result;
      document
        .querySelectorAll(".account-link")
        .forEach((n) => (n.textContent = "我的名片"));
      document.dispatchEvent(
        new CustomEvent("manor:account", { detail: session.user }),
      );
      const p = await api("/api/me/preferences");
      if (ticket !== epoch) return;
      document.documentElement.dataset.motion = p.motion;
      $("#reading-place").value = p.reading_place;
      $("#motion-choice").value = p.motion;
    } catch (e) {
      if (ticket === epoch)
        message("暂时无法核对账号，请检查连接。未保存的文字仍在当前页面。");
    }
  }
  function open(kind = "register", callback = null) {
    afterLogin = callback;
    // Keep underlying dialogs intact: their own close handlers own unsaved guards.
    if (dialog.dataset.panelMotion === "closing") panel.show();
    if (kind === "services") show("services");
    else if (session) {
      show("settings");
      $("#profile-name").value = session.user.name;
    } else show("entry");
    if (panel) panel.show();
    else if (!dialog.open) dialog.showModal();
  }
  async function run(action) {
    if (busy) return;
    busy = true;
    dialog
      .querySelectorAll("button[type=submit]")
      .forEach((b) => (b.disabled = true));
    message();
    const ticket = viewEpoch;
    try {
      await action(() => ticket === viewEpoch && dialog.open);
    } catch (e) {
      if (ticket === viewEpoch && dialog.open) message(e.message);
    } finally {
      busy = false;
      dialog
        .querySelectorAll("button[type=submit]")
        .forEach((b) => (b.disabled = false));
    }
  }
  const broadcast = () =>
    channel?.postMessage({ userId: session?.user?.id || null });
  async function send() {
    const ticket = viewEpoch;
    await api("/api/auth/email-otp/send-verification-otp", {
      email: $("#calling-email").value.trim(),
      type: "sign-in",
    });
    if (ticket !== viewEpoch || !dialog.open) return;
    cooldown = Date.now() + 30000;
    $("#code-address").textContent = $("#calling-email").value.trim();
    $("#calling-otp").value = "";
    show("code");
    $("#calling-otp").focus();
    updateCountdown();
  }
  function updateCountdown() {
    clearTimeout(timer);
    const b = dialog.querySelector("[data-action=resend]"),
      left = Math.max(0, Math.ceil((cooldown - Date.now()) / 1000));
    b.disabled = left > 0;
    b.textContent = left ? `${left} 秒后可重发` : "重新发送";
    if (left) timer = setTimeout(updateCountdown, 1000);
  }
  $("#calling-form").onsubmit = (e) => {
    e.preventDefault();
    run(send);
  };
  $("#code-form").onsubmit = (e) => {
    e.preventDefault();
    run(async (current) => {
      await api("/api/auth/sign-in/email-otp", {
        email: $("#calling-email").value.trim(),
        otp: $("#calling-otp").value,
        name: $("#calling-name").value.trim() || "来访者",
      });
      await refresh();
      if (!session) throw new Error("暂未能取得登录状态，请重新验证。");
      broadcast();
      if (!current()) return;
      $("#return-name").textContent = session.user.name;
      $("#return-date").textContent =
        "初访 · " +
        new Date(session.user.createdAt).toLocaleDateString("zh-CN");
      show("welcome");
    });
  };
  $("#settings-form").onsubmit = (e) => {
    e.preventDefault();
    run(async (current) => {
      await api("/api/auth/update-user", {
        name: $("#profile-name").value.trim(),
      });
      if (!current()) return;
      await api(
        "/api/me/preferences",
        {
          reading_place: $("#reading-place").value,
          motion: $("#motion-choice").value,
        },
        "PATCH",
      );
      await refresh();
      broadcast();
      if (!current()) return;
      message("名片已保存。");
    });
  };
  $("#email-change-form").onsubmit = (e) => {
    e.preventDefault();
    run(async (current) => {
      await api("/api/auth/email-otp/request-email-change", {
        newEmail: $("#new-email").value.trim(),
        otp: $("#old-otp").value,
      });
      if (!current()) return;
      const render = () => {
        $("#email-change-form").hidden = true;
        $("#email-confirm-form").hidden = false;
      };
      if (panel)
        panel.replace(render, {
          target: $("#email-confirm-form"),
          focus: $("#new-otp"),
        });
      else render();
      message("请查看新邮箱中的验证码。");
    });
  };
  $("#email-confirm-form").onsubmit = (e) => {
    e.preventDefault();
    run(async (current) => {
      await api("/api/auth/email-otp/change-email", {
        newEmail: $("#new-email").value.trim(),
        otp: $("#new-otp").value,
      });
      await refresh();
      broadcast();
      if (!current()) return;
      show("settings");
      message("邮箱已更换，通信记录保持不变。");
    });
  };
  $("#delete-form").onsubmit = (e) => {
    e.preventDefault();
    run(async (current) => {
      await api("/api/auth/delete-user", {
        confirm: $("#delete-confirm").value,
      });
      clear();
      broadcast();
      if (!current()) return;
      show("entry");
      message("账号及其通信和偏好已删除。");
    });
  };
  dialog.addEventListener("click", (e) => {
    const a = e.target.closest("[data-action]")?.dataset.action;
    if (!a) return;
    if (a === "close") {
      close();
      return;
    }
    if (a === "toggle-login") {
      mode = mode === "register" ? "login" : "register";
      $("#name-card").hidden = mode === "login";
      $("#calling-name").required = mode === "register";
      e.target.textContent =
        mode === "register" ? "已有名片，直接登录" : "第一次来，登记名片";
      show("entry");
      return;
    }
    if (a === "edit-email") {
      show("entry");
      $("#calling-email").focus();
      return;
    }
    if (a === "register") {
      open();
      return;
    }
    if (a === "continue") {
      const cb = afterLogin;
      afterLogin = null;
      close().then((closed) => {
        if (closed) cb?.();
      });
      return;
    }
    if (a === "delete-start") {
      show("delete");
      return;
    }
    if (a === "change-email") {
      show("change");
      $("#email-change-form").hidden = false;
      $("#email-confirm-form").hidden = true;
      return;
    }
    run(async (current) => {
      if (a === "resend") await send();
      if (a === "old-code") {
        await api("/api/auth/email-otp/send-verification-otp", {
          email: session.user.email,
          type: "email-verification",
        });
        if (current()) message("验证码已发往原邮箱，请查收。");
      }
      if (a === "logout") {
        await api("/api/auth/sign-out", {});
        clear();
        broadcast();
        if (!current()) return;
        show("entry");
        message("已经退出。");
      }
      if (a === "revoke") {
        await api("/api/auth/revoke-other-sessions", {});
        broadcast();
        if (current()) message("其他设备的登录已撤销。");
      }
      if (a === "export") {
        const data = await api("/api/me/export");
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = "我的通信.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        if (current()) message("导出的文件含私人内容，请妥善保存。");
      }
    });
  });
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-reception]");
    if (trigger) {
      e.preventDefault();
      if (
        trigger.classList.contains("butler-bell") &&
        document.body.classList.contains("living-estate")
      ) {
        window.dispatchEvent(new CustomEvent("manor:butler"));
        return;
      }
      open(trigger.dataset.reception);
    }
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        close();
    }
  });
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => {
    if (dialog.open) return;
    ++viewEpoch;
    message();
    $("#calling-otp").value = "";
    $("#old-otp").value = "";
    $("#new-otp").value = "";
  });
  document.addEventListener("manor:scene", (e) => {
    let desk = $("#reception-desk");
    if (!desk) {
      desk = document.createElement("section");
      desk.id = "reception-desk";
      desk.className = "reception-desk";
      desk.innerHTML = `<img src="${base}assets/baptistin.png" alt="接待管家巴蒂斯坦" width="90" height="108"><div><h2>巴蒂斯坦在此等候</h2><p>留一张名片，或请他为您指路。</p></div><button data-reception="register">递上名片 →</button>`;
      $(".room-dock")?.before(desk);
    }
    desk.hidden = e.detail.room !== "foyer";
  });
  channel?.addEventListener("message", (e) => {
    if (!e.data?.userId || e.data.userId !== session?.user?.id) {
      clear();
      if (dialog.open && pane !== "services") show("entry");
    }
    refresh();
  });
  window.addEventListener("pagehide", () => {
    clear();
    if (dialog.open) close({ immediate: true });
  });
  window.addEventListener("pageshow", refresh);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh();
  });
  window.Reception = {
    api,
    open,
    refresh,
    get user() {
      return session?.user || null;
    },
    needLogin(cb) {
      if (session) cb();
      else open("register", cb);
    },
    confirm: confirmAction,
  };
  const confirmPane = document.createElement("dialog");
  confirmPane.className = "manor-confirm";
  confirmPane.setAttribute("aria-labelledby", "manor-confirm-title");
  confirmPane.innerHTML =
    '<h2 id="manor-confirm-title">请再核对一下</h2><p id="manor-confirm-text"></p><div class="reception-actions"><button type="button" data-confirm="yes" class="primary">确认继续</button><button type="button" data-confirm="no">取消，返回</button></div>';
  document.body.append(confirmPane);
  const confirmPanel = window.ManorMotion?.createPanel(confirmPane);
  let confirmResolve = null,
    confirmOwner = null;
  function finishConfirm(yes) {
    const resolve = confirmResolve;
    confirmResolve = null;
    const accepted = yes && confirmOwner === session?.user?.id;
    if (confirmPanel) confirmPanel.close({ immediate: true });
    else confirmPane.close();
    resolve?.(accepted);
  }
  function confirmAction(text) {
    finishConfirm(false);
    confirmOwner = session?.user?.id;
    confirmPane.querySelector("p").textContent = text;
    const promise = new Promise((resolve) => {
      confirmResolve = resolve;
    });
    if (confirmPanel) confirmPanel.show();
    else confirmPane.showModal();
    confirmPane.querySelector('[data-confirm="no"]').focus();
    return promise;
  }
  confirmPane.querySelector('[data-confirm="yes"]').onclick = () =>
    finishConfirm(true);
  confirmPane.querySelector('[data-confirm="no"]').onclick = () =>
    finishConfirm(false);
  confirmPane.addEventListener("cancel", (e) => {
    e.preventDefault();
    finishConfirm(false);
  });
  document.addEventListener("manor:account", () => {
    if (confirmOwner !== session?.user?.id) finishConfirm(false);
  });
  window.addEventListener("pagehide", () => finishConfirm(false));
  // Status only: no subjects or private correspondence fetched into room scenes.
  const mailLink = document.querySelector(
      '.quick-nav a[href="' + base + 'letters.html"]',
    ),
    mailLabel = mailLink?.textContent;
  let mailEpoch = 0;
  async function mailStatus() {
    const uid = session?.user?.id,
      version = ++mailEpoch;
    if (mailLink) {
      mailLink.textContent = mailLabel;
      mailLink.removeAttribute("aria-label");
    }
    if (!uid || !mailLink || document.hidden) return;
    try {
      const result = await api("/api/me/correspondence", undefined, "GET", uid);
      if (version !== mailEpoch || session?.user?.id !== uid) return;
      if (result.unread) {
        mailLink.textContent = "我的通信 · 有未拆回信";
        mailLink.setAttribute("aria-label", "我的通信，有未拆回信");
      }
    } catch {}
  }
  document.addEventListener("manor:account", mailStatus);
  document.addEventListener("manor:mail-read", mailStatus);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) mailStatus();
  });
  setInterval(mailStatus, 60000);
  refresh();
})();

(()=>{let stamp=0;document.addEventListener('manor:account',async()=>{const n=++stamp;document.querySelectorAll('[data-owner-desk]').forEach(e=>e.remove());const uid=Reception.user?.id;if(!uid)return;try{await Reception.api('/api/admin/session',undefined,'GET',uid);if(n!==stamp||Reception.user?.id!==uid)return;const a=document.createElement('a');a.href='/correspondence-admin';a.dataset.ownerDesk='true';a.textContent='伯爵的回信案 →';const feedback=document.createElement('a');feedback.href='/feedback-desk';feedback.dataset.ownerDesk='true';feedback.textContent='来访便笺处理案 →';document.querySelector('[data-pane="settings"] .reception-actions')?.append(feedback);document.querySelector('[data-pane="settings"] .reception-actions')?.append(a);}catch{}});})();
