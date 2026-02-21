import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import type { ExtractedContent } from "./types";
import { extractOpenGraph, getHtml } from "./opengraph";

export async function extractWebpage(url: string): Promise<ExtractedContent> {
  const html = await getHtml(url);

  // Extract OG tags first
  const $ = await import("cheerio").then((c) => c.load(html));
  const getMeta = (property: string): string | undefined =>
    $(`meta[property="${property}"]`).attr("content") ||
    $(`meta[name="${property}"]`).attr("content") ||
    undefined;

  // Use Readability for article body
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const title =
    article?.title || getMeta("og:title") || $("title").text().trim() || undefined;
  const description = getMeta("og:description") || article?.excerpt || undefined;
  const thumbnailUrl = getMeta("og:image") || undefined;
  const authorName =
    article?.byline || getMeta("article:author") || getMeta("author") || undefined;

  const publishedAtStr =
    getMeta("article:published_time") || getMeta("date") || undefined;
  const publishedAt = publishedAtStr ? new Date(publishedAtStr) : undefined;

  // Truncate article content to avoid DB bloat (keep first 5000 chars)
  const content = article?.textContent
    ? article.textContent.substring(0, 5000).trim()
    : undefined;

  return { title, description, content, thumbnailUrl, authorName, publishedAt };
}
