import { worldAt } from "./world.mjs";
// Local prototype policy. No purchase, private-letter analysis, absence penalty or affinity UI.
export const relationshipPolicy = Object.freeze({
  familiarDays: 3,
  acquaintedDays: 6,
});
export async function relationshipData(db, uid) {
  const setting = await db
    .prepare("SELECT enabled FROM relationship_settings WHERE user_id=?")
    .bind(uid)
    .first();
  const days = await db
    .prepare(
      "SELECT COUNT(*) AS n FROM relationship_events WHERE user_id=? AND kind='meet'",
    )
    .bind(uid)
    .first();
  const painting = await db
    .prepare(
      "SELECT choice FROM relationship_events WHERE user_id=? AND kind='painting' ORDER BY created_at DESC LIMIT 1",
    )
    .bind(uid)
    .first();
  return {
    enabled: setting?.enabled !== 0,
    greeting:
      days.n >= relationshipPolicy.acquaintedDays
        ? "acquainted"
        : days.n >= relationshipPolicy.familiarDays
          ? "familiar"
          : days.n
            ? "returning"
            : "first",
    painting: painting?.choice || null,
  };
}
export async function exportRelationship(db, uid) {
  return {
    ...(await relationshipData(db, uid)),
    events: (
      await db
        .prepare(
          "SELECT day,kind,room,choice,created_at FROM relationship_events WHERE user_id=? ORDER BY created_at",
        )
        .bind(uid)
        .all()
    ).results,
  };
}
export async function relationshipRoute(
  req,
  env,
  uid,
  { json, body },
  now = Date.now(),
) {
  const db = env.DB,
    fail = (s, error) => json({ error }, s),
    path = new URL(req.url).pathname;
  if (req.method === "GET" && path === "/api/me/relationship")
    return json(await relationshipData(db, uid));
  if (req.method === "PUT" && path === "/api/me/relationship") {
    const b = await body(req);
    if (
      typeof b.enabled !== "boolean" ||
      Object.keys(b).some((k) => k !== "enabled")
    )
      return fail(400, "FIELD_NOT_ALLOWED");
    const statements = [
      db
        .prepare(
          "INSERT INTO relationship_settings(user_id,enabled) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled",
        )
        .bind(uid, Number(b.enabled)),
    ];
    if (!b.enabled)
      statements.push(
        db.prepare("DELETE FROM relationship_events WHERE user_id=?").bind(uid),
        db.prepare("DELETE FROM encounter_tickets WHERE user_id=?").bind(uid),
      );
    await db.batch(statements);
    return json(await relationshipData(db, uid));
  }
  if (req.method !== "POST") return fail(405, "METHOD_NOT_ALLOWED");
  const b = await body(req),
    before = await relationshipData(db, uid),
    world = worldAt(now);
  if (!before.enabled) return json({ enabled: false });
  if (Object.keys(b).some((k) => !["room", "ticket", "choice"].includes(k)))
    return fail(400, "FIELD_NOT_ALLOWED");
  if (
    world.count.moving ||
    world.count.room !== b.room ||
    !["study", "salon", "library", "gallery", "garden", "dining"].includes(
      b.room,
    )
  )
    return fail(409, "COUNT_NOT_HERE");
  if (b.room === "study" && world.clock.minute % 60 < 35)
    return fail(409, "COUNT_NOT_HERE");
  const enabled =
    "COALESCE((SELECT enabled FROM relationship_settings WHERE user_id=?),1)=1";
  if (path === "/api/me/relationship/meet") {
    const ticket = crypto.randomUUID();
    await db.batch([
      db.prepare("DELETE FROM encounter_tickets WHERE user_id=?").bind(uid),
      db
        .prepare(
          `INSERT INTO encounter_tickets(id,user_id,room,expires_at) SELECT ?,?,?,? WHERE ${enabled}`,
        )
        .bind(ticket, uid, b.room, world.encounterUntil, uid),
      db
        .prepare(
          `INSERT INTO relationship_events(user_id,day,kind,room,created_at) SELECT ?,?,'meet',?,? WHERE ${enabled} ON CONFLICT(user_id,day,kind) DO NOTHING`,
        )
        .bind(uid, world.clock.date, b.room, now, uid),
    ]);
    return json({ ...before, ticket });
  }
  if (path === "/api/me/relationship/painting") {
    if (b.room !== "gallery" || !["sky", "sail", "dislike"].includes(b.choice))
      return fail(400, "CHOICE_INVALID");
    const ticket = await db
      .prepare(
        "SELECT id FROM encounter_tickets WHERE id=? AND user_id=? AND room=? AND expires_at>?",
      )
      .bind(b.ticket || "", uid, b.room, now)
      .first();
    if (!ticket) return fail(409, "ENCOUNTER_EXPIRED");
    const saved = await db
      .prepare(
        `INSERT INTO relationship_events(user_id,day,kind,room,choice,created_at) SELECT ?,?,'painting',?,?,? WHERE ${enabled} AND EXISTS(SELECT 1 FROM encounter_tickets WHERE id=? AND user_id=? AND expires_at>?) ON CONFLICT(user_id,day,kind) DO NOTHING`,
      )
      .bind(
        uid,
        world.clock.date,
        b.room,
        b.choice,
        now,
        uid,
        b.ticket,
        uid,
        now,
      )
      .run();
    return json({ saved: !!saved.meta.changes });
  }
  return fail(404, "NOT_FOUND");
}
