CREATE TABLE IF NOT EXISTS admin_audit (
 id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
 target_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
 action TEXT NOT NULL CHECK(action='revoke-sessions'), created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_audit_time ON admin_audit(created_at);
CREATE TABLE IF NOT EXISTS operational_events (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('mail','server')),
 code TEXT NOT NULL, elapsed_ms INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS operational_events_time ON operational_events(created_at);
