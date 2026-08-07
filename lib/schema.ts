import { SITE_EMAIL, SITE_NAME, SITE_URL, DEFAULT_DESCRIPTION } from "@/lib/site";
import { HOW_IT_WORKS_STEPS } from "@/lib/how-it-works-steps";
import { FAQ_ITEMS } from "@/lib/faq";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/logos/logo-app.png`,
    image: `${SITE_URL}/og.jpg`,
    email: SITE_EMAIL,
    description: DEFAULT_DESCRIPTION,
    foundingDate: "2025",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SITE_EMAIL,
      url: `${SITE_URL}/contact`,
      availableLanguage: ["English"],
    },
    founder: {
      "@type": "Person",
      name: "Ali Javed",
      email: SITE_EMAIL,
      url: `${SITE_URL}/about`,
    },
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: "en",
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}

export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    featureList: [
      "Professor search by country, university, and field",
      "30,000+ professor emails across 100+ countries",
      "AI drafts grounded in recent papers",
      "Campaign scheduling from your email",
    ],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

export function howToSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to run research-aware professor outreach with ScholarBridge AI",
    description:
      "Five steps from finding professors to sending personalized outreach from your email.",
    totalTime: "PT30M",
    step: HOW_IT_WORKS_STEPS.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.body,
      url: `${SITE_URL}/how-it-works`,
    })),
  };
}

export function faqPageSchema(items = FAQ_ITEMS) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      ...items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: item.name,
        item: `${SITE_URL}${item.path}`,
      })),
    ],
  };
}

export function speakableSchema(cssSelectors: string[], url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: SITE_NAME,
    url: `${SITE_URL}${url === "/" ? "" : url}`,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: cssSelectors,
    },
  };
}

export function personSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Ali Javed",
    email: SITE_EMAIL,
    jobTitle: "Founder",
    worksFor: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    url: `${SITE_URL}/about`,
  };
}
