// Experiences (universes and places), game servers, joining, presence and
// per-experience settings, all from the platform database.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const M = require('../model.js');
const A = require('../auth.js');
const { open, now, ROOT } = require('../db.js');
const { json, error, unauthorized, notFound, badRequest, parseJson, idList } = require('../http.js');

const ADMIN_KEY = process.env.ADMIN_KEY || '';

// ---- shapes ------------------------------------------------------------------
function gameJson(g, viewer) {
  return {
    id: g.id, rootPlaceId: g.root_place_id, name: g.name, description: g.description, sourceName: g.name, sourceDescription: g.description,
    creator: { id: g.creator_id, name: M.creatorName(g.creator_type, g.creator_id), type: g.creator_type, isRNVAccount: false, hasVerifiedBadge: false },
    price: null, allowedGearGenres: [g.genre], allowedGearCategories: [], isGenreEnforced: false, copyingAllowed: false,
    playing: M.playingCount(g.id), visits: g.visits, maxPlayers: g.max_players, created: g.created_at, updated: g.updated_at,
    studioAccessToApisAllowed: false, createVipServersAllowed: false, universeAvatarType: g.avatar_type, genre: g.genre,
    genre_l1: '', genre_l2: '', isAllGenre: g.genre === 'All', isFavoritedByUser: false, favoritedCount: g.favorites,
  };
}
// Product info for a place, as economy.roblox.com/v2/assets/{id}/details returns it
// (MarketplaceService:GetProductInfo and the loading screen read it).
function placeProductInfo(p) {
  const g = M.universe(p.universe_id);
  const creator = { Id: g.creator_id, Name: M.creatorName(g.creator_type, g.creator_id), CreatorType: g.creator_type, CreatorTargetId: g.creator_id, HasVerifiedBadge: false };
  return {
    TargetId: p.id, ProductType: 'User Product', AssetId: p.id, ProductId: 0, Name: p.name, Description: p.description,
    AssetTypeId: 9, Creator: creator, IconImageAssetId: g.icon_asset_id || 0, Created: p.created_at, Updated: p.updated_at,
    PriceInRobux: null, PriceInTickets: null, Sales: 0, IsNew: false, IsForSale: false, IsPublicDomain: false, IsLimited: false,
    IsLimitedUnique: false, Remaining: null, MinimumMembershipLevel: 0, ContentRatingTypeId: 0, SaleAvailabilityLocations: null,
    SaleLocation: null, CollectibleItemId: null, CollectibleProductId: null, CollectiblesItemDetails: null,
  };
}

// ---- game server discovery -----------------------------------------------------
// Servers register through POST /api/local/servers (tools/studio/run_server.sh does),
// or are found the way the earlier setup did: RCC_HOST/RCC_PORT plus the RbxTransport
// port from the newest Studio log and the certificate hash read from the server.
function studioRbxTransportPort() {
  const dir = process.env.STUDIO_LOGS || '/home/user/studio/prefix/drive_c/users/root/AppData/Local/Roblox/logs';
  try {
    const logs = fs.readdirSync(dir).filter((f) => f.endsWith('.log'))
      .map((f) => path.join(dir, f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    for (const f of logs.slice(0, 20)) {
      const m = /Started RbxTransport network server [\d.]+\|(\d+)/.exec(fs.readFileSync(f, 'latin1'));
      if (m) return +m[1];
    }
  } catch (e) {}
  return 0;
}
const certCache = new Map();
// Studio's RbxTransport certificate is self-signed and changes per server start,
// so its SHA-256 is read from the live server (cached briefly).
function certHash(host, port) {
  const key = `${host}:${port}`, c = certCache.get(key);
  if (c && Date.now() - c.t < 20e3) return c.hash;
  let hash = null;
  try {
    hash = execFileSync('python3', [path.join(ROOT, 'tools', 'studio', 'wt_cert_hash.py'), String(port), host], { timeout: 8000 }).toString().trim();
  } catch (e) { console.log(`games: no RbxTransport server at ${host}:${port}`); }
  certCache.set(key, { hash, t: Date.now() });
  return hash;
}
function discoverStudioServer(placeId) {
  const studioPlace = +(process.env.STUDIO_PLACE_ID || process.env.PLACE_ID || 1818);
  if (placeId !== studioPlace) return;
  // run_server.sh registers what it starts; log discovery only covers servers started otherwise.
  if (M.activeServers(placeId).some((s) => s.source === 'registered')) return;
  const host = process.env.RCC_HOST || '127.0.0.1', port = +(process.env.RCC_PORT || 53640);
  const transportPort = +(process.env.RBX_TRANSPORT_PORT || studioRbxTransportPort());
  if (!transportPort) return;
  const hash = certHash(host, transportPort);
  if (!hash) return;
  const jobId = crypto.createHash('sha256').update(`studio:${host}:${port}:${transportPort}:${hash}`).digest('hex').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12}).*/, '$1-$2-$3-$4-$5');
  // Servers found earlier on other ports are gone.
  open().prepare(`UPDATE game_servers SET status = 'closed' WHERE source = 'studio-log' AND job_id != ? AND status = 'active'`).run(jobId);
  M.upsertServer({ jobId, placeId, host, port, transportPort, certHash: hash, source: 'studio-log' });
}

// ---- join ----------------------------------------------------------------------
// Join script fields for RbxTransport (WebTransport over HTTP/3), see docs/STUDIO_SERVER_JOIN.md.
function transportFields(s) {
  if (!s.transport_port || !s.cert_hash) return {};
  return {
    NetStackPort: s.transport_port,
    // Studio's local servers accept the token "local_test" (as its own clients send it).
    NetStackTokenValue: Buffer.from('local_test').toString('base64'),
    GameFqdn: s.host,
    // certHashes are base64 SHA-256 digests (WebClient.js decodes them with atob).
    // The engine form-decodes the value on the way (a '+' arrives as a space), so '+' is sent percent-encoded.
    NetStackConfig: JSON.stringify({ certHashes: [Buffer.from(s.cert_hash, 'hex').toString('base64').replace(/\+/g, '%2B')] }),
  };
}
function joinResponse(user, p, s) {
  const g = M.universe(p.universe_id);
  const session = M.joinSession(user.id, s);
  const sessionId = JSON.stringify({ SessionId: session.id, GameId: s.job_id, PlaceId: p.id });
  console.log(`games: ${user.name} (${user.id}) -> place ${p.id} job ${s.job_id} ${s.host}:${s.port}/${s.transport_port || '-'}`);
  return {
    jobId: s.job_id, status: 2, statusData: null, joinScriptUrl: null, authenticationUrl: null,
    authenticationTicket: null, message: null, queuePosition: 0,
    joinScript: {
      ClientPort: 0, MachineAddress: s.host, ServerPort: s.port,
      ServerConnections: [{ Address: s.host, Port: s.port }], UdmuxEndpoints: [], DirectServerReturn: true,
      ...transportFields(s),
      TokenGenAlgorithm: 0, PepperId: 0, TokenValue: '', PingUrl: '', PingInterval: 0,
      UserName: user.name, DisplayName: user.display_name, SeleniumTestMode: false, UserId: user.id,
      RobloxLocale: user.locale, GameLocale: user.locale, SuperSafeChat: false, FlexibleChatEnabled: false,
      CharacterAppearance: `https://avatar.roblox.com/v1/avatar-fetch?userId=${user.id}&placeId=${p.id}`, ClientTicket: '',
      GameId: s.job_id, PlaceId: p.id, BaseUrl: 'https://www.roblox.com/', ChatStyle: 'ClassicAndBubble',
      CreatorId: g.creator_id, CreatorTypeEnum: g.creator_type, MembershipType: 'None',
      AccountAge: Math.max(0, Math.floor((Date.now() - Date.parse(user.created_at)) / 86400e3)),
      CookieStoreFirstTimePlayKey: '', CookieStoreFiveMinutePlayKey: '', CookieStoreEnabled: false,
      IsUnknownOrUnder13: A.isUnder13(user), GameChatType: 'AllUsers', SessionId: sessionId,
      AnalyticsSessionId: '', DataCenterId: 0, UniverseId: g.id, FollowUserId: 0, characterAppearanceId: user.id,
      CountryCode: user.country_code, RandomSeed1: '', ClientPublicKeyData: '',
    },
  };
}
// Status codes as the client understands them: 0 = retry later (no server yet),
// 2 = join, 6 = full, 12 = not allowed.
function joinFail(res, status, message) {
  json(res, 200, { jobId: null, status, statusData: null, joinScriptUrl: null, authenticationUrl: null, authenticationTicket: null, message, joinScript: null, queuePosition: 0 });
}
function joinGame(req, res, u, body, { user }) {
  if (!user) return unauthorized(res);
  const b = parseJson(body);
  const placeId = +(b.placeId || process.env.PLACE_ID || 0);
  const p = M.place(placeId);
  if (!p) return joinFail(res, 12, `Place ${placeId} does not exist on this platform.`);
  const g = M.universe(p.universe_id);
  if (g.privacy !== 'Public' && g.creator_id !== user.id) return joinFail(res, 12, 'This experience is private.');
  discoverStudioServer(placeId);
  let s;
  if (b.gameId) {
    s = open().prepare(`SELECT * FROM game_servers WHERE job_id = ? AND status = 'active'`).get(String(b.gameId));
    if (!s) return joinFail(res, 12, 'That server is no longer running.');
    if (M.serverPlayers(s.job_id).filter((id) => id !== user.id).length >= s.max_players) return joinFail(res, 6, 'The server is full.');
  } else {
    s = M.pickServer(placeId);
  }
  if (!s) {
    const any = M.activeServers(placeId).length;
    return joinFail(res, any ? 6 : 0, any ? 'All servers are full.' : 'Waiting for a game server for this place to start.');
  }
  json(res, 200, joinResponse(user, p, s));
}

// ---- server registration (game servers -> backend) ---------------------------------
function adminOnly(fn) {
  return (req, res, ...rest) => {
    const ok = ADMIN_KEY ? req.headers['x-admin-key'] === ADMIN_KEY : /^(127\.|::1|::ffff:127\.)/.test(req.socket.remoteAddress || '');
    return ok ? fn(req, res, ...rest) : error(res, 403, 'Server registration needs X-Admin-Key (or a loopback caller when ADMIN_KEY is unset).', 0);
  };
}
function registerServer(req, res, u, body) {
  const b = parseJson(body);
  if (!M.place(+b.placeId)) return badRequest(res, `unknown place ${b.placeId}`);
  if (!b.host || !b.port) return badRequest(res, 'host and port are required');
  const certHashHex = b.certHash || (b.transportPort ? certHash(b.host, +b.transportPort) : null);
  const s = M.upsertServer({ jobId: b.jobId, placeId: +b.placeId, host: b.host, port: +b.port, transportPort: b.transportPort ? +b.transportPort : null,
    certHash: certHashHex, maxPlayers: b.maxPlayers ? +b.maxPlayers : undefined, source: 'registered' });
  console.log(`games: server ${s.job_id} for place ${s.place_id} at ${s.host}:${s.port}/${s.transport_port || '-'}`);
  json(res, 200, s);
}

// ---- universes / places --------------------------------------------------------------
const universeIdFromPath = (u) => +(/universes\/(\d+)/.exec(u.pathname) || [])[1];

const ROUTES = [
  ['POST', /^gamejoin\.roblox\.com$/, /^\/v1\/join-game(-instance)?$/, joinGame],
  ['POST', /^gamejoin\.roblox\.com$/, /^\/v1\/play-with-user$/, (req, res, u, body, ctx) => {
    if (!ctx.user) return unauthorized(res);
    const pr = M.presenceOf(+parseJson(body).userIdToFollow);
    if (pr.userPresenceType !== 2) return joinFail(res, 10, 'That user is not in an experience.');
    joinGame(req, res, u, Buffer.from(JSON.stringify({ placeId: pr.placeId, gameId: pr.gameId })), ctx);
  }],
  ['POST', /^local$/, /^\/api\/local\/servers$/, adminOnly(registerServer)],
  ['POST', /^local$/, /^\/api\/local\/servers\/[^/]+\/heartbeat$/, adminOnly((req, res, u) =>
    (M.heartbeatServer(u.pathname.split('/')[4]) ? json(res, 200, {}) : notFound(res, 'server')))],
  ['DELETE', /^local$/, /^\/api\/local\/servers\/[^/]+$/, adminOnly((req, res, u) => { M.closeServer(u.pathname.split('/')[4]); json(res, 200, {}); })],
  ['GET', /^local$/, /^\/api\/local\/servers$/, (req, res) => json(res, 200, open().prepare(`SELECT * FROM game_servers WHERE status = 'active'`).all()
    .map((s) => ({ ...s, players: M.serverPlayers(s.job_id) })))],

  ['GET', /^economy\.roblox\.com$/, /^\/v2\/assets\/\d+\/details$/, (req, res, u) => {
    const id = +/assets\/(\d+)/.exec(u.pathname)[1];
    const p = M.place(id);
    if (p) return json(res, 200, placeProductInfo(p));
    const a = require('../assets.js').getAsset(id);
    if (!a) return error(res, 400, 'Asset not found.', 0);
    json(res, 200, {
      TargetId: a.id, ProductType: 'User Product', AssetId: a.id, ProductId: 0, Name: a.name, Description: a.description, AssetTypeId: a.asset_type_id,
      Creator: { Id: a.creator_id, Name: M.creatorName(a.creator_type, a.creator_id), CreatorType: a.creator_type, CreatorTargetId: a.creator_id, HasVerifiedBadge: false },
      IconImageAssetId: 0, Created: a.created_at, Updated: a.updated_at, PriceInRobux: null, PriceInTickets: null, Sales: 0, IsNew: false, IsForSale: false,
      IsPublicDomain: false, IsLimited: false, IsLimitedUnique: false, Remaining: null, MinimumMembershipLevel: 0, ContentRatingTypeId: 0,
    });
  }],
  ['GET', /^apis\.roblox\.com$/, /^\/universes\/v1\/places\/\d+\/universe$/, (req, res, u) => {
    const p = M.place(+/places\/(\d+)/.exec(u.pathname)[1]);
    json(res, 200, { universeId: p ? p.universe_id : null });
  }],
  // Private testers are the experience's creator only.
  ['GET', /^apis\.roblox\.com$/, /^\/universes\/v1\/universes\/\d+\/is-private-playtester$/, (req, res, u, b, { user }) => {
    const g = M.universe(universeIdFromPath(u));
    json(res, 200, { isPrivatePlaytester: !!(g && user && g.creator_type === 'User' && g.creator_id === user.id) });
  }],
  ['GET', /^games\.roblox\.com$/, /^\/v1\/games$/, (req, res, u, b, { user }) =>
    json(res, 200, { data: idList(u, 'universeIds').map(M.universe).filter(Boolean).map((g) => gameJson(g, user)) })],
  ['GET', /^games\.roblox\.com$/, /^\/v1\/games\/multiget-place-details$/, (req, res, u) => json(res, 200, idList(u, 'placeIds').map(M.place).filter(Boolean).map((p) => {
    const g = M.universe(p.universe_id);
    return { placeId: p.id, name: p.name, description: p.description, sourceName: p.name, sourceDescription: p.description,
      url: `https://www.roblox.com/games/${p.id}/`, builder: M.creatorName(g.creator_type, g.creator_id), builderId: g.creator_id,
      hasVerifiedBadge: false, isPlayable: true, reasonProhibited: 'None', universeId: g.id, universeRootPlaceId: g.root_place_id, price: 0, imageToken: '' };
  }))],
  ['GET', /^games\.roblox\.com$/, /^\/v1\/games\/\d+\/servers\/(Public|0)$/, (req, res, u) => {
    const g = M.universe(+/games\/(\d+)/.exec(u.pathname)[1]);
    const list = g ? M.activeServers(g.root_place_id) : [];
    json(res, 200, { previousPageCursor: null, nextPageCursor: null, data: list.map((s) => {
      const players = M.serverPlayers(s.job_id);
      return { id: s.job_id, maxPlayers: s.max_players, playing: players.length, playerTokens: players.map((id) => crypto.createHash('md5').update(`${s.job_id}:${id}`).digest('hex')), players: [], fps: 60, ping: 0 };
    }) });
  }],
  ['GET', /^games\.roblox\.com$/, /^\/v1\/games\/votes$/, (req, res, u) => json(res, 200, { data: idList(u, 'universeIds').map((id) => ({ id, upVotes: 0, downVotes: 0 })) })],
  ['GET', /^games\.roblox\.com$/, /^\/v1\/games\/\d+\/favorites\/count$/, (req, res, u) => { const g = M.universe(+/games\/(\d+)/.exec(u.pathname)[1]); json(res, 200, { favoritesCount: g ? g.favorites : 0 }); }],
  ['GET', /^games\.roblox\.com$/, /^\/v1\/games\/\d+\/favorites$/, (req, res) => json(res, 200, { isFavorited: false })],
  ['GET', /^develop\.roblox\.com$/, /^\/v1\/universes\/\d+$/, (req, res, u) => {
    const g = M.universe(universeIdFromPath(u));
    if (!g) return error(res, 404, 'The universe does not exist.', 1);
    json(res, 200, { id: g.id, name: g.name, description: g.description, isArchived: false, rootPlaceId: g.root_place_id, isActive: true,
      privacyType: g.privacy, creatorType: g.creator_type, creatorTargetId: g.creator_id, creatorName: M.creatorName(g.creator_type, g.creator_id),
      created: g.created_at, updated: g.updated_at });
  }],
  ['GET', /^develop\.roblox\.com$/, /^\/v1\/universes\/multiget$/, (req, res, u) => json(res, 200, { data: idList(u, 'ids').map(M.universe).filter(Boolean)
    .map((g) => ({ id: g.id, name: g.name, description: g.description, isArchived: false, rootPlaceId: g.root_place_id, isActive: true, privacyType: g.privacy,
      creatorType: g.creator_type, creatorTargetId: g.creator_id, creatorName: M.creatorName(g.creator_type, g.creator_id), created: g.created_at, updated: g.updated_at })) })],
  ['GET', /^develop\.roblox\.com$/, /^\/v1\/universes\/\d+\/places$/, (req, res, u) => json(res, 200, { previousPageCursor: null, nextPageCursor: null,
    data: open().prepare('SELECT * FROM places WHERE universe_id = ? ORDER BY id').all(universeIdFromPath(u)).map((p) => ({ id: p.id, universeId: p.universe_id, name: p.name, description: p.description })) })],

  // Presence (presence.roblox.com/v1/presence/users).
  ['POST', /^presence\.roblox\.com$/, /^\/v1\/presence\/users$/, (req, res, u, body) =>
    json(res, 200, { userPresences: (parseJson(body).userIds || []).map(Number).filter((id) => M.user(id)).map(M.presenceOf) })],
  ['POST', /^presence\.roblox\.com$/, /^\/v1\/presence\/register-app-presence$/, (req, res, u, b, { user }) => { if (user) M.touch(user.id); json(res, 200, {}); }],
  ['POST', /^presence\.roblox\.com$/, /^\/v1\/presence\/last-online$/, (req, res, u, body) =>
    json(res, 200, { lastOnlineTimestamps: (parseJson(body).userIds || []).map(Number).map(M.presenceOf).map((p) => ({ userId: p.userId, lastOnline: p.lastOnline })) })],

  // The player's localization choice for an experience, stored per user.
  ['GET', /^gameinternationalization\.roblox\.com$/, /^\/v1\/user-localization-settings\/player-choice\/\d+$/, (req, res, u, b, { user }) => {
    if (!user) return unauthorized(res);
    const r = open().prepare('SELECT value FROM user_settings WHERE user_id = ? AND key = ?').get(user.id, `locale-choice:${/player-choice\/(\d+)/.exec(u.pathname)[1]}`);
    json(res, 200, { userUniverseLocalizationSettingValue: r ? JSON.parse(r.value) : { settingType: 'SupportedLocale', settingTargetId: 0 } });
  }],
  ['POST', /^gameinternationalization\.roblox\.com$/, /^\/v1\/user-localization-settings\/universe\/\d+$/, (req, res, u, body, { user }) => {
    if (!user) return unauthorized(res);
    const id = +/universe\/(\d+)/.exec(u.pathname)[1];
    const v = parseJson(body);
    open().prepare(`INSERT INTO user_settings (user_id, key, value) VALUES (?, ?, ?) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value`)
      .run(user.id, `locale-choice:${id}`, JSON.stringify({ settingType: v.settingType || 'SupportedLocale', settingTargetId: +v.settingTargetId || 0 }));
    json(res, 200, {});
  }],
  // Also the in-experience language picker (ExperienceLanguageSwitcherInitializer reads data[].languageCode).
  ['GET', /^gameinternationalization\.roblox\.com$/, /^\/v1\/supported-languages\/games\/\d+(\/in-experience-language-selection)?$/, (req, res) =>
    json(res, 200, { data: [{ name: 'English', type: 'Language', languageCodeType: 'Language', languageCode: 'en', isAutomaticTranslationEnabled: false }] })],
  ['GET', /^gameinternationalization\.roblox\.com$/, /^\/v1\/source-language\/games\/\d+$/, (req, res) => json(res, 200, { name: 'English', nativeName: 'English', languageCode: 'en' })],
];

module.exports = { ROUTES, discoverStudioServer };
