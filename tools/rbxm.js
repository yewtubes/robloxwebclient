// Minimal reader/writer for Roblox binary model/place files (.rbxm/.rbxl).
// Chunks are kept as-is except those we change; written chunks are stored
// uncompressed, which the format allows.
const fs = require('fs'), zlib = require('zlib');

function lz4Block(src, outLen) {
  const out = Buffer.alloc(outLen);
  let i = 0, o = 0;
  while (i < src.length) {
    const tok = src[i++];
    let lit = tok >> 4;
    if (lit === 15) { let b; do { b = src[i++]; lit += b; } while (b === 255); }
    src.copy(out, o, i, i + lit); i += lit; o += lit;
    if (i >= src.length) break;
    const off = src[i] | (src[i + 1] << 8); i += 2;
    let ml = tok & 15;
    if (ml === 15) { let b; do { b = src[i++]; ml += b; } while (b === 255); }
    ml += 4;
    for (let k = 0; k < ml; k++, o++) out[o] = out[o - off];
  }
  return out;
}

function read(file) {
  const b = fs.readFileSync(file);
  if (b.toString('latin1', 0, 8) !== '<roblox!') throw new Error('not a binary rbxm');
  const header = b.subarray(0, 32);
  const chunks = [];
  let p = 32;
  while (p < b.length) {
    const name = b.toString('latin1', p, p + 4);
    const clen = b.readUInt32LE(p + 4), ulen = b.readUInt32LE(p + 8);
    p += 16;
    let data;
    if (clen === 0) { data = b.subarray(p, p + ulen); p += ulen; }
    else {
      const raw = b.subarray(p, p + clen); p += clen;
      data = raw.readUInt32LE(0) === 0xfd2fb528 ? zlib.zstdDecompressSync(raw) : lz4Block(raw, ulen);
    }
    chunks.push({ name, data });
    if (name === 'END\0') break;
  }
  return { header, chunks };
}

function write(model, file) {
  const parts = [model.header];
  for (const c of model.chunks) {
    const h = Buffer.alloc(16);
    h.write(c.name, 0, 'latin1');
    h.writeUInt32LE(0, 4); h.writeUInt32LE(c.data.length, 8);
    parts.push(h, c.data);
  }
  fs.writeFileSync(file, Buffer.concat(parts));
}

// ---- helpers for INST/PROP/PRNT -------------------------------------------
const rdStr = (d, p) => { const n = d.readUInt32LE(p); return [d.toString('utf8', p + 4, p + 4 + n), p + 4 + n]; };
const strBuf = (s) => { const t = Buffer.from(s, 'utf8'), l = Buffer.alloc(4); l.writeUInt32LE(t.length); return Buffer.concat([l, t]); };
// Interleaved, zigzag, delta-encoded i32 arrays (referents).
function readRefs(d, p, n) {
  const out = new Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const v = (d[p + i] << 24) | (d[p + n + i] << 16) | (d[p + 2 * n + i] << 8) | d[p + 3 * n + i];
    acc += (v >>> 1) ^ -(v & 1);
    out[i] = acc;
  }
  return [out, p + 4 * n];
}
function writeRefs(arr) {
  const n = arr.length, b = Buffer.alloc(4 * n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const d = arr[i] - prev; prev = arr[i];
    const v = ((d << 1) ^ (d >> 31)) >>> 0;
    b[i] = v >>> 24; b[n + i] = (v >>> 16) & 255; b[2 * n + i] = (v >>> 8) & 255; b[3 * n + i] = v & 255;
  }
  return b;
}

function index(model) {
  const classes = new Map(), inst = new Map();
  for (const c of model.chunks) {
    if (c.name === 'INST') {
      const d = c.data, id = d.readUInt32LE(0);
      let [cls, p] = rdStr(d, 4);
      const isService = d[p], n = d.readUInt32LE(p + 1);
      const [refs] = readRefs(d, p + 5, n);
      classes.set(id, { id, cls, refs, isService });
      for (const r of refs) inst.set(r, { ref: r, cls, classId: id, props: {} });
    }
  }
  for (const c of model.chunks) {
    if (c.name === 'PROP') {
      const d = c.data, id = d.readUInt32LE(0);
      let [prop, p] = rdStr(d, 4);
      const type = d[p++];
      const cl = classes.get(id);
      if (type === 0x01 && (prop === 'Name' || prop === 'Source')) {
        for (const r of cl.refs) { let s; [s, p] = rdStr(d, p); inst.get(r).props[prop] = s; }
      }
    }
    if (c.name === 'PRNT') {
      const d = c.data, n = d.readUInt32LE(1);
      const [kids, p] = readRefs(d, 5, n);
      const [parents] = readRefs(d, p, n);
      kids.forEach((k, i) => { const o = inst.get(k); if (o) o.parent = parents[i]; });
    }
  }
  return { classes, inst };
}

function fullName(idx, ref) {
  const parts = [];
  for (let o = idx.inst.get(ref); o; o = idx.inst.get(o.parent)) parts.unshift(o.props.Name ?? o.cls);
  return parts.join('.');
}

module.exports = { read, write, index, fullName, rdStr, strBuf, readRefs, writeRefs };

if (require.main === module) {
  const [cmd, file, ...rest] = process.argv.slice(2);
  const m = read(file);
  if (cmd === 'chunks') {
    const counts = {};
    for (const c of m.chunks) counts[c.name] = (counts[c.name] || 0) + 1;
    console.log(counts);
  } else if (cmd === 'tree') {
    const idx = index(m);
    const filter = rest[0] ? new RegExp(rest[0]) : null;
    for (const o of idx.inst.values()) {
      const fn = fullName(idx, o.ref);
      if (!filter || filter.test(fn) || filter.test(o.cls))
        console.log(o.cls.padEnd(16), fn, o.props.Source !== undefined ? `[src ${o.props.Source.length}]` : '');
    }
  }
}
