const requested = new URLSearchParams(location.search).get("light");
const explicit = requested === "day" || requested === "night";
function paint(light) {
  document.getElementById("solitaire-garden").src = `assets/garden-${light}.webp`;
  document.documentElement.dataset.gardenLight = light;
}
// Room links retain the visitor's selected scenery. Direct visits use real
// manor time; the device clock is only a background fallback while offline.
const hour = new Date(Date.now() + 8 * 3600000).getUTCHours();
paint(explicit ? requested : hour >= 7 && hour < 18 ? "day" : "night");
if (!explicit) {
  fetch("/api/world", {cache:"no-store", credentials:"omit", signal:AbortSignal.timeout(7000)})
    .then(response => response.ok ? response.json() : null)
    .then(world => {
      if (world?.version === "manor-world-v1" && ["day", "night"].includes(world.light)) paint(world.light);
    })
    .catch(() => {});
}
