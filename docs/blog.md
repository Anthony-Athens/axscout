# Blog

AXScout's Blog supports public Markdown articles and an authenticated author
workspace for drafting, editing, and publishing posts.

## Table structure

`public.blog_posts` stores the slug, title, optional subtitle and excerpt,
Markdown content, optional cover image URL, author identity, status, tags, and
publication timestamps. Slugs are unique. Status is limited to `draft` or
`published`.

## Access and RLS

- Public users can select published posts only.
- Authenticated authors can select their own drafts and published posts.
- Authenticated authors can insert posts only with their own user ID.
- Authors can update or delete only their own posts.

The project does not currently expose an admin role or profile flag. Author
ownership is therefore the temporary publishing boundary. Add a dedicated
admin role and update the write policies before granting accounts to untrusted
multi-user publishers.

## Author workflow

1. Sign in to AXScout.
2. Open `/blog` and select **Manage Posts**.
3. Select **New Post**, write the article, and save it as a draft.
4. Open the post from **My Posts** to continue editing.
5. Select **Publish** when ready. The first publication sets `published_at`.

Returning a published post to draft clears `published_at` and removes it from
public Blog queries. Republishing sets a new publication timestamp.

## Markdown and visual aids

Article content supports headings, paragraphs, emphasis, links, ordered and
unordered lists, blockquotes, code blocks, tables, and images. Raw HTML is not
enabled.

Insert a visual aid with standard Markdown image syntax:

```markdown
![Run differential trend](https://example.com/run-differential-chart.png)
```

The cover image field and in-article images currently use remote HTTP or HTTPS
URLs. Only use images you are authorized to publish.

## SEO

The Blog index has route metadata. Published article pages generate title,
description, canonical, Open Graph article metadata, and optional cover image
metadata. Published article URLs are included dynamically in `sitemap.xml`.

## Future improvements

- Supabase Storage uploads and an image library
- A richer editor with Markdown preview
- A dedicated admin role and approval workflow
- Scheduled publishing
- Revision history
- Comments and moderation
