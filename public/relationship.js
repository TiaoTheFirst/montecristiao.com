/* Only explicit meetings and a spoken painting choice. No private-letter analysis. */
(() => {
  let data = null,
    owner = null,
    ticket = null,
    epoch = 0;
  const api = (path, body, method) =>
    Reception.api("/api/me/relationship" + path, body, method, owner);
  async function refresh() {
    const version = ++epoch,
      uid = Reception.user?.id;
    owner = uid;
    data = null;
    ticket = null;
    if (!uid) {
      updateSetting();
      return;
    }
    try {
      const result = await api("");
      if (version === epoch && Reception.user?.id === uid) data = result;
    } catch {}
    updateSetting();
  }
  async function meet(state) {
    const uid = owner,
      version = epoch;
    if (state?.world?.preview || !uid || !data?.enabled) return null;
    try {
      const result = await api("/meet", { room: state.room });
      if (version !== epoch || Reception.user?.id !== uid) return null;
      ticket = result.ticket;
      data = result;
      return result;
    } catch {
      return null;
    }
  }
  function decorate(page, state, known = data) {
    if (!known?.enabled || page.unavailable || known.greeting === "first")
      return page;
    const name = Reception.user?.name,
      address = name ? name + "，" : "";
    const prefix =
      {
        returning: "又见面了。",
        familiar: "您好。",
        acquainted: "您来了。",
      }[known.greeting] || "";
    let text = address + prefix + " " + page.text.replace(address, "");
    if (state.room === "gallery" && known.painting) {
      const memories = {
        sky: "上回您说喜欢那片灰蓝。今天还想看它吗？",
        sail: "上回您说船画得太小。我又看了看，还是喜欢这个大小。",
        dislike: "您上回说不喜欢这幅。今天想聊些什么？",
      };
      text = address + memories[known.painting];
    }
    const choices = [...page.choices];
    if (["familiar", "acquainted"].includes(known.greeting))
      choices.unshift({
        label: "我想在这里坐一会儿。",
        action: "familiar-unhurried",
      });
    if (known.greeting === "acquainted" && state.room === "gallery")
      choices.unshift({
        label: "这幅画，您自己还有不满意的地方吗？",
        action: "familiar-painting",
      });
    return { ...page, text, choices };
  }
  async function painting(choice, state) {
    if (state?.world?.preview || !data?.enabled || !owner) return;
    const uid = owner,
      version = epoch;
    if (!ticket) await meet(state);
    if (!ticket || uid !== owner || version !== epoch) return;
    try {
      await api("/painting", { room: state.room, choice, ticket });
    } catch {}
  }
  const settings = document.querySelector(
    '[data-pane="settings"] .reception-actions',
  );
  const control = document.createElement("button");
  control.type = "button";
  control.className = "secondary";
  function updateSetting() {
    control.textContent = data?.enabled
      ? "关闭并清除共同来访记录"
      : "允许记住府里的共同交谈";
    control.disabled = !owner;
  }
  control.onclick = async () => {
    if (!owner) return;
    const enabled = !data?.enabled,
      uid = owner,
      version = epoch;
    if (
      !enabled &&
      !confirm("清除已记录的共同交谈？私人信件、札记和购买安排不受影响。")
    )
      return;
    control.disabled = true;
    try {
      const result = await api("", { enabled }, "PUT");
      if (version === epoch && Reception.user?.id === uid) {
        data = result;
        ticket = null;
      }
    } catch (e) {
      if (version === epoch)
        document.querySelector("#reception-message").textContent = e.message;
    }
    updateSetting();
  };
  settings?.append(control);
  updateSetting();
  document.addEventListener("manor:account", refresh);
  window.addEventListener("pagehide", () => {
    epoch++;
    data = null;
    owner = null;
    ticket = null;
  });
  window.ManorRelationship = { meet, decorate, painting };
  if (Reception.user) refresh();
})();
