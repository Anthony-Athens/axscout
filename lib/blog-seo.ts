import type { BlogPost } from "@/lib/blog-types";

function cleanMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}(?:>|[-*+] |\d+\. )/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, maximum = 160) {
  if (value.length <= maximum) {
    return value;
  }
  const shortened = value.slice(0, maximum - 1);
  const lastSpace = shortened.lastIndexOf(" ");
  const boundary = lastSpace > 100 ? lastSpace : shortened.length;
  return `${shortened.slice(0, boundary).trim()}...`;
}

export function blogPostDescription(post: BlogPost) {
  const preferred = post.excerpt ?? post.subtitle;
  const description = cleanMarkdown(preferred || post.content);
  return truncate(description || `Read ${post.title} on AXScout.`);
}
