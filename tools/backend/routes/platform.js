// Client configuration (fast flags, client version, the web client build),
// locale, policy, social graph (friends, groups), voice and telemetry intake.
const fs = require('fs'), path = require('path');
const A = require('../auth.js');
const M = require('../model.js');
const { open, now, ROOT, DATA } = require('../db.js');
const { json, error, unauthorized, notFound, badRequest, parseJson, idList } = require('../http.js');

const FLAGS = path.join(ROOT, 'webclient', 'LocalFlags.json');
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

// The newest web client build in webclient/live/ (tools/fetch_webclient.sh).
function liveWebClient() {
  const dir = path.join(ROOT, 'webclient', 'live');
  try {
    const builds = fs.readdirSync(dir).map((d) => path.join(dir, d)).filter((d) => fs.existsSync(path.join(d, 'client-version.json')));
    return builds.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
  } catch (e) { return null; }
}

// The repo's own engine build (patched wasm, rebuilt WebClient.js, content overlay
// with the Lua App bootstrap), which tools/server.js serves under /engine/. Roblox's
// page loads it when site-shim.js pins this upload id (/games/start?build=local).
const LOCAL_BUILD = 'version-0000000000000745';

function webClientFile(req, res, u) {
  const [, upload] = /^\/webclient\/(version-[0-9a-f]+)-RobloxWebClient\//.exec(u.pathname);
  const rel = decodeURIComponent(u.pathname.slice(`/webclient/${upload}-RobloxWebClient/`.length));
  if (upload === LOCAL_BUILD) {
    if (rel.includes('..')) return notFound(res, `web client file ${upload}/${rel}`);
    res.writeHead(302, { Location: `/engine/${rel.split('/').map(encodeURIComponent).join('/')}`, 'Access-Control-Allow-Origin': '*' });
    return res.end();
  }
  const file = path.join(ROOT, 'webclient', 'live', upload, rel);
  if (rel.includes('..') || !fs.existsSync(file) || !fs.statSync(file).isFile()) return notFound(res, `web client file ${upload}/${rel}`);
  const types = { '.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json' };
  const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream',
    'Cross-Origin-Resource-Policy': 'cross-origin', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' };
  if (rel === 'WebClient.js' && process.env.ROUTING !== 'sw') {
    // Shim mode: the engine's workers run WebClient.js directly; the shim goes
    // first so their requests reach this backend (webclient/site-shim.js). With
    // ROUTING=sw the service worker routes them instead and WebClient.js is
    // served byte-for-byte.
    const body = Buffer.concat([fs.readFileSync(path.join(ROOT, 'webclient', 'site-shim.js')), Buffer.from('\n'), fs.readFileSync(file)]);
    res.writeHead(200, { ...headers, 'Content-Length': body.length });
    return res.end(body);
  }
  res.writeHead(200, { ...headers, 'Content-Length': fs.statSync(file).size });
  fs.createReadStream(file).pipe(res);
}

// PolicyService data for a player, from the account (age) and country.
function policyFor(user) {
  const minor = !user || A.isUnder13(user);
  return {
    isSubjectToChinaPolicies: false,
    arePaidRandomItemsRestricted: minor,
    isPaidItemTradingAllowed: !minor,
    allowedExternalLinkReferences: minor ? [] : ['Discord', 'Facebook', 'Twitch', 'YouTube', 'X', 'Guilded'],
    areAdsAllowed: !minor,
    isContentSharingAllowed: !minor,
    isEligibleToPurchaseSubscription: false,
    isEligibleToPurchaseCommerceProduct: false,
  };
}

// ---- blocks (user_blocks) -----------------------------------------------------------
const blocks = (a, b) => !!open().prepare('SELECT 1 FROM user_blocks WHERE user_id = ? AND blocked_id = ?').get(a, b);
// One entry per account the user blocks or is blocked by, as the game server's
// SocialCounterpartyManager reads it: isBlocked (user blocks them), isBlockingViewer (they block user).
function blockingData(userId, alsoIds = []) {
  const rows = open().prepare(`SELECT blocked_id other FROM user_blocks WHERE user_id = ? UNION SELECT user_id FROM user_blocks WHERE blocked_id = ?`).all(userId, userId);
  const ids = [...new Set([...rows.map((r) => r.other), ...alsoIds.filter((x) => x && x !== userId)])];
  return { blockedUsersListIsComplete: true, blockedByUsersListIsComplete: true,
    reciprocalUserData: ids.map((other) => ({ userId: other, isBlocked: blocks(userId, other), isBlockingViewer: blocks(other, userId) })) };
}

// ---- friends (mutual rows = friends; a single row = a pending request) ------------
const isFriend = (a, b) => !!open().prepare(`SELECT 1 FROM friendships f JOIN friendships g ON g.user_id = f.friend_id AND g.friend_id = f.user_id WHERE f.user_id = ? AND f.friend_id = ?`).get(a, b);
function friendsOf(id) {
  return open().prepare(`SELECT f.friend_id id FROM friendships f JOIN friendships g ON g.user_id = f.friend_id AND g.friend_id = f.user_id WHERE f.user_id = ?`).all(id).map((r) => r.id);
}
function friendJson(id) {
  const u = M.user(id), p = M.presenceOf(id);
  return { isOnline: p.userPresenceType > 0, presenceType: p.userPresenceType, isDeleted: false, friendFrequentScore: 0, friendFrequentRank: 1,
    hasVerifiedBadge: false, description: u.description, created: u.created_at, isBanned: !!u.is_banned, externalAppDisplayName: null,
    id: u.id, name: u.name, displayName: u.display_name };
}
const friendTarget = (u) => +(/users\/(\d+)/.exec(u.pathname) || [])[1];

const ROUTES = [
  // Browser capability reports from site-shim.js (which devices can run the engine).
  ['POST', /^local$/, /^\/api\/local\/client-report$/, (req, res, u, body) => {
    const r = parseJson(body, null);
    if (!r || typeof r !== 'object') return badRequest(res, 'expected a JSON report');
    const line = JSON.stringify({ at: new Date().toISOString(), ip: req.socket.remoteAddress, ...r }).slice(0, 8192);
    fs.mkdirSync(path.join(DATA, 'logs'), { recursive: true });
    fs.appendFileSync(path.join(DATA, 'logs', 'client-report.log'), line + '\n');
    json(res, 200, {});
  }],
  // Fast flags: engine defaults plus webclient/LocalFlags.json. Other apps (e.g. Studio's
  // PCStudioApp) get their own production set from webclient/flags/<app>.json plus <app>.local.json.
  ['GET', /^clientsettings(cdn)?\.roblox\.com$/, /^\/v\d\/settings\/application\//, (req, res, u) => {
    const app = path.basename(u.pathname);
    const own = read(path.join(ROOT, 'webclient', 'flags', `${app}.json`));
    const applicationSettings = own ? { ...own.applicationSettings, ...read(path.join(ROOT, 'webclient', 'flags', `${app}.local.json`)) } : read(FLAGS) || {};
    json(res, 200, { applicationSettings });
  }],
  ['GET', /^clientsettings(cdn)?\.roblox\.com$/, /^\/v2\/client-version\/WebClientApp/, (req, res) => {
    const live = liveWebClient();
    if (!live) return notFound(res, 'web client build (run tools/fetch_webclient.sh)');
    json(res, 200, read(path.join(live, 'client-version.json')));
  }],
  // Studio's update check: the build tools/studio/install_studio.sh installed, so it never offers an update.
  ['GET', /^clientsettings(cdn)?\.roblox\.com$/, /^\/v2\/client-version\/WindowsStudio64/, (req, res) => {
    const v = read(path.join(process.env.STUDIO_DIR || '/home/user/studio', 'version.json'));
    if (!v) return notFound(res, 'installed Studio version (run tools/studio/install_studio.sh)');
    json(res, 200, v);
  }],
  ['GET', /^clientsettings(cdn)?\.roblox\.com$/, /^\/v2\/user-channel/, // No channel assignment: the default (production) channel, as before.
    (req, res) => json(res, 200, {})],
  ['GET', /^setup\.rbxcdn\.com$/, /^\/webclient\/(version-[0-9a-f]+)-RobloxWebClient\//, webClientFile],

  ['GET', /^locale\.roblox\.com$/, /^\/v1\/locales/, (req, res, u, b, { user }) => {
    const l = { id: 1, locale: (user && user.locale) || 'en_us', name: 'English', nativeName: 'English', language: { id: 41, name: 'English', nativeName: 'English', languageCode: 'en' } };
    json(res, 200, { signupAndLogin: l, generalExperience: l, ugc: l, data: [{ locale: l, isEnabledForFullExperience: true, isEnabledForSignupAndLogin: true, isEnabledForInGameUgc: true }] });
  }],

  ['GET', /^apis\.roblox\.com$/, /^\/player-policy-service\/v1\/player-policy-client$/, (req, res, u, b, { user }) => json(res, 200, policyFor(user))],
  // The game server asks for a given player.
  ['*', /^apis\.roblox\.com$/, /^\/player-policy-service\/v1\/player-policy-rcc$/, (req, res, u, body) => {
    const id = +(u.searchParams.get('userId') || parseJson(body).userId);
    json(res, 200, policyFor(M.user(id)));
  }],
  // Game server (RCC) social checks. Text chat drops a player's messages while
  // their blocking data is missing, so this has to answer.
  ['POST', /^apis\.roblox\.com$/, /^\/user-blocking-api\/v1\/users\/rcc\/get-user-blocking-data$/, (req, res, u, body) => {
    // The 2026 game server sends {requesterUserId, userIds}; older callers {userId}.
    const b = parseJson(body), id = +(b.requesterUserId || b.userId || u.searchParams.get('userId'));
    if (!M.user(id)) return badRequest(res, 'Invalid userId');
    json(res, 200, blockingData(id, (b.userIds || []).map(Number)));
  }],
  ['POST', /^apis\.roblox\.com$/, /^\/user-blocking-api\/v1\/users\/rcc\/batch-check-reciprocal-block$/, (req, res, u, body) => {
    const b = parseJson(body), id = +b.userId;
    json(res, 200, { otherUsers: (b.otherUserIds || []).map(Number).map((other) => ({ userId: other, isBlocked: blocks(id, other), isBlockingViewer: blocks(other, id) })) });
  }],
  // Universe-wide chat needs universe-chat-messaging-api, which this platform doesn't run.
  ['GET', /^apis\.roblox\.com$/, /^\/universe-chat-api\/v1\/universe-chat-settings$/, (req, res) => json(res, 200, { globalChatEnabled: false, presetChatStatus: 'Enabled' })],
  // Experimentation (IXP): this platform runs no experiments, so every requested
  // layer is unassigned and has no parameter overrides; clients use their defaults.
  ['POST', /^apis\.roblox\.com$/, /^\/product-experimentation-platform\/v1\/projects\/\d+\/values$/, (req, res, u, body, { user }) => {
    const projectId = +/projects\/(\d+)/.exec(u.pathname)[1];
    const layers = Object.entries(parseJson(body).layers || {});
    json(res, 200, { layers: Object.fromEntries(layers.map(([name, unit]) => {
      const [primaryUnit, primaryUnitValue] = Object.entries(unit || {})[0] || ['UserId', user ? String(user.id) : ''];
      return [name, { experimentName: null, isAudienceSpecified: false, isAudienceMember: null, segment: null, experimentVariant: null,
        parameters: {}, primaryUnit, primaryUnitValue: String(primaryUnitValue), holdoutGroupExperimentName: null, projectId,
        version: null, platformType: null, userAgent: null }];
    })) });
  }],
  ['GET', /^apis\.roblox\.com$/, /^\/maintenance-status/, (req, res) => json(res, 200, { isAlertVisible: false })],
  ['*', /^apis\.roblox\.com$/, /guac|universal-app-configuration|app-policy/, (req, res) => json(res, 200, {})],

  // Voice chat is not provided by this platform; the settings say so.
  ['GET', /^voice\.roblox\.com$/, /^\/v1\/settings$/, (req, res) => json(res, 200, {
    isVoiceEnabled: false, isUserOptIn: false, isUserEligible: false, isBanned: false, banReason: 0, bannedUntil: null,
    canVerifyAgeForVoice: false, isVerifiedForVoice: false, denialReason: 0, isOptInDisabled: true, hasEverOptedAllVoiceBeta: false,
    isAvatarVideoEnabled: false, isAvatarVideoOptIn: false, isAvatarVideoOptInDisabled: true, isAvatarVideoEligible: false,
    canVerifyPhoneForVoice: false, seamlessVoiceStatus: 0, allowVoiceDataUsage: false, voiceDataUsageStatus: 0,
  })],

  ['GET', /^friends\.roblox\.com$/, /^\/v1\/users\/\d+\/friends\/count$/, (req, res, u) => json(res, 200, { count: friendsOf(friendTarget(u)).length })],
  ['GET', /^friends\.roblox\.com$/, /^\/v1\/users\/\d+\/friends(\/online)?$/, (req, res, u) => {
    let ids = friendsOf(friendTarget(u));
    if (u.pathname.endsWith('/online')) ids = ids.filter((id) => M.presenceOf(id).userPresenceType > 0);
    json(res, 200, { data: ids.map(friendJson) });
  }],
  ['GET', /^friends\.roblox\.com$/, /^\/v1\/users\/\d+\/friends\/statuses$/, (req, res, u) => {
    const me = friendTarget(u);
    json(res, 200, { data: idList(u, 'userIds').map((id) => ({ id, status: isFriend(me, id) ? 'Friends'
      : open().prepare('SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?').get(me, id) ? 'RequestSent'
        : open().prepare('SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?').get(id, me) ? 'RequestReceived' : 'NotFriends' })) });
  }],
  ['GET', /^friends\.roblox\.com$/, /^\/v1\/my\/friends\/requests$/, (req, res, u, b, { user }) => {
    if (!user) return unauthorized(res);
    const ids = open().prepare(`SELECT f.user_id id FROM friendships f LEFT JOIN friendships g ON g.user_id = f.friend_id AND g.friend_id = f.user_id WHERE f.friend_id = ? AND g.user_id IS NULL`).all(user.id).map((r) => r.id);
    json(res, 200, { previousPageCursor: null, nextPageCursor: null, data: ids.map(friendJson) });
  }],
  ['GET', /^friends\.roblox\.com$/, /^\/v1\/user\/friend-requests\/count$/, (req, res, u, b, { user }) => {
    if (!user) return unauthorized(res);
    json(res, 200, { count: open().prepare(`SELECT COUNT(*) n FROM friendships f LEFT JOIN friendships g ON g.user_id = f.friend_id AND g.friend_id = f.user_id WHERE f.friend_id = ? AND g.user_id IS NULL`).get(user.id).n });
  }],
  // Sending a request to someone who already asked you makes you friends.
  ['POST', /^friends\.roblox\.com$/, /^\/v1\/users\/\d+\/(request-friendship|accept-friend-request)$/, (req, res, u, b, { user }) => {
    if (!user) return unauthorized(res);
    const other = friendTarget(u);
    if (!M.user(other) || other === user.id) return badRequest(res, 'Invalid user');
    open().prepare('INSERT OR IGNORE INTO friendships (user_id, friend_id, created_at) VALUES (?, ?, ?)').run(user.id, other, now());
    json(res, 200, { success: true, isCaptchaRequired: false });
  }],
  ['POST', /^friends\.roblox\.com$/, /^\/v1\/users\/\d+\/(unfriend|decline-friend-request)$/, (req, res, u, b, { user }) => {
    if (!user) return unauthorized(res);
    const other = friendTarget(u);
    open().prepare('DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)').run(user.id, other, other, user.id);
    json(res, 200, {});
  }],
  ['GET', /^friends\.roblox\.com$/, /^\/v1\/users\/\d+\/(followers|followings)\/count$/, (req, res) => json(res, 200, { count: 0 })],

  // Groups: this platform has none yet, so memberships are genuinely empty.
  ['GET', /^groups\.roblox\.com$/, /^\/v[12]\/users\/\d+\/groups\/roles$/, (req, res) => json(res, 200, { data: [] })],
  ['GET', /^groups\.roblox\.com$/, /^\/v2\/groups\/\d+\/users$/, (req, res) => json(res, 200, { previousPageCursor: null, nextPageCursor: null, data: [] })],
  ['GET', /^groups\.roblox\.com$/, /^\/v[12]\/groups\/\d+$/, (req, res) => error(res, 400, 'Group is invalid or does not exist.', 1)],
  ['GET', /^groups\.roblox\.com$/, /^\/v2\/groups$/, (req, res) => json(res, 200, { data: [] })],

  // Crash reports stay local.
  ['*', /(^|\.)rbxinfra\.com$/, /./, (req, res) => json(res, 200, {})],
  // Telemetry, counters and heartbeats: accepted, counted in the request log, not forwarded.
  ['*', /^(ephemeralcounters\.api|ecsv2|client-telemetry|metrics|lms|tracing)\.roblox\.com$/, /./, (req, res) => json(res, 200, {})],
  ['*', /./, /experience-signals-ingest|\/pbe$|otel|analytics|telemetry|user-heartbeats/, (req, res) => json(res, 200, {})],
];

module.exports = { ROUTES, policyFor };
