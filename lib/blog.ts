import "server-only";

import { cache } from "react";

import type { BlogPost } from "@/lib/blog-types";
import { createClient } from "@/lib/supabase/server";

const PUBLIC_POST_COLUMNS =
  "id, slug, title, subtitle, excerpt, content, cover_image_url, author_id, author_name, status, tags, published_at, created_at, updated_at";

export async function getPublishedPosts(): Promise<BlogPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(PUBLIC_POST_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return error ? [] : ((data ?? []) as BlogPost[]);
}

export const getPublishedPostBySlug = cache(
  async (slug: string): Promise<BlogPost | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select(PUBLIC_POST_COLUMNS)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    return error ? null : (data as BlogPost | null);
  }
);
