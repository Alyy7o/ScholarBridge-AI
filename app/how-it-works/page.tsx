import HowItWorksPage from "@/components/HowItWorks";
import JsonLd from "@/components/JsonLd";
import { howToSchema } from "@/lib/schema";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Five steps from finding professors to sending personalized, research-aware outreach from your email with ScholarBridge AI.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How it works — ScholarBridge AI",
    description:
      "Five steps from finding professors to sending personalized outreach from your email.",
    url: "/how-it-works",
  },
};

export default function Page() {
  return (
    <>
      <JsonLd data={howToSchema()} />
      <HowItWorksPage />
    </>
  );
}
