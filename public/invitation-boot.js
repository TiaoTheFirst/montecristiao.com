(() => {
  const params = new URLSearchParams(location.search);
  // An explicit free-roam exit never forces the road or the conversation again.
  if (params.get("arrival") === "skip" && params.get("invite") !== "welcome")
    return;
  let done = false;
  try {
    done =
      JSON.parse(
        localStorage.getItem("manor-invitations-v1"),
      )?.chapters?.welcome?.actions?.at(-1) === "finish";
  } catch {}
  if (done) return;
  if (
    params.get("invite") === "welcome" ||
    ManorArrivalState.terminal(ManorArrivalState.read())
  ) {
    location.replace("/invitations.html?chapter=welcome");
  } else {
    location.replace(
      "/arrival.html?to=" + encodeURIComponent("/?invite=welcome#court"),
    );
  }
})();
