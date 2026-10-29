// Copies files listed in WebClient.metadata.json that are missing from the output
// tree out of the Studio staging tree, then prints what is still missing.
const fs = require("fs"), path = require("path");
const [meta, out, stage] = process.argv.slice(2);
const files = JSON.parse(fs.readFileSync(meta, "utf8"));
let present = 0, copied = 0;
const missing = {};
for (const f of files) {
  const dst = out + f.path;
  if (fs.existsSync(dst)) { present++; continue; }
  let src = stage + f.path;
  if (!fs.existsSync(src) && f.path.startsWith("/ExtraContent/Workspace/"))
    src = stage + "/ExtraContent/LuaPackages/" + f.path.slice("/ExtraContent/Workspace/".length);
  if (fs.existsSync(src) && fs.statSync(src).isFile()) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    copied++;
  } else {
    const k = f.path.split("/").slice(0, 3).join("/");
    missing[k] = (missing[k] || 0) + 1;
  }
}
console.log({ total: files.length, present, copied });
console.log("still missing:", missing);
