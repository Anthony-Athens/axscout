import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import MarkdownArticle from "@/components/blog/MarkdownArticle";
import { getPublishedPostBySlug } from "@/lib/blog";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Publication date pending";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
  }).format(new Date(value));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) {
    return { title: "Article Not Found" };
  }
  const description =
    post.excerpt ?? post.subtitle ?? `Read ${post.title} on AXScout.`;

  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      authors: post.author_name ? [post.author_name] : undefined,
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-4xl">
      <Link
        href="/blog"
        className="text-sm font-semibold text-blue-700 hover:text-blue-800"
      >
        Back to Blog
      </Link>

      <header className="mt-8 border-b border-slate-200 pb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          AXScout Analysis
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
          {post.title}
        </h1>
        {post.subtitle ? (
          <p className="mt-5 text-xl leading-8 text-slate-600">
            {post.subtitle}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-500">
          <span>By {post.author_name ?? "AXScout"}</span>
          <span aria-hidden="true">|</span>
          <time dateTime={post.published_at ?? undefined}>
            {formatDate(post.published_at)}
          </time>
        </div>
        {post.tags?.length ? (
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Tags">
            {post.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      {post.cover_image_url ? (
        // Blog images are author-provided remote URLs from arbitrary hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover_image_url}
          alt=""
          className="mt-8 aspect-[16/9] w-full rounded-lg border border-slate-200 object-cover shadow-sm"
        />
      ) : null}

      <div className="pb-12 pt-4">
        <MarkdownArticle content={post.content} />
      </div>
    </article>
  );
}
