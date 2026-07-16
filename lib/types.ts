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

export interface ScheduleConfig {
  days: string[];
  slot_hours: number[];
  per_slot: number;
  timezone: string;
  spread: boolean;
  start_date?: string | null;
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
