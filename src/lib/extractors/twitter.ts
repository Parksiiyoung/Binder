import type { ExtractedContent } from "./types";
import { extractOpenGraph } from "./opengraph";

export async function extractTwitter(url: string): Promise<ExtractedContent> {
  // Normalize x.com to twitter.com for better OG compatibility
  const normalized = url.replace("x.com", "twitter.com");

  // Twitter/X: rely on OG tags (free, no API key needed)
  // OG tags usually contain tweet text in og:description and image in og:image
  try {
    return await extractOpenGraph(normalized);
  } catch {
    // If twitter.com fails, try the original URL
    if (normalized !== url) {
      return extractOpenGraph(url);
    }
    return {};
  }
}
