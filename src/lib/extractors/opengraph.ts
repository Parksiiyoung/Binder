import * as cheerio from "cheerio";
import type { ExtractedContent } from "./types";

export async function extractOpenGraph(url: string): Promise<ExtractedContent> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Binder/1.0; +https://github.com/binder)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  });

  const html = await res.text();
  const $ = cheerio.load(html);

  const getMeta = (property: string): string | undefined => {
    return (
      $(`meta[property="${property}"]`).attr("content") ||
      $(`meta[name="${property}"]`).attr("content") ||
      undefined
    );
  };

  const title =
    getMeta("og:title") || $("title").text().trim() || undefined;
  const description =
    getMeta("og:description") || getMeta("description") || undefined;
  const thumbnailUrl = getMeta("og:image") || undefined;
  const authorName =
    getMeta("article:author") || getMeta("author") || undefined;

  const publishedAtStr =
    getMeta("article:published_time") || getMeta("date") || undefined;
  const publishedAt = publishedAtStr ? new Date(publishedAtStr) : undefined;

  return { title, description, thumbnailUrl, authorName, publishedAt };
}

export function getHtml(url: string): Promise<string> {
  return fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Binder/1.0; +https://github.com/binder)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  }).then((res) => res.text());
}
