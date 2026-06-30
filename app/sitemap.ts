import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("slug, updated_at, cover_image_url")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const routes: MetadataRoute.Sitemap = publicRoutes.map(
    ({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
    })
  );
  const posts: MetadataRoute.Sitemap = (data ?? []).map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.updated_at,
    changeFrequency: "monthly",
    priority: 0.6,
    images: post.cover_image_url ? [post.cover_image_url] : undefined,
  }));

  return [...routes, ...posts];
}
