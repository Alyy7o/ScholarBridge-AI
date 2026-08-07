import MarketingShell from "@/components/MarketingShell";
import ContactForm from "@/components/ContactForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact ScholarBridge AI for product questions, partnerships, or support. Email us or use the form — we usually reply within 1–2 business days.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact — ScholarBridge AI",
    description:
      "Questions about ScholarBridge, partnerships, or support — reach the team by email or contact form.",
    url: "/contact",
  },
};

export default function ContactPage() {
  return (
    <MarketingShell activeHref="/contact">
      <ContactForm />
    </MarketingShell>
  );
}
