import { invitationWindows } from "./game-hours.mjs";
const manor = globalThis.createManor(globalThis.ManorArchitecture);
const time = (n) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
let cachedDate, today, upcoming;
function refresh() {
  const box = document.getElementById("game-schedule");
  if (!box) return;
  const world = window.ManorWorld?.snapshot();
  if (!world?.ready) {
    box.textContent = "今日牌桌时段：正在确认府中时钟……";
    return;
  }
  if (world.preview) {
    box.textContent = "当前为时间预览；恢复实时后可查看今日牌桌时段。";
    return;
  }
  const clock = window.ManorWorld.clock();
  if (clock.date !== cachedDate) {
    cachedDate = clock.date;
    today = invitationWindows(clock.date, manor);
    upcoming = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date(
        Date.parse(clock.date + "T12:00:00Z") + i * 86400000,
      )
        .toISOString()
        .slice(0, 10);
      const slots = invitationWindows(date, manor);
      if (slots.length) {
        upcoming = [{ date, ...slots[0] }];
        break;
      }
    }
  }
  const next = today.find((w) => w.end > clock.minute);
  const line = today.length
    ? today.map((w) => `${time(w.start)}–${time(w.end)}`).join("、")
    : "今天没有可邀请的时段";
  const future = upcoming[0];
  box.textContent =
    `今日（${clock.date}）牌桌：${line}。均为北京时间。` +
    (!next && future
      ? ` 下一次：${future.date} ${time(future.start)}–${time(future.end)}。`
      : "") +
    " 到时请到大客厅；其他时间仍可独自摆棋。";
}
window.addEventListener("manor:world", refresh);
document.addEventListener("visibilitychange", refresh);
refresh();
