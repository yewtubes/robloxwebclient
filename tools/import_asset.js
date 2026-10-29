// Adds a file to the local backend's asset store (webclient/assets/), so the
// client can load it as rbxassetid://<id> or .../asset?id=<id>.
//   node tools/import_asset.js <id> <file> [assetTypeId]
// Asset type ids: 1 Image, 4 Mesh, 5 Lua, 10 Model, 13 Decal, 24 Animation.
const fs = require('fs'), path = require('path');
const [id, file, type] = process.argv.slice(2);
if (!/^\d+$/.test(id || '') || !file) {
  console.error('usage: node tools/import_asset.js <id> <file> [assetTypeId]');
  process.exit(1);
}
const dir = path.resolve(__dirname, '..', 'webclient', 'assets');
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(file, path.join(dir, id));
if (type) fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ assetTypeId: +type }));
console.log(`asset ${id} <- ${file}`);
