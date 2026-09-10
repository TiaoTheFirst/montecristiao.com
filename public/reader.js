const reader = document.querySelector(".reader");
document.querySelector("#font-size").addEventListener("click", function () {
  const on = reader.classList.toggle("large");
  this.textContent = on ? "恢复字号" : "放大字号";
  this.setAttribute("aria-pressed", String(on));
});
document.querySelector("#night-mode").addEventListener("click", function () {
  const on = document.body.classList.toggle("night");
  this.textContent = on ? "日间阅读" : "夜间阅读";
  this.setAttribute("aria-pressed", String(on));
});
