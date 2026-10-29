// WebSocket -> UDP relay for the web client's local-relay transport
// (FFlagDebugLocalRccServerConnection). Protocol, as used by WasmPlayer.js:
//   client: "hello from browser", then "forward <host>:<port>"
//   relay:  "forwarding"; afterwards each binary message is one UDP datagram.
const crypto = require('crypto'), dgram = require('dgram');

function frame(payload, opcode) {
  const len = payload.length;
  const head = len < 126 ? Buffer.from([0x80 | opcode, len])
    : len < 65536 ? Buffer.from([0x80 | opcode, 126, len >> 8, len & 255])
    : (() => { const b = Buffer.alloc(10); b[0] = 0x80 | opcode; b[1] = 127; b.writeBigUInt64BE(BigInt(len), 2); return b; })();
  return Buffer.concat([head, payload]);
}

function attach(server, pathname = '/local-relay', { log = console.log, resolve = (h, p) => [h, p] } = {}) {
  server.on('upgrade', (req, sock) => {
    if (new URL(req.url, 'http://x').pathname !== pathname) return sock.destroy();
    const key = req.headers['sec-websocket-key'];
    const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    sock.setNoDelay(true);
    let buf = Buffer.alloc(0), udp = null, dest = null, up = 0, down = 0;
    const sendText = (s) => sock.write(frame(Buffer.from(s), 1));
    const onMessage = (op, data) => {
      if (op === 1) {
        const text = data.toString();
        const m = /^forward (.+):(\d+)$/.exec(text);
        if (m) {
          const [host, port] = resolve(m[1], +m[2]);
          dest = { host, port };
          udp = dgram.createSocket(host.includes(':') ? 'udp6' : 'udp4');
          udp.on('message', (msg) => { down++; sock.write(frame(msg, 2)); });
          udp.on('error', (e) => log('relay udp error', e.message));
          log(`relay: forwarding to ${host}:${port}`);
          sendText('forwarding');
        }
      } else if (op === 2 && udp) {
        up++;
        udp.send(data, dest.port, dest.host);
      } else if (op === 9) {
        sock.write(frame(data, 10));
      } else if (op === 8) {
        sock.end();
      }
    };
    sock.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      for (;;) {
        if (buf.length < 2) return;
        const op = buf[0] & 15, masked = buf[1] & 128;
        let len = buf[1] & 127, p = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); p = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); p = 10; }
        if (buf.length < p + (masked ? 4 : 0) + len) return;
        let data = buf.subarray(p + (masked ? 4 : 0), p + (masked ? 4 : 0) + len);
        if (masked) { const mask = buf.subarray(p, p + 4); data = Buffer.from(data.map((b, i) => b ^ mask[i & 3])); }
        buf = buf.subarray(p + (masked ? 4 : 0) + len);
        onMessage(op, data);
      }
    });
    const close = () => { if (udp) { udp.close(); udp = null; log(`relay: closed ${dest?.host}:${dest?.port} (${up} up, ${down} down)`); } };
    sock.on('close', close);
    sock.on('error', close);
  });
}
module.exports = { attach };
