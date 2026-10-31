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
// Preload a configurable pthread pool before main() can create threads.
// Creating a new worker is already supported by the Emscripten glue, but an
// on-demand worker is not immediately ready to run a pthread. Ensure the warm
// workers have sent CMD_LOADED (3) before completing wasm initialization.
const pthreadAnchor = '    wasmModule = module;\n    return wasmExports;';
if (!js.includes(pthreadAnchor)) throw new Error('pthread warmup anchor missing from generated glue');
js = js.replace(pthreadAnchor, (m) => (n++, `    wasmModule = module;
    if (!ENVIRONMENT_IS_PTHREAD) {
      // New pthread workers load the wasm asynchronously. Initialize the
      // pool before main() so a synchronous pthread_create can use ready workers.
      var poolSetting = Number(globalThis.__rbxPthreadPoolSize);
      var memoryGB = Number(globalThis.navigator?.deviceMemory) || 0;
      var poolSize = Number.isFinite(poolSetting) && poolSetting >= 4
        ? Math.min(24, Math.floor(poolSetting))
        : (memoryGB > 0 && memoryGB <= 4 ? 12 : 16);
      var ready = [];
      for (var i = 0; i < poolSize; i++) {
        ready.push(PThread.loadWasmModuleToWorker(PThread.allocateUnusedWorker()));
      }
      console.info('[rbx] warming ' + poolSize + ' pthread workers');
      return Promise.all(ready).then(() => {
        console.info('[rbx] pthread pool ready: ' + poolSize);
        return wasmExports;
      });
    }
    return wasmExports;`));
js = js.replace('GLctx.shaderSource(GL.shaders[shader], source);', (m) => (n++, 'GLctx.shaderSource(GL.shaders[shader], rbxConvertShader(source));'));
// -sASSERTIONS wraps every wasm export in a closure that checks (and formats
// two messages) on every call; call the exports directly instead.
js = js.replace(/function createExportWrapper\(name, func, nargs\) \{\n  assert\(func\);\n/, (m) => (n++, m + '  return func;\n'));
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
