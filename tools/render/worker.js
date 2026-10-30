#!/usr/bin/env node
// Studio render worker: completes the platform's thumbnail jobs with Roblox Studio.
//   node tools/render/worker.js [--once]
// For each job claimed from /api/local/render/claim it opens a place in its own
// Studio (on a separate virtual display) with tools/render/RenderPlugin.lua
// installed for that job. The plugin sets the scene up the way RCC's render
// scripts do (avatars: a local player with CharacterAppearance = avatar-fetch,
// LoadCharacter) and marks the viewport; the worker captures Studio's rendered
// viewport, keys out the backdrop (avatars), sizes it and posts the PNG back.
// Studio has no ThumbnailGenerator, so the screen capture is what stands in for
// RCC's ThumbnailGenerator:Click.
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const API = process.env.RENDER_API || 'http://127.0.0.1:8080';
const S = process.env.STUDIO_DIR || '/home/user/studio';
const DISPLAY = process.env.RENDER_DISPLAY || ':79';
const BASE = process.env.RENDER_BASE_URL || 'https://www.sitetest1.robloxlabs.com';
const TIMEOUT_MS = +(process.env.RENDER_TIMEOUT_MS || 150000);
const KINDS = process.env.RENDER_KINDS || 'avatar,avatar-headshot,avatar-bust,place';
const PREFIX = `${S}/prefix`;
const WINUSER = require('os').userInfo().username;
const LOCAL = `${PREFIX}/drive_c/users/${WINUSER}/AppData/Local/Roblox`;
const STAGE = `${LOCAL}/render`;
const PLUGIN = `${LOCAL}/Plugins/LocalRenderWorker.lua`;
const headers = process.env.ADMIN_KEY ? { 'X-Admin-Key': process.env.ADMIN_KEY } : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString(), ...a);

const EMPTY_PLACE = `<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" version="4">
<Item class="Workspace" referent="RBX0"><Properties><string name="Name">Workspace</string></Properties></Item>
<Item class="Lighting" referent="RBX1"><Properties><string name="Name">Lighting</string><token name="Technology">3</token></Properties></Item>
</roblox>
`;

function ensureDisplay() {
  if (fs.existsSync(`/tmp/.X11-unix/X${DISPLAY.slice(1)}`)) return;
  spawn('Xvfb', [DISPLAY, '-screen', '0', '1280x800x24'], { detached: true, stdio: 'ignore' }).unref();
  execFileSync('sleep', ['1']);
}

// Bounding box of the magenta markers in a capture ("WxH+X+Y"), or null.
function markers(png) {
  const out = execFileSync('convert', [png, '-fuzz', '4%', '-fill', 'black', '+opaque', '#ff00ff', '-fill', 'white', '-opaque', '#ff00ff',
    '-format', '%[fx:mean*w*h] %@', 'info:'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  const [count, box] = out.split(' ');
  if (+count < 40) return null;
  const m = /^(\d+)x(\d+)\+(\d+)\+(\d+)$/.exec(box);
  return m && +m[1] > 100 && +m[2] > 100 ? { w: +m[1], h: +m[2], x: +m[3], y: +m[4] } : null;
}
// Waits until two captures of the viewport 2 s apart are identical, so transient
// Studio UI over it (the place-open toast with its spinner) has gone.
async function settled(raw, rect, until) {
  const box = `${rect.w}x${rect.h}+${rect.x}+${rect.y}`, prev = `${raw}.prev.png`;
  for (let last = null; Date.now() < until; ) {
    capture(raw);
    execFileSync('convert', [raw, '-crop', box, '+repage', prev + '.now.png']);
    if (last) {
      let diff = 1;
      try { execFileSync('compare', ['-metric', 'AE', '-fuzz', '2%', last, prev + '.now.png', 'null:'], { stdio: 'ignore' }); diff = 0; } catch {}
      if (!diff) { fs.rmSync(last, { force: true }); fs.rmSync(prev + '.now.png', { force: true }); return true; }
    }
    fs.renameSync(prev + '.now.png', prev); last = prev;
    await sleep(2000);
  }
  return false;
}
const capture = (file) => execFileSync('import', ['-display', DISPLAY, '-window', 'root', `png:${file}`]);

// The render the plugin printed to Studio's log (Studio started at or after
// `since`): { w, h, file } with the raw RGBA in file, 'fallback' if the plugin had
// to use markers instead, or null while it isn't complete yet.
function clicked(since, key) {
  const dir = `${LOCAL}/logs`;
  let logs = [];
  try { logs = fs.readdirSync(dir).filter((f) => f.endsWith('.log')).map((f) => path.join(dir, f)).filter((f) => fs.statSync(f).mtimeMs >= since - 5000); } catch {}
  for (const f of logs) {
    const text = fs.readFileSync(f, 'latin1');
    if (text.includes('[LocalRender] in-engine capture unavailable')) return 'fallback';
    const head = new RegExp(`\\[LocalRender\\] click ${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} (\\d+) (\\d+) (\\d+)`).exec(text);
    if (!head || !text.includes(`[LocalRender] ready ${key}`)) continue;
    const [w, h, count] = head.slice(1).map(Number);
    const parts = new Array(count);
    for (const m of text.slice(head.index).matchAll(/\[LocalRender\] px (\d+) ([A-Za-z0-9+/=]+)/g)) if (+m[1] <= count && !parts[m[1] - 1]) parts[m[1] - 1] = m[2];
    if (parts.includes(undefined) || parts.length !== count) throw new Error('incomplete render in the log');
    const file = path.join(STAGE, `${key.replace(/[^A-Za-z0-9]+/g, '-')}.rgba`);
    const px = Buffer.from(parts.join(''), 'base64');
    if (px.length !== w * h * 4) throw new Error(`render is ${px.length} bytes, expected ${w * h * 4}`);
    fs.writeFileSync(file, px);
    return { w, h, file };
  }
  return null;
}

function finish(raw, rect, job, out) {
  const { w, h, x, y } = rect;
  if (job.kind === 'place') {
    // Fill the requested aspect from the middle of the viewport.
    const aspect = job.width / job.height;
    const cw = Math.min(w, Math.round(h * aspect)), ch = Math.round(cw / aspect);
    execFileSync('convert', [raw, '-crop', `${cw}x${ch}+${x + ((w - cw) >> 1)}+${y + ((h - ch) >> 1)}`, '+repage',
      '-resize', `${job.width}x${job.height}!`, `png:${out}`]);
  } else {
    // The plugin framed the figure in the middle square; the backdrop becomes transparent.
    // Headshots/busts keep the plugin's framing; full-body renders are cropped to the
    // figure and centered with a margin, as ThumbnailGenerator:Click(..., crop) does.
    const side = Math.min(w, h), fit = Math.round(Math.min(job.width, job.height) * 0.92);
    execFileSync('convert', [raw, '-crop', `${side}x${side}+${x + ((w - side) >> 1)}+${y + ((h - side) >> 1)}`, '+repage',
      '-fuzz', '28%', '-transparent', '#00ff00', ...(job.kind === 'avatar' ? ['-trim', '+repage', '-resize', `${fit}x${fit}`] : ['-resize', `${job.width}x${job.height}`]),
      '-background', 'none', '-gravity', 'center', '-extent', `${job.width}x${job.height}`, `png32:${out}`]);
  }
}

async function render(job) {
  const id = job.key.replace(/[^A-Za-z0-9]+/g, '-');
  fs.mkdirSync(STAGE, { recursive: true });
  fs.mkdirSync(path.dirname(PLUGIN), { recursive: true });
  let file;
  if (job.kind === 'place') {
    const src = path.resolve(ROOT, job.input.file);
    file = `render-${id}${path.extname(src)}`;
    fs.copyFileSync(src, path.join(STAGE, file));
  } else {
    file = `render-${id}.rbxlx`;
    fs.writeFileSync(path.join(STAGE, file), EMPTY_PLACE);
  }
  const spec = { key: job.key, file: path.basename(file, path.extname(file)), kind: job.kind, targetId: job.targetId, input: job.input,
    characterAppearance: `${BASE.replace('://www.', '://avatar.')}/v1.1/avatar-fetch/?placeId=0&userId=${job.targetId}` };
  fs.writeFileSync(PLUGIN, fs.readFileSync(path.join(__dirname, 'RenderPlugin.lua'), 'utf8').replace('__JOB__', JSON.stringify(spec)));

  ensureDisplay();
  const env = { ...process.env, DISPLAY, WINEPREFIX: PREFIX, WINEDEBUG: '-all', WINEDLLOVERRIDES: 'mscoree,mshtml=', LP_NUM_THREADS: '1',
    PATH: `${ROOT}/tools/studio/bin:${process.env.PATH}`, NO_PROXY: `${process.env.NO_PROXY || ''},.robloxlabs.com`, no_proxy: `${process.env.no_proxy || ''},.robloxlabs.com` };
  const started = Date.now();
  const studio = spawn('taskset', ['-c', process.env.STUDIO_CPUS || '0,1', 'wine', 'RobloxStudioBeta.exe', '-task', 'EditFile',
    '-localPlaceFile', `C:/users/${WINUSER}/AppData/Local/Roblox/render/${file}`, '-baseUrl', BASE], { cwd: `${S}/app`, env, stdio: 'ignore' });
  const raw = path.join(STAGE, `${id}-capture.png`), out = path.join(STAGE, `${id}.png`);
  try {
    let rect = null, screen = false;
    const until = Date.now() + TIMEOUT_MS;
    while (Date.now() < until) {
      await sleep(1000);
      if (studio.exitCode !== null) throw new Error(`Studio exited (${studio.exitCode})`);
      if (!screen) {
        // The plugin's in-engine capture (RenderPlugin.lua's click), printed to the log.
        const r = clicked(started, job.key);
        if (r === 'fallback') { screen = true; log(`${job.key}: no in-engine capture, using the display`); }
        else if (r) {
          execFileSync('convert', ['-size', `${r.w}x${r.h}`, '-depth', '8', `rgba:${r.file}`, `png:${raw}`]);
          fs.rmSync(r.file, { force: true });
          finish(raw, { w: r.w, h: r.h, x: 0, y: 0 }, job, out);
          return fs.readFileSync(out);
        }
        continue;
      }
      try { capture(raw); } catch { continue; }
      const m = markers(raw);
      if (m) rect = m;
      else if (rect && (await settled(raw, rect, until))) { finish(raw, rect, job, out); return fs.readFileSync(out); }
    }
    fs.copyFileSync(raw, path.join(STAGE, 'last-failed-capture.png'));
    throw new Error('timed out waiting for Studio to render');
  } finally {
    try { execFileSync('pkill', ['-f', `render/${file}`]); } catch {}
    studio.kill();
    fs.rmSync(PLUGIN, { force: true });
    for (const f of [file, `${id}-capture.png`, `${id}-capture.png.prev.png`, `${id}-capture.png.prev.png.now.png`, `${id}.png`]) fs.rmSync(path.join(STAGE, f), { force: true });
  }
}

async function main() {
  const once = process.argv.includes('--once');
  for (;;) {
    let job = null;
    try {
      const r = await fetch(`${API}/api/local/render/claim?kinds=${KINDS}`, { method: 'POST', headers });
      ({ job } = await r.json());
    } catch (e) { log('claim failed:', e.message); }
    if (!job) { if (once) return; await sleep(5000); continue; }
    log(`rendering ${job.key} (attempt ${job.attempt})`);
    const result = `${API}/api/local/render/jobs/${encodeURIComponent(job.key)}/result`;
    try {
      const png = await render(job);
      const r = await fetch(result, { method: 'POST', headers: { ...headers, 'Content-Type': 'image/png' }, body: png });
      log(`done ${job.key}: HTTP ${r.status}`);
    } catch (e) {
      log(`failed ${job.key}: ${e.message}`);
      await fetch(`${result}?error=${encodeURIComponent(e.message)}`, { method: 'POST', headers }).catch(() => {});
    }
    if (once) return;
  }
}
main();
