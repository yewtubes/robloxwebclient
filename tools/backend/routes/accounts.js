// Accounts: local sign-up/login, users.roblox.com, profiles, account
// information, moderation state and the OAuth server Studio signs in with.
const crypto = require('crypto');
const A = require('../auth.js');
const M = require('../model.js');
const { open, now } = require('../db.js');
const { json, error, unauthorized, badRequest, parseJson, formOrJson, idList } = require('../http.js');

const userJson = (u) => ({ hasVerifiedBadge: false, id: u.id, name: u.name, displayName: u.display_name });
const requireUser = (fn) => (req, res, u, body, ctx) => (ctx.user ? fn(req, res, u, body, ctx) : unauthorized(res));

// ---- local account API (our own web pages use these) -------------------------
function signup(req, res, u, body) {
  const p = parseJson(body);
  const err = A.validateNewUser(p);
  if (err) return badRequest(res, err);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.birthdate || '')) return badRequest(res, 'Birthdate is required (YYYY-MM-DD).');
  const user = A.createUser(p);
  const t = A.createSession(user.id, 'web', { userAgent: req.headers['user-agent'] });
  console.log(`accounts: signed up ${user.name} (${user.id})`);
  json(res, 200, userJson(user), { 'Set-Cookie': A.webCookie(t) });
}
function login(req, res, u, body) {
  const p = parseJson(body);
  const user = A.getUserByName(p.username || '');
  if (!user || !A.checkPassword(p.password || '', user.password_hash)) return error(res, 403, 'Incorrect username or password.', 1);
  if (user.is_banned) return error(res, 403, 'Account is banned.', 4);
  const t = A.createSession(user.id, 'web', { userAgent: req.headers['user-agent'] });
  json(res, 200, userJson(user), { 'Set-Cookie': A.webCookie(t) });
}
function logout(req, res) {
  const c = require('../http.js').cookies(req)[A.WEB_COOKIE];
  if (c) A.revokeSession(c);
  json(res, 200, {}, { 'Set-Cookie': A.webCookie('', 0) });
}

// ---- OAuth for Studio --------------------------------------------------------
function apiBase(req) {
  const h = req.headers['x-original-host'] || 'apis.roblox.com';
  return `https://${h.replace(/^[^.]+\./, 'apis.')}`;
}
function issueTokens(user, scope) {
  const access = A.createSession(user.id, 'oauth-access', { days: 1 / 24, scope });
  const refresh = A.createSession(user.id, 'oauth-refresh', { days: 90, scope });
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const t = Math.floor(Date.now() / 1000);
  // Unsigned id_token (alg none): Studio reads the claims, nothing verifies a signature.
  const idToken = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: String(user.id), name: user.display_name, nickname: user.display_name,
    preferred_username: user.name, created_at: Math.floor(Date.parse(user.created_at) / 1000), profile: `https://www.roblox.com/users/${user.id}/profile`, iat: t, exp: t + 3600 })}.`;
  return { access_token: access, refresh_token: refresh, token_type: 'Bearer', expires_in: 3600, scope: scope || 'openid profile', id_token: idToken };
}
// The OAuth user: the browser's signed-in account; else STUDIO_OAUTH_USER (a
// local account name or id, for headless Studio on a dev machine); else a login form.
function oauthUser(req, ctx) {
  if (ctx.user) return ctx.user;
  const v = process.env.STUDIO_OAUTH_USER || '';
  if (!v) return null;
  return /^\d+$/.test(v) ? A.getUser(+v) : A.getUserByName(v);
}
function authorizeForm(res, u, msg = '') {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  const hidden = [...u.searchParams].map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join('');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><meta charset="utf-8"><title>Sign in to Studio</title>
<body style="font-family:system-ui;max-width:360px;margin:60px auto"><h2>Sign in to Roblox Studio</h2>
<p>Local platform account. ${esc(msg)}</p><form method="post">${hidden}
<p><input name="username" placeholder="Username" required></p><p><input name="password" type="password" placeholder="Password" required></p>
<button>Allow Studio</button></form>`);
}
function authorize(req, res, u, body, ctx) {
  let user = oauthUser(req, ctx);
  if (!user && req.method === 'POST') {
    const p = formOrJson(body);
    const cand = A.getUserByName(p.username || '');
    if (cand && A.checkPassword(p.password || '', cand.password_hash)) user = cand;
    else return authorizeForm(res, u, 'Incorrect username or password.');
  }
  if (!user) return authorizeForm(res, u);
  const redirect = u.searchParams.get('redirect_uri');
  if (!redirect) return badRequest(res, 'redirect_uri is required');
  const code = A.token();
  open().prepare('INSERT INTO oauth_codes (code_hash, user_id, client_id, scope, challenge, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(A.sha(code), user.id, u.searchParams.get('client_id'), u.searchParams.get('scope'), u.searchParams.get('code_challenge'),
      new Date(Date.now() + 600e3).toISOString());
  const loc = new URL(redirect);
  loc.searchParams.set('code', code);
  if (u.searchParams.get('state')) loc.searchParams.set('state', u.searchParams.get('state'));
  console.log(`oauth: authorized ${user.name} for ${u.searchParams.get('client_id') || '?'} -> ${loc.protocol}//${loc.host}${loc.pathname}`);
  res.writeHead(302, { Location: loc.href });
  res.end();
}
function tokenEndpoint(req, res, u, body) {
  const p = formOrJson(body);
  const db = open();
  let user, scope;
  if (p.grant_type === 'authorization_code') {
    const c = db.prepare('SELECT * FROM oauth_codes WHERE code_hash = ? AND expires_at > ?').get(A.sha(p.code || ''), now());
    if (!c) return json(res, 400, { error: 'invalid_grant' });
    db.prepare('DELETE FROM oauth_codes WHERE code_hash = ?').run(c.code_hash);
    if (c.challenge && p.code_verifier) {
      const s = crypto.createHash('sha256').update(p.code_verifier).digest('base64url');
      if (s !== c.challenge) return json(res, 400, { error: 'invalid_grant', error_description: 'PKCE verification failed' });
    }
    user = A.getUser(c.user_id); scope = c.scope;
  } else if (p.grant_type === 'refresh_token') {
    const s = A.sessionFor(p.refresh_token, ['oauth-refresh']);
    if (!s) return json(res, 400, { error: 'invalid_grant' });
    user = A.getUser(s.user_id); scope = s.scope;
  } else {
    return json(res, 400, { error: 'unsupported_grant_type' });
  }
  console.log(`oauth: ${p.grant_type} -> tokens for ${user.name}`);
  // Studio waits for a .ROBLOSECURITY cookie after login before it leaves the
  // login screen. It gets one of this platform's studio sessions.
  const studio = A.createSession(user.id, 'studio', { days: 30 });
  const domain = (req.headers['x-original-host'] || 'www.roblox.com').replace(/^[^.]+/, '');
  const cookie = `.ROBLOSECURITY=${A.STUDIO_PREFIX}${studio}; domain=${domain}; path=/; expires=Fri, 01 Jan 2100 00:00:00 GMT; secure; HttpOnly; SameSite=Lax`;
  json(res, 200, issueTokens(user, scope), { 'Set-Cookie': cookie });
}
function userinfo(req, res, u, body, ctx) {
  const user = ctx.user;
  if (!user) return unauthorized(res);
  json(res, 200, {
    sub: String(user.id), name: user.display_name, nickname: user.display_name, preferred_username: user.name,
    created_at: Math.floor(Date.parse(user.created_at) / 1000), profile: `https://www.roblox.com/users/${user.id}/profile`,
    picture: `https://tr.rbxcdn.com/30DAY-AvatarHeadshot-${user.id}/150/150/AvatarHeadshot/Png/noFilter`,
    email: `${user.name.toLowerCase()}@local.invalid`, email_verified: false, verified: false, age_checked: !!user.birthdate,
    age_bracket: A.isUnder13(user) ? 'AgeUnder13' : 'Age13OrOver', premium: false, roles: [], internal_user: false, attributes: {},
  });
}
function discovery(req, res) {
  const base = apiBase(req), b = base + '/oauth', create = base.replace('://apis.', '://create.');
  json(res, 200, {
    issuer: b + '/', authorization_endpoint: b + '/v1/authorize', token_endpoint: b + '/v1/token',
    introspection_endpoint: b + '/v1/token/introspect', revocation_endpoint: b + '/v1/token/revoke',
    resources_endpoint: b + '/v1/token/resources', userinfo_endpoint: b + '/v1/userinfo', jwks_uri: b + '/v1/certs',
    registration_endpoint: create + '/dashboard/credentials', service_documentation: create + '/docs/reference/cloud',
    scopes_supported: ['openid', 'profile', 'email', 'verification', 'credentials', 'age', 'premium', 'roles', 'attributes'],
    response_types_supported: ['none', 'code'], subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['ES256'],
    claims_supported: ['sub', 'type', 'iss', 'aud', 'exp', 'iat', 'nonce', 'name', 'nickname', 'preferred_username', 'created_at',
      'profile', 'picture', 'email', 'email_verified', 'verified', 'age_checked', 'age_bracket', 'premium', 'roles', 'internal_user', 'attributes'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
  });
}

// ---- users.roblox.com ----------------------------------------------------------
function usersByIds(req, res, u, body) {
  const p = parseJson(body);
  const ids = (p.userIds || []).map(Number).filter(Number.isSafeInteger);
  const rows = ids.map((id) => M.user(id)).filter((x) => x && !(p.excludeBannedUsers && x.is_banned));
  json(res, 200, { data: rows.map(userJson) });
}
function usersByNames(req, res, u, body) {
  const p = parseJson(body);
  const out = [];
  for (const n of p.usernames || []) {
    const x = A.getUserByName(String(n));
    if (x && !(p.excludeBannedUsers && x.is_banned)) out.push({ requestedUsername: n, ...userJson(x) });
  }
  json(res, 200, { data: out });
}
function userById(req, res, u) {
  const x = M.user(+/\/users\/(\d+)/.exec(u.pathname)[1]);
  if (!x) return error(res, 404, 'The user id is invalid.', 3);
  json(res, 200, { description: x.description, created: x.created_at, isBanned: !!x.is_banned, externalAppDisplayName: null, ...userJson(x) });
}
function search(req, res, u) {
  const k = (u.searchParams.get('keyword') || '').trim();
  if (k.length < 3) return badRequest(res, 'The keyword is too short.');
  const lim = Math.min(+(u.searchParams.get('limit') || 10), 100);
  const rows = open().prepare(`SELECT * FROM users WHERE (name LIKE ? OR display_name LIKE ?) AND is_banned = 0 ORDER BY id LIMIT ?`).all(`%${k}%`, `%${k}%`, lim);
  json(res, 200, { previousPageCursor: null, nextPageCursor: null, data: rows.map((x) => ({ previousUsernames: [], ...userJson(x) })) });
}
function profiles(req, res, u, body) {
  const p = parseJson(body);
  const ids = (p.userIds || []).map(Number);
  json(res, 200, {
    profileDetails: ids.map((id) => M.user(id)).filter(Boolean).map((x) => ({
      userId: x.id,
      names: { combinedName: x.display_name, displayName: x.display_name, username: x.name, alias: '', contactName: '', platformName: '' },
      isVerified: false,
    })),
  });
}

const ROUTES = [
  ['POST', /^local$/, /^\/api\/local\/auth\/signup$/, signup],
  ['POST', /^local$/, /^\/api\/local\/auth\/login$/, login],
  ['POST', /^local$/, /^\/api\/local\/auth\/logout$/, logout],
  ['GET', /^local$/, /^\/api\/local\/auth\/me$/, requireUser((req, res, u, b, ctx) => json(res, 200, userJson(ctx.user)))],

  ['GET', /^apis\.roblox\.com$/, /^\/oauth\/\.well-known\/openid-configuration/, discovery],
  ['*', /^apis\.roblox\.com$/, /^\/oauth\/v1\/authorize/, authorize],
  ['POST', /^apis\.roblox\.com$/, /^\/oauth\/v1\/token\/revoke/, (req, res, u, body) => { const t = formOrJson(body).token; if (t) A.revokeSession(t); json(res, 200, {}); }],
  ['POST', /^apis\.roblox\.com$/, /^\/oauth\/v1\/token\/introspect/, (req, res, u, body) => {
    const s = A.sessionFor(formOrJson(body).token, ['oauth-access', 'oauth-refresh']);
    json(res, 200, s ? { active: true, sub: String(s.user_id), scope: s.scope, client_id: 'studio', exp: Math.floor(Date.parse(s.expires_at) / 1000) } : { active: false });
  }],
  ['POST', /^apis\.roblox\.com$/, /^\/oauth\/v1\/token\/resources/, requireUser((req, res, u, b, ctx) =>
    json(res, 200, { resource_infos: [{ owner: { id: String(ctx.user.id), type: 'User' }, resources: {} }] }))],
  ['POST', /^apis\.roblox\.com$/, /^\/oauth\/v1\/token$/, tokenEndpoint],
  ['GET', /^apis\.roblox\.com$/, /^\/oauth\/v1\/userinfo/, userinfo],
  // No signing keys: id_tokens are unsigned (see issueTokens).
  ['GET', /^apis\.roblox\.com$/, /^\/oauth\/v1\/certs/, (req, res) => json(res, 200, { keys: [] })],

  ['GET', /^users\.roblox\.com$/, /^\/v1\/users\/authenticated\/app-launch-info$/, requireUser((req, res, u, b, { user }) =>
    json(res, 200, { ...userJson(user), ageBracket: A.isUnder13(user) ? 1 : 0, countryCode: user.country_code, isPremium: false }))],
  ['GET', /^users\.roblox\.com$/, /^\/v1\/users\/authenticated\/age-bracket$/, requireUser((req, res, u, b, { user }) => json(res, 200, { ageBracket: A.isUnder13(user) ? 1 : 0 }))],
  ['GET', /^users\.roblox\.com$/, /^\/v1\/users\/authenticated\/country-code$/, requireUser((req, res, u, b, { user }) => json(res, 200, { countryCode: user.country_code }))],
  ['GET', /^users\.roblox\.com$/, /^\/v1\/users\/authenticated\/roles$/, requireUser((req, res) => json(res, 200, { roles: [] }))],
  ['GET', /^users\.roblox\.com$/, /^\/v1\/users\/authenticated$/, requireUser((req, res, u, b, { user }) => json(res, 200, { id: user.id, name: user.name, displayName: user.display_name }))],
  ['GET', /^users\.roblox\.com$/, /^\/v1\/users\/search$/, search],
  ['GET', /^users\.roblox\.com$/, /^\/v1\/users\/\d+$/, userById],
  ['GET', /^users\.roblox\.com$/, /^\/v1\/users\/\d+\/username-history$/, (req, res) => json(res, 200, { previousPageCursor: null, nextPageCursor: null, data: [] })],
  ['POST', /^users\.roblox\.com$/, /^\/v1\/users$/, usersByIds],
  ['POST', /^users\.roblox\.com$/, /^\/v1\/usernames\/users$/, usersByNames],
  ['POST', /^apis\.roblox\.com$/, /^\/user-profile-api\/v1\/user\/profiles\/get-profiles/, profiles],

  ['GET', /^accountinformation\.roblox\.com$/, /^\/v1\/birthdate$/, requireUser((req, res, u, b, { user }) => {
    const d = user.birthdate ? new Date(user.birthdate) : null;
    json(res, 200, d ? { birthMonth: d.getUTCMonth() + 1, birthDay: d.getUTCDate(), birthYear: d.getUTCFullYear() } : {});
  })],
  ['GET', /^(accountinformation|users)\.roblox\.com$/, /^\/v1\/description$/, requireUser((req, res, u, b, { user }) => json(res, 200, { description: user.description }))],
  ['POST', /^(accountinformation|users)\.roblox\.com$/, /^\/v1\/description$/, requireUser((req, res, u, body, { user }) => {
    const description = String(formOrJson(body).description ?? '').slice(0, 1000);
    open().prepare('UPDATE users SET description = ? WHERE id = ?').run(description, user.id);
    json(res, 200, { description });
  })],
  ['GET', /^accountsettings\.roblox\.com$/, /^\/v1\/email$/, requireUser((req, res) => json(res, 200, { emailAddress: null, verified: false }))],

  // Moderation state from the account: banned accounts get a ban record.
  ['GET', /^usermoderation\.roblox\.com$/, /^\/v1\/not-approved/, (req, res, u, b, { user }) =>
    json(res, 200, user && user.is_banned ? { punishedUserId: user.id, messageToUser: 'Account banned on this platform.', punishmentTypeDescription: 'Ban' } : {})],
  // Logout: ends the session the request was made with (web cookie or Studio's .ROBLOSECURITY).
  ['POST', /^auth\.roblox\.com$/, /^\/v[12]\/logout$/, (req, res) => {
    const c = require('../http.js').cookies(req);
    if (c[A.WEB_COOKIE]) A.revokeSession(c[A.WEB_COOKIE]);
    const sec = c['.ROBLOSECURITY'];
    if (sec && sec.startsWith(A.STUDIO_PREFIX)) A.revokeSession(sec.slice(A.STUDIO_PREFIX.length));
    json(res, 200, {});
  }],
  ['POST', /^apis\.roblox\.com$/, /^\/validate-machine/, (req, res) => json(res, 200, { success: true, isValid: true, messages: [] })],
];

module.exports = { ROUTES, userJson };
