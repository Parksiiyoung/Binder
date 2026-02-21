import type { Platform } from "@/types/bookmark";
import type { ExtractedContent } from "./types";
import { extractYouTube } from "./youtube";
import { extractWebpage } from "./webpage";
import { extractTwitter } from "./twitter";
import { extractInstagram } from "./instagram";
import { extractOpenGraph } from "./opengraph";

export type { ExtractedContent };

const extractorMap: Record<
  Platform,
  (url: string) => Promise<ExtractedContent>
> = {
  YOUTUBE: extractYouTube,
  TWITTER: extractTwitter,
  INSTAGRAM: extractInstagram,
  WEB: extractWebpage,
  OTHER: extractOpenGraph,
};

export async function extractContent(
  url: string,
  platform: Platform
): Promise<ExtractedContent> {
  const extractor = extractorMap[platform] || extractOpenGraph;

  try {
    const result = await extractor(url);
    // If primary extractor returned nothing useful, try OG fallback
    if (!result.title && platform !== "WEB" && platform !== "OTHER") {
      const fallback = await extractOpenGraph(url);
      return { ...fallback, ...stripEmpty(result) };
    }
    return result;
  } catch (err) {
    console.error(`Extraction failed for ${url} (${platform}):`, err);
    // Last resort: try OG tags
    try {
      return await extractOpenGraph(url);
    } catch {
      return {};
    }
  }
}

function stripEmpty(obj: ExtractedContent): Partial<ExtractedContent> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== "") {
      result[key] = value;
    }
  }
  return result as Partial<ExtractedContent>;
}
