// Breaks at the entry of a defined wasm function in the running web client (on
// every thread: the page and its pthread workers) and prints the function's
// locals after STEPS single steps, optionally dumping a libc++ std::string held
// in one local and a C string in another. For reverse engineering engine
// internals.
//   FUNC=105853 STEPS=21 STR=2 SIZE=13 CHUNK=3 MAXHITS=20 node tools/debug_break.js <seconds> [query]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const secs = +(process.argv[2] || 60), query = process.argv[3] || '';
const FUNC = +process.env.FUNC, STEPS = +(process.env.STEPS || 0), MAXHITS = +(process.env.MAXHITS || 5);
const { STR, SIZE, CHUNK } = process.env;
const PORT = 9333;

function bodyOffset(file, func) {
  const b = fs.readFileSync(file); let p = 8;
  const u = () => { let r = 0, s = 0, x; do { x = b[p++]; r += (x & 127) * 2 ** s; s += 7; } while (x & 128); return r; };
  while (p < b.length) {
    const id = b[p++], size = u(), end = p + size;
    if (id === 10) {
      const n = u();
      for (let i = 0; i < n; i++) {
        const sz = u(), start = p;
        if (i === func) { const groups = u(); for (let g = 0; g < groups; g++) { u(); const t = b[p++]; if (t === 0x63 || t === 0x64) u(); } return p; }
        p = start + sz;
      }
    }
    p = end;
  }
}

(async () => {
  const server = require('./server.js');
  const off = bodyOffset(path.resolve(__dirname, '..', 'webclient', 'WebClient.patched.wasm'), FUNC);
  console.log(`func ${FUNC} first instruction at byte ${off}`);
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist',
    '--enable-features=WebAssemblyJSPromiseIntegration,SharedArrayBuffer', '--js-flags=--experimental-wasm-jspi', `--remote-debugging-port=${PORT}`] });
  const ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let nextId = 1; const pending = new Map();
  const send = (method, params = {}, sessionId) => new Promise((resolve) => {
    const id = nextId++; pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  let hits = 0;
  const steps = new Map();
  const onEvent = async ({ method, params, sessionId }) => {
    if (method === 'Target.attachedToTarget') {
      const s = params.sessionId;
      await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }, s);
      await send('Debugger.enable', {}, s);
      await send('Runtime.runIfWaitingForDebugger', {}, s);
    } else if (method === 'Debugger.scriptParsed' && params.scriptLanguage === 'WebAssembly') {
      const r = await send('Debugger.setBreakpoint', { location: { scriptId: params.scriptId, lineNumber: 0, columnNumber: off } }, sessionId);
      console.log('breakpoint in session', sessionId.slice(0, 8), r.result?.breakpointId || JSON.stringify(r.error));
    } else if (method === 'Debugger.paused') {
      const n = steps.get(sessionId) || 0;
      if (n < STEPS) { steps.set(sessionId, n + 1); await send('Debugger.stepOver', {}, sessionId); return; }
      steps.set(sessionId, 0);
      if (hits < MAXHITS) {
        const f = params.callFrames[0], locals = {};
        for (let i = 0; i < 18; i++) {
          const r = await send('Debugger.evaluateOnCallFrame', { callFrameId: f.callFrameId, expression: `$var${i}`, returnByValue: true }, sessionId);
          const v = r.result?.result?.value; locals[i] = v && typeof v === 'object' ? v.value : v;
        }
        const ev = async (expr) => (await send('Debugger.evaluateOnCallFrame', { callFrameId: f.callFrameId, returnByValue: true, expression: expr }, sessionId)).result?.result?.value;
        // The heap is reachable from wasm frames as `memories[0]`.
        const heap = `new Uint8Array(memories[0].buffer)`;
        const chunk = CHUNK ? await ev(`(() => { const h = ${heap}; let p = ${locals[CHUNK]}, e = p; while (h[e]) e++; return new TextDecoder().decode(h.slice(p, e)); })()`) : '';
        // CHUNKRE: only report chunks whose name matches this regex.
        if (process.env.CHUNKRE && !new RegExp(process.env.CHUNKRE).test(chunk)) { await send('Debugger.resume', {}, sessionId); return; }
        hits++;
        let line = `hit ${hits} [${sessionId.slice(0, 8)}]`;
        if (CHUNK) line += ` chunk=${chunk}`;
        if (STR) line += ' ' + JSON.stringify(await ev(`(() => { const h = ${heap}, dv = new DataView(h.buffer); const p = ${locals[STR]};
          const long = h[p + 11] & 0x80, d = long ? dv.getUint32(p, true) : p, n = long ? dv.getUint32(p + 4, true) : h[p + 11];
          return { n, size: ${SIZE ? locals[SIZE] : -1}, hex: Array.from(h.slice(d, d + Math.min(n, 64))).map((x) => x.toString(16).padStart(2, '0')).join('') }; })()`));
        console.log(line);
      }
      await send('Debugger.resume', {}, sessionId);
    }
  };
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } else if (msg.method) onEvent(msg);
  };
  await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await page.goto(`http://localhost:${server.address().port}/${query}`);
  await page.waitForTimeout(secs * 1000);
  await browser.close();
  process.exit(0);
})();
