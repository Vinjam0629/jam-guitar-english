import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/course.ts", import.meta.url), "utf8");
const days = [...src.matchAll(/^  \[(\d+), "2026-/gm)].map((match) => Number(match[1]));
if (days.length !== 31 || days[0] !== 1 || days.at(-1) !== 31) {
  console.error("lesson days mismatch", days.length, days[0], days.at(-1));
  process.exit(1);
}
for (let i = 0; i < days.length; i += 1) {
  if (days[i] !== i + 1) {
    console.error("noncontiguous lesson", days[i]);
    process.exit(1);
  }
}
const quizDays = new Set(
  [...src.matchAll(/^  \[(\d+), "(?:选择|填空|中英互译)",/gm)].map((match) => Number(match[1])),
);
for (let day = 1; day <= 31; day += 1) {
  if (!quizDays.has(day)) {
    console.error("missing quiz", day);
    process.exit(1);
  }
}
const dialogs = (src.match(/\], \[\[/g) || []).length;
if (dialogs !== 31) {
  console.error("dialog count", dialogs);
  process.exit(1);
}
for (const needle of [
  "品丝端冒出 Fret Sprout",
  "fret sprout",
  "琴颈钢筋",
  "truss rod",
  "周1 · 精调基础",
  "收尾 · 柜台通关",
  "I can file the fret ends and dress them.",
]) {
  if (!src.includes(needle)) {
    console.error("missing", needle);
    process.exit(1);
  }
}
console.log(`source ok: ${days.length} lessons, ${quizDays.size} quiz days, ${dialogs} dialogs`);
