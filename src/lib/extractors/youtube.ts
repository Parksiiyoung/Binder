import type { ExtractedContent } from "./types";

function extractVideoId(url: string): string | null {
  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&#]+)/);
  if (watchMatch) return watchMatch[1];

  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?&#]+)/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/shorts/VIDEO_ID
  const shortsMatch = url.match(/\/shorts\/([^?&#]+)/);
  if (shortsMatch) return shortsMatch[1];

  return null;
}

export async function extractYouTube(url: string): Promise<ExtractedContent> {
  const videoId = extractVideoId(url);
  if (!videoId) return {};

  const apiKey = process.env.YOUTUBE_API_KEY;

  // If no API key, fall back to oEmbed (no key required)
  if (!apiKey) {
    return extractYouTubeOEmbed(url);
  }

  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,statistics`;

  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    return extractYouTubeOEmbed(url);
  }

  const data = await res.json();
  const item = data.items?.[0];
  if (!item) return {};

  const snippet = item.snippet;
  return {
    title: snippet.title,
    description: snippet.description,
    thumbnailUrl:
      snippet.thumbnails?.maxres?.url ||
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url,
    authorName: snippet.channelTitle,
    publishedAt: new Date(snippet.publishedAt),
  };
}

async function extractYouTubeOEmbed(url: string): Promise<ExtractedContent> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return {};

  const data = await res.json();
  return {
    title: data.title,
    thumbnailUrl: data.thumbnail_url,
    authorName: data.author_name,
  };
}
