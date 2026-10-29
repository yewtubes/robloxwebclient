-- Blocks between accounts (user_id blocked blocked_id).
CREATE TABLE user_blocks (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, blocked_id)
);
CREATE INDEX user_blocks_blocked ON user_blocks(blocked_id);
