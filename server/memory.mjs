const fields =
  "id,kind,title,body,room,resource,anchor,revision,created_at,updated_at";
const rooms = new Set([
  "court",
  "foyer",
  "salon",
  "dining",
  "gallery",
  "library",
  "study",
  "letter",
  "garden",
]);
const resources = new Set(["", "introduction", "friendship", "reply"]);
const valid = (b) =>
  ["note", "bookmark"].includes(b.kind) &&
  typeof b.title === "string" &&
  b.title.trim().length > 0 &&
  b.title.length <= 80 &&
  typeof b.body === "string" &&
  b.body.length <= 3000 &&
  rooms.has(b.room) &&
  resources.has(b.resource) &&
  typeof b.anchor === "string" &&
  /^(?:section-[1-9][0-9]?)?$/.test(b.anchor) &&
  (b.kind !== "bookmark" || (b.resource !== "" && b.anchor !== "")) &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(b.title + b.body);
export async function exportMemory(env, uid) {
  return (
    await env.DB.prepare(
      `SELECT ${fields} FROM visitor_memory WHERE user_id=? ORDER BY updated_at DESC,id`,
    )
      .bind(uid)
      .all()
  ).results;
}
export async function memoryRoute(req, env, uid, { json, body }) {
  const fail = (s, error) => json({ error }, s);
  const path = new URL(req.url).pathname;
  if (path === "/api/me/memory" && req.method === "GET")
    return json({
      format: "visitor-memory-v1",
      items: await exportMemory(env, uid),
    });
  const match = path.match(/^\/api\/me\/memory\/([a-f0-9-]{36})$/);
  if (!match) return fail(404, "NOT_FOUND");
  const id = match[1];
  if (!["PUT", "DELETE"].includes(req.method))
    return fail(405, "METHOD_NOT_ALLOWED");
  const b = await body(req);
  if (
    Object.keys(b).some(
      (k) =>
        ![
          "kind",
          "title",
          "body",
          "room",
          "resource",
          "anchor",
          "revision",
          "consent",
        ].includes(k),
    )
  )
    return fail(400, "FIELD_NOT_ALLOWED");
  const old = await env.DB.prepare(
    `SELECT ${fields} FROM visitor_memory WHERE user_id=? AND id=?`,
  )
    .bind(uid, id)
    .first();
  if (req.method === "DELETE") {
    if (!old) return fail(404, "NOT_FOUND");
    if (!Number.isInteger(b.revision)) return fail(400, "REVISION_REQUIRED");
    const r = await env.DB.prepare(
      "DELETE FROM visitor_memory WHERE user_id=? AND id=? AND revision=?",
    )
      .bind(uid, id, b.revision)
      .run();
    return r.meta.changes
      ? json({ deleted: true })
      : fail(409, "MEMORY_CONFLICT");
  }
  if (
    b.consent !== "save-fictional-memory-v1" ||
    !valid(b) ||
    !Number.isInteger(b.revision) ||
    b.revision < -1
  )
    return fail(400, "MEMORY_INVALID");
  const now = Date.now();
  if (b.revision === -1) {
    // A repeated save request is safe, but must never overwrite an edited record.
    if (old) {
      const same = [
        "kind",
        "title",
        "body",
        "room",
        "resource",
        "anchor",
      ].every((k) => old[k] === (k === "title" ? b[k].trim() : b[k]));
      return same ? json({ item: old }) : fail(409, "MEMORY_CONFLICT");
    }
    const r = await env.DB.prepare(
      "INSERT INTO visitor_memory(id,user_id,kind,title,body,room,resource,anchor,revision,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,0,?,? WHERE (SELECT COUNT(*) FROM visitor_memory WHERE user_id=?) < 100 ON CONFLICT(user_id,id) DO NOTHING",
    )
      .bind(
        id,
        uid,
        b.kind,
        b.title.trim(),
        b.body,
        b.room,
        b.resource,
        b.anchor,
        now,
        now,
        uid,
      )
      .run();
    if (!r.meta.changes) return fail(409, "MEMORY_LIMIT_OR_CONFLICT");
  } else {
    if (!old) return fail(404, "NOT_FOUND");
    const r = await env.DB.prepare(
      "UPDATE visitor_memory SET kind=?,title=?,body=?,room=?,resource=?,anchor=?,revision=revision+1,updated_at=? WHERE user_id=? AND id=? AND revision=?",
    )
      .bind(
        b.kind,
        b.title.trim(),
        b.body,
        b.room,
        b.resource,
        b.anchor,
        now,
        uid,
        id,
        b.revision,
      )
      .run();
    if (!r.meta.changes) return fail(409, "MEMORY_CONFLICT");
  }
  const item = await env.DB.prepare(
    `SELECT ${fields} FROM visitor_memory WHERE user_id=? AND id=?`,
  )
    .bind(uid, id)
    .first();
  return json({ item });
}
