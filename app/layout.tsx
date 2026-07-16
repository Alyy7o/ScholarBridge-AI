import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ScholarBridge AI",
  description: "AI-personalized professor outreach — research, draft, schedule, send.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
