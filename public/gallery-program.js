/* A quiet release index, separate from in-world time and character presence. */
(() => {
  const date = () =>
    new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  function mount({ side, open }) {
    const section = document.createElement("details");
    section.className = "gallery-program";
    const summary = document.createElement("summary");
    summary.textContent = "画廊近况与旧藏";
    section.append(summary);
    const entries = ManorGalleryProgram.visible(date());
    for (const entry of entries) {
      const article = document.createElement("article");
      const time = document.createElement("time");
      time.dateTime = entry.released;
      time.textContent = entry.released.replaceAll("-", ".") + " · 增补";
      const button = document.createElement("button");
      button.className = "folio-action";
      button.textContent = entry.title + " →";
      button.type = "button";
      button.onclick = () => open(entry.painting, undefined, entry.id);
      const text = document.createElement("p");
      text.textContent = entry.description;
      article.append(time, button, text);
      section.append(article);
    }
    side.append(section);
  }
  window.ManorGalleryProgramUI = { mount };
  function roomEntry() {
    let button = document.getElementById("gallery-program-entry");
    if (window.ManorView?.snapshot().room !== "gallery") {
      button?.remove();
      return;
    }
    const entries = ManorGalleryProgram.visible(date());
    if (!entries.length) return;
    if (!button) button = document.createElement("button");
    button.id = "gallery-program-entry";
    button.type = "button";
    button.textContent =
      "画廊近况 · " + entries[0].released.slice(5).replace("-", ".");
    button.onclick = () => {
      window.ManorObjects.open(entries[0].painting);
      const details = document.querySelector("#folio-dialog .gallery-program");
      if (!details) return;
      details.open = true;
      details.querySelector("summary").focus();
    };
    if (!button.isConnected)
      document.getElementById("object-list")?.append(button);
  }
  window.addEventListener("manor:state", roomEntry);
  document.addEventListener("DOMContentLoaded", roomEntry);
})();
