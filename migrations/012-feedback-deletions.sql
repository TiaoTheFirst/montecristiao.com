CREATE TABLE privacy_feedback_deletions (
  object_kind TEXT NOT NULL DEFAULT 'feedback' CHECK(object_kind='feedback'),
  object_id TEXT PRIMARY KEY,
  deleted_at INTEGER NOT NULL
);
-- statement
CREATE TRIGGER remember_deleted_feedback AFTER DELETE ON feedback BEGIN
  INSERT OR REPLACE INTO privacy_feedback_deletions(object_kind,object_id,deleted_at)
  VALUES('feedback',OLD.id,CAST(strftime('%s','now') AS INTEGER)*1000);
END;
