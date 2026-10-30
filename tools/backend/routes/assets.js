// assetdelivery.roblox.com: the platform's asset store (../assets.js) behind
// Roblox's asset delivery request and response formats.
const fs = require('fs');
const S = require('../assets.js');
const { json, error, parseJson } = require('../http.js');

// Base URL of a service as the caller addresses it (the web client uses
// roblox.com names through the proxy; Studio uses sitetest1 names over HTTPS).
function svcUrl(req, svc) {
  const h = req.headers['x-original-host'];
  return h ? `https://${h.replace(/^[^.]+\./, svc + '.')}` : `https://${svc}.roblox.com`;
}

// The store holds each asset's baseline ("source") representation, which is also
// the uploaded original ("Original"). Transcoded ones (ktx2 textures, Residual
// meshes) aren't made here. A request
// that lists only other representations and forbids falling back to the
// baseline (doNotFallbackToBaselineRepresentation) can't be served from it.
function representationRequest(list, noFallback) {
  let formats = [];
  try { formats = JSON.parse(Buffer.from(decodeURIComponent(list || ''), 'base64').toString()).map((r) => r.format); } catch {}
  const baselineOk = !noFallback || formats.length === 0 || formats.some((f) => /^(source|baseline|original)$/i.test(f));
  return { formats, baselineOk };
}

async function lookup({ id, hash, version }) {
  if (id) return S.ensure(id, version ? +version : undefined);
  if (hash) {
    const r = S.resolveHash(hash);
    if (!r) S.logMiss(`hash:${hash}`, 'missing', 'hash-addressed content not in local store');
    return r;
  }
  return null;
}

function sendContent(req, res, r) {
  const etag = `"${r.sha256}"`;
  const headers = {
    'Content-Type': r.contentType, ETag: etag, 'Cache-Control': 'public, max-age=86400',
    'Roblox-AssetFormat': 'source', 'Last-Modified': new Date((r.asset && r.asset.updated_at) || Date.now()).toUTCString(),
  };
  if (r.asset) { headers['Roblox-AssetTypeId'] = String(r.asset.asset_type_id); headers['Roblox-AssetVersion'] = String(r.version); }
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end(); }
  const size = fs.statSync(r.file).size;
  res.writeHead(200, { ...headers, 'Content-Length': size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(r.file).pipe(res);
}

async function asset(req, res, u) {
  const q = u.searchParams;
  const id = q.get('id') || q.get('ID') || (/assetId\/(\d+)/.exec(u.pathname) || [])[1];
  const hash = q.get('hash');
  const rep = representationRequest(q.get('contentRepresentationPriorityList'), q.get('doNotFallbackToBaselineRepresentation') === 'true');
  const r = await lookup({ id, hash, version: q.get('version') });
  if (!r) return error(res, 404, 'Request asset was not found', 404);
  if (!rep.baselineOk) return error(res, 404, `Requested representation (${rep.formats.join(', ')}) is not available for this asset`, 404);
  sendContent(req, res, r);
}

function location(req, r, { id, hash }) {
  const base = svcUrl(req, 'assetdelivery');
  return id ? `${base}/v1/asset/?id=${id}&version=${r.version}` : `${base}/v1/asset/?hash=${hash}`;
}

// GET /v1/assetId/{id}[/version/{n}] and /v2/assetId/{id}[/version/{n}]
async function assetIdJson(req, res, u) {
  const id = +/assetId\/(\d+)/.exec(u.pathname)[1];
  const version = (/version\/(\d+)/.exec(u.pathname) || [])[1];
  const r = await lookup({ id, version });
  const v2 = u.pathname.startsWith('/v2/');
  if (!r) {
    const err = { errors: [{ code: 404, message: 'Request asset was not found' }], requestId: null, isArchived: false, assetTypeId: 0, isRecordable: false };
    return json(res, 404, v2 ? err : { ...err, location: null });
  }
  const type = r.asset ? r.asset.asset_type_id : 0;
  if (v2) return json(res, 200, { locations: [{ assetFormat: 'source', location: location(req, r, { id }), assetMetadatas: [] }], requestId: null, isArchived: false, assetTypeId: type, isRecordable: true });
  json(res, 200, { location: location(req, r, { id }), requestId: null, IsHashDynamic: false, IsCopyrightProtected: false, isArchived: false, assetTypeId: type, isRecordable: true });
}

async function batch(req, res, u, body) {
  const items = parseJson(body, []);
  if (!Array.isArray(items)) return error(res, 400, 'Expected a JSON array of asset requests', 0);
  const out = await Promise.all(items.map(async (it) => {
    const id = it.assetId ?? it.AssetId, hash = it.hash ?? it.Hash, version = it.version ?? it.Version;
    const base = { requestId: it.requestId ?? it.RequestId, isArchived: false, isRecordable: true, IsHashDynamic: false, IsCopyrightProtected: false };
    const rep = representationRequest(it.contentRepresentationPriorityList, it.doNotFallbackToBaselineRepresentation === true);
    const r = await lookup({ id, hash, version });
    if (!r) return { ...base, errors: [{ code: 404, message: 'Request asset was not found' }] };
    if (!rep.baselineOk) return { ...base, errors: [{ code: 404, message: `Requested representation (${rep.formats.join(', ')}) is not available` }] };
    return { ...base, location: location(req, r, { id, hash }), assetTypeId: r.asset ? r.asset.asset_type_id : 0,
      contentRepresentationSpecifier: { format: 'source', majorVersion: '1', fidelity: '' } };
  }));
  json(res, 200, out);
}

const ROUTES = [
  ['POST', /^assetdelivery\.roblox\.com$/, /^\/v[12]\/assets\/batch$/, batch],
  ['GET', /^assetdelivery\.roblox\.com$/, /^\/v[12]\/assetId\/\d+(\/version\/\d+)?$/, assetIdJson],
  ['*', /^assetdelivery\.roblox\.com$/, /^\/v[12]\/asset\/?$/, asset],
  // c0..c7.rbxcdn.com style hash URLs
  ['GET', /^(c\d|t\d|tr|fts|sc\d)\.rbxcdn\.com$/, /^\/[0-9a-f]{32}$/, (req, res, u) => asset(req, res, new URL(`https://x/?hash=${u.pathname.slice(1)}`))],
];

module.exports = { ROUTES, svcUrl };
