// Local dev server for the web client.
//   /                 -> webclient/WebClient.html
//   /<file>           -> webclient/<file> (WasmPlayer.js, WasmLoader.js, ...)
//   /engine/<path>    -> webclient/<path>, falling back to webclient/files/<path>
// Sends COOP/COEP so SharedArrayBuffer is available.
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', 'webclient');
const PORT = +process.env.PORT || 8080;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json',
  '.png': 'image/png', '.ttf': 'font/ttf', '.otf': 'font/otf', '.css': 'text/css', '.svg': 'image/svg+xml' };

function send(res, code, body, type = 'text/plain') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(body);
}
function serveFile(req, res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { log(req, 404); return send(res, 404, 'not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Content-Length': st.size });
    fs.createReadStream(file).pipe(res);
    log(req, 200);
  });
}
function log(req, code) {
  if (code !== 200 || process.env.VERBOSE) console.log(code, req.method, req.url);
}
// WebClient.metadata.json lists the web build's own content files; ours come from
// other platforms' packages, so sizes differ and some files are missing. Serve a
// version that matches what is on disk (the engine sizes its read buffers from it).
let metadataCache = null;
function metadata() {
  if (metadataCache) return metadataCache;
  const files = JSON.parse(fs.readFileSync(path.join(ROOT, 'WebClient.metadata.json'), 'utf8'));
  const out = [];
  for (const f of files) {
    for (const dir of ['overlay', 'files']) {
      try { out.push({ path: f.path, size: fs.statSync(path.join(ROOT, dir, f.path)).size }); break; } catch {}
    }
  }
  console.log(`metadata: ${out.length}/${files.length} files present`);
  return (metadataCache = JSON.stringify(out));
}

// /proxy/<url>: the engine's web requests (it uses this form when its CORS
// proxy is enabled; WebClient.js and WasmLoader.js rewrite the rest). They are
// answered by the local backend; nothing is forwarded to Roblox.
const backend = require('./backend.js');
const auth = require('./backend/auth.js');
function proxy(req, res, rest) {
  let target = decodeURIComponent(rest).replace(/^(https?):\/(?!\/)/, '$1://');
  if (!/^https?:\/\//.test(target)) target = 'https://' + target;
  target = target.replace(/([?&])auth=[^&]*(&|$)/, (m, a, b) => (b ? a : '')).replace(/[?&]$/, '');
  return backend.handle(req, res, target);
}

const server = http.createServer((req, res) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = new URL(req.url, 'http://x');
  let p = decodeURIComponent(url.pathname);
  if (p.includes('..')) return send(res, 400, 'bad path');
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Headers', '*'); res.setHeader('Access-Control-Allow-Methods', '*'); return send(res, 204, ''); }
  if (req.url.startsWith('/proxy/')) return proxy(req, res, req.url.slice('/proxy/'.length));
  // The platform's own API (accounts, server registration, render jobs).
  if (p.startsWith('/api/local/')) return backend.handle(req, res, `https://local${req.url}`);
  // Sign-in and sign-up pages for local platform accounts.
  if (p === '/login' || p === '/signup') return serveFile(req, res, path.join(ROOT, 'pages', 'login.html'));
  // Roblox's own play page (tools/fetch_webclient.sh), with site-shim.js loaded first.
  // It needs a signed-in local account; without one the browser goes to /login first.
  if (p === '/games/start') {
    if (!auth.userFromRequest(req)) {
      res.writeHead(302, { Location: `/login?returnUrl=${encodeURIComponent(req.url)}` });
      return res.end();
    }
    const html = fs.readFileSync(path.join(ROOT, 'site', 'games', 'start.html'), 'utf8');
    log(req, 200);
    return send(res, 200, html.replace('<head>', '<head><script src="/site-shim.js"></script>'), 'text/html');
  }
  if (/^\/[0-9a-f]{40}\//.test(p)) return serveFile(req, res, path.join(ROOT, 'site', p));
  if (p === '/') return serveFile(req, res, path.join(ROOT, 'WebClient.html'));
  if (p === '/engine/WebClient.metadata.json') { log(req, 200); return send(res, 200, metadata(), 'application/json'); }
  if (p === '/engine/WebClient.wasm' && fs.existsSync(path.join(ROOT, 'WebClient.patched.wasm')))
    return serveFile(req, res, path.join(ROOT, 'WebClient.patched.wasm'));
  if (p.startsWith('/engine/')) {
    const rel = p.slice('/engine/'.length);
    const candidates = [path.join(ROOT, rel), path.join(ROOT, 'overlay', rel), path.join(ROOT, 'files', rel)];
    const hit = candidates.find((f) => { try { return fs.statSync(f).isFile(); } catch { return false; } });
    return serveFile(req, res, hit || candidates[2]);
  }
  return serveFile(req, res, path.join(ROOT, p));
});
// RCC_HOST/RCC_PORT override where "forward <host>:<port>" goes (e.g. a Studio
// test server on another machine).
require('./relay.js').attach(server, '/local-relay', {
  resolve: (h, p) => [process.env.RCC_HOST || h, +(process.env.RCC_PORT || p)],
});
server.listen(PORT, process.env.LISTEN_HOST || undefined, () => console.log(`web client on http://localhost:${PORT}/`));
module.exports = server;
