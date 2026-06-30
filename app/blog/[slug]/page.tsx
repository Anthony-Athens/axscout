import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import MarkdownArticle from "@/components/blog/MarkdownArticle";
import JsonLd from "@/components/seo/JsonLd";
import { getPublishedPostBySlug } from "@/lib/blog";
import { blogPostDescription } from "@/lib/blog-seo";
import { absoluteUrl } from "@/lib/metadata";

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
    return {
      title: "Article Not Found",
      robots: { index: false, follow: false },
    };
  }
  const description = blogPostDescription(post);
  const url = absoluteUrl(`/blog/${post.slug}`);

  return {
    title: post.title,
    description,
    keywords: post.tags ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description,
      siteName: "AXScout",
      type: "article",
      url,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: post.author_name ? [post.author_name] : undefined,
      tags: post.tags ?? undefined,
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
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
  const description = blogPostDescription(post);
  const url = absoluteUrl(`/blog/${post.slug}`);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    url,
    mainEntityOfPage: url,
    image: post.cover_image_url || undefined,
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at,
    author: {
      "@type": post.author_name ? "Person" : "Organization",
      name: post.author_name ?? "AXScout",
    },
    publisher: {
      "@type": "Organization",
      name: "AXScout",
      url: absoluteUrl("/"),
    },
    keywords: post.tags?.length ? post.tags.join(", ") : undefined,
    inLanguage: "en-US",
  };

  return (
    <article className="mx-auto max-w-4xl">
      <JsonLd data={structuredData} />
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
          alt={`${post.title} cover`}
          className="mt-8 aspect-[16/9] w-full rounded-lg border border-slate-200 object-cover shadow-sm"
        />
      ) : null}

      <div className="pb-12 pt-4">
        <MarkdownArticle content={post.content} />
      </div>
    </article>
  );
}
