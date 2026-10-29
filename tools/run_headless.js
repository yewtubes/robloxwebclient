// Boots the web client in headless Chromium, records the console and takes a
// screenshot.  Usage: node tools/run_headless.js [seconds] [query] [out.png]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const secs = +(process.argv[2] || 60);
const query = process.argv[3] || '';
const shot = process.argv[4] || path.resolve(__dirname, '..', 'screenshots', 'latest.png');
const logFile = shot.replace(/\.png$/, '.log');
fs.mkdirSync(path.dirname(shot), { recursive: true });

(async () => {
  const server = require('./server.js');
  const browser = await chromium.launch({
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist',
      '--enable-features=WebAssemblyJSPromiseIntegration,SharedArrayBuffer',
      `--js-flags=--experimental-wasm-jspi ${process.env.JSFLAGS || ''}`, '--autoplay-policy=no-user-gesture-required',
      // NETLOG=<file>: Chromium network log (QUIC/WebTransport details).
      ...(process.env.NETLOG ? [`--log-net-log=${process.env.NETLOG}`, '--net-log-capture-mode=Everything'] : [])],
  });
  // VIDEO=1 records the session (webm, next to the screenshot)
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  // VIDEO=1: capture frames with the DevTools screencast (lighter than
  // Playwright's recorder, which ran the page out of memory) and encode them
  // with ffmpeg at the end.
  const frameDir = shot.replace(/\.png$/, '-frames');
  const frames = [];
  if (process.env.VIDEO) {
    fs.rmSync(frameDir, { recursive: true, force: true });
    fs.mkdirSync(frameDir, { recursive: true });
    const cdp = await context.newCDPSession(page);
    cdp.on('Page.screencastFrame', async (f) => {
      const file = path.join(frameDir, `${String(frames.length).padStart(6, '0')}.jpg`);
      fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
      frames.push({ file, t: f.metadata.timestamp });
      cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: 1280, maxHeight: 720 });
  }
  fs.writeFileSync(logFile, '');
  const t0 = Date.now();
  const w = (s) => fs.appendFileSync(logFile, `[${((Date.now() - t0) / 1000).toFixed(1)}] ${s}\n`);
  let lines = 0;
  if (process.env.FORCEGC) await page.addInitScript(() => { setInterval(() => self.gc && self.gc(), 1000); });
  if (process.env.MEMDEBUG) await page.addInitScript(() => {
    setInterval(() => {
      const m = performance.memory;
      console.log(`[mem] js used=${(m.usedJSHeapSize / 1048576) | 0}MB total=${(m.totalJSHeapSize / 1048576) | 0}MB limit=${(m.jsHeapSizeLimit / 1048576) | 0}MB`);
    }, 2000);
  });
  if (process.env.JSPIDEBUG) await page.addInitScript(() => {
    const orig = WebAssembly.promising;
    const live = new Map();
    WebAssembly.promising = (fn) => {
      const name = fn.name || '?';
      const w = orig(fn);
      return (...a) => {
        live.set(name, (live.get(name) || 0) + 1);
        const p = w(...a);
        p.finally(() => live.set(name, live.get(name) - 1));
        return p;
      };
    };
    setInterval(() => console.log('[jspi] live ' + JSON.stringify(Object.fromEntries(live))), 2000);
  });
  if (process.env.GLDEBUG) await page.addInitScript(() => {
    const P = WebGL2RenderingContext.prototype, stats = (window.__glStats = {});
    for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'clear', 'useProgram', 'texImage2D', 'texSubImage2D', 'compressedTexImage2D', 'bindFramebuffer']) {
      const o = P[k];
      P[k] = function (...a) { stats[k] = (stats[k] || 0) + 1; return o.apply(this, a); };
    }
    const cs = P.compileShader;
    P.compileShader = function (sh) {
      cs.call(this, sh);
      stats.compiled = (stats.compiled || 0) + 1;
      if (!this.getShaderParameter(sh, this.COMPILE_STATUS) && (stats.compileFail = (stats.compileFail || 0) + 1) <= 3)
        console.error('[gl] compile failed:', this.getShaderInfoLog(sh), '\n', this.getShaderSource(sh));
    };
    const lp = P.linkProgram;
    P.linkProgram = function (pr) {
      lp.call(this, pr);
      if (!this.getProgramParameter(pr, this.LINK_STATUS) && (stats.linkFail = (stats.linkFail || 0) + 1) <= 3)
        console.error('[gl] link failed:', this.getProgramInfoLog(pr));
    };
    setInterval(() => console.log('[gl] stats ' + JSON.stringify(stats)), 5000);
  });
  page.on('console', (m) => {
    const t = m.text();
    if (/\[MAIN\] heartbeat/.test(t)) return;
    w(`${m.type()}: ${t}`);
    if (++lines < 400 || /error|abort|crash|exception/i.test(t)) console.log(`${m.type()}: ${t.slice(0, 400)}`);
    // Object arguments print as "Object"; expand them for the transport's messages.
    if (/\[WASM-RNA\]/.test(t)) Promise.all(m.args().map((a) => a.jsonValue().catch(() => '?'))).then((v) => console.log('  args', JSON.stringify(v)));
  });
  page.on('pageerror', (e) => { w(`PAGEERROR: ${e.stack || e}`); console.log('PAGEERROR', String(e.stack || e).slice(0, 1500)); });
  page.on('crash', () => { w('PAGE CRASHED'); console.log('PAGE CRASHED'); });
  page.on('worker', (wk) => wk.on('console', (m) => w(`worker ${m.type()}: ${m.text()}`)));
  // HOST=play.localhost serves the page from the host name Roblox expects locally.
  await page.goto(`http://${process.env.HOST || 'localhost'}:${server.address().port}/${query}`);
  // DEBUGPAUSE=<sec>: pause the main thread then and print its call stack.
  if (process.env.DEBUGPAUSE) {
    const dbg = await context.newCDPSession(page);
    await dbg.send('Debugger.enable');
    dbg.on('Debugger.paused', (e) => {
      const lines = e.callFrames.slice(0, 40).map((f) => `  ${f.functionName || '?'} ${f.url.split('/').pop()}:${f.location.lineNumber}:${f.location.columnNumber}`);
      w('PAUSED (' + e.reason + '):\n' + lines.join('\n'));
      console.log('PAUSED:\n' + lines.join('\n'));
      dbg.send('Debugger.resume').catch(() => {});
    });
    setTimeout(() => dbg.send('Debugger.pause').catch((err) => console.log('pause failed', err.message)), +process.env.DEBUGPAUSE * 1000);
  }
  const step = 10;
  for (let s = 0; s < secs; s += step) {
    await page.waitForTimeout(step * 1000);
    await page.screenshot({ path: shot }).catch((e) => console.log('screenshot failed', e.message));
    // SHOTS=1 also keeps each step's screenshot (<out>-<sec>s.png), e.g. to see the loading screen.
    if (process.env.SHOTS && fs.existsSync(shot)) fs.copyFileSync(shot, shot.replace(/\.png$/, `-${s + step}s.png`));
  }
  // Optional input script after loading, e.g. KEYS="w:3000,space:300,d:1500"
  if (process.env.KEYS) {
    await page.mouse.click(640, 360);
    for (const step of process.env.KEYS.split(',')) {
      if (step.startsWith('click:')) {
        const [, x, y, wait] = step.split(':');
        w(`input: click ${x},${y}`);
        await page.mouse.click(+x, +y);
        await page.waitForTimeout(+wait || 2000);
        continue;
      }
      if (step.startsWith('wait:')) { await page.waitForTimeout(+step.split(':')[1]); continue; }
      const [k, ms] = step.split(':');
      const key = { space: 'Space', w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD', q: 'KeyQ', e: 'KeyE' }[k] || k;
      w(`input: ${key} for ${ms}ms`);
      await page.keyboard.down(key);
      await page.waitForTimeout(+ms || 200);
      await page.keyboard.up(key);
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: shot.replace(/\.png$/, '-after-input.png') });
  }
  console.log('screenshot:', shot, 'log:', logFile);
  await context.close();
  await browser.close();
  if (frames.length > 1) {
    // concat demuxer with real frame durations
    const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(0.01, ((frames[i + 1] || f).t - f.t) || 0.1).toFixed(3)}`).join('\n');
    fs.writeFileSync(path.join(frameDir, 'list.txt'), list + `\nfile '${frames[frames.length - 1].file}'\n`);
    const out = shot.replace(/\.png$/, '.mp4');
    require('child_process').execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(frameDir, 'list.txt'),
      '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '23', '-preset', 'veryfast', out]);
    console.log('video:', out, `(${frames.length} frames)`);
  }
  server.close();
})();
