// Queries over the platform database shared by the route modules: experiences,
// game servers, sessions, presence and avatars.
const crypto = require('crypto');
const { open, now } = require('./db.js');

// A player counts as in a game while the client keeps talking to the backend
// (its telemetry and heartbeats touch the session) within this window.
const ACTIVE_MS = +(process.env.PRESENCE_TIMEOUT_MS || 120e3);
const SERVER_STALE_MS = +(process.env.SERVER_TIMEOUT_MS || 180e3);
const since = (ms) => new Date(Date.now() - ms).toISOString();

const place = (id) => open().prepare('SELECT * FROM places WHERE id = ?').get(id) || null;
const universe = (id) => open().prepare('SELECT * FROM universes WHERE id = ?').get(id) || null;
const universeOfPlace = (placeId) => { const p = place(placeId); return p ? universe(p.universe_id) : null; };
const user = (id) => open().prepare('SELECT * FROM users WHERE id = ?').get(id) || null;

// The verified badge of a creator (users only: groups have no badge here).
const verified = (type, id) => type === 'User' && !!(user(id) || {}).has_verified_badge;
const groupRoles = (userId) => open().prepare('SELECT group_id, role_name, rank FROM group_members WHERE user_id = ? ORDER BY group_id').all(userId);
const groupRole = (groupId, userId) => open().prepare('SELECT role_name, rank FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);

function creatorName(type, id) {
  if (type === 'User') { const u = user(id); return u ? u.name : ''; }
  return '';
}

function playingCount(universeId) {
  return open().prepare(`SELECT COUNT(DISTINCT user_id) n FROM game_sessions WHERE universe_id = ? AND left_at IS NULL AND last_seen_at > ?`)
    .get(universeId, since(ACTIVE_MS)).n;
}
function serverPlayers(jobId) {
  return open().prepare(`SELECT DISTINCT user_id FROM game_sessions WHERE job_id = ? AND left_at IS NULL AND last_seen_at > ?`)
    .all(jobId, since(ACTIVE_MS)).map((r) => r.user_id);
}

// ---- game servers ----------------------------------------------------------
function upsertServer({ jobId, placeId, host, port, transportPort = null, certHash = null, maxPlayers, source }) {
  const db = open(), t = now();
  const u = universeOfPlace(placeId);
  const max = maxPlayers || (place(placeId) || {}).max_players || (u && u.max_players) || 10;
  jobId = jobId || crypto.randomUUID();
  db.prepare(`INSERT INTO game_servers (job_id, place_id, host, port, transport_port, cert_hash, max_players, status, source, started_at, last_heartbeat_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    ON CONFLICT(job_id) DO UPDATE SET place_id = excluded.place_id, host = excluded.host, port = excluded.port,
      transport_port = excluded.transport_port, cert_hash = excluded.cert_hash, max_players = excluded.max_players,
      status = 'active', last_heartbeat_at = excluded.last_heartbeat_at`)
    .run(jobId, placeId, host, port, transportPort, certHash, max, source, t, t);
  return db.prepare('SELECT * FROM game_servers WHERE job_id = ?').get(jobId);
}
function heartbeatServer(jobId) {
  return open().prepare(`UPDATE game_servers SET last_heartbeat_at = ?, status = 'active' WHERE job_id = ?`).run(now(), jobId).changes > 0;
}
function closeServer(jobId) {
  open().prepare(`UPDATE game_servers SET status = 'closed' WHERE job_id = ?`).run(jobId);
  open().prepare(`UPDATE game_sessions SET left_at = ? WHERE job_id = ? AND left_at IS NULL`).run(now(), jobId);
}
function activeServers(placeId) {
  return open().prepare(`SELECT * FROM game_servers WHERE place_id = ? AND status = 'active' AND last_heartbeat_at > ? ORDER BY started_at`)
    .all(placeId, since(SERVER_STALE_MS));
}
// The fullest server that still has room (keeps players together).
function pickServer(placeId) {
  const list = activeServers(placeId).map((s) => ({ ...s, players: serverPlayers(s.job_id) }));
  return list.filter((s) => s.players.length < s.max_players).sort((a, b) => b.players.length - a.players.length)[0] || null;
}

// ---- sessions and presence -------------------------------------------------
function joinSession(userId, server) {
  const db = open(), t = now();
  const u = universeOfPlace(server.place_id);
  db.prepare(`UPDATE game_sessions SET left_at = ? WHERE user_id = ? AND left_at IS NULL AND job_id != ?`).run(t, userId, server.job_id);
  let s = db.prepare(`SELECT * FROM game_sessions WHERE user_id = ? AND job_id = ? AND left_at IS NULL`).get(userId, server.job_id);
  if (!s) {
    const id = crypto.randomUUID();
    db.prepare(`INSERT INTO game_sessions (id, user_id, job_id, place_id, universe_id, joined_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(id, userId, server.job_id, server.place_id, u ? u.id : 0, t, t);
    if (u) db.prepare('UPDATE universes SET visits = visits + 1 WHERE id = ?').run(u.id);
    s = db.prepare('SELECT * FROM game_sessions WHERE id = ?').get(id);
  } else {
    db.prepare('UPDATE game_sessions SET last_seen_at = ? WHERE id = ?').run(t, s.id);
  }
  setPresence(userId, 2, { placeId: server.place_id, universeId: u ? u.id : null, jobId: server.job_id, location: u ? u.name : '' });
  return s;
}
// Any authenticated request from a player's client counts as activity.
function touch(userId) {
  const db = open(), t = now();
  const open_ = db.prepare(`SELECT * FROM game_sessions WHERE user_id = ? AND left_at IS NULL ORDER BY joined_at DESC LIMIT 1`).get(userId);
  if (open_) db.prepare('UPDATE game_sessions SET last_seen_at = ? WHERE id = ?').run(t, open_.id);
  db.prepare(`INSERT INTO presence (user_id, presence_type, last_online_at) VALUES (?, 1, ?)
    ON CONFLICT(user_id) DO UPDATE SET last_online_at = excluded.last_online_at`).run(userId, t);
}
function setPresence(userId, type, { placeId = null, universeId = null, jobId = null, location = '' } = {}) {
  open().prepare(`INSERT INTO presence (user_id, presence_type, place_id, universe_id, job_id, last_location, last_online_at) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET presence_type = excluded.presence_type, place_id = excluded.place_id, universe_id = excluded.universe_id,
      job_id = excluded.job_id, last_location = excluded.last_location, last_online_at = excluded.last_online_at`)
    .run(userId, type, placeId, universeId, jobId, location, now());
}
// Presence as Roblox reports it, with timeouts applied.
function presenceOf(userId) {
  const p = open().prepare('SELECT * FROM presence WHERE user_id = ?').get(userId);
  if (!p || p.last_online_at < since(ACTIVE_MS)) {
    return { userPresenceType: 0, lastLocation: 'Offline', placeId: null, rootPlaceId: null, gameId: null, universeId: null, userId, lastOnline: p ? p.last_online_at : null };
  }
  const inGame = p.presence_type === 2 && open().prepare(`SELECT 1 FROM game_sessions WHERE user_id = ? AND job_id = ? AND left_at IS NULL AND last_seen_at > ?`)
    .get(userId, p.job_id, since(ACTIVE_MS));
  const u = inGame && p.universe_id ? universe(p.universe_id) : null;
  return inGame
    ? { userPresenceType: 2, lastLocation: p.last_location, placeId: p.place_id, rootPlaceId: u ? u.root_place_id : p.place_id, gameId: p.job_id, universeId: p.universe_id, userId, lastOnline: p.last_online_at }
    : { userPresenceType: 1, lastLocation: 'Website', placeId: null, rootPlaceId: null, gameId: null, universeId: null, userId, lastOnline: p.last_online_at };
}

// ---- avatars ---------------------------------------------------------------
// BrickColor ids -> hex, for the colours the defaults and the avatar editor API use.
const BRICK = {
  1: 'F2F3F3', 5: 'D7C59A', 9: 'E8BAC8', 18: 'CC8E69', 21: 'C4281C', 23: '0D69AC', 24: 'F5CD30', 26: '1B2A35',
  28: '287F47', 37: '4B974B', 38: 'A05F35', 45: 'B4D2E4', 102: '6E99CA', 105: 'E29B40', 106: 'DA8541', 107: '008F9C',
  119: 'A4BD47', 125: 'EAB892', 135: '74869D', 141: '27462D', 151: '789082', 153: '957977', 192: '694028', 194: 'A3A2A5',
  199: '635F62', 208: 'E5E4DF', 217: '7C5C46', 226: 'FDEA8D', 315: '0989CF', 330: 'FF98DC', 345: '8F4C2A', 351: 'BC9B5D',
  359: 'AF9483', 361: '564236', 364: '5A4C42', 1001: 'F8F8F8', 1002: 'CDCDCD', 1003: '111111', 1004: 'FF0000', 1007: 'A34B4B',
  1010: '0000FF', 1011: '002060', 1012: '2154B9', 1013: '04AFEC', 1014: 'AA5500', 1017: 'FFAF00', 1018: '12EED4', 1020: '00FF00',
  1025: 'FFC9C9', 1030: 'FFCC99', 1031: '6225D1', 1032: 'FF00BF',
};
const DEFAULT_COLORS = { head: 24, torso: 23, leftArm: 24, rightArm: 24, leftLeg: 119, rightLeg: 119 };
const DEFAULT_SCALES = { height: 1, width: 1, head: 1, depth: 1, proportion: 0, bodyType: 0 };

function avatarOf(userId) {
  const a = open().prepare('SELECT * FROM avatars WHERE user_id = ?').get(userId);
  return {
    avatarType: a ? a.avatar_type : (process.env.AVATAR_TYPE || 'R15'),
    colors: a ? JSON.parse(a.body_colors) : { ...DEFAULT_COLORS },
    scales: a ? JSON.parse(a.scales) : { ...DEFAULT_SCALES },
    assets: a ? JSON.parse(a.assets) : [],
    emotes: a ? JSON.parse(a.emotes) : [],
  };
}
// Asset types a character can wear: classic clothing and faces, heads and body
// parts, accessories, animations, emotes, layered clothing, dynamic head parts.
const WEARABLE_TYPES = new Set([2, 8, 11, 12, 17, 18, 19, 27, 28, 29, 30, 31, 41, 42, 43, 44, 45, 46, 47,
  48, 49, 50, 51, 52, 53, 54, 55, 56, 61, 64, 65, 66, 67, 68, 69, 70, 71, 72, 76, 77, 78, 79]);
// Splits asset ids into wearable {id, assetTypeId} entries and invalid ids, fetching
// unknown ones into the store first (assets.ensure, per ASSET_FALLBACK).
async function wearable(ids) {
  const S = require('./assets.js');
  const ok = [], invalid = [];
  for (const id of ids) {
    if (!S.getAsset(id)) await S.ensure(id);
    const a = S.getAsset(id);
    if (a && WEARABLE_TYPES.has(a.asset_type_id)) ok.push({ id, assetTypeId: a.asset_type_id });
    else invalid.push(id);
  }
  return { ok, invalid };
}

function saveAvatar(userId, patch) {
  const cur = { ...avatarOf(userId), ...patch };
  open().prepare(`INSERT INTO avatars (user_id, avatar_type, body_colors, scales, assets, emotes, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET avatar_type = excluded.avatar_type, body_colors = excluded.body_colors, scales = excluded.scales,
      assets = excluded.assets, emotes = excluded.emotes, updated_at = excluded.updated_at`)
    .run(userId, cur.avatarType, JSON.stringify(cur.colors), JSON.stringify(cur.scales), JSON.stringify(cur.assets), JSON.stringify(cur.emotes), now());
  return cur;
}

module.exports = { wearable, WEARABLE_TYPES,
  place, universe, universeOfPlace, user, creatorName, verified, groupRoles, groupRole, playingCount, serverPlayers,
  upsertServer, heartbeatServer, closeServer, activeServers, pickServer,
  joinSession, touch, setPresence, presenceOf, avatarOf, saveAvatar, BRICK, ACTIVE_MS,
};
