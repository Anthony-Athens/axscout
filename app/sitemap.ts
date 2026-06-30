import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

const publicRoutes = [
  { path: "", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/dashboard", changeFrequency: "daily" as const, priority: 0.9 },
  { path: "/trends/team", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/trends/individual", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/scouting-report", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/blog", changeFrequency: "weekly" as const, priority: 0.5 },
  { path: "/predictions", changeFrequency: "weekly" as const, priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.2 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.2 },
  { path: "/disclaimer", changeFrequency: "yearly" as const, priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  }));
}
