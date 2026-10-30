// avatar.roblox.com and thumbnails.roblox.com.
//
// Avatars are stored per user (avatars table) and editable through the same
// write endpoints Roblox's avatar editor uses. Thumbnails of avatars, places and
// non-image assets are rendered by Studio (the render worker claims jobs from
// /api/local/render/claim), as RCC renders them for Roblox; until then the APIs
// answer state "Pending", which clients already poll. Experience icons and
// thumbnails can also be image assets set on the universe (tools/admin.js).
const fs = require('fs');
const M = require('../model.js');
const S = require('../assets.js');
const { json, error, unauthorized, badRequest, parseJson, idList } = require('../http.js');

// ---- avatar --------------------------------------------------------------------
const COLOR_KEYS = ['head', 'torso', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg'];
function colorIds(c) { return Object.fromEntries(COLOR_KEYS.map((k) => [`${k}ColorId`, c[k]])); }
function color3s(c) { return Object.fromEntries(COLOR_KEYS.map((k) => [`${k}Color3`, M.BRICK[c[k]] || 'A3A2A5'])); }
function assetsJson(list) {
  return list.map((a) => { const x = S.getAsset(a.id); return { id: a.id, name: x ? x.name : '', assetType: { id: a.assetTypeId, name: '' }, currentVersionId: a.id }; });
}
function avatarFetch(userId) {
  const a = M.avatarOf(userId);
  return {
    resolvedAvatarType: a.avatarType, accessoryVersionIds: [], equippedGearVersionIds: [], backpackGearVersionIds: [],
    assetAndAssetTypeIds: a.assets.map((x) => ({ assetId: x.id, assetTypeId: x.assetTypeId })), animationAssetIds: {},
    bodyColors: colorIds(a.colors), bodyColor3s: color3s(a.colors), scales: a.scales, emotes: a.emotes,
  };
}
function avatarV1(userId) {
  const a = M.avatarOf(userId);
  return { scales: a.scales, playerAvatarType: a.avatarType, bodyColors: colorIds(a.colors), assets: assetsJson(a.assets),
    defaultShirtApplied: false, defaultPantsApplied: false, emotes: a.emotes };
}
function avatarV2(userId) {
  const a = M.avatarOf(userId);
  return { scales: a.scales, playerAvatarType: a.avatarType, bodyColor3s: color3s(a.colors), assets: assetsJson(a.assets),
    defaultShirtApplied: false, defaultPantsApplied: false, emotes: a.emotes };
}
// Enum.AssetType names for the types users wear or own.
const ASSET_TYPE_NAMES = { 2: 'TShirt', 8: 'Hat', 11: 'Shirt', 12: 'Pants', 17: 'Head', 18: 'Face', 19: 'Gear', 27: 'Torso',
  28: 'RightArm', 29: 'LeftArm', 30: 'LeftLeg', 31: 'RightLeg', 41: 'HairAccessory', 42: 'FaceAccessory', 43: 'NeckAccessory',
  44: 'ShoulderAccessory', 45: 'FrontAccessory', 46: 'BackAccessory', 47: 'WaistAccessory', 48: 'ClimbAnimation',
  50: 'FallAnimation', 51: 'IdleAnimation', 52: 'JumpAnimation', 53: 'RunAnimation', 54: 'SwimAnimation', 55: 'WalkAnimation',
  56: 'PoseAnimation', 61: 'EmoteAnimation', 64: 'TShirtAccessory', 65: 'ShirtAccessory', 66: 'PantsAccessory',
  67: 'JacketAccessory', 68: 'SweaterAccessory', 69: 'ShortsAccessory', 70: 'LeftShoeAccessory', 71: 'RightShoeAccessory',
  72: 'DressSkirtAccessory', 76: 'EyebrowAccessory', 77: 'EyelashAccessory', 78: 'MoodAnimation', 79: 'DynamicHead' };
const userIdOf = (u) => +(u.searchParams.get('userId') || (/users\/(\d+)/.exec(u.pathname) || [])[1]);
const authed = (fn) => (req, res, u, body, ctx) => (ctx.user ? fn(req, res, u, body, ctx) : unauthorized(res));

// ---- thumbnails ------------------------------------------------------------------
// Rendered images come from the Studio render worker (tools/studio/render_worker.js)
// through the job queue below; nothing is drawn here.
const crypto = require('crypto');
const { open, now } = require('../db.js');
const RETRY_MS = 300e3;

function sizeOf(u, def = '150x150') {
  const m = /^(\d+)x(\d+)$/.exec(u.searchParams.get('size') || def);
  return m ? [Math.min(+m[1], 1024), Math.min(+m[2], 1024)] : [150, 150];
}
// Browsers load imageUrl directly (an <img>), so it goes through this page's /proxy/.
function imageUrl(req, path) {
  if (req.headers['x-original-host']) return `https://${req.headers['x-original-host'].replace(/^[^.]+\./, 'thumbnails.')}${path}`;
  return `${req.headers.host ? `http://${req.headers.host}/proxy/` : ''}https://thumbnails.roblox.com${path}`;
}
const none = (targetId, state = 'Error') => ({ targetId, state, imageUrl: null, version: null });

// Looks up (or queues) the render of <kind> for a target with the given input.
function rendered(req, kind, targetId, [w, h], input) {
  const inputJson = JSON.stringify(input);
  const hash = crypto.createHash('sha256').update(inputJson).digest('hex').slice(0, 16);
  const key = `${kind}:${targetId}:${w}x${h}:${hash}`;
  const db = open();
  let t = db.prepare('SELECT * FROM thumbnails WHERE key = ?').get(key);
  if (!t) {
    db.prepare(`INSERT INTO thumbnails (key, kind, target_id, width, height, input_hash, input, requested_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(key, kind, targetId, w, h, hash, inputJson, now());
    return { targetId, state: 'Pending', imageUrl: null, version: hash };
  }
  if (t.state === 'Completed') return { targetId, state: 'Completed', imageUrl: imageUrl(req, `/local/thumbnail/${t.sha256}.png`), version: hash };
  if (t.state === 'Error') return { targetId, state: 'Error', imageUrl: null, version: hash };
  return { targetId, state: 'Pending', imageUrl: null, version: hash };
}
function avatarThumb(req, userId, kind, size) {
  if (!M.user(userId)) return none(userId);
  return rendered(req, kind, userId, size, { userId, avatar: avatarFetch(userId) });
}
function placeThumb(req, targetId, placeId, size) {
  const p = M.place(placeId);
  if (!p || !p.file_path) return none(targetId);
  return { ...rendered(req, 'place', placeId, size, { placeId, file: p.file_path, version: p.version }), targetId };
}
// An experience's icon/thumbnail: the image asset set on the universe, else a render of its root place.
function experienceThumb(req, universeId, which, size) {
  const g = M.universe(universeId);
  if (!g) return none(universeId);
  const assetId = which === 'icon' ? g.icon_asset_id : g.thumbnail_asset_id;
  if (assetId) return { targetId: universeId, state: 'Completed', imageUrl: imageUrl(req, `/local/asset/${assetId}.png`), version: `asset-${assetId}` };
  return placeThumb(req, universeId, g.root_place_id, size);
}
function assetThumb(req, id, size) {
  const a = S.getAsset(id);
  if (!a) return none(id);
  const r = S.resolveId(id);
  if (r && /^image\//.test(r.contentType)) return { targetId: id, state: 'Completed', imageUrl: imageUrl(req, `/local/asset/${id}.png`), version: `asset-${id}` };
  return rendered(req, 'asset', id, size, { assetId: id, assetTypeId: a.asset_type_id, sha256: r && r.sha256 });
}

async function serveLocalImage(req, res, u) {
  let m;
  if ((m = /^\/local\/thumbnail\/([0-9a-f]{64})\.png$/.exec(u.pathname))) {
    const file = require('path').join(S.CONTENT, m[1]);
    if (!fs.existsSync(file)) return error(res, 404, 'Image not found', 0);
    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400', 'Cross-Origin-Resource-Policy': 'cross-origin' });
    return fs.createReadStream(file).pipe(res);
  }
  if ((m = /^\/local\/asset\/(\d+)\.png$/.exec(u.pathname))) {
    const r = await S.ensure(+m[1]);
    if (!r) return error(res, 404, 'Image not found', 0);
    res.writeHead(200, { 'Content-Type': r.contentType, 'Cache-Control': 'public, max-age=3600', 'Cross-Origin-Resource-Policy': 'cross-origin' });
    return fs.createReadStream(r.file).pipe(res);
  }
  error(res, 404, 'Image not found', 0);
}

// ---- render worker API ----------------------------------------------------------------
function claimJob(req, res) {
  const db = open();
  db.prepare(`UPDATE thumbnails SET state = 'Pending' WHERE state = 'Rendering' AND claimed_at < ?`).run(new Date(Date.now() - RETRY_MS).toISOString());
  const kinds = (new URL(req.url, 'http://x').searchParams.get('kinds') || '').split(',').filter(Boolean);
  const t = db.prepare(`SELECT * FROM thumbnails WHERE state = 'Pending' ${kinds.length ? `AND kind IN (${kinds.map(() => '?').join(',')})` : ''} ORDER BY requested_at LIMIT 1`).get(...kinds);
  if (!t) return json(res, 200, { job: null });
  db.prepare(`UPDATE thumbnails SET state = 'Rendering', claimed_at = ?, attempts = attempts + 1 WHERE key = ?`).run(now(), t.key);
  json(res, 200, { job: { key: t.key, kind: t.kind, targetId: t.target_id, width: t.width, height: t.height, input: JSON.parse(t.input), attempt: t.attempts + 1 } });
}
function jobResult(req, res, u, body) {
  const key = decodeURIComponent(u.pathname.split('/')[5] || '');
  const db = open();
  const t = db.prepare('SELECT * FROM thumbnails WHERE key = ?').get(key);
  if (!t) return error(res, 404, 'No such render job', 0);
  const err = u.searchParams.get('error');
  if (err) {
    db.prepare(`UPDATE thumbnails SET state = ?, error = ?, completed_at = ? WHERE key = ?`).run(t.attempts >= 3 ? 'Error' : 'Pending', err, now(), key);
    console.log(`render: ${key} failed (attempt ${t.attempts}): ${err}`);
    return json(res, 200, {});
  }
  if (S.sniff(body) !== 'image/png') return badRequest(res, 'Result must be a PNG image');
  const { sha256 } = S.storeContent(body);
  db.prepare(`UPDATE thumbnails SET state = 'Completed', sha256 = ?, error = NULL, completed_at = ? WHERE key = ?`).run(sha256, now(), key);
  console.log(`render: ${key} completed (${body.length} bytes)`);
  json(res, 200, {});
}

// POST thumbnails.roblox.com/v1/batch
function batch(req, res, u, body) {
  const items = parseJson(body, []);
  json(res, 200, { data: (Array.isArray(items) ? items : []).map((it) => {
    const size = sizeOf(new URL(`https://x/?size=${it.size || '150x150'}`));
    const id = +it.targetId;
    const base = { requestId: it.requestId, errorCode: 0, errorMessage: '' };
    switch (it.type) {
      case 'AvatarHeadShot': return { ...base, ...avatarThumb(req, id, 'avatar-headshot', size) };
      case 'AvatarBust': return { ...base, ...avatarThumb(req, id, 'avatar-bust', size) };
      case 'Avatar': return { ...base, ...avatarThumb(req, id, 'avatar', size) };
      case 'GameIcon': return { ...base, ...experienceThumb(req, id, 'icon', size) };
      case 'GameThumbnail': return { ...base, ...experienceThumb(req, id, 'thumbnail', size) };
      case 'PlaceIcon': { const p = M.place(id); return { ...base, ...(p ? { ...experienceThumb(req, p.universe_id, 'icon', size), targetId: id } : none(id)) }; }
      case 'Asset': return { ...base, ...assetThumb(req, id, size) };
      default: return { ...base, errorCode: 1, errorMessage: `Thumbnail type ${it.type} is not supported`, ...none(id) };
    }
  }) });
}

const ADMIN_KEY = process.env.ADMIN_KEY || '';
const worker = (fn) => (req, res, ...rest) =>
  ((ADMIN_KEY ? req.headers['x-admin-key'] === ADMIN_KEY : /^(127\.|::1|::ffff:127\.)/.test(req.socket.remoteAddress || ''))
    ? fn(req, res, ...rest) : error(res, 403, 'Render worker calls need X-Admin-Key (or a loopback caller when ADMIN_KEY is unset).', 0));

const ROUTES = [
  // Player.CharacterAppearance URL (RCC render scripts, LoadCharacter): same document.
  ['GET', /^(avatar|api|www)\.roblox\.com$/, /^\/(v1\.1\/avatar-fetch|v2\/avatar\/avatar-fetch)\/?$/, (req, res, u) => (M.user(userIdOf(u)) ? json(res, 200, avatarFetch(userIdOf(u))) : error(res, 400, 'The user id is invalid.', 1))],
  ['GET', /^avatar\.roblox\.com$/, /^\/v1\/avatar-fetch$/, (req, res, u) => (M.user(userIdOf(u)) ? json(res, 200, avatarFetch(userIdOf(u))) : error(res, 400, 'The user id is invalid.', 1))],
  ['GET', /^avatar\.roblox\.com$/, /^\/v1\/users\/\d+\/avatar$/, (req, res, u) => (M.user(userIdOf(u)) ? json(res, 200, avatarV1(userIdOf(u))) : error(res, 400, 'The user id is invalid.', 1))],
  ['GET', /^avatar\.roblox\.com$/, /^\/v2\/avatar\/users\/\d+\/avatar$/, (req, res, u) => (M.user(userIdOf(u)) ? json(res, 200, avatarV2(userIdOf(u))) : error(res, 400, 'The user id is invalid.', 1))],
  ['GET', /^avatar\.roblox\.com$/, /^\/v1\/users\/\d+\/currently-wearing$/, (req, res, u) => json(res, 200, { assetIds: M.avatarOf(userIdOf(u)).assets.map((a) => a.id) })],
  // A user's items of one asset type. There is no ownership ledger here: a user
  // has what they wear, the emotes they have equipped and the assets they created.
  ['GET', /^inventory\.roblox\.com$/, /^\/v2\/users\/\d+\/inventory\/\d+$/, (req, res, u) => {
    const userId = userIdOf(u), type = +/inventory\/(\d+)/.exec(u.pathname)[1];
    if (!M.user(userId)) return error(res, 400, 'The user id is invalid.', 1);
    const a = M.avatarOf(userId);
    const ids = new Set([...a.assets.filter((x) => x.assetTypeId === type).map((x) => x.id),
      ...a.emotes.map((e) => +e.assetId).filter((id) => S.getAsset(id)?.asset_type_id === type),
      ...open().prepare("SELECT id FROM assets WHERE creator_type = 'User' AND creator_id = ? AND asset_type_id = ?").all(userId, type).map((r) => r.id)]);
    const data = [...ids].map((id) => { const x = S.getAsset(id); return { assetId: id, name: x ? x.name : '', assetType: ASSET_TYPE_NAMES[type] || String(type), created: x ? x.created_at : null }; });
    json(res, 200, { previousPageCursor: null, nextPageCursor: null, data });
  }],
  ['GET', /^avatar\.roblox\.com$/, /^\/v1\/avatar$/, authed((req, res, u, b, { user }) => json(res, 200, avatarV1(user.id)))],
  ['GET', /^avatar\.roblox\.com$/, /^\/v2\/avatar\/avatar$/, authed((req, res, u, b, { user }) => json(res, 200, avatarV2(user.id)))],
  ['GET', /^avatar\.roblox\.com$/, /^\/v1\/avatar-rules$/, (req, res) => json(res, 200, {
    playerAvatarTypes: ['R6', 'R15'],
    scales: { height: { min: 0.9, max: 1.05, increment: 0.01 }, width: { min: 0.7, max: 1, increment: 0.01 }, head: { min: 0.95, max: 1, increment: 0.01 },
      proportion: { min: 0, max: 1, increment: 0.01 }, bodyType: { min: 0, max: 1, increment: 0.01 } },
    wearableAssetTypes: [], bodyColorsPalette: Object.entries(M.BRICK).map(([id, hexColor]) => ({ brickColorId: +id, hexColor: `#${hexColor}`, name: '' })),
    basicBodyColorsPalette: [], minimumDeltaEBodyColorDifference: 11.4, proportionsAndBodyTypeEnabledForUser: true,
    defaultClothingAssetLists: { defaultShirtAssetIds: [], defaultPantAssetIds: [] }, bundlesEnabledForUser: false, emotesEnabledForUser: true,
  })],
  ['POST', /^avatar\.roblox\.com$/, /^\/v1\/avatar\/set-body-colors$/, authed((req, res, u, body, { user }) => {
    const p = parseJson(body), colors = { ...M.avatarOf(user.id).colors };
    for (const k of COLOR_KEYS) if (p[`${k}ColorId`] !== undefined) {
      if (!M.BRICK[+p[`${k}ColorId`]]) return badRequest(res, `Unknown BrickColor ${p[`${k}ColorId`]}`);
      colors[k] = +p[`${k}ColorId`];
    }
    M.saveAvatar(user.id, { colors });
    json(res, 200, { success: true });
  })],
  ['POST', /^avatar\.roblox\.com$/, /^\/v1\/avatar\/set-player-avatar-type$/, authed((req, res, u, body, { user }) => {
    const t = parseJson(body).playerAvatarType;
    if (t !== 'R6' && t !== 'R15') return badRequest(res, 'playerAvatarType must be R6 or R15');
    M.saveAvatar(user.id, { avatarType: t });
    json(res, 200, { success: true });
  })],
  ['POST', /^avatar\.roblox\.com$/, /^\/v1\/avatar\/set-scales$/, authed((req, res, u, body, { user }) => {
    const p = parseJson(body), scales = { ...M.avatarOf(user.id).scales };
    for (const k of ['height', 'width', 'head', 'depth', 'proportion', 'bodyType']) if (typeof p[k] === 'number') scales[k] = p[k];
    M.saveAvatar(user.id, { scales });
    json(res, 200, { success: true });
  })],
  // Wearing: only assets that exist in this platform's store.
  // Assets not in the store yet are fetched through the configured fallback (logged
  // in data/logs/asset-fallback.log) and accepted only if they are a wearable type.
  ['POST', /^avatar\.roblox\.com$/, /^\/v[12]\/avatar\/set-wearing-assets$/, authed(async (req, res, u, body, { user }) => {
    const p = parseJson(body);
    const list = (p.assetIds || (p.assets || []).map((a) => a.id) || []).map(Number);
    const { ok, invalid } = await M.wearable(list);
    M.saveAvatar(user.id, { assets: ok });
    json(res, 200, { invalidAssets: [], invalidAssetIds: invalid, success: invalid.length === 0 });
  })],

  ['POST', /^thumbnails\.roblox\.com$/, /^\/v1\/batch$/, batch],
  ['GET', /^thumbnails\.roblox\.com$/, /^\/v1\/games\/icons$/, (req, res, u) =>
    json(res, 200, { data: idList(u, 'universeIds').map((id) => experienceThumb(req, id, 'icon', sizeOf(u, '256x256'))) })],
  ['GET', /^thumbnails\.roblox\.com$/, /^\/v1\/places\/gameicons$/, (req, res, u) =>
    json(res, 200, { data: idList(u, 'placeIds').map((id) => { const p = M.place(id); return p ? { ...experienceThumb(req, p.universe_id, 'icon', sizeOf(u, '256x256')), targetId: id } : none(id); }) })],
  ['GET', /^thumbnails\.roblox\.com$/, /^\/v1\/games\/multiget\/thumbnails$/, (req, res, u) =>
    json(res, 200, { data: idList(u, 'universeIds').map((id) => ({ universeId: id, error: M.universe(id) ? null : { code: 1, message: 'Invalid universe' },
      thumbnails: M.universe(id) ? [experienceThumb(req, id, 'thumbnail', sizeOf(u, '768x432'))] : [] })) })],
  ['GET', /^thumbnails\.roblox\.com$/, /^\/v1\/users\/(avatar-headshot|avatar-bust|avatar)$/, (req, res, u) => {
    const kind = /avatar-headshot/.test(u.pathname) ? 'avatar-headshot' : /avatar-bust/.test(u.pathname) ? 'avatar-bust' : 'avatar';
    json(res, 200, { data: idList(u, 'userIds').map((id) => avatarThumb(req, id, kind, sizeOf(u))) });
  }],
  ['GET', /^thumbnails\.roblox\.com$/, /^\/v1\/assets$/, (req, res, u) => json(res, 200, { data: idList(u, 'assetIds').map((id) => assetThumb(req, id, sizeOf(u))) })],
  ['POST', /^local$/, /^\/api\/local\/render\/claim$/, worker(claimJob)],
  ['POST', /^local$/, /^\/api\/local\/render\/jobs\/[^/]+\/result$/, worker(jobResult)],
  ['GET', /^local$/, /^\/api\/local\/render\/jobs$/, (req, res) => json(res, 200, open().prepare('SELECT key, kind, target_id, width, height, state, error, attempts, requested_at, completed_at FROM thumbnails ORDER BY requested_at DESC LIMIT 200').all())],
  ['GET', /^thumbnails\.roblox\.com$/, /^\/local\//, serveLocalImage],
  // Image URLs in the old tr.rbxcdn.com form (Studio's OAuth "picture" claim).
  // Studio's OAuth "picture" claim (tr.rbxcdn.com/30DAY-AvatarHeadshot-<id>/150/150/...): the rendered headshot.
  ['GET', /^tr\.rbxcdn\.com$/, /AvatarHeadshot-(\d+)/, (req, res, u) => {
    const t = avatarThumb(req, +/AvatarHeadshot-(\d+)/.exec(u.pathname)[1], 'avatar-headshot', [150, 150]);
    if (t.state !== 'Completed') return error(res, 404, `Headshot ${t.state}`, 0);
    serveLocalImage(req, res, new URL(`https://x/local/thumbnail/${/thumbnail\/([0-9a-f]{64})/.exec(t.imageUrl)[1]}.png`));
  }],
];

module.exports = { ROUTES };
