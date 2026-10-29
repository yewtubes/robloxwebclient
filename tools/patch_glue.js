// Post-processes the generated WebClient.js:
// - EM_ASM lookups fall back to a logger for addresses we have no body for.
const fs = require('fs');
const [src, dst] = process.argv.slice(2);
let js = fs.readFileSync(src, 'utf8');
const fallback = `
var rbxUnknownEmAsmSeen = {};
function rbxEmAsm(addr) {
  var f = ASM_CONSTS[addr];
  if (f) return f;
  if (!rbxUnknownEmAsmSeen[addr]) { rbxUnknownEmAsmSeen[addr] = 1; console.warn('[rbx] unknown EM_ASM', addr); }
  return () => 0;
}
`;
let n = 0;
js = js.replace(/assert\(ASM_CONSTS\.hasOwnProperty\((\w+)\)[^;]*;/g, () => (n++, ''));
js = js.replace(/ASM_CONSTS\[(\w+)\]\(/g, (m, v) => (n++, `rbxEmAsm(${v})(`));
js = js.replace(/var func = emAsmAddr \? ASM_CONSTS\[emAsmAddr\]/, (m) => (n++, 'var func = emAsmAddr ? rbxEmAsm(emAsmAddr)'));
js = js.replace('var ASM_CONSTS = {', fallback + 'var ASM_CONSTS = {');
// WasmPlayer passes a few Module properties this build does not consume.
js = js.replace(/abort\(`\\`Module\.\$\{prop\}\\` was supplied but/, (m) => (n++, m.replace('abort(', 'console.warn(')));
// Desktop GLSL -> GLSL ES conversion (see rbxConvertShader in rbxlib.js).
js = js.replace('GLctx.shaderSource(GL.shaders[shader], source);', (m) => (n++, 'GLctx.shaderSource(GL.shaders[shader], rbxConvertShader(source));'));
// Route roblox.com / rbxcdn.com requests (main thread and pthread workers)
// through the local server's /proxy/: the page is cross-origin isolated, so
// direct cross-origin responses without CORP headers are blocked.
js = `(function () {
  if (typeof self === 'undefined' || self.__rbxProxyInstalled) return;
  self.__rbxProxyInstalled = true;
  var origin = self.location.origin;
  var rewrite = function (u) {
    try {
      var x = new URL(u, self.location.href);
      if (x.origin !== origin && /(^|\\.)(roblox\\.com|rbxcdn\\.com)$/.test(x.hostname)) return origin + '/proxy/' + x.href;
    } catch (e) {}
    return u;
  };
  var open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u) {
    arguments[1] = rewrite(u);
    return open.apply(this, arguments);
  };
  if (self.fetch) {
    var f = self.fetch;
    self.fetch = function (i, init) { return f.call(this, typeof i === 'string' || i instanceof URL ? rewrite(String(i)) : i, init); };
  }
})();
` + js;
fs.writeFileSync(dst, js);
console.log('patched', n, 'EM_ASM sites');
