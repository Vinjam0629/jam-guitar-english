const KEY = "jam-guitar-english:lastDay";

export function readLastDay(maxDay: number): string {
  try {
    const raw = localStorage.getItem(KEY);
    const day = Number(raw);
    if (Number.isInteger(day) && day >= 1 && day <= maxDay) return String(day);
  } catch {
    /* private mode or blocked storage */
  }
  return String(maxDay);
}

export function writeLastDay(day: string): void {
  try {
    localStorage.setItem(KEY, day);
  } catch {
    /* ignore quota / private mode */
  }
}
