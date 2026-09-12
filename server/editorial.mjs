export function editorialDate(now = Date.now()) {
  return new Date(now + 8 * 3600000).toISOString().slice(0, 10);
}
export async function dailyEdition(db, now = Date.now()) {
  const edition = await db
    .prepare(
      "SELECT date,title,source_url,source_date,lunch,dinner FROM daily_editions WHERE date=? AND status='approved'",
    )
    .bind(editorialDate(now))
    .first();
  return edition || household(now).current;
}
import { household } from "./household.mjs";
