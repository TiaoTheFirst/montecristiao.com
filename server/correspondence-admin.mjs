import { manorAdmin } from "./manor-admin.mjs";
import { adminSecurity, ADMIN_SESSION_MS } from "./admin-security.mjs";
import { applyReplyAction } from "./letter-workflow.mjs";

export async function adminRoute(req, env, session, { json, body }) {
  const url = new URL(req.url),
    fail = (s, error) => json({ error }, s);
  const denied = await adminSecurity(req, env, session);
  if (denied) return fail(denied.status, denied.error);
  if (
    /^\/api\/admin\/(overview|accounts|operations|content)(\/|$)/.test(
      url.pathname,
    )
  ) {
    const result = await manorAdmin(req, env, session, { json, body });
    if (result) return result;
  }
  if (url.pathname === "/api/admin/session" && req.method === "GET")
    return json({ owner: true, security: { access: env.ADMIN_ACCESS_MODE, expiresAt: new Date(session.session.createdAt).getTime() + ADMIN_SESSION_MS } });
  if (url.pathname === "/api/admin/letters" && req.method === "GET") {
    const limit = 40,
      offset = Number(url.searchParams.get("offset") || 0);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
      return fail(400, "OFFSET_INVALID");
    const rows = await env.DB.prepare(
      "SELECT l.id,l.subject,l.submitted_at,u.name,COALESCE(w.state,'received') AS state FROM letters l JOIN user u ON u.id=l.user_id LEFT JOIN letter_workflow w ON w.letter_id=l.id WHERE l.status='submitted' ORDER BY l.submitted_at DESC,l.id LIMIT ? OFFSET ?",
    )
      .bind(limit + 1, offset)
      .all();
    return json({
      letters: rows.results.slice(0, limit),
      total: (
        await env.DB.prepare(
          "SELECT count(*) n FROM letters WHERE status='submitted'",
        ).first()
      ).n,
      nextOffset: rows.results.length > limit ? offset + limit : null,
    });
  }
  const match = url.pathname.match(
    /^\/api\/admin\/letters\/([a-f0-9-]{36})(?:\/(review|draft|publish))?$/,
  );
  if (!match) return fail(404, "NOT_FOUND");
  const [, id, action] = match;
  const letter = await env.DB.prepare(
    "SELECT l.id,l.subject,l.body,l.submitted_at,u.name FROM letters l JOIN user u ON u.id=l.user_id WHERE l.id=? AND l.status='submitted'",
  )
    .bind(id)
    .first();
  if (!letter) return fail(404, "NOT_FOUND");
  if (req.method === "GET" && !action) {
    const workflow = await env.DB.prepare(
      "SELECT state,revision,reply_body,updated_at FROM letter_workflow WHERE letter_id=?",
    )
      .bind(id)
      .first();
    const replies = await env.DB.prepare(
      "SELECT id,body,created_at FROM replies WHERE letter_id=? ORDER BY created_at",
    )
      .bind(id)
      .all();
    return json({
      letter,
      workflow: workflow || { state: "received", revision: 0, reply_body: "" },
      replies: replies.results,
    });
  }
  if (req.method !== "POST" || !action) return fail(405, "METHOD_NOT_ALLOWED");
  const input = await body(req);
  if (action === "publish" && input.confirm !== "publish-reply-v1")
    return fail(400, "CONFIRM_REQUIRED");
  try {
    return json(await applyReplyAction(env.DB, id, action, input));
  } catch (e) {
    if (["REPLY_CONFLICT", "REVIEW_DRAFT_FIRST"].includes(e.message))
      return fail(409, e.message);
    if (["REPLY_INVALID", "REVISION_REQUIRED"].includes(e.message))
      return fail(400, e.message);
    if (e.message === "NOT_FOUND") return fail(404, "NOT_FOUND");
    throw e;
  }
}
