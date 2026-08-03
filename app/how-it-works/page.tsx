import HowItWorksPage from "@/components/HowItWorks";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How it works — ScholarBridge AI",
  description: "Five steps from finding professors to sending personalized outreach from your Gmail.",
};

export default function Page() {
  return <HowItWorksPage />;
}
