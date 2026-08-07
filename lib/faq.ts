export type FaqItem = {
  question: string;
  answer: string;
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is ScholarBridge AI?",
    answer:
      "ScholarBridge AI is a research-aware outreach tool that helps students and researchers find professors by field and university, draft personalized emails grounded in each professor’s recent papers, and send campaigns from their own email.",
  },
  {
    question: "How does research-aware professor outreach work?",
    answer:
      "You search for labs by country, university, and field, then ScholarBridge reads recent papers for each professor and drafts a tailored message and subject line. You edit tone and length, schedule sends, and track delivery from one dashboard.",
  },
  {
    question: "Does email send from my email?",
    answer:
      "Yes. ScholarBridge connects the email account you sign in with and sends from your inbox — not from a shared ScholarBridge address — so replies land where you expect them and you keep ownership of the relationship.",
  },
  {
    question: "How do I find professors by field or university?",
    answer:
      "Use search filters for country, university, and research field to build a list. Add individuals or whole groups into buckets, or upload a spreadsheet of targets if you already have names to reach.",
  },
  {
    question: "How many professor emails does ScholarBridge have?",
    answer:
      "The shared email-mining cache includes more than 30,000 professor emails covering 100+ countries. Counts grow as open-access papers are processed country by country; search results reflect what is currently cached.",
  },
  {
    question: "Where do the professor emails come from?",
    answer:
      "Emails are harvested from open-access research papers and related public scholarly metadata—not from private inboxes. The miner works country by country so applicants can filter by location, university, and field.",
  },
  {
    question: "Is ScholarBridge free to start?",
    answer:
      "Yes. You can sign in, search professors, draft research-aware emails, and schedule outreach. Sending real messages requires connecting your email via Google sign-in with send permission.",
  },
  {
    question: "How is this different from a generic email blast tool?",
    answer:
      "Generic blasts ignore a professor’s recent work. ScholarBridge grounds each draft in that researcher’s papers, keeps sends in your own inbox, and organizes targets into buckets so outreach stays specific instead of spammy.",
  },
  {
    question: "Can I upload my own professor list?",
    answer:
      "Yes. Upload a spreadsheet of professors or add people manually, then sort them into buckets. You can also mix uploaded contacts with professors discovered through search and email mining.",
  },
  {
    question: "How do I get support or contact the team?",
    answer:
      "Email alijaved.developer@gmail.com or use the contact form on the site. We usually reply within one to two business days for product questions, partnerships, and support.",
  },
];
