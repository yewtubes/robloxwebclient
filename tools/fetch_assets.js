// One-time setup step: downloads genuine Roblox assets into the local asset
// store (webclient/assets/), so the client never has to contact Roblox at
// runtime. Uses the public, anonymous asset delivery API.
//   node tools/fetch_assets.js <id> [id...]
//   node tools/fetch_assets.js --missing     (ids the backend logged as missing)
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const DIR = path.resolve(__dirname, '..', 'webclient', 'assets');
const MISSING = path.join(DIR, 'missing.txt');
fs.mkdirSync(DIR, { recursive: true });

let ids = process.argv.slice(2);
if (ids[0] === '--missing') ids = fs.existsSync(MISSING) ? fs.readFileSync(MISSING, 'utf8').split(/\s+/).filter(Boolean) : [];
ids = [...new Set(ids.filter((i) => /^\d+$/.test(i)))];

const curl = (args) => execFileSync('curl', ['-sS', '-m', '60', '--compressed', ...args], { maxBuffer: 1 << 30 });
let ok = 0, failed = [];
for (const id of ids) {
  if (fs.existsSync(path.join(DIR, id))) { ok++; continue; }
  try {
    const meta = JSON.parse(curl([`https://assetdelivery.roblox.com/v2/assetId/${id}`]).toString());
    const loc = meta.locations && meta.locations[0] && meta.locations[0].location;
    if (!loc) throw new Error((meta.errors && meta.errors[0] && meta.errors[0].message) || 'no location');
    fs.writeFileSync(path.join(DIR, id), curl(['-L', loc]));
    fs.writeFileSync(path.join(DIR, `${id}.json`), JSON.stringify({ assetTypeId: meta.assetTypeId }));
    ok++;
  } catch (e) {
    failed.push(`${id}: ${e.message.split('\n')[0]}`);
  }
}
console.log(`${ok}/${ids.length} assets in the local store`);
if (failed.length) console.log('not downloadable:\n  ' + failed.join('\n  '));
