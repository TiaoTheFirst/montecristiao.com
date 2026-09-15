import worker from "./worker.mjs";
import { worldAt } from "./world.mjs";
import { household } from "./household.mjs";
import { productionReady } from "./service-state.mjs";
const json = (data, status = 200, head = false) =>
  new Response(head ? null : JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
export default {
  async fetch(req, env) {
    const url = new URL(req.url),
      head = req.method === "HEAD",
      read = ["GET", "HEAD"].includes(req.method);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    if (read && url.pathname === "/api/daily")
      return json({ edition: household().current }, 200, head);
    if (read && url.pathname === "/api/world")
      return url.search
        ? json({ error: "TIME_OVERRIDE_NOT_ALLOWED" }, 400, head)
        : json(worldAt(), 200, head);
    const ready = productionReady(env) && url.origin === env.APP_ORIGIN;
    if (read && url.pathname === "/api/config")
      return json(
        {
          mode: ready ? "production" : "public-visit",
          realService: ready,
          mail: ready ? "resend" : "closed",
          accounts: ready,
          letters: ready,
          feedback: ready && env.FEEDBACK_OPEN === "true",
          salon: false,
        },
        200,
        head,
      );
    if (read && url.pathname === "/api/health")
      return json(
        {
          app: "montecristiao-v4",
          mode: ready ? "production" : "public-visit",
        },
        200,
        head,
      );
    if (!ready)
      return read && url.pathname === "/api/auth/get-session"
        ? json(null, 200, head)
        : json({ error: "SERVICE_NOT_OPEN" }, 503, head);
    return worker.fetch(req, env);
  },
  async scheduled(_event, env) {
    if (!productionReady(env)) return;
    // No correspondence is auto-deleted. Remove only expired credentials and short-lived request records.
    const now = Date.now();
    await env.DB.batch([
      ...(env.OPS_ENABLED === "true"
        ? [
            env.DB.prepare(
              "DELETE FROM operational_events WHERE created_at < ?",
            ).bind(now - 7 * 86400000),
            env.DB.prepare("DELETE FROM admin_audit WHERE created_at < ?").bind(
              now - 30 * 86400000,
            ),
          ]
        : []),
      env.DB.prepare("DELETE FROM verification WHERE expiresAt < ?").bind(now),
      env.DB.prepare("DELETE FROM session WHERE expiresAt < ?").bind(now),
      env.DB.prepare("DELETE FROM rateLimit WHERE lastRequest < ?").bind(
        now - 86400000,
      ),
      env.DB.prepare("DELETE FROM mail_cooldown WHERE sent_at < ?").bind(
        now - 86400000,
      ),
      env.DB.prepare("DELETE FROM privacy_deletions WHERE deleted_at < ?").bind(
        now - 8 * 86400000,
      ),
      ...(env.FEEDBACK_OPEN === "true"
        ? [
            env.DB.prepare("DELETE FROM feedback WHERE created_at < ?").bind(
              now - 180 * 86400000,
            ),
            env.DB.prepare(
              "DELETE FROM feedback_limits WHERE window_start < ?",
            ).bind(now - 2 * 3600000),
            env.DB.prepare(
              "DELETE FROM privacy_feedback_deletions WHERE deleted_at < ?",
            ).bind(now - 8 * 86400000),
          ]
        : []),
    ]);
  },
};
