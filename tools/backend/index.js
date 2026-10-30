// Self-hosted, Roblox-compatible web API. Requests the web client (and Studio)
// address to *.roblox.com / *.rbxcdn.com arrive here as https://<host>/<path>
// (through tools/server.js's /proxy/ or tools/studio_backend.js) and are
// answered from the platform database; nothing is forwarded to Roblox, except
// asset fallback fetches when ASSET_FALLBACK allows them (see assets.js).
// The platform's own API is host "local" (/api/local/...).
//
// Every request is appended to <data>/logs/requests.jsonl (method, host, path,
// query, status, time, user): the record docs/API_ROUTE_COVERAGE.md is built from.
const fs = require('fs'), path = require('path');
const { open, DATA } = require('./db.js');
const A = require('./auth.js');
const M = require('./model.js');
const { notFound, readBody } = require('./http.js');

open();
const ROUTES = [
  ...require('./routes/accounts.js').ROUTES,
  ...require('./routes/games.js').ROUTES,
  ...require('./routes/assets.js').ROUTES,
  ...require('./routes/media.js').ROUTES,
  ...require('./routes/platform.js').ROUTES,
];

const LOGS = path.join(DATA, 'logs');
fs.mkdirSync(LOGS, { recursive: true });
const requestLog = fs.createWriteStream(path.join(LOGS, 'requests.jsonl'), { flags: 'a' });
const unhandled = new Set();

async function handle(req, res, target) {
  let u;
  try { u = new URL(target); } catch { return notFound(res, 'bad url'); }
  const t0 = Date.now();
  const body = await readBody(req);
  let user = null;
  try { user = A.userFromRequest(req); } catch (e) { console.log('auth error', e.message); }
  if (user) M.touch(user.id);
  const route = ROUTES.find(([method, host, p]) => (method === '*' || method === req.method || (method === 'GET' && req.method === 'HEAD'))
    && host.test(u.hostname) && p.test(u.pathname));
  res.on('finish', () => {
    const q = Object.fromEntries([...u.searchParams].map(([k, v]) => [k, v.length > 120 ? v.slice(0, 120) + '…' : v]));
    requestLog.write(JSON.stringify({
      t: new Date(t0).toISOString(), ms: Date.now() - t0, method: req.method, host: u.hostname, path: u.pathname, query: q,
      status: res.statusCode, user: user ? user.id : null, route: !!route, via: req.headers['x-original-host'] ? 'studio' : 'web',
      ...(!route || res.statusCode >= 400 ? { body: body.toString('utf8', 0, 600) } : {}),
      // LOG_BODY=<regex>: also the full request body and headers of matching paths (debugging).
      ...(process.env.LOG_BODY && new RegExp(process.env.LOG_BODY).test(u.pathname) ? { body: body.toString('utf8'), headers: req.headers } : {}),
    }) + '\n');
  });
  if (route) {
    if (process.env.VERBOSE) console.log('backend', req.method, u.hostname + u.pathname);
    try {
      return await route[3](req, res, u, body, { user });
    } catch (e) {
      console.log(`backend: ${req.method} ${u.hostname}${u.pathname} failed:`, e.stack);
      if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ errors: [{ code: 0, message: 'InternalServerError' }] })); }
      return;
    }
  }
  const key = `${req.method} ${u.hostname}${u.pathname.replace(/\d+/g, ':n')}`;
  if (!unhandled.has(key)) { unhandled.add(key); console.log(`backend: unhandled ${key}`); }
  notFound(res, u.hostname + u.pathname);
}

module.exports = { handle, ROUTES };
