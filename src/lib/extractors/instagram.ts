import type { ExtractedContent } from "./types";
import { extractOpenGraph } from "./opengraph";

export async function extractInstagram(url: string): Promise<ExtractedContent> {
  // Instagram: rely on OG tags (API requires business account + review)
  return extractOpenGraph(url);
}
