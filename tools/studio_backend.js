// HTTPS front for the local backend, for Roblox Studio. Studio is started with
// BaseUrl https://www.sitetest1.robloxlabs.com (one of the base URLs it has an
// OAuth client for); those hostnames resolve to this machine, and requests are
// answered by tools/backend.js as if they were for *.roblox.com.
const https = require('https'), fs = require('fs'), path = require('path');
const backend = require('./backend.js');
const TLS = path.resolve(__dirname, '..', 'backend-tls');
const PORT = +process.env.HTTPS_PORT || 443;
const LOG = process.env.STUDIO_BACKEND_LOG || path.resolve(__dirname, '..', 'backend-tls', 'requests.log');

const server = https.createServer({ key: fs.readFileSync(path.join(TLS, 'server.key')), cert: fs.readFileSync(path.join(TLS, 'server.crt')) }, (req, res) => {
  const host = (req.headers.host || '').replace(/:\d+$/, '');
  const mapped = host.replace(/\.sitetest\d\.robloxlabs\.com$/, '.roblox.com').replace(/^sitetest\d\.robloxlabs\.com$/, 'roblox.com');
  fs.appendFileSync(LOG, `${new Date().toISOString()} ${req.method} ${host}${req.url}\n`);
  req.headers['x-original-host'] = host;
  backend.handle(req, res, `https://${mapped}${req.url}`);
});
server.listen(PORT, () => console.log(`studio backend on https://*.sitetest1.robloxlabs.com:${PORT}`));
