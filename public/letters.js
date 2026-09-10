const form = document.querySelector("#letter-demo");
function step(n) {
  document
    .querySelectorAll(".demo-step")
    .forEach((e) => (e.hidden = Number(e.dataset.step) !== n));
  const region = document.querySelector(`[data-step="${n}"]`);
  const target =
    region.querySelector("legend") || document.querySelector("#demo-title");
  target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}
document.querySelector("#demo-next").addEventListener("click", () => step(1));
document.querySelector("#demo-back").addEventListener("click", () => step(0));
document.querySelector("#demo-reset").addEventListener("click", () => {
  form.reset();
  step(0);
});
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const risk = new FormData(form).get("risk");
  const out = document.querySelector("#demo-result");
  out.replaceChildren();
  const wrap = document.createElement("div");
  wrap.className = risk === "high" ? "safety-message" : "receipt";
  const h = document.createElement("h3");
  h.textContent =
    risk === "high" ? "这类情况不能等待普通回信。" : "您已经看过来信的起点。";
  const p = document.createElement("p");
  p.textContent =
    risk === "high"
      ? "这是安全分流演示。实际遇到即时危险时，应优先联系适用的本地紧急支持；不要为验证关系判断而故意冲突或试探。正式流程会停止普通建议，不把此类情况放入等待队列。"
      : "正式流程还需要了解原有相处、焦点事件、双方说过的话与已经尝试的做法。材料齐备后进入异步分析；此处没有提交、生成或发送任何回信。";
  wrap.append(h, p);
  if (risk !== "high") {
    const a = document.createElement("a");
    a.className = "line-link";
    a.href = "letters.html";
    a.textContent = "查看私人通信的安排 ↗";
    wrap.append(a);
  }
  out.append(wrap);
  step(2);
});
