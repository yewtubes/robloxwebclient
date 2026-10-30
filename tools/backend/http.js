// Response helpers shared by the route modules. Error bodies use the shape
// Roblox's web APIs return: {errors:[{code, message}]}.
const zlib = require('zlib');
function json(res, code, body, headers = {}) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': data.length, ...headers });
  res.end(data);
}
function error(res, status, message, code = 0) {
  json(res, status, { errors: [{ code, message }] });
}
const unauthorized = (res) => error(res, 401, 'Authorization has been denied for this request.', 0);
const notFound = (res, what) => error(res, 404, `${what} is not available on the local backend`, 404);
const badRequest = (res, message) => error(res, 400, message, 1);

function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return Promise.resolve(Buffer.alloc(0));
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      // Studio compresses some request bodies (asset delivery batches: gzip).
      const raw = Buffer.concat(chunks), enc = String(req.headers['content-encoding'] || '').toLowerCase();
      try {
        if (enc === 'gzip' || enc === 'x-gzip') return resolve(zlib.gunzipSync(raw));
        if (enc === 'deflate') return resolve(zlib.inflateSync(raw));
        if (enc === 'br') return resolve(zlib.brotliDecompressSync(raw));
        if (enc === 'zstd' && zlib.zstdDecompressSync) return resolve(zlib.zstdDecompressSync(raw));
      } catch (e) { console.log(`backend: undecodable ${enc} request body: ${e.message}`); }
      resolve(raw);
    });
    req.on('error', reject);
  });
}
function parseJson(body, fallback = {}) {
  try { return JSON.parse(body.toString() || 'null') ?? fallback; } catch { return fallback; }
}
function formOrJson(body) {
  const t = body.toString();
  try { return JSON.parse(t); } catch {}
  return Object.fromEntries(new URLSearchParams(t));
}
function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
// Comma-separated or repeated ids in a query string: ?userIds=1,2&userIds=3
function idList(u, ...names) {
  const out = [];
  for (const n of names) for (const v of u.searchParams.getAll(n)) for (const x of v.split(',')) if (/^\d+$/.test(x.trim())) out.push(+x);
  return out;
}

module.exports = { json, error, unauthorized, notFound, badRequest, readBody, parseJson, formOrJson, cookies, idList };
