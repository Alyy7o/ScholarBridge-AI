import MarketingShell from "@/components/MarketingShell";
import ContactForm from "@/components/ContactForm";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, speakableSchema } from "@/lib/schema";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact ScholarBridge AI for product questions, partnerships, or support about research-aware professor outreach and the 30,000+ email cache. We usually reply within 1–2 business days.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact — ScholarBridge AI",
    description:
      "Reach the ScholarBridge team by email or contact form for product, partnership, and support questions.",
    url: "/contact",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "ScholarBridge AI" }],
  },
};

export default function ContactPage() {
  return (
    <MarketingShell activeHref="/contact">
      <JsonLd
        data={[
          breadcrumbSchema([{ name: "Contact", path: "/contact" }]),
          speakableSchema([".speakable", "h1", ".lead"], "/contact"),
        ]}
      />
      <ContactForm />
    </MarketingShell>
  );
}
