export type BlogPostStatus = "draft" | "published";

export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  author_id: string;
  author_name: string | null;
  status: BlogPostStatus;
  tags: string[] | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"title" | "slug" | "content" | "coverImageUrl", string>
  >;
};
