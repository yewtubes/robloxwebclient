// Saves the hero video from roblox.com's logged-out landing page as one WebM
// (tools/fetch_login_assets.sh calls this). The page streams it over HLS with
// a signed URL, so the playlist is found by loading the page in Chromium.
//   node tools/fetch_landing_video.js <out.webm>
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

(async () => {
  const out = path.resolve(process.argv[2] || 'landing.webm');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const master = new Promise((res) => p.on('request', (r) => /\/main\.m3u8/.test(r.url()) && res(r.url())));
  await p.goto('https://www.roblox.com/', { timeout: 60000 });
  const url = await master;
  await b.close();

  const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`${r.status} ${u}`); return r; };
  // Variant and segment URIs carry {$...} placeholders for the signed query
  // string; the master playlist's own query fills them.
  const signed = (u) => { const x = new URL(u, url); x.search = new URL(url).search; return x; };
  const variants = [...(await (await get(url)).text()).matchAll(/#EXT-X-STREAM-INF:([^\n]*)\n([^\n]+)/g)]
    .map((m) => ({ bw: +(/BANDWIDTH=(\d+)/.exec(m[1]) || [0, 0])[1], uri: m[2] }))
    .sort((a, b) => b.bw - a.bw);
  const variant = signed(variants[0].uri);
  const segs = (await (await get(variant.href)).text()).split('\n').filter((l) => l && !l.startsWith('#'));

  // Each segment is a standalone WebM with absolute timestamps: rebase each to
  // zero, then join them without re-encoding.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'landing-'));
  const list = [];
  for (const [i, s] of segs.entries()) {
    const raw = path.join(tmp, `raw${i}.webm`), seg = path.join(tmp, `seg${i}.webm`);
    fs.writeFileSync(raw, Buffer.from(await (await get(signed(new URL(s, variant)).href)).arrayBuffer()));
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-map', '0:v', '-c', 'copy', '-avoid_negative_ts', 'make_zero', seg]);
    list.push(`file '${seg}'`);
  }
  fs.writeFileSync(path.join(tmp, 'list.txt'), list.join('\n'));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', out]);
  fs.rmSync(tmp, { recursive: true });
  console.log(`landing video: ${segs.length} segments -> ${out}`);
})().catch((e) => { console.error(e); process.exit(1); });
