const categories = new Set([
  "general",
  "usability",
  "content",
  "story",
  "account",
]);
const rooms = new Set([
  "",
  "court",
  "foyer",
  "salon",
  "dining",
  "gallery",
  "garden",
  "library",
  "study",
  "letter",
  "music",
  "terrace",
  "westpath",
  "eastpath",
  "orangery",
  "pavilion",
]);
const pages = new Set([
  "",
  "/",
  "/index.html",
  "/feedback.html",
  "/letters.html",
  "/visits.html",
  "/manuscripts.html",
  "/privacy.html",
  "/about.html",
  "/reading/reply.html",
  "/reading/introduction.html",
  "/reading/friendship.html",
  "/games.html",
  "/solitaire.html",
  "/seven-cards.html",
  "/household.html",
]);
const idPattern =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const fail = (json, status, code) => json({ error: code }, status);
async function hash(text) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    ),
  ]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
async function quotaKey(secret, subject) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return [
    ...new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode("feedback:" + subject),
      ),
    ),
  ]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
const receipt = (row) => ({
  id: row.id,
  status: row.status,
  createdAt: row.created_at,
  owned: !!row.user_id,
});
export async function feedbackRoute(req, env, session, { json, body }) {
  const path = new URL(req.url).pathname;
  const uid = session?.user.id || null;
  const expected = req.headers.get("x-manor-account");
  if ((uid && expected !== uid) || (!uid && expected))
    return fail(json, 409, "ACCOUNT_CHANGED");
  if (path === "/api/feedback" && req.method === "POST") {
    const b = await body(req);
    const allowed = [
      "requestId",
      "body",
      "category",
      "entry",
      "room",
      "page",
      "pageVersion",
      "consent",
      "website",
    ];
    if (Object.keys(b).some((k) => !allowed.includes(k)))
      return fail(json, 400, "FIELD_NOT_ALLOWED");
    if (b.website) return fail(json, 400, "FEEDBACK_INVALID");
    if (b.consent !== (env.APP_MODE === "production" ? "feedback-v1" : "feedback-local-v1"))
      return fail(json, 400, "FEEDBACK_CONSENT");
    if (
      !idPattern.test(b.requestId || "") ||
      typeof b.body !== "string" ||
      !b.body.trim() ||
      b.body.length > 3000 ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(b.body)
    )
      return fail(json, 400, "FEEDBACK_INVALID");
    if (
      !categories.has(b.category) ||
      !["tea", "butler", "footer", "direct"].includes(b.entry) ||
      !rooms.has(b.room) ||
      !pages.has(b.page) ||
      !["", "feedback-v1"].includes(b.pageVersion)
    )
      return fail(json, 400, "FEEDBACK_CONTEXT");
    const digest = await hash(
      JSON.stringify([
        b.body.trim(),
        b.category,
        b.entry,
        b.room,
        b.page,
        b.pageVersion,
      ]),
    );
    const existing = await env.DB.prepare(
      "SELECT * FROM feedback WHERE request_key=?",
    )
      .bind(b.requestId)
      .first();
    if (existing) {
      if (existing.user_id !== uid || existing.payload_hash !== digest)
        return fail(json, 409, "FEEDBACK_RETRY_CHANGED");
      return json(receipt(existing));
    }
    const now = Date.now(),
      windowStart = Math.floor(now / 3600000) * 3600000;
    const key = await quotaKey(
      env.BETTER_AUTH_SECRET,
      uid
        ? "user:" + uid
        : "ip:" + (req.headers.get("cf-connecting-ip") || "local-anonymous"),
    );
    await env.DB.prepare("DELETE FROM feedback_limits WHERE window_start < ?")
      .bind(windowStart - 3600000)
      .run();
    const quota = await env.DB.prepare(
      "INSERT INTO feedback_limits(key,window_start,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start,count=CASE WHEN feedback_limits.window_start=excluded.window_start THEN feedback_limits.count+1 ELSE 1 END WHERE feedback_limits.window_start!=excluded.window_start OR feedback_limits.count<8",
    )
      .bind(key, windowStart)
      .run();
    if (!quota.meta.changes) return fail(json, 429, "FEEDBACK_LIMIT");
    await env.DB.prepare(
      "INSERT INTO feedback(id,user_id,request_key,payload_hash,body,category,entry,room,page,page_version,consent_version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(request_key) DO NOTHING",
    )
      .bind(
        crypto.randomUUID(),
        uid,
        b.requestId,
        digest,
        b.body.trim(),
        b.category,
        b.entry,
        b.room,
        b.page,
        b.pageVersion,
        b.consent,
        now,
        now,
      )
      .run();
    const saved = await env.DB.prepare(
      "SELECT * FROM feedback WHERE request_key=?",
    )
      .bind(b.requestId)
      .first();
    if (saved.user_id !== uid || saved.payload_hash !== digest)
      return fail(json, 409, "FEEDBACK_RETRY_CHANGED");
    return json(receipt(saved), 201);
  }
  if (!uid) return fail(json, 401, "LOGIN_REQUIRED");
  if (path === "/api/feedback" && req.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id,body,category,room,status,operator_note,revision,seen_revision,created_at,updated_at FROM feedback WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
    )
      .bind(uid)
      .all();
    return json({ feedback: results });
  }
  const match = path.match(
    /^\/api\/feedback\/([a-f0-9-]{36})(?:\/(read|history))?$/,
  );
  if (!match) return fail(json, 404, "NOT_FOUND");
  const row = await env.DB.prepare(
    "SELECT * FROM feedback WHERE id=? AND user_id=?",
  )
    .bind(match[1], uid)
    .first();
  if (!row) return fail(json, 404, "NOT_FOUND");
  if (req.method === "GET" && match[2] === "history") {
    return json({ history: await feedbackHistory(env.DB, row) });
  }
  if (req.method === "POST" && match[2] === "read") {
    const b = await body(req);
    if (
      Object.keys(b).some((k) => k !== "revision") ||
      !Number.isInteger(b.revision) ||
      b.revision !== row.revision
    )
      return fail(json, 409, "REVISION_CONFLICT");
    const marked = await env.DB.prepare(
      "UPDATE feedback SET seen_revision=? WHERE id=? AND user_id=? AND revision=?",
    )
      .bind(row.revision, row.id, uid, row.revision)
      .run();
    if (!marked.meta.changes) return fail(json, 409, "REVISION_CONFLICT");
    return json({ read: true });
  }
  if (req.method === "DELETE" && !match[2]) {
    await env.DB.prepare("DELETE FROM feedback WHERE id=? AND user_id=?")
      .bind(row.id, uid)
      .run();
    return json({ deleted: true });
  }
  return fail(json, 405, "METHOD_NOT_ALLOWED");
}

export async function feedbackHistory(db, row) {
  const events = await db
    .prepare(
      "SELECT status,note,revision,created_at FROM feedback_events WHERE feedback_id=? ORDER BY revision",
    )
    .bind(row.id)
    .all();
  // The durable receipt supplies revision zero, including records predating this UI.
  return [
    { status: "received", note: "", revision: 0, created_at: row.created_at },
    ...events.results,
  ];
}

// Operator update shared by the local CLI and the guarded internal review desk.
export async function updateFeedback(db, { id, status, note, revision }) {
  if (
    !idPattern.test(id || "") ||
    !["reviewing", "planned", "done", "declined"].includes(status) ||
    typeof note !== "string" ||
    !note.trim() ||
    note.length > 2000 ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(note) ||
    !Number.isInteger(revision)
  )
    throw new Error("INVALID_UPDATE");
  const result = await db.batch([
    db
      .prepare(
        "UPDATE feedback SET status=?,operator_note=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?",
      )
      .bind(status, note.trim(), Date.now(), id, revision),
    db
      .prepare(
        "INSERT INTO feedback_events(id,feedback_id,status,note,revision,created_at) SELECT ?,id,status,operator_note,revision,updated_at FROM feedback WHERE id=? AND revision=? AND changes()=1",
      )
      .bind(crypto.randomUUID(), id, revision + 1),
  ]);
  if (!result[0].meta.changes) throw new Error("REVISION_CONFLICT");
  return { updated: true, revision: revision + 1 };
}
