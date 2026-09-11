import paper from "../public/content/household.json" with { type: "json" };
export function household(now = Date.now(), data = paper) {
  const date = new Date(now + 8 * 3600000).toISOString().slice(0, 10);
  const editions = data.editions
    .filter((e) => e.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date));
  return {
    date,
    current: editions.find((e) => e.date === date) || null,
    latest: editions[0] || null,
    editions,
  };
}
