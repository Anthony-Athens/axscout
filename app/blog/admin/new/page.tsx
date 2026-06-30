import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import { createClient } from "@/lib/supabase/server";
import BlogPostForm from "../BlogPostForm";

export const metadata: Metadata = {
  title: "New Blog Post",
  robots: { index: false, follow: false },
};

export default async function NewBlogPostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <Link
        href="/blog/admin"
        className="text-sm font-semibold text-blue-700 hover:text-blue-800"
      >
        Back to My Posts
      </Link>
      <PageHeader
        label="Blog Admin"
        title="New Post"
        description="Write in Markdown, save a draft, or publish when the article is ready."
      />
      <SectionCard>
        <BlogPostForm />
      </SectionCard>
    </div>
  );
}
