import type { ScheduleConfig } from "./types";

const WEEKDAYS: Record<string, number> = {
  mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0,
};

/**
 * Build a UTC Date for a wall-clock time in an IANA timezone. Robust and
 * server-timezone-independent: it reads the zone's actual offset via
 * Intl.formatToParts instead of parsing locale strings with `new Date`.
 */
function zonedToUtc(y: number, m: number, d: number, hh: number, mm: number, tz: string): Date {
  const utcGuess = Date.UTC(y, m - 1, d, hh, mm);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(utcGuess))) parts[p.type] = p.value;
  const asWall = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second),
  );
  // offset = how far the zone's wall clock is ahead of UTC at this instant.
  const offset = asWall - utcGuess;
  return new Date(utcGuess - offset);
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
  const perSlot = Math.max(1, cfg.per_slot);
  // When spread is on, space emails by the user-chosen gap (minutes). Falls back
  // to 10 if missing/invalid. Off = every email at the exact slot time.
  const stepMin = cfg.spread ? Math.max(1, Math.floor(Number(cfg.spread_gap_min) || 10)) : 0;

  // Preferred path: explicit calendar slots (date + hour + minute) chosen by the
  // user. Each slot holds up to `per_slot` emails, optionally spread by minutes.
  if (Array.isArray(cfg.slots) && cfg.slots.length) {
    const out: string[] = [];
    for (const sl of cfg.slots) {
      const [y, m, d] = String(sl.date).split("-").map(Number);
      if (![y, m, d].every((x) => Number.isFinite(x))) continue;
      // Use Number.isFinite so hour/minute 0 are preserved (|| would also work, but be explicit)
      const hh = Number.isFinite(Number(sl.hour)) ? Number(sl.hour) : 0;
      const mm = Number.isFinite(Number(sl.minute)) ? Number(sl.minute) : 0;
      for (let i = 0; i < perSlot; i++) {
        out.push(zonedToUtc(y, m, d, hh, mm + i * stepMin, tz).toISOString());
        if (out.length >= n) return out;
      }
    }
    return out;
  }

  // Legacy path: recurring weekdays + hours.
  const startISO = cfg.start_date || new Date().toISOString().slice(0, 10);
  const [sy, sm, sd] = startISO.split("-").map(Number);
  const start = new Date(Date.UTC(sy, sm - 1, sd));
  const slots: string[] = [];
  for (const day of nextDates(cfg.days || [], start)) {
    const y = day.getUTCFullYear();
    const m = day.getUTCMonth() + 1;
    const d = day.getUTCDate();
    for (const hour of (cfg.slot_hours || [])) {
      for (let i = 0; i < perSlot; i++) {
        const dt = zonedToUtc(y, m, d, hour, i * stepMin, tz);
        slots.push(dt.toISOString());
        if (slots.length >= n) return slots;
      }
    }
  }
  return slots;
}
