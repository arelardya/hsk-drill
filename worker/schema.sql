CREATE TABLE IF NOT EXISTS scores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,          -- unix ms
  name       TEXT    NOT NULL,
  level      INTEGER NOT NULL,
  mode       TEXT    NOT NULL,
  lessons    TEXT    NOT NULL,
  total      INTEGER NOT NULL,
  correct    INTEGER NOT NULL,
  pct        INTEGER NOT NULL,
  ip_hash    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS scores_board ON scores (level, pct DESC, total DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS scores_ip ON scores (ip_hash, created_at);
