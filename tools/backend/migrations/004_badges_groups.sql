-- The verified badge (users.roblox.com hasVerifiedBadge; the game server sets
-- Player.HasVerifiedBadge from it) and group memberships. Groups have no UI here:
-- memberships are set with tools/admin.js. The in-game CoreScripts check a few of
-- Roblox's own groups for name icons (1200769 = Roblox admins).
ALTER TABLE users ADD COLUMN has_verified_badge INTEGER NOT NULL DEFAULT 0;
CREATE TABLE group_members (
  group_id   INTEGER NOT NULL,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_name  TEXT NOT NULL DEFAULT 'Member',
  rank       INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX group_members_user ON group_members(user_id);
