"use client";

import { useActionState } from "react";

import type { BlogFormState, BlogPost } from "@/lib/blog-types";
import { createBlogPost, updateBlogPost } from "./actions";

type BlogPostFormProps = {
  post?: BlogPost;
};

type BlogAction = (
  previousState: BlogFormState,
  formData: FormData
) => Promise<BlogFormState>;

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

export default function BlogPostForm({ post }: BlogPostFormProps) {
  const action: BlogAction = post
    ? updateBlogPost.bind(null, post.id)
    : createBlogPost;
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <label
            htmlFor="title"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Title
          </label>
          <input
            id="title"
            name="title"
            defaultValue={post?.title ?? ""}
            required
            maxLength={160}
            className={fieldClass}
          />
          {state.fieldErrors?.title ? (
            <p className="mt-2 text-sm text-red-700">
              {state.fieldErrors.title}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="slug"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            defaultValue={post?.slug ?? ""}
            maxLength={180}
            placeholder="Generated from title when blank"
            className={fieldClass}
          />
          {state.fieldErrors?.slug ? (
            <p className="mt-2 text-sm text-red-700">
              {state.fieldErrors.slug}
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Lowercase letters, numbers, and hyphens only.
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="subtitle"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Subtitle
        </label>
        <input
          id="subtitle"
          name="subtitle"
          defaultValue={post?.subtitle ?? ""}
          className={fieldClass}
        />
      </div>

      <div>
        <label
          htmlFor="excerpt"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Excerpt
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          defaultValue={post?.excerpt ?? ""}
          rows={3}
          className={fieldClass}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <label
            htmlFor="coverImageUrl"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Cover Image URL
          </label>
          <input
            id="coverImageUrl"
            name="coverImageUrl"
            type="url"
            defaultValue={post?.cover_image_url ?? ""}
            placeholder="https://example.com/image.jpg"
            className={fieldClass}
          />
          {state.fieldErrors?.coverImageUrl ? (
            <p className="mt-2 text-sm text-red-700">
              {state.fieldErrors.coverImageUrl}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="tags"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Tags
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={post?.tags?.join(", ") ?? ""}
            placeholder="Statcast, Team Trends, Scouting"
            className={fieldClass}
          />
          <p className="mt-2 text-xs text-slate-500">
            Separate tags with commas.
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor="content"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Article Content (Markdown)
        </label>
        <textarea
          id="content"
          name="content"
          defaultValue={post?.content ?? ""}
          rows={24}
          required
          className={`${fieldClass} font-mono text-sm leading-6`}
        />
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Add visual aids by pasting image URLs into the content using Markdown
          syntax: ![description](https://image-url.com/chart.png).
        </p>
        {state.fieldErrors?.content ? (
          <p className="mt-2 text-sm text-red-700">
            {state.fieldErrors.content}
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6">
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={pending}
          className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save Draft"}
        </button>
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Saving..." : "Publish"}
        </button>
      </div>
    </form>
  );
}
