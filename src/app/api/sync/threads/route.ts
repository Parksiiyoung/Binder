import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchMyThreads, extractUrlsFromText } from "@/lib/threads";
import { getStoredToken } from "@/lib/token";
import { detectPlatform } from "@/lib/platform";
import { extractContent } from "@/lib/extractors";
import type { Platform } from "@/types/bookmark";

// POST /api/sync/threads - Sync bookmarks from Threads
export async function POST() {
  const token =
    process.env.THREADS_ACCESS_TOKEN || (await getStoredToken());

  if (!token) {
    return NextResponse.json(
      { error: "Threads 계정이 연동되지 않았습니다. 설정에서 연동해주세요." },
      { status: 401 }
    );
  }

  try {
    // Get last sync time
    const lastSynced = await prisma.bookmark.findFirst({
      where: { threadsPostId: { not: null } },
      orderBy: { syncedAt: "desc" },
      select: { syncedAt: true },
    });

    const since = lastSynced?.syncedAt
      ? lastSynced.syncedAt.toISOString().split("T")[0]
      : undefined;

    const posts = await fetchMyThreads(token, since);

    let created = 0;
    let skipped = 0;

    for (const post of posts) {
      // Skip if already synced
      const exists = await prisma.bookmark.findUnique({
        where: { threadsPostId: post.id },
      });
      if (exists) {
        skipped++;
        continue;
      }

      // Extract URLs from post text
      const urls = post.text ? extractUrlsFromText(post.text) : [];

      for (const url of urls) {
        // Skip if URL already bookmarked
        const urlExists = await prisma.bookmark.findFirst({
          where: { originalUrl: url },
        });
        if (urlExists) {
          skipped++;
          continue;
        }

        const platform = detectPlatform(url);

        // Create bookmark
        let bookmark = await prisma.bookmark.create({
          data: {
            originalUrl: url,
            platform,
            threadsPostId: post.id,
            title: url,
            syncedAt: new Date(),
          },
        });

        // Extract content
        try {
          const extracted = await extractContent(url, platform as Platform);
          bookmark = await prisma.bookmark.update({
            where: { id: bookmark.id },
            data: {
              title: extracted.title || url,
              description: extracted.description,
              content: extracted.content,
              thumbnailUrl: extracted.thumbnailUrl,
              authorName: extracted.authorName,
              publishedAt: extracted.publishedAt,
            },
          });
        } catch (err) {
          console.error(`Extraction failed during sync for ${url}:`, err);
        }

        created++;
      }

      // If no URLs found in text, save the thread post itself if it has a link
      if (urls.length === 0 && post.permalink) {
        // Still mark as synced by using threadsPostId, but don't create a bookmark
        // for plain text threads (no link to bookmark)
      }
    }

    return NextResponse.json({
      success: true,
      synced: created,
      skipped,
      totalPosts: posts.length,
    });
  } catch (err) {
    console.error("Threads sync error:", err);
    return NextResponse.json(
      { error: "동기화 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
