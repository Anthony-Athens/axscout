"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type {
  BlogFormState,
  BlogPostStatus,
} from "@/lib/blog-types";
import { createClient } from "@/lib/supabase/server";

type ValidatedPost = {
  title: string;
  slug: string;
  subtitle: string | null;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  tags: string[];
  status: BlogPostStatus;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

function optionalText(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim() || null;
}

function validatePost(formData: FormData):
  | { post: ValidatedPost }
  | { state: BlogFormState } {
  const title = String(formData.get("title") ?? "").trim();
  const requestedSlug = String(formData.get("slug") ?? "").trim();
  const slug = slugify(requestedSlug || title);
  const content = String(formData.get("content") ?? "").trim();
  const coverImageUrl = optionalText(formData, "coverImageUrl");
  const intent = String(formData.get("intent") ?? "draft");
  const fieldErrors: BlogFormState["fieldErrors"] = {};

  if (title.length < 3 || title.length > 160) {
    fieldErrors.title = "Title must be between 3 and 160 characters.";
  }
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    fieldErrors.slug = "Use lowercase letters, numbers, and hyphens only.";
  }
  if (content.length < 20) {
    fieldErrors.content = "Article content must be at least 20 characters.";
  }
  if (coverImageUrl) {
    try {
      const url = new URL(coverImageUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        fieldErrors.coverImageUrl = "Cover image must use an HTTP or HTTPS URL.";
      }
    } catch {
      fieldErrors.coverImageUrl = "Enter a valid cover image URL.";
    }
  }

  if (Object.keys(fieldErrors).length) {
    return { state: { fieldErrors } };
  }

  const tags = [
    ...new Set(
      String(formData.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 12)
    ),
  ];

  return {
    post: {
      title,
      slug,
      subtitle: optionalText(formData, "subtitle"),
      excerpt: optionalText(formData, "excerpt"),
      content,
      cover_image_url: coverImageUrl,
      tags,
      status: intent === "publish" ? "published" : "draft",
    },
  };
}

async function authenticatedAuthor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, authorName: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const authorName =
    profile?.full_name ??
    user.user_metadata.full_name ??
    user.email?.split("@")[0] ??
    "AXScout contributor";

  return { supabase, user, authorName };
}

function revalidateBlog(slug: string, previousSlug?: string) {
  revalidatePath("/blog");
  revalidatePath("/blog/admin");
  revalidatePath(`/blog/${slug}`);
  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`/blog/${previousSlug}`);
  }
  revalidatePath("/sitemap.xml");
}

export async function createBlogPost(
  _previousState: BlogFormState,
  formData: FormData
): Promise<BlogFormState> {
  const validated = validatePost(formData);
  if ("state" in validated) {
    return validated.state;
  }

  const { supabase, user, authorName } = await authenticatedAuthor();
  if (!user) {
    return { error: "Your session expired. Log in and try again." };
  }

  const publishedAt =
    validated.post.status === "published" ? new Date().toISOString() : null;
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      ...validated.post,
      author_id: user.id,
      author_name: authorName,
      published_at: publishedAt,
    })
    .select("id, slug")
    .single();

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That slug is already in use. Choose another one."
          : "The post could not be created. Please try again.",
    };
  }

  revalidateBlog(data.slug);
  redirect(`/blog/admin/${data.id}/edit?saved=created`);
}

export async function updateBlogPost(
  postId: number,
  _previousState: BlogFormState,
  formData: FormData
): Promise<BlogFormState> {
  const validated = validatePost(formData);
  if ("state" in validated) {
    return validated.state;
  }

  const { supabase, user, authorName } = await authenticatedAuthor();
  if (!user) {
    return { error: "Your session expired. Log in and try again." };
  }

  const { data: existing } = await supabase
    .from("blog_posts")
    .select("slug, published_at")
    .eq("id", postId)
    .eq("author_id", user.id)
    .maybeSingle();
  if (!existing) {
    return { error: "This post is unavailable or you do not own it." };
  }

  const publishedAt =
    validated.post.status === "published"
      ? existing.published_at ?? new Date().toISOString()
      : null;
  const { data, error } = await supabase
    .from("blog_posts")
    .update({
      ...validated.post,
      author_name: authorName,
      published_at: publishedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .eq("author_id", user.id)
    .select("slug")
    .maybeSingle();

  if (error || !data) {
    return {
      error:
        error?.code === "23505"
          ? "That slug is already in use. Choose another one."
          : "The post could not be updated. Please try again.",
    };
  }

  revalidateBlog(data.slug, existing.slug);
  redirect(`/blog/admin/${postId}/edit?saved=${validated.post.status}`);
}
