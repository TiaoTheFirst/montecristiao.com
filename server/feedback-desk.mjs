import { isOwner, productionReady } from "./service-state.mjs";
import { updateFeedback, feedbackHistory } from "./feedback.mjs";
const states = ["received", "reviewing", "planned", "done", "declined"];
export async function feedbackDesk(req, env, session, { json, body }) {
  const url = new URL(req.url),
    fail = (status, error) => json({ error }, status);
  const production = productionReady(env) && url.origin === env.APP_ORIGIN && env.FEEDBACK_OPEN === "true";
  const local = env.APP_MODE === "local-test" && env.FEEDBACK_DESK_OPEN === "true" && ["127.0.0.1", "localhost"].includes(url.hostname);
  if (!production && !local)
    return fail(503, "SERVICE_NOT_OPEN");
  if (!isOwner(env, session)) return fail(403, "OWNER_ONLY");
  if (req.headers.get("x-manor-account") !== session.user.id)
    return fail(409, "ACCOUNT_CHANGED");
  if (url.pathname === "/api/review/feedback" && req.method === "GET") {
    const status = url.searchParams.get("status") || "",
      category = url.searchParams.get("category") || "",
      room = url.searchParams.get("room") || "",
      query = (url.searchParams.get("q") || "").trim(),
      offset = Number(url.searchParams.get("offset") || 0);
    if (
      (status && !states.includes(status)) ||
      !["", "general", "usability", "content", "story", "account"].includes(
        category,
      ) ||
      room.length > 32 ||
      query.length > 100 ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 100000
    )
      return fail(400, "FILTER_INVALID");
    const filter =
      "(?='' OR status=?) AND (?='' OR category=?) AND (?='' OR room=?) AND (?='' OR instr(lower(body),lower(?))>0)";
    const params = [
      status,
      status,
      category,
      category,
      room,
      room,
      query,
      query,
    ];
    const rows = await env.DB.prepare(
      `SELECT id,substr(body,1,180) AS excerpt,category,room,page,status,revision,created_at,updated_at FROM feedback WHERE ${filter} ORDER BY created_at DESC,id DESC LIMIT 41 OFFSET ?`,
    )
      .bind(...params, offset)
      .all();
    const counts = await env.DB.prepare(
      "SELECT status,count(*) AS total FROM feedback GROUP BY status",
    ).all();
    return json({
      feedback: rows.results.slice(0, 40),
      nextOffset: rows.results.length > 40 ? offset + 40 : null,
      counts: counts.results,
    });
  }
  const match = url.pathname.match(
    /^\/api\/review\/feedback\/([a-f0-9-]{36})$/,
  );
  if (!match) return fail(404, "NOT_FOUND");
  const id = match[1];
  const record = await env.DB.prepare(
    "SELECT id,body,category,entry,room,page,page_version,status,operator_note,revision,created_at,updated_at,user_id IS NOT NULL AS owned FROM feedback WHERE id=?",
  )
    .bind(id)
    .first();
  if (!record) return fail(404, "NOT_FOUND");
  if (req.method === "GET") {
    return json({ record, history: await feedbackHistory(env.DB, record) });
  }
  if (req.method !== "POST") return fail(405, "METHOD_NOT_ALLOWED");
  const input = await body(req);
  if (
    Object.keys(input).some(
      (k) =>
        !["status", "note", "revision", "verification", "confirm"].includes(k),
    )
  )
    return fail(400, "FIELD_NOT_ALLOWED");
  if (input.confirm !== "publish-feedback-update-v1")
    return fail(400, "CONFIRM_REQUIRED");
  if (
    input.status === "done" &&
    (typeof input.verification !== "string" ||
      input.verification.trim().length < 8)
  )
    return fail(400, "VERIFICATION_REQUIRED");
  if (
    typeof input.verification !== "string" ||
    input.verification.length > 700 ||
    typeof input.note !== "string" ||
    !input.note.trim()
  )
    return fail(400, "INVALID_UPDATE");
  const note =
    input.note.trim() +
    (input.verification.trim() ? "\n核验：" + input.verification.trim() : "");
  try {
    return json(
      await updateFeedback(env.DB, {
        id,
        status: input.status,
        note,
        revision: input.revision,
      }),
    );
  } catch (e) {
    if (e.message === "REVISION_CONFLICT") return fail(409, e.message);
    if (e.message === "INVALID_UPDATE") return fail(400, e.message);
    throw e;
  }
}
