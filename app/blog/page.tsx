import Link from "next/link";

import PageHeader from "@/components/layout/PageHeader";
import { getPublishedPosts } from "@/lib/blog";
import { createPageMetadata } from "@/lib/metadata";
import { createClient } from "@/lib/supabase/server";

export const metadata = createPageMetadata({
  title: "Blog",
  description:
    "Read AXScout updates, MLB analytics articles, scouting report examples, prediction notes, and baseball intelligence product updates.",
  path: "/blog",
});

function formatDate(value: string | null) {
  if (!value) {
    return "Publication date pending";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default async function BlogPage() {
  const supabase = await createClient();
  const [{ data: { user } }, posts] = await Promise.all([
    supabase.auth.getUser(),
    getPublishedPosts(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <PageHeader
          label="AXScout Analysis"
          title="Blog"
          description="Baseball analysis, Statcast research, scouting ideas, and a closer look at the data powering AXScout."
        />
        {user ? (
          <Link
            href="/blog/admin"
            className="rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
          >
            Manage Posts
          </Link>
        ) : null}
      </div>

      {posts.length ? (
        <section
          aria-label="Published articles"
          className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
        >
          {posts.map((post) => (
            <article
              key={post.id}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              {post.cover_image_url ? (
                // Blog images are author-provided remote URLs from arbitrary hosts.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.cover_image_url}
                  alt={`${post.title} cover`}
                  className="aspect-[16/9] w-full object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                  <time dateTime={post.published_at ?? undefined}>
                    {formatDate(post.published_at)}
                  </time>
                  <span aria-hidden="true">|</span>
                  <span>{post.author_name ?? "AXScout"}</span>
                </div>
                <h2 className="mt-3 text-xl font-bold text-slate-950">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="hover:text-blue-700"
                  >
                    {post.title}
                  </Link>
                </h2>
                {post.subtitle || post.excerpt ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                    {post.subtitle ?? post.excerpt}
                  </p>
                ) : null}
                {post.tags?.length ? (
                  <ul className="mt-5 flex flex-wrap gap-2" aria-label="Tags">
                    {post.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-6 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  Read article
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Articles are coming soon.
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            AXScout analysis and research will appear here as it is published.
          </p>
        </div>
      )}
    </div>
  );
}
