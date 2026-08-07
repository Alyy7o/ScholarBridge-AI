import HowItWorksPage from "@/components/HowItWorks";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, howToSchema, speakableSchema } from "@/lib/schema";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Five steps from finding professors in a 30,000+ email cache across 100+ countries to sending personalized, research-aware outreach from your email.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How it works — ScholarBridge AI",
    description:
      "Five steps from finding professors to sending personalized outreach from your email.",
    url: "/how-it-works",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "ScholarBridge AI" }],
  },
};

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          howToSchema(),
          breadcrumbSchema([{ name: "How it works", path: "/how-it-works" }]),
          speakableSchema([".hiw-hero h1", ".hiw-hero p", ".speakable"], "/how-it-works"),
        ]}
      />
      <HowItWorksPage />
    </>
  );
}
