export type HowItWorksStep = {
  n: string;
  title: string;
  body: string;
};

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    n: "01",
    title: "Sign in with Google",
    body: "Connect the email account you’ll send from. ScholarBridge never sends as itself — every message goes out from your inbox so replies land where you expect them.",
  },
  {
    n: "02",
    title: "Build your professor list",
    body: "Search by country, university, and research field. Add individuals or whole groups into buckets, or upload a spreadsheet if you already have targets.",
  },
  {
    n: "03",
    title: "Draft with AI personalization",
    body: "For each professor, we look at recent papers and generate a tailored email plus subject line. You choose tone and length, then edit anything before it goes out.",
  },
  {
    n: "04",
    title: "Schedule your campaign",
    body: "Pick dates and times that fit your plan. Queue dozens of personalized messages without sending them all at once — or pause and resume whenever you need.",
  },
  {
    n: "05",
    title: "Send & track",
    body: "Due messages send automatically from your email. Follow delivery and open status from the dashboard so you know what’s working and who to follow up with.",
  },
];
