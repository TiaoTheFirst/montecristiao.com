CREATE TABLE IF NOT EXISTS admin_security (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  locked INTEGER NOT NULL CHECK (locked IN (0, 1)),
  revoked_before INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO admin_security (id, locked, revoked_before, updated_at) VALUES (1, 0, 0, 0);
