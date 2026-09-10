import "../public/manor.js";
import plan from "../models/manor-plan.json" with { type: "json" };

const manor = globalThis.createManor(plan);
export function worldAt(timestamp = Date.now()) {
  const date = new Date(timestamp + 8 * 3600000);
  const clock = {
    date: date.toISOString().slice(0, 10),
    minute: date.getUTCHours() * 60 + date.getUTCMinutes(),
  };
  const count = manor.state(clock.date, clock.minute);
  const phase = manor.phases.findLastIndex((p) => p.at <= clock.minute);
  const end = manor.phases[phase + 1]?.at ?? 1440;
  return {
    version: "manor-world-v1",
    timestamp,
    clock,
    count,
    meal: manor.meal(clock.date, clock.minute),
    light: manor.light(clock.minute),
    encounterUntil: Math.min(
      timestamp + 10 * 60000,
      timestamp +
        (end - clock.minute) * 60000 -
        date.getUTCSeconds() * 1000 -
        date.getUTCMilliseconds(),
    ),
    phaseEndsAt: end,
  };
}
