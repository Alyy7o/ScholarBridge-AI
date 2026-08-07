import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/about", "/how-it-works", "/contact", "/faq", "/privacy", "/terms"];
  const lastModified = new Date();

  return paths.map((path) => ({
    url: `${SITE_URL}${path || "/"}`,
    lastModified,
    changeFrequency: path === "" || path === "/faq" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/how-it-works" || path === "/faq" ? 0.8 : 0.6,
  }));
}
