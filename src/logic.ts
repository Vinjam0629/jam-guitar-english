import { weeks, type Q, type WeekKey } from "./course";

export function weekForDay(day: number): WeekKey {
  const hit = weeks.find((week) => day >= week.from && day <= week.to);
  return hit?.key ?? "more";
}

export function oralIndexForDay(day: number): string {
  if (day <= 7) return "0";
  if (day <= 14) return "1";
  if (day <= 21) return "2";
  if (day <= 28) return "3";
  if (day === 29) return "4";
  return "5";
}

export function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?。]+$/, "");
}

export function isCorrect(q: Q, given: string | undefined): boolean {
  if (given === undefined || given === "") return false;
  const ans = q[4];
  if (typeof ans === "number") return given === String(ans);
  const g = norm(given);
  return ans.some((accepted) => norm(accepted) === g);
}

export function answerText(q: Q): string {
  const ans = q[4];
  if (typeof ans === "number" && q[3]) return `${String.fromCharCode(65 + ans)}. ${q[3][ans]}`;
  return Array.isArray(ans) ? ans[0] : "";
}
