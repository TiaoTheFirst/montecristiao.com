import { household } from "./household.mjs";
const count = async (db, sql, ...args) =>
  (
    await db
      .prepare(sql)
      .bind(...args)
      .first()
  ).n;
export async function manorAdmin(req, env, session, { json, body }) {
  const url = new URL(req.url),
    p = url.pathname,
    db = env.DB,
    now = Date.now();
  const fail = (status, error) => json({ error }, status);
  if (p === "/api/admin/content" && req.method === "GET") {
    const rows = household().editions.map((e) => ({
      id: e.date,
      date: e.date,
      title: e.title,
      news: e.news,
      lunch: e.lunch,
      dinner: e.dinner,
      source: e.source_name,
      status: "published",
    }));
    const offset = Number(url.searchParams.get("offset") || 0);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
      return fail(400, "FILTER_INVALID");
    return json({
      content: rows.slice(offset, offset + 40),
      total: rows.length,
    });
  }
  const edition = p.match(/^\/api\/admin\/content\/(\d{4}-\d{2}-\d{2})$/);
  if (edition && req.method === "GET") {
    const e = household().editions.find((e) => e.date === edition[1]);
    return e ? json({ content: { ...e, id: e.date } }) : fail(404, "NOT_FOUND");
  }
  if (p === "/api/admin/overview" && req.method === "GET") {
    const day = new Date(now).toISOString().slice(0, 10);
    const [users, letters, feedback, active, daily, monthly, events] =
      await Promise.all([
        count(db, "SELECT count(*) n FROM user"),
        count(
          db,
          "SELECT count(*) n FROM letters l LEFT JOIN letter_workflow w ON w.letter_id=l.id WHERE l.status='submitted' AND COALESCE(w.state,'received')!='replied'",
        ),
        count(
          db,
          "SELECT count(*) n FROM feedback WHERE status IN ('received','reviewing','planned')",
        ),
        count(
          db,
          "SELECT count(DISTINCT userId) n FROM session WHERE expiresAt>?",
          now,
        ),
        count(
          db,
          "SELECT COALESCE(sum(attempts),0) n FROM mail_delivery_budget WHERE day=?",
          day,
        ),
        count(
          db,
          "SELECT COALESCE(sum(attempts),0) n FROM mail_delivery_budget WHERE day>=? AND day<=?",
          day.slice(0, 7) + "-01",
          day,
        ),
        db
          .prepare(
            "SELECT code,count(*) total FROM operational_events WHERE created_at>? GROUP BY code",
          )
          .bind(now - 86400000)
          .all(),
      ]);
    return json({
      users,
      letters,
      feedback,
      active,
      database: "reachable",
      checkedAt: now,
      mail: {
        daily,
        monthly,
        dailyLimit: Number(env.MAIL_DAILY_LIMIT || 90),
        monthlyLimit: Number(env.MAIL_MONTHLY_LIMIT || 2700),
        period: "UTC",
        events: events.results,
      },
      integrations: {
        delivery: "not-connected",
        alerts: "not-connected",
        backup: "not-connected",
      },
      mode: env.APP_MODE,
    });
  }
  if (p === "/api/admin/accounts" && req.method === "GET") {
    const q = (url.searchParams.get("q") || "").trim(),
      offset = Number(url.searchParams.get("offset") || 0);
    if (
      q.length > 100 ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 100000
    )
      return fail(400, "FILTER_INVALID");
    const where =
      "(?='' OR instr(lower(u.name),lower(?))>0 OR instr(lower(u.email),lower(?))>0)";
    const rows = await db
      .prepare(
        `SELECT u.id,u.name,u.email,u.emailVerified,u.createdAt,u.updatedAt,(SELECT max(createdAt) FROM session s WHERE s.userId=u.id) AS lastSessionAt,(SELECT count(*) FROM session s WHERE s.userId=u.id AND s.expiresAt>?) AS activeSessions FROM user u WHERE ${where} ORDER BY u.createdAt DESC,u.id LIMIT 40 OFFSET ?`,
      )
      .bind(now, q, q, q, offset)
      .all();
    return json({
      accounts: rows.results,
      total: await count(
        db,
        `SELECT count(*) n FROM user u WHERE ${where}`,
        q,
        q,
        q,
      ),
    });
  }
  const m = p.match(
    /^\/api\/admin\/accounts\/([a-zA-Z0-9_-]{1,128})(?:\/(revoke))?$/,
  );
  if (m) {
    const row = await db
      .prepare(
        "SELECT id,name,email,emailVerified,createdAt,updatedAt FROM user WHERE id=?",
      )
      .bind(m[1])
      .first();
    if (!row) return fail(404, "NOT_FOUND");
    const owner = row.email.toLowerCase() === env.OWNER_EMAIL.toLowerCase();
    if (req.method === "GET" && !m[2])
      return json({
        account: {
          ...row,
          isOwner: owner,
          activeSessions: await count(
            db,
            "SELECT count(*) n FROM session WHERE userId=? AND expiresAt>?",
            row.id,
            now,
          ),
          lastSessionAt: (
            await db
              .prepare("SELECT max(createdAt) t FROM session WHERE userId=?")
              .bind(row.id)
              .first()
          ).t,
        },
      });
    if (req.method === "POST" && m[2] === "revoke") {
      if (owner) return fail(403, "OWNER_ACCOUNT_PROTECTED");
      const b = await body(req);
      if (b.confirm !== "revoke-sessions-v1")
        return fail(400, "CONFIRM_REQUIRED");
      await db.batch([
        db.prepare("DELETE FROM session WHERE userId=?").bind(row.id),
        db
          .prepare(
            "INSERT INTO admin_audit(id,actor_id,target_id,action,created_at) VALUES(?,?,?,'revoke-sessions',?)",
          )
          .bind(crypto.randomUUID(), session.user.id, row.id, now),
      ]);
      return json({ revoked: true });
    }
    return fail(405, "METHOD_NOT_ALLOWED");
  }
  if (p === "/api/admin/operations" && req.method === "GET") {
    const offset = Number(url.searchParams.get("offset") || 0);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
      return fail(400, "FILTER_INVALID");
    const rows = await db
      .prepare(
        "SELECT * FROM operational_events ORDER BY created_at DESC,id LIMIT 41 OFFSET ?",
      )
      .bind(offset)
      .all();
    return json({
      events: rows.results.slice(0, 40),
      total: await count(db, "SELECT count(*) n FROM operational_events"),
      nextOffset: rows.results.length > 40 ? offset + 40 : null,
    });
  }
  return null;
}
