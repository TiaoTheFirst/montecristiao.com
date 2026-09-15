import { recordOperation } from "./operations.mjs";
import { createAuth } from "./auth.mjs";
import { sendVerificationMail } from "./mail.mjs";
import { dailyEdition } from "./editorial.mjs";
import { feedbackRoute } from "./feedback.mjs";
import { worldAt } from "./world.mjs";
import { memoryRoute, exportMemory } from "./memory.mjs";
import { workflowFor, letterHistory } from "./letter-workflow.mjs";
import { relationshipRoute, exportRelationship } from "./relationship.mjs";
import { productionReady, validEmail, isOwner } from "./service-state.mjs";
import { adminRoute } from "./correspondence-admin.mjs";
import { feedbackDesk } from "./feedback-desk.mjs";

const sessions = new WeakMap();
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
const fail = (status, code) => json({ error: code }, status);
const cleanName = (name) =>
  typeof name === "string" &&
  name.trim().length > 0 &&
  [...name.trim()].length <= 40 &&
  !/[\u0000-\u001f\u007f]/u.test(name);
const privateHeaders = (response) => {
  const r = new Response(response.body, response);
  r.headers.set("cache-control", "no-store");
  r.headers.set("x-content-type-options", "nosniff");
  r.headers.set("referrer-policy", "no-referrer");
  return r;
};
const authPaths = new Set([
  "/get-session",
  "/sign-out",
  "/email-otp/send-verification-otp",
  "/sign-in/email-otp",
  "/update-user",
  "/delete-user",
  "/email-otp/request-email-change",
  "/email-otp/change-email",
  "/revoke-other-sessions",
]);

function authFor(env) {
  if (!sessions.has(env))
    sessions.set(
      env,
      createAuth(env, async (message) => {
        const started = Date.now();
        try {
          await sendVerificationMail(env, message);
          await recordOperation(env, "mail", "MAIL_ACCEPTED", started);
        } catch (error) {
          error.reference = await recordOperation(
            env,
            "mail",
            error.message,
            started,
          );
          throw error;
        }
      }),
    );
  return sessions.get(env);
}
async function body(req) {
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new Error("JSON_REQUIRED");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("JSON_REQUIRED");
  const parts = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 96000) {
      void reader.cancel().catch(() => {});
      throw new Error("BODY_TOO_LARGE");
    }
    parts.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const p of parts) {
    all.set(p, offset);
    offset += p.byteLength;
  }
  const parsed = JSON.parse(new TextDecoder().decode(all));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("JSON_REQUIRED");
  return parsed;
}
async function owned(env, id, uid) {
  return env.DB.prepare("SELECT * FROM letters WHERE id = ? AND user_id = ?")
    .bind(id, uid)
    .first();
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    const production = productionReady(env) && url.origin === env.APP_ORIGIN;
    // Production requires every binding/secret and an explicit release flag.
    if (
      !production &&
      (env.APP_MODE !== "local-test" ||
        !["127.0.0.1", "localhost"].includes(url.hostname))
    )
      return fail(503, "SERVICE_NOT_OPEN");
    if (
      production &&
      !/^\/api\/(?:auth\/|letters(?:\/|$)|admin\/|feedback(?:\/|$)|review\/feedback(?:\/|$)|me\/(?:preferences|export|arrival|correspondence)$)/.test(
        url.pathname,
      )
    )
      return fail(503, "SERVICE_NOT_OPEN");
    if (
      production &&
      /^\/api\/(?:feedback(?:\/|$)|review\/feedback(?:\/|$))/.test(
        url.pathname,
      ) &&
      env.FEEDBACK_OPEN !== "true"
    )
      return fail(503, "SERVICE_NOT_OPEN");
    if (
      !["GET", "HEAD"].includes(req.method) &&
      req.headers.get("origin") !== env.APP_ORIGIN
    )
      return fail(403, "ORIGIN_REJECTED");
    if (url.pathname === "/api/config")
      return json({
        mode: "local-test",
        mail: "fictional-only",
        realService: false,
      });
    if (url.pathname === "/api/health")
      return json({
        app: "montecristiao-v4",
        privateData: "local-fictional-only",
      });
    try {
      if (url.pathname === "/api/daily" && req.method === "GET")
        return json({ edition: await dailyEdition(env.DB) });
      if (url.pathname === "/api/world")
        return req.method === "GET"
          ? json(worldAt())
          : fail(405, "METHOD_NOT_ALLOWED");
      const auth = authFor(env);
      if (url.pathname.startsWith("/api/auth/")) {
        const path = url.pathname.slice("/api/auth".length);
        if (!authPaths.has(path)) return fail(404, "NOT_FOUND");
        if (req.method === "POST") {
          const input = await body(req.clone());
          if (
            production &&
            [
              "/update-user",
              "/delete-user",
              "/email-otp/request-email-change",
              "/email-otp/change-email",
              "/revoke-other-sessions",
            ].includes(path)
          ) {
            const current = await auth.api.getSession({ headers: req.headers });
            if (!current) return fail(401, "LOGIN_REQUIRED");
            if (req.headers.get("x-manor-account") !== current.user.id)
              return fail(409, "ACCOUNT_CHANGED");
          }
          for (const key of ["email", "newEmail"])
            if (
              input[key] !== undefined &&
              (production
                ? !validEmail(input[key]) || /@example\.test$/i.test(input[key])
                : !/^[^\s@]+@example\.test$/i.test(input[key]))
            )
              return fail(
                400,
                production ? "EMAIL_INVALID" : "TEST_EMAIL_ONLY",
              );
          if (
            production &&
            [
              "/email-otp/request-email-change",
              "/email-otp/change-email",
              "/delete-user",
            ].includes(path)
          ) {
            const current = await auth.api.getSession({ headers: req.headers });
            if (isOwner(env, current))
              return fail(403, "OWNER_ACCOUNT_PROTECTED");
          }
          if (input.name !== undefined && !cleanName(input.name))
            return fail(400, "NAME_INVALID");
          if (
            path === "/update-user" &&
            Object.keys(input).some((k) => k !== "name")
          )
            return fail(400, "FIELD_NOT_ALLOWED");
          if (
            path === "/sign-in/email-otp" &&
            Object.keys(input).some(
              (k) => !["email", "otp", "name"].includes(k),
            )
          )
            return fail(400, "FIELD_NOT_ALLOWED");
          if (
            path === "/email-otp/send-verification-otp" &&
            !["sign-in", "email-verification"].includes(input.type)
          )
            return fail(400, "TYPE_INVALID");
          if (path === "/email-otp/send-verification-otp") {
            const email = String(input.email || "").toLowerCase();
            // Atomic per-mailbox cooldown supplements per-IP library rate limiting.
            const sent = await env.DB.prepare(
              "INSERT INTO mail_cooldown(email,sent_at) VALUES(?,?) ON CONFLICT(email) DO UPDATE SET sent_at=excluded.sent_at WHERE mail_cooldown.sent_at < ?",
            )
              .bind(email, Date.now(), Date.now() - 30000)
              .run();
            if (!sent.meta.changes) return fail(429, "WAIT_BEFORE_RESEND");
          }
          if (path === "/delete-user") {
            const session = await auth.api.getSession({ headers: req.headers });
            if (!session) return fail(401, "LOGIN_REQUIRED");
            if (input.confirm !== "删除账号")
              return fail(400, "CONFIRM_REQUIRED");
            // Library validates a fresh session before deletion; FK cascades clear business data.
            const forwarded = new Request(req, { body: JSON.stringify({}) });
            const deleted = await auth.handler(forwarded);
            if (deleted.ok)
              await env.DB.batch([
                env.DB.prepare("DELETE FROM local_mail WHERE email=?").bind(
                  session.user.email,
                ),
                env.DB.prepare("DELETE FROM mail_cooldown WHERE email=?").bind(
                  session.user.email,
                ),
              ]);
            return privateHeaders(deleted);
          }
        }
        return privateHeaders(await auth.handler(req));
      }
      const session = await auth.api.getSession({ headers: req.headers });
      if (
        url.pathname === "/api/feedback" ||
        url.pathname.startsWith("/api/feedback/")
      )
        return await feedbackRoute(req, env, session, { json, body });
      if (!session) return fail(401, "LOGIN_REQUIRED");
      const uid = session.user.id;
      if (url.pathname.startsWith("/api/review/feedback"))
        return await feedbackDesk(req, env, session, { json, body });
      if (url.pathname.startsWith("/api/admin/"))
        return await adminRoute(req, env, session, { json, body });
      if (
        production &&
        url.pathname.startsWith("/api/me/") &&
        req.headers.get("x-manor-account") !== uid
      )
        return fail(409, "ACCOUNT_CHANGED");
      if (url.pathname.startsWith("/api/me/relationship")) {
        if (req.headers.get("x-manor-account") !== uid)
          return fail(409, "ACCOUNT_CHANGED");
        return await relationshipRoute(req, env, uid, { json, body });
      }
      if (url.pathname === "/api/me/correspondence" && req.method === "GET") {
        if (req.headers.get("x-manor-account") !== uid)
          return fail(409, "ACCOUNT_CHANGED");
        const row = await env.DB.prepare(
          "SELECT COUNT(r.id) AS unread FROM replies r JOIN letters l ON l.id=r.letter_id WHERE l.user_id=? AND r.read_at IS NULL",
        )
          .bind(uid)
          .first();
        return json(row);
      }
      if (
        url.pathname.startsWith("/api/letters") &&
        req.headers.get("x-manor-account") !== uid
      )
        return fail(409, "ACCOUNT_CHANGED");
      if (
        url.pathname === "/api/me/memory" ||
        url.pathname.startsWith("/api/me/memory/")
      ) {
        if (req.headers.get("x-manor-account") !== uid)
          return fail(409, "ACCOUNT_CHANGED");
        return await memoryRoute(req, env, uid, { json, body });
      }
      if (url.pathname === "/api/me/arrival") {
        if (req.headers.get("x-manor-account") !== uid)
          return fail(409, "ACCOUNT_CHANGED");
        if (req.method === "GET")
          return json(
            (await env.DB.prepare(
              "SELECT status,updated_at FROM arrival_preferences WHERE user_id=?",
            )
              .bind(uid)
              .first()) || { status: null },
          );
        if (req.method === "PUT") {
          const b = await body(req);
          if (!["done", "skipped"].includes(b.status))
            return fail(400, "ARRIVAL_INVALID");
          await env.DB.prepare(
            "INSERT INTO arrival_preferences(user_id,status,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET status=CASE WHEN arrival_preferences.status='done' THEN 'done' ELSE excluded.status END,updated_at=excluded.updated_at",
          )
            .bind(uid, b.status, Date.now())
            .run();
          return json({ saved: true });
        }
        return fail(405, "METHOD_NOT_ALLOWED");
      }
      if (url.pathname === "/api/me/export" && req.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT id,subject,body,status,revision,created_at,updated_at FROM letters WHERE user_id=?",
        )
          .bind(uid)
          .all();
        const { results: replies } = await env.DB.prepare(
          "SELECT r.id,r.letter_id,r.body,r.created_at,r.read_at FROM replies r JOIN letters l ON l.id=r.letter_id WHERE l.user_id=?",
        )
          .bind(uid)
          .all();
        const preferences = (await env.DB.prepare(
          "SELECT reading_place,motion FROM preferences WHERE user_id=?",
        )
          .bind(uid)
          .first()) || { reading_place: "", motion: "system" };
        return json({
          format: "montecristiao-export-v1",
          profile: { name: session.user.name, email: session.user.email },
          preferences,
          arrival: await env.DB.prepare(
            "SELECT status,updated_at FROM arrival_preferences WHERE user_id=?",
          )
            .bind(uid)
            .first(),
          memory: await exportMemory(env, uid),
          relationship: await exportRelationship(env.DB, uid),
          letters: results,
          replies,
          feedback: (
            await env.DB.prepare(
              "SELECT id,body,category,room,page,page_version,status,operator_note,created_at,updated_at FROM feedback WHERE user_id=? ORDER BY created_at",
            )
              .bind(uid)
              .all()
          ).results,
        });
      }
      if (url.pathname === "/api/me/preferences") {
        if (req.method === "GET")
          return json(
            (await env.DB.prepare(
              "SELECT reading_place,motion FROM preferences WHERE user_id=?",
            )
              .bind(uid)
              .first()) || { reading_place: "", motion: "system" },
          );
        if (req.method === "PATCH") {
          const b = await body(req);
          if (
            !["", "library", "garden", "study"].includes(b.reading_place) ||
            !["system", "reduce"].includes(b.motion)
          )
            return fail(400, "PREFERENCE_INVALID");
          await env.DB.prepare(
            "INSERT INTO preferences(user_id,reading_place,motion) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET reading_place=excluded.reading_place,motion=excluded.motion",
          )
            .bind(uid, b.reading_place, b.motion)
            .run();
          return json({ saved: true });
        }
      }
      if (url.pathname === "/api/letters") {
        if (req.method === "GET") {
          const { results } = await env.DB.prepare(
            "SELECT l.id,l.subject,l.status,l.revision,l.updated_at,COUNT(r.id) AS reply_count,SUM(CASE WHEN r.read_at IS NULL AND r.id IS NOT NULL THEN 1 ELSE 0 END) AS unread FROM letters l LEFT JOIN replies r ON r.letter_id=l.id WHERE l.user_id=? GROUP BY l.id ORDER BY l.updated_at DESC",
          )
            .bind(uid)
            .all();
          return json({ letters: results });
        }
        if (req.method === "POST") {
          const b = await body(req);
          if (!/^[a-zA-Z0-9-]{16,60}$/.test(b.requestId || ""))
            return fail(400, "REQUEST_ID_INVALID");
          const existing = await env.DB.prepare(
            "SELECT * FROM letters WHERE user_id=? AND request_key=?",
          )
            .bind(uid, b.requestId)
            .first();
          if (existing) return json(existing, 201);
          const now = Date.now();
          await env.DB.prepare(
            "INSERT INTO letters(id,user_id,request_key,subject,body,status,revision,created_at,updated_at) SELECT ?,?,?,'','','draft',0,?,? WHERE (SELECT COUNT(*) FROM letters WHERE user_id=?) < 30 ON CONFLICT(user_id,request_key) DO NOTHING",
          )
            .bind(crypto.randomUUID(), uid, b.requestId, now, now, uid)
            .run();
          const created = await env.DB.prepare(
            "SELECT * FROM letters WHERE user_id=? AND request_key=?",
          )
            .bind(uid, b.requestId)
            .first();
          return created ? json(created, 201) : fail(429, "DRAFT_LIMIT");
        }
      }
      const match = url.pathname.match(
        /^\/api\/letters\/([a-f0-9-]{36})(?:\/(submit|read))?$/,
      );
      if (match) {
        const [, id, action] = match;
        const letter = await owned(env, id, uid);
        if (!letter) return fail(404, "NOT_FOUND");
        if (req.method === "GET" && !action) {
          const { results } = await env.DB.prepare(
            "SELECT id,body,created_at,read_at FROM replies WHERE letter_id=? ORDER BY created_at",
          )
            .bind(id)
            .all();
          return json({
            letter,
            replies: results,
            workflow: await workflowFor(env.DB, id),
            history: await letterHistory(env.DB, id),
          });
        }
        if (req.method === "DELETE" && !action) {
          await env.DB.prepare("DELETE FROM letters WHERE id=? AND user_id=?")
            .bind(id, uid)
            .run();
          return json({ deleted: true });
        }
        if (req.method === "PATCH" && !action) {
          const b = await body(req);
          if (
            typeof b.subject !== "string" ||
            b.subject.trim().length > 100 ||
            typeof b.body !== "string" ||
            b.body.length > 12000 ||
            !Number.isInteger(b.revision)
          )
            return fail(400, "LETTER_INVALID");
          if (letter.status !== "draft") return fail(409, "ALREADY_SUBMITTED");
          const r = await env.DB.prepare(
            "UPDATE letters SET subject=?,body=?,revision=revision+1,updated_at=? WHERE id=? AND user_id=? AND revision=? AND status='draft'",
          )
            .bind(b.subject.trim(), b.body, Date.now(), id, uid, b.revision)
            .run();
          return r.meta.changes
            ? json({ saved: true, revision: b.revision + 1 })
            : fail(409, "REVISION_CONFLICT");
        }
        if (req.method === "POST" && action === "submit") {
          const b = await body(req);
          if (letter.status === "submitted")
            return json({ submitted: true, id });
          if (
            b.consent !==
              (production ? "correspondence-v1" : "fictional-test-v1") ||
            !letter.subject ||
            !letter.body.trim()
          )
            return fail(400, "SUBMISSION_INVALID");
          const r = await env.DB.prepare(
            "UPDATE letters SET status='submitted',submitted_at=?,updated_at=?,revision=revision+1 WHERE id=? AND user_id=? AND revision=? AND status='draft'",
          )
            .bind(Date.now(), Date.now(), id, uid, b.revision)
            .run();
          return r.meta.changes
            ? json({ submitted: true, id })
            : fail(409, "REVISION_CONFLICT");
        }
        if (req.method === "POST" && action === "read") {
          await env.DB.prepare(
            "UPDATE replies SET read_at=COALESCE(read_at,?) WHERE letter_id=?",
          )
            .bind(Date.now(), id)
            .run();
          return json({ read: true });
        }
      }
      return fail(404, "NOT_FOUND");
    } catch (e) {
      if (e.message === "BODY_TOO_LARGE") return fail(413, "BODY_TOO_LARGE");
      if (e.message === "JSON_REQUIRED" || e instanceof SyntaxError)
        return fail(400, "JSON_REQUIRED");
      const reference = await recordOperation(
        env,
        "server",
        "TEMPORARILY_UNAVAILABLE",
      );
      return json({ error: "TEMPORARILY_UNAVAILABLE", reference }, 500);
    }
  },
};
