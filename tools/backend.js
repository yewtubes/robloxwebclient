// Local stand-in for the Roblox web APIs the client calls. Nothing is forwarded
// to Roblox: requests the engine (or WasmPlayer.js) makes to *.roblox.com /
// *.rbxcdn.com arrive here as /proxy/<url> and are answered locally.
//
// Assets come from webclient/assets/ (files named by asset id, or
// hash/<hash> for hash-addressed content); see tools/import_asset.js.
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'webclient', 'assets');
const FLAGS = path.join(ROOT, 'webclient', 'LocalFlags.json');

const USER = { id: 1, name: 'Player1', displayName: 'Player1' };

// Assets are genuine Roblox content: anything not yet in the local store is
// fetched once from Roblox's public asset delivery and cached in
// webclient/assets/ (set ASSET_FETCH=0 to stay fully offline).
const { execFile } = require('child_process');
const fetching = new Map();
const noFetch = new Set();
function curl(args) {
  return new Promise((resolve, reject) =>
    execFile('curl', ['-sS', '-m', '60', '--compressed', ...args], { encoding: 'buffer', maxBuffer: 1 << 30 },
      (err, out) => (err ? reject(err) : resolve(out))));
}
function fetchAsset(id) {
  id = String(id);
  if (process.env.ASSET_FETCH === '0' || !/^\d+$/.test(id) || noFetch.has(id)) return Promise.resolve(false);
  if (assetFile(id)) return Promise.resolve(true);
  if (!fetching.has(id)) {
    fetching.set(id, (async () => {
      try {
        const meta = JSON.parse((await curl([`https://assetdelivery.roblox.com/v2/assetId/${id}`])).toString());
        const loc = meta.locations && meta.locations[0] && meta.locations[0].location;
        if (!loc) throw new Error((meta.errors && meta.errors[0] && meta.errors[0].message) || 'no location');
        const data = await curl(['-L', loc]);
        fs.mkdirSync(ASSETS, { recursive: true });
        fs.writeFileSync(path.join(ASSETS, id), data);
        fs.writeFileSync(path.join(ASSETS, `${id}.json`), JSON.stringify({ assetTypeId: meta.assetTypeId }));
        console.log(`backend: cached asset ${id} (type ${meta.assetTypeId}, ${data.length} bytes)`);
        return true;
      } catch (e) {
        noFetch.add(id);
        console.log(`backend: asset ${id} not downloadable: ${e.message.split('\n')[0]}`);
        return false;
      } finally {
        fetching.delete(id);
      }
    })());
  }
  return fetching.get(id);
}
const unhandled = new Set();

const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};
const notFound = (res, what) => json(res, 404, { errors: [{ code: 404, message: `${what} is not available on the local backend` }] });

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function assetFile(id) {
  const f = path.join(ASSETS, String(id).replace(/[^0-9]/g, ''));
  return fs.existsSync(f) ? f : null;
}
function assetMeta(id) {
  try { return JSON.parse(fs.readFileSync(path.join(ASSETS, `${id}.json`), 'utf8')); } catch { return {}; }
}
function hashFile(hash) {
  const f = path.join(ASSETS, 'hash', String(hash).replace(/[^0-9a-f]/gi, ''));
  return fs.existsSync(f) ? f : null;
}
function sendFile(res, file) {
  res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': fs.statSync(file).size });
  fs.createReadStream(file).pipe(res);
}

// Avatar for the local player: classic R6 colours, no catalog assets.
const AVATAR = {
  resolvedAvatarType: process.env.AVATAR_TYPE || 'R15',
  accessoryVersionIds: [], equippedGearVersionIds: [], backpackGearVersionIds: [],
  assetAndAssetTypeIds: [], animationAssetIds: {},
  bodyColors: { headColorId: 24, torsoColorId: 23, rightArmColorId: 24, leftArmColorId: 24, rightLegColorId: 119, leftLegColorId: 119 },
  bodyColor3s: { headColor3: 'F5CD30', torsoColor3: '0D69AC', rightArmColor3: 'F5CD30', leftArmColor3: 'F5CD30', rightLegColor3: 'A4BD47', leftLegColor3: 'A4BD47' },
  scales: { height: 1, width: 1, head: 1, depth: 1, proportion: 0, bodyType: 0 },
  emotes: [],
};

// RbxTransport (WebTransport over HTTP/3) endpoint of the game server, as the
// web client needs it: port, FQDN and the SHA-256 of the server's self-signed
// certificate, which Studio rotates, so it is read from the server per join.
// The newest web client build in webclient/live/ (tools/fetch_webclient.sh).
function liveWebClient() {
  const dir = path.join(ROOT, 'webclient', 'live');
  try {
    const builds = fs.readdirSync(dir).map((d) => path.join(dir, d)).filter((d) => fs.existsSync(path.join(d, 'client-version.json')));
    return builds.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
  } catch (e) { return null; }
}

// Studio picks the RbxTransport port itself; it is logged at server start.
function studioRbxTransportPort() {
  const dir = process.env.STUDIO_LOGS || '/home/user/studio/prefix/drive_c/users/root/AppData/Local/Roblox/logs';
  try {
    const logs = fs.readdirSync(dir).filter((f) => f.endsWith('.log'))
      .map((f) => path.join(dir, f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    for (const f of logs) {
      const m = /Started RbxTransport network server [\d.]+\|(\d+)/.exec(fs.readFileSync(f, 'latin1'));
      if (m) return +m[1];
    }
  } catch (e) {}
  return 0;
}

function rbxTransport(host) {
  const port = +(process.env.RBX_TRANSPORT_PORT || studioRbxTransportPort());
  if (!port) return {};
  let hash = '';
  try {
    hash = require('child_process').execFileSync('python3',
      [path.join(__dirname, 'studio', 'wt_cert_hash.py'), String(port), host], { timeout: 8000 }).toString().trim();
  } catch (e) {
    console.log(`backend: no RbxTransport server at ${host}:${port}`);
    return {};
  }
  console.log(`backend: RbxTransport ${host}:${port} cert ${hash}`);
  return {
    NetStackPort: port,
    // Studio's local servers accept the token "local_test" (as its own clients send it).
    NetStackTokenValue: Buffer.from('local_test').toString('base64'),
    GameFqdn: host,
    // certHashes are base64 SHA-256 digests (WebClient.js decodes them with atob).
    // The engine form-decodes the value on the way (a '+' arrives as a space),
    // so '+' is sent percent-encoded.
    NetStackConfig: JSON.stringify({ certHashes: [Buffer.from(hash, 'hex').toString('base64').replace(/\+/g, '%2B')] }),
  };
}

function joinScript(placeId) {
  const host = process.env.RCC_HOST || '127.0.0.1', port = +(process.env.RCC_PORT || 53640);
  const gameId = '00000000-0000-0000-0000-000000000001';
  const session = JSON.stringify({ SessionId: crypto.randomUUID(), GameId: gameId, PlaceId: placeId });
  console.log(`backend: join script -> ${host}:${port}`);
  return {
    jobId: gameId, status: 2, statusData: null, joinScriptUrl: null, authenticationUrl: null,
    authenticationTicket: null, message: null, queuePosition: 0,
    joinScript: {
      ClientPort: 0, MachineAddress: host, ServerPort: port,
      ServerConnections: [{ Address: host, Port: port }], UdmuxEndpoints: [], DirectServerReturn: true,
      ...rbxTransport(host),
      TokenGenAlgorithm: 0, PepperId: 0, TokenValue: '', PingUrl: '', PingInterval: 0,
      UserName: USER.name, DisplayName: USER.displayName, SeleniumTestMode: false, UserId: USER.id,
      RobloxLocale: 'en_us', GameLocale: 'en_us', SuperSafeChat: false, FlexibleChatEnabled: false,
      CharacterAppearance: '', ClientTicket: '', GameId: gameId, PlaceId: placeId,
      BaseUrl: 'https://www.roblox.com/', ChatStyle: 'ClassicAndBubble', CreatorId: 1, CreatorTypeEnum: 'User',
      MembershipType: 'None', AccountAge: 365, CookieStoreFirstTimePlayKey: '', CookieStoreFiveMinutePlayKey: '',
      CookieStoreEnabled: false, IsUnknownOrUnder13: false, GameChatType: 'AllUsers', SessionId: session,
      AnalyticsSessionId: '', DataCenterId: 0, UniverseId: 1, FollowUserId: 0, characterAppearanceId: USER.id,
      CountryCode: 'US', RandomSeed1: '', ClientPublicKeyData: '',
    },
  };
}

// ---- OAuth (Roblox Studio login) ------------------------------------------
// Every authorization request is approved for the local user; tokens are
// opaque random strings remembered in memory.
const tokens = new Map();
const codes = new Map();
function apiBase(req) {
  const h = req.headers['x-original-host'] || 'apis.roblox.com';
  return `https://${h.replace(/^[^.]+\./, 'apis.')}`;
}
function securityCookie(req) {
  const domain = (req.headers['x-original-host'] || 'www.roblox.com').replace(/^[^.]+/, '');
  return `.ROBLOSECURITY=_|WARNING:-DO-NOT-SHARE-THIS.--Local-backend-session|_${USER.id}; domain=${domain}; ` +
    'path=/; expires=Fri, 01 Jan 2100 00:00:00 GMT; secure; HttpOnly; SameSite=Lax';
}
function newToken() { return crypto.randomBytes(24).toString('hex'); }
function issueTokens(scope) {
  const access = newToken(), refresh = newToken();
  tokens.set(access, { user: USER, scope });
  tokens.set(refresh, { user: USER, scope, refresh: true });
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const idToken = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: String(USER.id), name: USER.displayName, nickname: USER.displayName,
    preferred_username: USER.name, created_at: 1136073600, profile: `https://www.roblox.com/users/${USER.id}/profile`, iat: now, exp: now + 3600 })}.`;
  return { access_token: access, refresh_token: refresh, token_type: 'Bearer', expires_in: 3600, scope: scope || 'openid profile', id_token: idToken };
}
function formOrJson(body) {
  const t = body.toString();
  try { return JSON.parse(t); } catch {}
  return Object.fromEntries(new URLSearchParams(t));
}

// [host regex, path regex, handler(req, res, url, body)]
const ROUTES = [
  [/^apis\.roblox\.com$/, /^\/oauth\/\.well-known\/openid-configuration/, (req, res) => {
    // Same shape as Roblox's own discovery document, pointed at this host.
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
  }],
  [/^apis\.roblox\.com$/, /^\/oauth\/v1\/authorize/, (req, res, u) => {
    const redirect = u.searchParams.get('redirect_uri');
    const code = newToken();
    codes.set(code, { scope: u.searchParams.get('scope'), challenge: u.searchParams.get('code_challenge') });
    const loc = new URL(redirect);
    loc.searchParams.set('code', code);
    if (u.searchParams.get('state')) loc.searchParams.set('state', u.searchParams.get('state'));
    console.log(`backend: oauth authorize approved for ${USER.name} -> ${loc.protocol}//${loc.host}${loc.pathname}`);
    res.writeHead(302, { Location: loc.href });
    res.end();
  }],
  [/^apis\.roblox\.com$/, /^\/oauth\/v1\/token\/revoke/, (req, res) => json(res, 200, {})],
  [/^apis\.roblox\.com$/, /^\/oauth\/v1\/token\/introspect/, async (req, res, u, body) => {
    const t = tokens.get(formOrJson(body).token);
    json(res, 200, t ? { active: true, sub: String(USER.id), scope: t.scope, client_id: 'studio', exp: Math.floor(Date.now() / 1000) + 3600 } : { active: false });
  }],
  [/^apis\.roblox\.com$/, /^\/oauth\/v1\/token\/resources/, (req, res) => json(res, 200, { resource_infos: [{ owner: { id: String(USER.id), type: 'User' }, resources: {} }] })],
  [/^apis\.roblox\.com$/, /^\/oauth\/v1\/token/, async (req, res, u, body) => {
    const p = formOrJson(body);
    if (p.grant_type === 'authorization_code' && !codes.has(p.code)) return json(res, 400, { error: 'invalid_grant' });
    const c = codes.get(p.code) || {};
    codes.delete(p.code);
    const out = issueTokens(c.scope || p.scope);
    console.log(`backend: oauth ${p.grant_type} -> tokens for ${USER.name}`);
    // Studio waits for a .ROBLOSECURITY cookie after login before it leaves the login screen.
    res.setHeader('Set-Cookie', securityCookie(req));
    json(res, 200, out);
  }],
  [/^apis\.roblox\.com$/, /^\/oauth\/v1\/userinfo/, (req, res) => json(res, 200, {
    sub: String(USER.id), name: USER.displayName, nickname: USER.displayName, preferred_username: USER.name,
    created_at: 1136073600, profile: `https://www.roblox.com/users/${USER.id}/profile`,
    picture: `https://tr.rbxcdn.com/30DAY-AvatarHeadshot-${USER.id}/150/150/AvatarHeadshot/Png/noFilter`,
    email: 'player1@localhost', email_verified: true, verified: true, age_checked: true, age_bracket: 'Age13OrOver',
    premium: false, roles: [], internal_user: false, attributes: {},
  })],
  [/^apis\.roblox\.com$/, /^\/oauth\/v1\/certs/, (req, res) => json(res, 200, { keys: [] })],

  // Fast flags: engine defaults plus webclient/LocalFlags.json.
  // Other apps (e.g. Studio's PCStudioApp) get their own production set from webclient/flags/<app>.json,
  // plus local overrides from <app>.local.json.
  [/^clientsettings(cdn)?\.roblox\.com$/, /^\/v\d\/settings\/application\//, (req, res, u) => {
    const app = path.basename(u.pathname);
    const read = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
    const own = read(path.join(ROOT, 'webclient', 'flags', `${app}.json`));
    const applicationSettings = own
      ? { ...own.applicationSettings, ...read(path.join(ROOT, 'webclient', 'flags', `${app}.local.json`)) }
      : read(FLAGS) || {};
    json(res, 200, { applicationSettings });
  }],
  // Roblox's own web client build, downloaded by tools/fetch_webclient.sh.
  [/^clientsettings(cdn)?\.roblox\.com$/, /^\/v2\/client-version\/WebClientApp/, (req, res) => {
    const live = liveWebClient();
    if (!live) return notFound(res, 'web client build (run tools/fetch_webclient.sh)');
    json(res, 200, JSON.parse(fs.readFileSync(path.join(live, 'client-version.json'), 'utf8')));
  }],
  [/^clientsettings(cdn)?\.roblox\.com$/, /./, (req, res) => json(res, 200, {})],
  [/^setup\.rbxcdn\.com$/, /^\/webclient\/(version-[0-9a-f]+)-RobloxWebClient\//, (req, res, u) => {
    const [, upload] = /^\/webclient\/(version-[0-9a-f]+)-RobloxWebClient\//.exec(u.pathname);
    const rel = decodeURIComponent(u.pathname.slice(`/webclient/${upload}-RobloxWebClient/`.length));
    const file = path.join(ROOT, 'webclient', 'live', upload, rel);
    if (rel.includes('..') || !fs.existsSync(file) || !fs.statSync(file).isFile()) return notFound(res, `web client file ${upload}/${rel}`);
    const types = { '.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json' };
    const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cross-Origin-Resource-Policy': 'cross-origin', 'Access-Control-Allow-Origin': '*' };
    if (rel === 'WebClient.js') {
      // The engine's workers run WebClient.js directly; the shim goes first so
      // their requests reach this backend (see webclient/site-shim.js).
      const body = Buffer.concat([fs.readFileSync(path.join(ROOT, 'webclient', 'site-shim.js')), Buffer.from('\n'), fs.readFileSync(file)]);
      res.writeHead(200, { ...headers, 'Content-Length': body.length });
      return res.end(body);
    }
    res.writeHead(200, { ...headers, 'Content-Length': fs.statSync(file).size });
    fs.createReadStream(file).pipe(res);
  }],
  // Crash and error reports stay local.
  [/(^|\.)rbxinfra\.com$/, /./, (req, res) => json(res, 200, {})],

  [/^locale\.roblox\.com$/, /supported-locales|user-locus|locales/, (req, res) => {
    const l = { id: 1, locale: 'en_us', name: 'English', nativeName: 'English', language: { id: 41, name: 'English', nativeName: 'English', languageCode: 'en' } };
    json(res, 200, { signupAndLogin: l, generalExperience: l, ugc: l, data: [l] });
  }],

  [/^users\.roblox\.com$/, /^\/v1\/users\/authenticated\/app-launch-info/, (req, res) => json(res, 200, { ...USER, ageBracket: 0, countryCode: 'US', isPremium: false })],
  [/^users\.roblox\.com$/, /^\/v1\/users\/authenticated/, (req, res) => json(res, 200, USER)],
  [/^users\.roblox\.com$/, /^\/v1\/users\/\d+$/, (req, res) => json(res, 200, { ...USER, description: '', created: '2006-01-01T00:00:00Z', isBanned: false, hasVerifiedBadge: false })],
  [/^users\.roblox\.com$/, /^\/v1\/users$/, (req, res) => json(res, 200, { data: [USER] })],

  [/^avatar\.roblox\.com$/, /avatar-fetch|\/avatar$/, (req, res) => json(res, 200, AVATAR)],
  [/^avatar\.roblox\.com$/, /./, (req, res) => json(res, 200, { data: [] })],

  [/^thumbnails\.roblox\.com$/, /./, (req, res) => json(res, 200, { data: [] })],

  // Asset delivery from the local store.
  [/^assetdelivery\.roblox\.com$/, /^\/v1\/assets\/batch/, async (req, res, u, body) => {
    let items = [];
    try { items = JSON.parse(body.toString() || '[]'); } catch {}
    await Promise.all(items.map((it) => (it.assetId ?? it.AssetId) && fetchAsset(it.assetId ?? it.AssetId)));
    json(res, 200, items.map((it) => {
      const id = it.assetId ?? it.AssetId;
      const hash = it.hash ?? it.Hash;
      const base = { requestId: it.requestId ?? it.RequestId, isArchived: false, isRecordable: true };
      if (id && assetFile(id))
        return { ...base, location: `https://assetdelivery.roblox.com/v1/asset/?id=${id}`, assetTypeId: assetMeta(id).assetTypeId ?? 0 };
      if (hash && hashFile(hash))
        return { ...base, location: `https://assetdelivery.roblox.com/v1/asset/?hash=${hash}`, assetTypeId: 0 };
      unhandledAsset(id ?? hash);
      return { ...base, errors: [{ code: 404, message: 'Asset not in local store' }] };
    }));
  }],
  [/^assetdelivery\.roblox\.com$/, /^\/v\d\/asset(Id\/\d+)?/, async (req, res, u) => {
    const id = u.searchParams.get('id') || (/assetId\/(\d+)/.exec(u.pathname) || [])[1];
    if (id) await fetchAsset(id);
    const hash = u.searchParams.get('hash');
    const f = (id && assetFile(id)) || (hash && hashFile(hash));
    if (f) return sendFile(res, f);
    unhandledAsset(id ?? hash);
    notFound(res, `asset ${id ?? hash}`);
  }],

  [/^gamejoin\.roblox\.com$/, /^\/v1\/join-game/, async (req, res, u, body) => {
    let placeId = +(process.env.PLACE_ID || 1818);
    try { placeId = JSON.parse(body.toString()).placeId || placeId; } catch {}
    json(res, 200, joinScript(placeId));
  }],

  // Display names for player lists, chat, etc.
  [/^apis\.roblox\.com$/, /^\/user-profile-api\/v1\/user\/profiles\/get-profiles/, async (req, res, u, body) => {
    let ids = [USER.id];
    try { ids = JSON.parse(body.toString()).userIds || ids; } catch {}
    json(res, 200, {
      profileDetails: ids.map((id) => {
        const name = +id === USER.id ? USER.name : `Player${id}`;
        return {
          userId: +id,
          names: { combinedName: name, displayName: name, username: name, alias: '', contactName: '', platformName: '' },
          isVerified: false,
        };
      }),
    });
  }],

  // Account standing: not moderated, machine OK.
  [/^usermoderation\.roblox\.com$/, /^\/v1\/not-approved/, (req, res) => json(res, 200, {})],
  [/^apis\.roblox\.com$/, /^\/validate-machine/, (req, res) => json(res, 200, { success: true, isValid: true, messages: [] })],

  // App policy: allow the defaults.
  [/^apis\.roblox\.com$/, /guac|universal-app-configuration|app-policy/, (req, res) => json(res, 200, {})],
  [/^apis\.roblox\.com$/, /maintenance-status/, (req, res) => json(res, 200, { isAlertVisible: false })],

  // Telemetry and heartbeats are acknowledged and dropped.
  [/^(ephemeralcounters\.api|ecsv2|client-telemetry|metrics|lms|tracing)\.roblox\.com$/, /./, (req, res) => json(res, 200, {})],
  [/./, /experience-signals-ingest|\/pbe$|otel|analytics|telemetry|heartbeat|user-heartbeats/, (req, res) => json(res, 200, {})],
];

// Missing asset ids are appended to webclient/assets/missing.txt so they can be
// fetched once with `node tools/fetch_assets.js --missing`.
function unhandledAsset(key) {
  if (key && !unhandled.has('asset:' + key)) {
    unhandled.add('asset:' + key);
    console.log(`backend: asset ${key} not in local store`);
    if (/^\d+$/.test(String(key))) {
      fs.mkdirSync(ASSETS, { recursive: true });
      fs.appendFileSync(path.join(ASSETS, 'missing.txt'), key + '\n');
    }
  }
}

async function handle(req, res, target) {
  let u;
  try { u = new URL(target); } catch { return notFound(res, 'bad url'); }
  const body = req.method === 'GET' ? Buffer.alloc(0) : await readBody(req);
  for (const [host, p, fn] of ROUTES) {
    if (host.test(u.hostname) && p.test(u.pathname)) {
      if (process.env.VERBOSE) console.log('backend', req.method, u.hostname + u.pathname);
      return fn(req, res, u, body);
    }
  }
  const key = `${req.method} ${u.hostname}${u.pathname.replace(/\d+/g, ':n')}`;
  if (!unhandled.has(key)) { unhandled.add(key); console.log(`backend: unhandled ${key}`); }
  notFound(res, u.hostname + u.pathname);
}

module.exports = { handle };
