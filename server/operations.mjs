// Operational events deliberately contain no addresses, bodies, cookies or OTPs.
export async function recordOperation(env, kind, code, started = Date.now()) {
  if (env.OPS_ENABLED !== "true") return null;
  const id = crypto.randomUUID(),
    now = Date.now();
  const safe = /^(?:MAIL_[A-Z_]+|TEMPORARILY_UNAVAILABLE)$/.test(code)
    ? code
    : "TEMPORARILY_UNAVAILABLE";
  try {
    await env.DB.prepare(
      "INSERT INTO operational_events(id,kind,code,elapsed_ms,created_at) VALUES(?,?,?,?,?)",
    )
      .bind(id, kind, safe, Math.max(0, now - started), now)
      .run();
  } catch {
    console.error(
      JSON.stringify({ event: "operations-storage-failed", reference: id }),
    );
  }
  return id;
}
