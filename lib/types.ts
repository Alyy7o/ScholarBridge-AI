export interface Professor {
  id?: string;
  name: string;
  email: string;
  university?: string;
  topics?: string;
}

export interface Paper {
  title: string;
  year?: number | null;
  abstract?: string;
  source?: string;
}

export interface ScheduleSlot {
  date: string;   // YYYY-MM-DD (wall-clock date in `timezone`)
  hour: number;   // 0-23
  minute: number; // 0-59
}

export interface ScheduleConfig {
  days?: string[];
  slot_hours?: number[];
  per_slot: number;
  timezone: string;
  spread: boolean;
  /** Minutes between emails when `spread` is on (e.g. 10 → 6:00, 6:10, 6:20). */
  spread_gap_min?: number;
  start_date?: string | null;
  slots?: ScheduleSlot[]; // explicit calendar slots (preferred over days/hours)
}

export interface ComposedEmail {
  professor_name: string;
  email: string;
  university?: string;
  topics?: string;
  subject: string;
  body: string;
  personalized?: string;
  research_source?: string;
  papers_used?: string[];
  workflow?: string;
}
