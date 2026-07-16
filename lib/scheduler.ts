import type { ScheduleConfig } from "./types";

const WEEKDAYS: Record<string, number> = {
  mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0,
};

/** Build a UTC ISO timestamp for a wall-clock time in an IANA timezone. */
function zonedToUtc(y: number, m: number, d: number, hh: number, mm: number, tz: string): Date {
  const utcGuess = Date.UTC(y, m - 1, d, hh, mm);
  const asIf = new Date(utcGuess);
  const localized = new Date(asIf.toLocaleString("en-US", { timeZone: tz }));
  const diff = asIf.getTime() - localized.getTime();
  return new Date(utcGuess + diff);
}

function nextDates(days: string[], start: Date, weeks = 10): Date[] {
  const wanted = days
    .map((d) => WEEKDAYS[d.trim().toLowerCase().slice(0, 3)])
    .filter((n) => n !== undefined);
  const out: Date[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    if (wanted.includes(d.getUTCDay())) out.push(d);
  }
  return out;
}

/** Generate n ISO send_at timestamps in one pass (day → hour → slot). */
export function generateSlots(n: number, cfg: ScheduleConfig): string[] {
  const tz = cfg.timezone || "UTC";
  const startISO = cfg.start_date || new Date().toISOString().slice(0, 10);
  const [sy, sm, sd] = startISO.split("-").map(Number);
  const start = new Date(Date.UTC(sy, sm - 1, sd));

  const perSlot = Math.max(1, cfg.per_slot);
  const stepMin = cfg.spread && perSlot > 1 ? Math.floor(60 / perSlot) : 0;

  const slots: string[] = [];
  for (const day of nextDates(cfg.days, start)) {
    const y = day.getUTCFullYear();
    const m = day.getUTCMonth() + 1;
    const d = day.getUTCDate();
    for (const hour of cfg.slot_hours) {
      for (let i = 0; i < perSlot; i++) {
        const dt = zonedToUtc(y, m, d, hour, i * stepMin, tz);
        slots.push(dt.toISOString());
        if (slots.length >= n) return slots;
      }
    }
  }
  return slots;
}
