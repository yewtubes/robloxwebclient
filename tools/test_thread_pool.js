// Tests the checked-in Emscripten pthread warmup without starting the 100 MB
// Roblox wasm. Run: node tools/test_thread_pool.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'webclient/WebClient.js'), 'utf8');
const shim = fs.readFileSync(path.join(root, 'webclient/site-shim.js'), 'utf8');
const generator = fs.readFileSync(path.join(root, 'tools/patch_glue.js'), 'utf8');
const begin = source.indexOf('    wasmModule = module;\n    if (!ENVIRONMENT_IS_PTHREAD) {');
const end = source.indexOf('\n  }\n\n  // Prefer streaming instantiation', begin);
assert(begin !== -1 && end > begin, 'Generated glue must contain the warmup block');
const block = source.slice(begin, end);
assert(block.includes('Promise.all(ready)'), 'Warmup must await ALL workers');
assert(generator.includes('pthreadAnchor'), 'Glue generator must preserve the warmup');
assert(generator.includes('Promise.all(ready)'), 'Glue generator and checked-in glue must agree');
assert(shim.includes('__rbxPthreadPoolSize'), 'Shim must configure local build pool size');
const warm = new vm.Script('(function(module, wasmExports) {\n var wasmModule;\n' + block + '\n})');

async function scenario(memoryGB, override, expected) {
  const workers = [];
  const pending = [];
  const logs = [];
  const ctx = {
    ENVIRONMENT_IS_PTHREAD: false,
    navigator: { deviceMemory: memoryGB },
    __rbxPthreadPoolSize: override,
    console: { info: (...args) => logs.push(args.join(' ')) },
    PThread: {
      allocateUnusedWorker() {
        const w = { id: workers.length + 1 };
        workers.push(w);
        return w;
      },
      loadWasmModuleToWorker(worker) {
        return new Promise(resolve => pending.push(() => resolve(worker)));
      },
    },
  };
  const resultObject = { ready: true };
  const result = warm.runInNewContext(ctx)({}, resultObject);
  assert.equal(typeof result.then, 'function', 'Main thread should wait for warmup');
  assert.equal(workers.length, expected);
  let finished = false;
  result.then(() => { finished = true; });
  await Promise.resolve();
  assert.equal(finished, false, 'No worker acknowledged loading yet');
  for (const ack of pending.slice(0, -1)) ack();
  await Promise.resolve();
  assert.equal(finished, false, 'Must wait for the last worker');
  pending.at(-1)();
  assert.strictEqual(await result, resultObject);
  assert(logs.some(x => x.includes('pthread pool ready')), 'Readiness must be logged');
}

(async () => {
  await scenario(4, undefined, 12); // Chromebook default
  await scenario(8, undefined, 16);
  await scenario(undefined, undefined, 16);
  await scenario(4, 6, 6);  // explicit diagnostic override
  await scenario(8, 999, 24); // cap against runaway worker allocation
  const result = warm.runInNewContext({
    ENVIRONMENT_IS_PTHREAD: true,
    PThread: { allocateUnusedWorker() { throw Error('not on pthread'); } },
    console: { info() {} },
  })({}, 123);
  assert.equal(result, 123, 'Worker threads must not start more workers');
  assert(shim.includes("get('debugCrash') === '1'"));
  assert(shim.includes("kind: 'runtime-diagnostic'"));
  assert(shim.includes("stats.poolExhaustions++"));
  assert(shim.includes("stats.peakActive"));
  assert(shim.includes("navigator.sendBeacon?.('/api/local/client-report'"));
  console.log('pthread warmup and diagnostics static checks passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
