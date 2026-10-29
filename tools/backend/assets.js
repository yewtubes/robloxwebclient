// Asset store: content-addressed blobs under <data>/content/, asset rows and
// versions in the database. Lookup order for an asset id:
//   1. the platform's own assets (imported or uploaded: tools/admin.js asset import)
//   2. legacy files in webclient/assets/<id> (imported into the store on first use)
//   3. the external fallback, if configured (ASSET_FALLBACK), cached with the
//      original bytes and marked source='fallback:<mode>'
// Every miss and every fallback use is recorded in asset_misses and in
// <data>/logs/asset-fallback.log, so it is clear which assets depend on it.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { execFile } = require('child_process');
const { open, now, DATA, ROOT } = require('./db.js');

const CONTENT = path.join(DATA, 'content');
const LEGACY = path.join(ROOT, 'webclient', 'assets');
const LOGS = path.join(DATA, 'logs');

// ASSET_FALLBACK: none | public | opencloud | mirror (default public; ASSET_FETCH=0 = none, as before)
//  public:    Roblox's anonymous asset delivery (works only for assets Roblox serves without sign-in)
//  opencloud: Roblox Open Cloud asset delivery with ROBLOX_OPEN_CLOUD_API_KEY (an API key you
//             created for your own Roblox account/group; it only reaches what that key may read)
//  mirror:    an asset delivery mirror you operate or are permitted to use, ASSET_MIRROR_URL with
//             {id} (e.g. https://assets.example.org/v1/asset/?id={id}); it may answer with the asset
//             bytes (following redirects) or with a v2-style {locations:[{location}]} document.
//             The operator is responsible for the mirror being authorized to serve those assets.
function fallbackMode() {
  if (process.env.ASSET_FETCH === '0') return 'none';
  const m = process.env.ASSET_FALLBACK || 'public';
  return ['none', 'public', 'opencloud', 'mirror'].includes(m) ? m : 'none';
}

function sniff(buf) {
  const s = buf.subarray(0, 16).toString('latin1');
  if (s.startsWith('\x89PNG')) return 'image/png';
  if (s.startsWith('\xff\xd8\xff')) return 'image/jpeg';
  if (s.startsWith('GIF8')) return 'image/gif';
  if (s.startsWith('RIFF') && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  if (s.startsWith('\xabKTX 20')) return 'image/ktx2';
  if (s.startsWith('DDS ')) return 'image/vnd-ms.dds';
  if (s.startsWith('OggS')) return 'audio/ogg';
  if (s.startsWith('ID3') || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return 'audio/mpeg';
  if (s.startsWith('<roblox!')) return 'application/x-roblox-binary';
  if (s.startsWith('<roblox')) return 'application/x-roblox-xml';
  if (s.startsWith('version ')) return 'application/x-roblox-mesh';
  return 'application/octet-stream';
}

function storeContent(buf) {
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  const md5 = crypto.createHash('md5').update(buf).digest('hex');
  const file = path.join(CONTENT, sha256);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(CONTENT, { recursive: true });
    fs.writeFileSync(file + '.tmp', buf);
    fs.renameSync(file + '.tmp', file);
  }
  open().prepare('INSERT OR IGNORE INTO content (sha256, md5, size, created_at) VALUES (?, ?, ?, ?)').run(sha256, md5, buf.length, now());
  return { sha256, md5 };
}

// Adds a new version of an asset (creating the asset row if needed).
function putAsset(id, buf, { assetTypeId = 0, name = '', description = '', creatorType = 'User', creatorId = 1, source = 'local', contentType } = {}) {
  const db = open();
  const { sha256 } = storeContent(buf);
  const t = now();
  const existing = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
  if (!existing) {
    db.prepare(`INSERT INTO assets (id, asset_type_id, name, description, creator_type, creator_id, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, assetTypeId, name, description, creatorType, creatorId, source, t, t);
  } else {
    db.prepare('UPDATE assets SET updated_at = ?, asset_type_id = COALESCE(NULLIF(?, 0), asset_type_id), name = COALESCE(NULLIF(?, \'\'), name) WHERE id = ?')
      .run(t, assetTypeId, name, id);
  }
  const last = db.prepare('SELECT version, sha256 FROM asset_versions WHERE asset_id = ? ORDER BY version DESC LIMIT 1').get(id);
  if (last && last.sha256 === sha256) return last.version;
  const version = (last ? last.version : 0) + 1;
  db.prepare('INSERT INTO asset_versions (asset_id, version, sha256, content_type, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, version, sha256, contentType || sniff(buf), t);
  return version;
}

function getAsset(id) {
  return open().prepare('SELECT * FROM assets WHERE id = ?').get(id) || null;
}

// {file, sha256, contentType, version, asset} for an asset id (and optional version), or null.
function resolveId(id, version) {
  const db = open();
  let v = version
    ? db.prepare('SELECT * FROM asset_versions WHERE asset_id = ? AND version = ?').get(id, version)
    : db.prepare('SELECT * FROM asset_versions WHERE asset_id = ? ORDER BY version DESC LIMIT 1').get(id);
  if (!v && !version) {
    const legacy = path.join(LEGACY, String(id));
    if (/^\d+$/.test(String(id)) && fs.existsSync(legacy)) {
      let meta = {};
      try { meta = JSON.parse(fs.readFileSync(legacy + '.json', 'utf8')); } catch {}
      putAsset(id, fs.readFileSync(legacy), { assetTypeId: meta.assetTypeId || 0, source: 'import' });
      v = db.prepare('SELECT * FROM asset_versions WHERE asset_id = ? ORDER BY version DESC LIMIT 1').get(id);
    }
  }
  if (!v) return null;
  return { file: path.join(CONTENT, v.sha256), sha256: v.sha256, contentType: v.content_type, version: v.version, asset: getAsset(id) };
}

// Content by its MD5 hash (the ?hash= form of asset delivery URLs).
function resolveHash(hash) {
  hash = String(hash).toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hash)) return null;
  const db = open();
  let c = db.prepare('SELECT * FROM content WHERE md5 = ?').get(hash);
  if (!c) {
    const legacy = path.join(LEGACY, 'hash', hash);
    if (fs.existsSync(legacy)) { storeContent(fs.readFileSync(legacy)); c = db.prepare('SELECT * FROM content WHERE md5 = ?').get(hash); }
  }
  if (!c) return null;
  const file = path.join(CONTENT, c.sha256);
  return { file, sha256: c.sha256, contentType: sniff(fs.readFileSync(file).subarray(0, 16)), version: 0, asset: null };
}

function logMiss(key, outcome, detail = '') {
  const t = now();
  open().prepare(`INSERT INTO asset_misses (asset_key, first_at, last_at, count, outcome, detail) VALUES (?, ?, ?, 1, ?, ?)
    ON CONFLICT(asset_key) DO UPDATE SET last_at = excluded.last_at, count = count + 1, outcome = excluded.outcome, detail = excluded.detail`)
    .run(key, t, t, outcome, detail);
  fs.mkdirSync(LOGS, { recursive: true });
  fs.appendFileSync(path.join(LOGS, 'asset-fallback.log'), `${t} ${key} ${outcome} ${detail}\n`);
}

function curl(args) {
  return new Promise((resolve, reject) =>
    execFile('curl', ['-sS', '-m', '60', '--compressed', ...args], { encoding: 'buffer', maxBuffer: 1 << 30 },
      (err, out) => (err ? reject(err) : resolve(out))));
}

const fetching = new Map();
const failed = new Map(); // id -> time of last failure (retried after 10 min)
async function fetchExternal(id) {
  const mode = fallbackMode();
  if (mode === 'none') return false;
  const f = failed.get(id);
  if (f && Date.now() - f < 600e3) return false;
  let url, headers = [];
  if (mode === 'opencloud') {
    const key = process.env.ROBLOX_OPEN_CLOUD_API_KEY;
    if (!key) { logMiss(`id:${id}`, 'fallback-error', 'ASSET_FALLBACK=opencloud without ROBLOX_OPEN_CLOUD_API_KEY'); return false; }
    url = `https://apis.roblox.com/asset-delivery-api/v1/assetId/${id}`;
    headers = ['-H', `x-api-key: ${key}`];
  } else if (mode === 'mirror') {
    // ASSET_MIRROR_URL: one or more URL templates (comma or space separated),
    // tried in order. {id} is replaced with the asset id (appended if absent).
    // A mirror may answer with the asset bytes, or with a {locations} document.
    const mirrors = (process.env.ASSET_MIRROR_URL || '').split(/[\s,]+/).filter(Boolean);
    if (!mirrors.length) { logMiss(`id:${id}`, 'fallback-error', 'ASSET_FALLBACK=mirror needs ASSET_MIRROR_URL'); return false; }
    for (const tpl of mirrors) {
      const url = tpl.includes('{id}') ? tpl.replace('{id}', id) : tpl + id;
      const host = new URL(url).host;
      let raw;
      try { raw = await curl(['-L', '-f', url]); } catch (e) { logMiss(`id:${id}`, 'mirror-error', `${host}: ${e.message.split('\n')[0]}`); continue; }
      const head = raw.subarray(0, 64).toString().trimStart().toLowerCase();
      if (head.startsWith('{')) {
        let meta = null;
        try { meta = JSON.parse(raw.toString()); } catch {}
        if (meta && meta.locations && (await storeFromLocations(id, meta, `mirror ${host}`))) return true;
        logMiss(`id:${id}`, 'mirror-error', `${host}: ${raw.toString().slice(0, 160)}`);
        continue;
      }
      if (!raw.length || head.startsWith('<!doctype') || head.startsWith('<html')) { logMiss(`id:${id}`, 'mirror-error', `${host}: not an asset (${raw.length} bytes)`); continue; }
      const info = await productInfo(id);
      putAsset(id, raw, { assetTypeId: info.AssetTypeId || 0, name: info.Name || '', description: info.Description || '', source: `fallback:mirror:${host}` });
      logMiss(`id:${id}`, 'fallback-ok', `mirror ${host}: ${raw.length} bytes`);
      console.log(`assets: ${id} from mirror ${host} (${raw.length} bytes)`);
      return true;
    }
    return false;
  } else {
    url = `https://assetdelivery.roblox.com/v2/assetId/${id}`;
  }
  return storeFromLocations(id, JSON.parse((await curl([...headers, url])).toString()), mode);
}

// Name, description and type from Roblox's public product info (anonymous; the
// asset's original creator isn't an account here, so it isn't copied).
async function productInfo(id) {
  try { return JSON.parse((await curl([`https://economy.roblox.com/v2/assets/${id}/details`])).toString()); } catch { return {}; }
}

async function storeFromLocations(id, meta, mode) {
  const loc = meta.locations && meta.locations[0] && meta.locations[0].location;
  if (!loc) {
    const err = (meta.errors && meta.errors[0]) || {};
    failed.set(id, Date.now());
    logMiss(`id:${id}`, err.code === 401 || err.code === 403 || err.code === 409 ? 'fallback-denied' : 'fallback-error',
      `${mode}: ${err.code || ''} ${err.message || 'no location'}`.trim());
    return false;
  }
  const data = await curl(['-L', loc]);
  const info = await productInfo(id);
  putAsset(id, data, { assetTypeId: meta.assetTypeId || info.AssetTypeId || 0, name: info.Name || '', description: info.Description || '', source: `fallback:${mode}` });
  logMiss(`id:${id}`, 'fallback-ok', `${mode}: type ${meta.assetTypeId}, ${data.length} bytes`);
  console.log(`assets: ${id} from ${mode} fallback (type ${meta.assetTypeId}, ${data.length} bytes)`);
  return true;
}

// Resolves an id from the store, falling back to the external service once.
async function ensure(id, version) {
  id = Number(id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  let r = resolveId(id, version);
  if (r) return r;
  if (version) return null;
  if (!fetching.has(id)) {
    fetching.set(id, fetchExternal(id).catch((e) => {
      failed.set(id, Date.now());
      logMiss(`id:${id}`, 'fallback-error', e.message.split('\n')[0]);
      return false;
    }).finally(() => fetching.delete(id)));
  }
  await fetching.get(id);
  r = resolveId(id);
  if (!r && fallbackMode() === 'none') logMiss(`id:${id}`, 'missing', 'not in local store; fallback disabled');
  return r;
}

module.exports = { putAsset, getAsset, resolveId, resolveHash, ensure, logMiss, sniff, storeContent, fallbackMode, CONTENT };
