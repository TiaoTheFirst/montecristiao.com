import {
  chapter,
  advance,
  finishGame,
  result,
  store,
} from "/invitation-core.mjs";
import { chapters, scene } from "/invitation-data.mjs";
const $ = (id) => document.getElementById(id);
let storage;
try {
  storage = localStorage;
} catch {}
const saved = store(storage);
let state = finishGame(saved.read(), saved.game()),
  active = null,
  view = null,
  navigation = 0,
  departing = false;
function persist() {
  const ok = saved.write(state);
  $("saved").textContent = ok
    ? "已保存 · 仅当前浏览器，不计入账号关系。"
    : "浏览器未允许保存；离开后剧情可能从头开始。牌局需要允许本地保存后再赴约。";
  return ok;
}
persist();
function node(tag, text, cls) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (cls) el.className = cls;
  return el;
}
function address(id) {
  history.replaceState(
    null,
    "",
    id ? "/invitations.html?chapter=" + id : "/invitations.html",
  );
}
function marker() {
  const mark = $("detail-marker"),
    img = $("scene-image");
  if (!view?.detail || !img.naturalWidth) {
    mark.hidden = true;
    return;
  }
  const width = img.clientWidth,
    height = img.clientHeight,
    scale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
  const w = img.naturalWidth * scale,
    h = img.naturalHeight * scale;
  const [x, y] = view.detail === "window" ? [90, 31] : [26, 79];
  mark.style.left = (width - w) / 2 + (w * x) / 100 + "px";
  mark.style.top = (height - h) / 2 + (h * y) / 100 + "px";
  mark.hidden = false;
}
const motion = ManorMotion.create({
  stage: $("story"),
  srcFor: (job) => "/assets/" + job.view.image,
  labelFor: (job) => job.view.title,
  failed: (job) => {
    $("error").textContent = "这一景未能载入，请重试。";
    $("retry-scene").hidden = false;
    $("retry-scene").onclick = () => {
      $("retry-scene").hidden = true;
      motion.go(job);
    };
  },
  commit(job, src, focus) {
    // Persist only after the new scene has loaded, so a failed transition is retryable.
    state = job.state;
    active = job.id;
    $("invitations").hidden = active === "welcome";
    view = job.view;
    persist();
    address(active);
    $("hub").hidden = true;
    $("story").hidden = false;
    $("scene-image").src = src;
    $("scene-image").alt = view.title;
    $("scene-image").style.filter = "";
    $("scene-image").style.objectPosition = view.image.startsWith("games/")
      ? "center top"
      : view.image.includes("gallery-attentive")
        ? "78% 20%"
        : view.image.includes("salon-approach")
          ? "72% 20%"
          : "center 32%";
    $("story").dataset.art =
      view.painting || view.detail ? "painting" : "scene";
    $("time").textContent = chapters[active].time + " · 剧情时间";
    $("chapter-name").textContent = chapters[active].title;
    $("title").textContent = view.title;
    $("speaker").textContent = view.speaker;
    $("text").textContent = view.text;
    $("lamp").hidden = !view.painting;
    $("light").value = 75;
    if (view.painting) light();
    $("choices").replaceChildren();
    $("error").textContent = "";
    $("retry-scene").hidden = true;
    const progress = chapter(state, active),
      gameResult = result(chapter(state, "cards").game);
    $("score").hidden = progress.step !== "result" || !gameResult;
    if (gameResult)
      $("score").textContent =
        `本局得分：您 ${gameResult.scores[0]} · 伯爵 ${gameResult.scores[1]}`;
    for (const [action, label] of view.choices) {
      const button = node("button", label);
      button.onclick = () => {
        if (motion.busy || departing) return;
        if (active === "cards" && action === "sit" && !persist()) return;
        const next = advance(state, active, action);
        if (chapter(next, active).done) {
          state = next;
          persist();
          if (active === "welcome") leaveForFoyer();
          else showHub();
        } else show(active, next);
      };
      $("choices").append(button);
    }
    if (progress.step === "playing") {
      const link = node("a", "坐回牌桌，继续这一局 →");
      link.href = "/invitations/seven-cards.html";
      $("choices").append(link);
    }
    if (progress.step === "result") {
      const link = node("a", "再看出牌记录 →");
      link.href = "/invitations/seven-cards.html";
      $("choices").append(link);
    }
    if (progress.done) {
      const button = node("button", "收好请柬");
      button.onclick = showHub;
      $("choices").append(button);
    }
    requestAnimationFrame(marker);
    if (focus) {
      const request = navigation;
      const restoreFocus = () => {
        if (request !== navigation) return;
        if (motion.busy) setTimeout(restoreFocus, 30);
        else $("title").focus({ preventScroll: true });
      };
      setTimeout(restoreFocus, 30);
    }
  },
});
function show(id, next = state) {
  if (!chapters[id]) return showHub();
  if (id === "welcome" && chapter(next, id).done) return leaveForFoyer();
  navigation++;
  $("story").hidden = false;
  $("hub").hidden = true;
  motion.go({
    id,
    state: next,
    view: scene(id, chapter(next, id), result(chapter(next, "cards").game)),
  });
}
async function showHub() {
  const request = ++navigation;
  while (motion.busy) {
    await new Promise((resolve) => setTimeout(resolve, 30));
    if (request !== navigation) return;
  }
  await ManorMotion.animate($("story"), [{ opacity: 1 }, { opacity: 0 }], 150);
  if (request !== navigation) return;
  active = null;
  view = null;
  address(null);
  $("story").hidden = true;
  $("hub").hidden = false;
  $("invitations").hidden = false;
  $("chapter-list").replaceChildren();
  for (const [id, entry] of Object.entries(chapters)) {
    if (id === "welcome") continue;
    const progress = chapter(state, id),
      button = node("button", "", "invitation"),
      img = node("img");
    img.src = "/assets/" + entry.image;
    img.alt = "";
    button.append(
      img,
      node("strong", entry.title),
      node("small", entry.description),
      node(
        "span",
        progress.done
          ? "这次赴约已经结束"
          : progress.actions.length
            ? "接着上次继续 →"
            : "展开请柬 →",
      ),
    );
    button.onclick = () => show(id);
    $("chapter-list").append(button);
  }
  await ManorMotion.animate($("hub"), [{ opacity: 0 }, { opacity: 1 }], 180);
  $("hub-title").focus({ preventScroll: true });
}
function light() {
  const value = Number($("light").value);
  $("scene-image").style.filter = `brightness(${value / 100})`;
  $("light-value").textContent =
    value < 65 ? "灯光压低" : value > 90 ? "灯光移近" : "微亮";
}
async function leaveForFoyer() {
  if (departing) return;
  departing = true;
  ++navigation;
  await ManorMotion.animate(document.querySelector("main"), [{ opacity: 1 }, { opacity: 0 }], 160);
  location.replace("/?arrival=skip#foyer");
}
$("light").addEventListener("input", light);
$("scene-image").addEventListener("load", marker);
window.addEventListener("resize", marker);
$("invitations").onclick = showHub;
$("leave").onclick = async (event) => {
  event.preventDefault();
  await ManorMotion.animate(
    document.querySelector("main"),
    [{ opacity: 1 }, { opacity: 0 }],
    160,
  );
  location.href = $("leave").href;
};
const initial = new URLSearchParams(location.search).get("chapter");
if (initial && chapters[initial]) show(initial);
else showHub();
