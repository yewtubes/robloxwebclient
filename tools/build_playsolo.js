// Builds webclient/overlay/ (served before webclient/files/):
//  - ExtraContent/models/UniversalApp/UniversalApp.rbxm with the Lua App entry
//    point (CoreScripts.LuaAppStarterScript) replaced by playsolo/PlaySolo.lua
//  - ExtraContent/places/Mobile.rbxl = the place to play (default: World HQ)
// With --join[=<placeId>] the entry point is playsolo/Join.lua instead: the
// app asks the engine to join a game server (place 1818 by default) rather
// than playing the place locally.
// Usage: node tools/build_playsolo.js [--join[=<placeId>]] [place.rbxl]
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const R = require('./rbxm.js');
const ROOT = path.resolve(__dirname, '..');
const W = path.join(ROOT, 'webclient');
const OV = path.join(W, 'overlay');
const args = process.argv.slice(2);
const joinArg = args.find((a) => /^--join(=|$)/.test(a));
const joinPlace = joinArg ? +(joinArg.split('=')[1] || 1818) : 0;
if (joinArg && !(Number.isSafeInteger(joinPlace) && joinPlace > 0)) throw new Error(`bad place id in ${joinArg}`);
// In join mode the place only fills the app DataModel, so a light one is used:
// a heavy one (World HQ) slows the page enough to miss the QUIC handshake timeout.
const place = args.find((a) => !a.startsWith('--')) || path.join(ROOT, 'places', joinArg ? 'Baseplate.rbxlx' : 'WorldHQ.rbxl');

// 1. compile the bootstrap
const bc = path.join(OV, 'PlaySolo.bin');
fs.mkdirSync(OV, { recursive: true });
let entry = path.join(ROOT, 'playsolo/PlaySolo.lua');
if (joinPlace) {
  const src = fs.readFileSync(path.join(ROOT, 'playsolo/Join.lua'), 'utf8');
  const out = src.replace(/^local PLACE_ID = \d+/m, `local PLACE_ID = ${joinPlace}`);
  if (out === src && !src.includes(`local PLACE_ID = ${joinPlace}`)) throw new Error('PLACE_ID line not found in Join.lua');
  entry = path.join(OV, 'Join.lua');
  fs.writeFileSync(entry, out);
}
execFileSync(path.join(ROOT, 'tools/luauc/luauc'), [entry, bc]);
if (joinPlace) fs.unlinkSync(entry);
const bytecode = fs.readFileSync(bc);
fs.unlinkSync(bc);

// 2. Build the Lua App patch from the in-experience patch, so the 2026 in-game
// CoreScripts (StarterScript, chat, topbar, ...) and their CorePackages are
// present. The engine starts PatchRoot.CoreScripts.LuaAppStarterScript; a
// test-only module is renamed to that and given the bootstrap's bytecode.
const src = path.join(W, 'files/ExtraContent/models/InExperience/InExperience.rbxm');
const HOST = 'PatchRoot.CoreScripts.CoreScripts/jest.config';
const m = R.read(src);
const idx = R.index(m);
let target = null;
for (const o of idx.inst.values()) if (R.fullName(idx, o.ref) === HOST) target = o;
if (!target) throw new Error(HOST + ' not found');
function setProp(name, value, inst) {
  const cls = idx.classes.get(inst.classId);
  const pos = cls.refs.indexOf(inst.ref);
  for (const c of m.chunks) {
    if (c.name !== 'PROP' || c.data.readUInt32LE(0) !== cls.id) continue;
    const [prop, p0] = R.rdStr(c.data, 4);
    if (prop !== name) continue;
    const type = c.data[p0];
    let p = p0 + 1;
    const vals = [];
    for (let i = 0; i < cls.refs.length; i++) {
      const n = c.data.readUInt32LE(p);
      vals.push(c.data.subarray(p + 4, p + 4 + n));
      p += 4 + n;
    }
    vals[pos] = value;
    const parts = [c.data.subarray(0, p0), Buffer.from([type])];
    for (const v of vals) { const l = Buffer.alloc(4); l.writeUInt32LE(v.length); parts.push(l, v); }
    c.data = Buffer.concat([...parts, c.data.subarray(p)]);
    return;
  }
  throw new Error('property ' + name + ' not found');
}
setProp('Name', Buffer.from('LuaAppStarterScript'), target);
setProp('Source', bytecode, target);

// Optional module replacements from Lua source: playsolo/replace/<Full.Path>.lua
const repDir = path.join(ROOT, 'playsolo', 'replace');
if (fs.existsSync(repDir)) {
  for (const f of fs.readdirSync(repDir).filter((f) => f.endsWith('.lua'))) {
    const full = f.slice(0, -4);
    let inst = null;
    for (const o of idx.inst.values()) if (R.fullName(idx, o.ref) === full) inst = o;
    if (!inst) { console.log(`replace: ${full} not found`); continue; }
    const out = path.join(OV, 'tmp.bin');
    execFileSync(path.join(ROOT, 'tools/luauc/luauc'), [path.join(repDir, f), out]);
    setProp('Source', fs.readFileSync(out), inst);
    fs.unlinkSync(out);
    console.log(`replace: ${full}`);
  }
}
console.log(`${HOST} -> LuaAppStarterScript (${joinPlace ? `join place ${joinPlace}` : 'Play Solo'}, ${bytecode.length} bytes of bytecode)`);
const outModel = path.join(OV, 'ExtraContent/models/UniversalApp/UniversalApp.rbxm');
fs.mkdirSync(path.dirname(outModel), { recursive: true });
R.write(m, outModel);

// 3. the place
const outPlace = path.join(OV, 'ExtraContent/places/Mobile.rbxl');
fs.mkdirSync(path.dirname(outPlace), { recursive: true });
fs.copyFileSync(place, outPlace);
console.log(`place: ${place} -> ${path.relative(ROOT, outPlace)}`);

// 4. which bootstrap the overlay carries, for Roblox's page (/games/start?build=local,
// see webclient/site-shim.js)
fs.writeFileSync(path.join(OV, 'bootstrap.json'), JSON.stringify(joinPlace ? { mode: 'join', placeId: joinPlace } : { mode: 'playsolo' }) + '\n');
