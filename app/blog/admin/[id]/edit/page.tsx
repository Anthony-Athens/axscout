import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import type { BlogPost } from "@/lib/blog-types";
import { createClient } from "@/lib/supabase/server";
import BlogPostForm from "../../BlogPostForm";

export const metadata: Metadata = {
  title: "Edit Blog Post",
  robots: { index: false, follow: false },
};

type EditBlogPostPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
};

const savedMessages: Record<string, string> = {
  created: "Post created successfully.",
  draft: "Draft saved successfully.",
  published: "Post published successfully.",
};

export default async function EditBlogPostPage({
  params,
  searchParams,
}: EditBlogPostPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { id: rawId } = await params;
  const postId = Number(rawId);
  if (!Number.isSafeInteger(postId) || postId < 1) {
    notFound();
  }
  const { data } = await supabase
    .from("blog_posts")
    .select(
      "id, slug, title, subtitle, excerpt, content, cover_image_url, author_id, author_name, status, tags, published_at, created_at, updated_at"
    )
    .eq("id", postId)
    .eq("author_id", user.id)
    .maybeSingle();
  if (!data) {
    notFound();
  }

  const post = data as BlogPost;
  const { saved } = await searchParams;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/blog/admin"
          className="text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          Back to My Posts
        </Link>
        {post.status === "published" ? (
          <Link
            href={`/blog/${post.slug}`}
            className="text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            View Published Article
          </Link>
        ) : null}
      </div>
      <PageHeader
        label="Blog Admin"
        title="Edit Post"
        description="Update the article, save a draft, or publish the latest version."
      />
      <SectionCard>
        {saved && savedMessages[saved] ? (
          <p
            role="status"
            className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {savedMessages[saved]}
          </p>
        ) : null}
        <BlogPostForm post={post} />
      </SectionCard>
    </div>
  );
}
