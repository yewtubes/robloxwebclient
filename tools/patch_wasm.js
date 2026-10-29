// Applies local patches to WebClient.wasm and writes webclient/WebClient.patched.wasm,
// which tools/server.js serves in place of the original.
//
// A patch replaces a function body with `i32.const <v>; return`, padded with nops,
// so the body size (and every other offset in the module) stays the same.
const fs = require('fs'), path = require('path');
const W = path.resolve(__dirname, '..', 'webclient');

// Defined-function indexes (as in a binaryen dump, i.e. excluding imports).
const PATCHES = [
  // DataModelPatchConfigurer signature verification of the bundled Lua App patch.
  // The bundled UniversalApp.rbxm comes from the Windows package, whose signature
  // the web build rejects ("No signatures in the model could be verified").
  { func: 116001, ret: 1, why: 'accept bundled UniversalApp patch signature' },
];

const NUM_IMPORTED_FUNCS = 270;
const sleb = (v) => { const out = []; for (;;) { const b = v & 0x7f; v >>= 7; if ((v === 0 && !(b & 0x40)) || (v === -1 && (b & 0x40))) { out.push(b); return out; } out.push(b | 0x80); } };
const uleb = (v) => { const out = []; do { let b = v & 0x7f; v >>>= 7; if (v) b |= 0x80; out.push(b); } while (v); return out; };

// Instruction-level patches: inside `func`, find `i32.const <constArg>` followed
// (within a few bytes) by `call <callee>` and `br <depth>`; replace the call with
// drops (for its `nargs` operands) and the br with nops.
const SKIP_CALLS = [
  // luau_load: "%s: bytecode corrupted" when the bytecode has no valid Roblox
  // footer (our own compiled Play Solo bootstrap). Continue loading instead.
  { func: 147667, constArg: 1929621, callee: 147043, nargs: 3, why: 'load unsigned Luau bytecode' },
];

const buf = Buffer.from(fs.readFileSync(path.join(W, 'WebClient.wasm')));
let p = 8;
const leb = () => { let r = 0, s = 0, b; do { b = buf[p++]; r |= (b & 127) << s; s += 7; } while (b & 128); return r >>> 0; };
let codeStart = -1;
while (p < buf.length) {
  const id = buf[p++], len = leb(), end = p + len;
  if (id === 10) { codeStart = p; break; }
  p = end;
}
p = codeStart;
const count = leb();
const bodies = [];
for (let i = 0; i < count; i++) { const size = leb(); bodies.push([p, size]); p += size; }

for (const pt of PATCHES) {
  const [start, size] = bodies[pt.func];
  // locals: 0 groups; i32.const v (signed LEB, small); return; nops...; end
  const code = [0x00, 0x41, pt.ret & 0x3f, 0x0f];
  if (size < code.length + 1) throw new Error(`body of ${pt.func} too small`);
  for (let i = 0; i < size; i++) buf[start + i] = i < code.length ? code[i] : 0x01;
  buf[start + size - 1] = 0x0b;
  console.log(`patched func ${pt.func} (${size} bytes): ${pt.why}`);
}
for (const pt of SKIP_CALLS) {
  const [start, size] = bodies[pt.func];
  const body = buf.subarray(start, start + size);
  const needle = Buffer.from([0x41, ...sleb(pt.constArg)]);
  const call = Buffer.from([0x10, ...uleb(pt.callee + NUM_IMPORTED_FUNCS)]);
  let at = body.indexOf(needle), done = false;
  while (at >= 0 && !done) {
    const c = body.indexOf(call, at);
    if (c > at && c - at < 24 && body[c + call.length] === 0x0c) {
      for (let i = 0; i < call.length; i++) body[c + i] = i < pt.nargs ? 0x1a : 0x01;
      if (call.length < pt.nargs) throw new Error('call too short to hold drops');
      // br <depth>: opcode + uleb depth
      let q = c + call.length + 1;
      body[c + call.length] = 0x01;
      while (body[q] & 0x80) body[q++] = 0x01;
      body[q] = 0x01;
      done = true;
      console.log(`patched func ${pt.func} at +${c}: ${pt.why}`);
    }
    at = body.indexOf(needle, at + 1);
  }
  if (!done) throw new Error(`pattern not found in func ${pt.func}`);
}
fs.writeFileSync(path.join(W, 'WebClient.patched.wasm'), buf);
console.log('wrote webclient/WebClient.patched.wasm');
