import type { Platform } from "@/types/bookmark";

export function detectPlatform(url: string): Platform {
  if (/youtube\.com|youtu\.be/i.test(url)) return "YOUTUBE";
  if (/twitter\.com|x\.com/i.test(url)) return "TWITTER";
  if (/instagram\.com/i.test(url)) return "INSTAGRAM";
  return "WEB";
}
