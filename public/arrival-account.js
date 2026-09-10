/* Synchronize the one-time preference only; no plot actions or affinity writes. */
(() => {
  let epoch = 0;
  async function sync() {
    const uid = window.Reception?.user?.id,
      ticket = ++epoch;
    if (!uid) return;
    try {
      const saved = await Reception.api(
        "/api/me/arrival",
        undefined,
        "GET",
        uid,
      );
      if (ticket !== epoch || Reception.user?.id !== uid) return;
      const local = ManorArrivalState.read();
      if (ManorArrivalState.terminal(saved))
        ManorArrivalState.write(saved.status);
      else if (ManorArrivalState.terminal(local))
        await Reception.api(
          "/api/me/arrival",
          { status: local.status },
          "PUT",
          uid,
        );
    } catch {
      /* The local preference remains valid; retry on sign-in/online. */
    }
  }
  document.addEventListener("manor:account", sync);
  window.addEventListener("online", sync);
  sync();
})();
