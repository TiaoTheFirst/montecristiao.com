(() => {
  if (new URLSearchParams(location.search).get("arrival") === "skip") return;
  if (ManorArrivalState.terminal(ManorArrivalState.read())) return;
  const to = ManorArrivalState.destination(
    location.pathname + location.search + location.hash,
  );
  location.replace("/arrival.html?to=" + encodeURIComponent(to));
})();
