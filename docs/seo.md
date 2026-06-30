# SEO

AXScout uses the Next.js App Router Metadata API, dynamic sitemap and robots
files, and JSON-LD structured data to describe public analytics and Blog pages.

## Site origin

Set the canonical production origin in every deployed environment:

```text
NEXT_PUBLIC_SITE_URL=https://www.axscout.com
```

Metadata, canonical URLs, Open Graph URLs, structured data, `robots.txt`, and
`sitemap.xml` all derive from this value. Do not set it to localhost in a
production deployment and do not include a trailing path.

## Metadata strategy

The root layout defines the AXScout title template, default description,
Open Graph website identity, and Twitter card defaults. Public pages use the
shared metadata helper in `lib/metadata.ts` to keep each route's title,
description, canonical URL, Open Graph URL, and Twitter copy aligned.

Private author and account routes are marked for exclusion through robots
rules or page metadata where applicable.

## Blog metadata

Published Blog posts generate metadata from their stored title, excerpt,
subtitle, content, author, tags, dates, and optional cover image. Description
selection follows this order:

1. Excerpt
2. Subtitle
3. A bounded plain-text snippet derived from Markdown content

Markdown syntax and fenced code are removed from fallback descriptions. Missing
or unpublished posts return not-found behavior and `noindex` metadata. Drafts
remain unavailable to public queries through existing RLS and status filters.

## Structured data

The homepage publishes `WebSite`, `Organization`, and `SoftwareApplication`
JSON-LD. Published article pages publish `BlogPosting` JSON-LD with canonical
URL, headline, description, author, publisher, publication dates, tags, and
cover image when available.

JSON-LD is serialized through the shared `JsonLd` component, which escapes `<`
characters before inserting the payload into an `application/ld+json` script.

## Sitemap

`/sitemap.xml` includes public static routes and dynamically queries published
Blog posts. Draft posts and Blog admin routes are not included. Blog cover
images are added to sitemap entries when present.

Verify locally or in production:

```text
https://www.axscout.com/sitemap.xml
```

## Robots

`/robots.txt` allows public crawling and references the canonical sitemap. It
disallows API, auth callback, Blog admin, profile, login, and signup routes.

Verify:

```text
https://www.axscout.com/robots.txt
```

## Validation

- Inspect page source for title, description, canonical, Open Graph, and
  Twitter tags.
- Validate JSON-LD with Google's Rich Results Test and Schema Markup Validator.
- Confirm only published Blog URLs appear in the sitemap.
- Confirm private and account routes appear under `Disallow` in robots.

## Future improvements

- Generate branded Open Graph images for core routes and Blog posts.
- Register and monitor Google Search Console.
- Register Bing Webmaster Tools.
- Expand schema as product entities and public datasets mature.
- Continue page-speed and Core Web Vitals optimization.
- Build a deliberate internal-linking strategy between analytics, scouting,
  predictions, and related Blog content.
