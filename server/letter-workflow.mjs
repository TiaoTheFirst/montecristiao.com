// CLI entry remains local-only; the production entry is called after owner authorization.
export async function workflowFor(db, id) {
  return await db
    .prepare(
      "SELECT state,revision,updated_at FROM letter_workflow WHERE letter_id=?",
    )
    .bind(id)
    .first();
}
export async function letterHistory(db, id) {
  return (
    await db
      .prepare(
        "SELECT kind,created_at FROM letter_events WHERE letter_id=? ORDER BY created_at,id",
      )
      .bind(id)
      .all()
  ).results;
}
export async function operatorAction(env, id, action, input = {}) {
  if (env.APP_MODE !== "local-test" || env.MAIL_MODE !== "local-test")
    throw new Error("LOCAL_ONLY");
  const db = env.DB;
  const letter = await db
    .prepare(
      "SELECT l.status,u.email FROM letters l JOIN user u ON u.id=l.user_id WHERE l.id=?",
    )
    .bind(id)
    .first();
  if (letter?.status !== "submitted" || !letter.email.endsWith("@example.test"))
    throw new Error("SUBMITTED_FICTIONAL_ONLY");
  return applyReplyAction(db, id, action, input);
}
export async function applyReplyAction(db, id, action, input = {}) {
  const letter = await db
    .prepare("SELECT status FROM letters WHERE id=?")
    .bind(id)
    .first();
  if (letter?.status !== "submitted") throw new Error("NOT_FOUND");
  const now = Date.now();
  await db
    .prepare(
      "INSERT INTO letter_workflow(letter_id,state,updated_at) VALUES(?,'received',?) ON CONFLICT(letter_id) DO NOTHING",
    )
    .bind(id, now)
    .run();
  const current = await db
    .prepare("SELECT * FROM letter_workflow WHERE letter_id=?")
    .bind(id)
    .first();
  if (action === "inspect") return current;
  if (action === "review") {
    if (current.state !== "received") return current;
    await db.batch([
      db
        .prepare(
          "INSERT INTO letter_events(id,letter_id,kind,created_at) SELECT ?,?,'reviewing',? WHERE EXISTS(SELECT 1 FROM letter_workflow WHERE letter_id=? AND state='received')",
        )
        .bind(crypto.randomUUID(), id, now, id),
      db
        .prepare(
          "UPDATE letter_workflow SET state='reviewing',updated_at=? WHERE letter_id=? AND state='received'",
        )
        .bind(now, id),
    ]);
  } else if (action === "draft") {
    if (
      typeof input.text !== "string" ||
      !input.text.trim() ||
      input.text.length > 20000
    )
      throw new Error("REPLY_INVALID");
    if (!Number.isInteger(input.revision)) throw new Error("REVISION_REQUIRED");
    const result = await db
      .prepare(
        "UPDATE letter_workflow SET reply_body=?,state='reply-draft',revision=revision+1,updated_at=? WHERE letter_id=? AND revision=?",
      )
      .bind(input.text, now, id, input.revision)
      .run();
    if (!result.meta.changes) throw new Error("REPLY_CONFLICT");
  } else if (action === "publish") {
    if (!Number.isInteger(input.revision)) throw new Error("REVISION_REQUIRED");
    const published = await db
      .prepare(
        "SELECT reply_id FROM reply_publications WHERE letter_id=? AND revision=?",
      )
      .bind(id, input.revision)
      .first();
    if (published) return { published: true, repeated: true, ...published };
    if (
      current.state !== "reply-draft" ||
      current.revision !== input.revision ||
      !current.reply_body.trim()
    )
      throw new Error("REVIEW_DRAFT_FIRST");
    const replyId = crypto.randomUUID();
    // Atomic publication, ledger and state; uniqueness makes network/process retries safe.
    const eligible =
      "EXISTS(SELECT 1 FROM letter_workflow WHERE letter_id=? AND state='reply-draft' AND revision=?)";
    await db.batch([
      db
        .prepare(
          `INSERT INTO replies(id,letter_id,body,created_at) SELECT ?,letter_id,reply_body,? FROM letter_workflow WHERE letter_id=? AND state='reply-draft' AND revision=?`,
        )
        .bind(replyId, now, id, input.revision),
      db
        .prepare(
          "INSERT INTO reply_publications(letter_id,revision,reply_id) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM replies WHERE id=?)",
        )
        .bind(id, input.revision, replyId, replyId),
      db
        .prepare(
          `INSERT INTO letter_events(id,letter_id,kind,created_at) SELECT ?,?,'replied',? WHERE ${eligible}`,
        )
        .bind(crypto.randomUUID(), id, now, id, input.revision),
      db
        .prepare(
          "UPDATE letter_workflow SET state='replied',updated_at=? WHERE letter_id=? AND state='reply-draft' AND revision=?",
        )
        .bind(now, id, input.revision),
    ]);
    const result = await db
      .prepare(
        "SELECT reply_id FROM reply_publications WHERE letter_id=? AND revision=?",
      )
      .bind(id, input.revision)
      .first();
    if (!result) throw new Error("REPLY_CONFLICT");
    return { published: true, ...result, notification: "in-site-only" };
  } else throw new Error("UNKNOWN_ACTION");
  return workflowFor(db, id);
}
