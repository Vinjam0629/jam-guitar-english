import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const files = walk("dist");
const html = readFileSync("dist/index.html", "utf8");
if (!html.includes("/jam-guitar-english/assets/")) {
  console.error("index.html is missing the /jam-guitar-english/ asset base");
  process.exit(1);
}
if (html.includes('src="/assets/') || html.includes('href="/assets/')) {
  console.error("found root-absolute asset path; Pages would 404");
  process.exit(1);
}
const text = files
  .filter((file) => /\.(html|js|css|json|webmanifest)$/.test(file))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
for (const needle of ["fonts.googleapis", "fonts.gstatic", "youtube.com", "youtu.be"]) {
  if (text.includes(needle)) {
    console.error("disallowed external service:", needle);
    process.exit(1);
  }
}
for (const needle of [
  "品丝端冒出",
  "Fret Sprout",
  "fret sprout",
  "琴颈钢筋",
  "truss rod",
  "今日课",
  "周口语测",
  "当前环境听不了朗读，可点右上角用 Safari 打开",
  "添加到主屏幕",
]) {
  if (!text.includes(needle)) {
    console.error("built site missing", needle);
    process.exit(1);
  }
}
const manifest = readFileSync("dist/manifest.json", "utf8");
if (!manifest.includes('"/jam-guitar-english/"')) {
  console.error("manifest scope/start_url is not the project path");
  process.exit(1);
}
console.log(`dist ok: ${files.length} files, base /jam-guitar-english/`);
