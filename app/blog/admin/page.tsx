import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import type { BlogPost } from "@/lib/blog-types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Manage Blog Posts",
  robots: { index: false, follow: false },
};

function formatDate(value: string | null) {
  if (!value) {
    return "--";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default async function BlogAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("blog_posts")
    .select(
      "id, slug, title, subtitle, excerpt, content, cover_image_url, author_id, author_name, status, tags, published_at, created_at, updated_at"
    )
    .eq("author_id", user.id)
    .order("updated_at", { ascending: false });
  const posts = (data ?? []) as BlogPost[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <PageHeader
          label="Blog Admin"
          title="My Posts"
          description="Draft, edit, and publish AXScout analysis articles."
        />
        <Link
          href="/blog/admin/new"
          className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          New Post
        </Link>
      </div>

      <SectionCard>
        {posts.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-600">
                <tr>
                  {[
                    "Title",
                    "Status",
                    "Created",
                    "Published",
                    "Updated",
                    "",
                  ].map((column) => (
                    <th
                      key={column || "actions"}
                      scope="col"
                      className="px-4 py-3 font-semibold first:pl-0 last:pr-0"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td className="px-4 py-4 pl-0">
                      <p className="font-semibold text-slate-950">
                        {post.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        /blog/{post.slug}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          post.status === "published"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                        }`}
                      >
                        {post.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                      {formatDate(post.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                      {formatDate(post.published_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                      {formatDate(post.updated_at)}
                    </td>
                    <td className="px-4 py-4 pr-0 text-right">
                      <Link
                        href={`/blog/admin/${post.id}/edit`}
                        className="font-semibold text-blue-700 hover:text-blue-800"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center">
            <h2 className="font-semibold text-slate-900">No posts yet.</h2>
            <p className="mt-2 text-sm text-slate-600">
              Start with a draft and publish when the article is ready.
            </p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
