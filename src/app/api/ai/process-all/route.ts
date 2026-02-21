import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeContent } from "@/lib/ai";

// POST /api/ai/process-all - AI-analyze all unprocessed bookmarks
export async function POST() {
  const unprocessed = await prisma.bookmark.findMany({
    where: { aiProcessed: false },
    orderBy: { createdAt: "desc" },
    take: 50, // Process max 50 at a time
  });

  if (unprocessed.length === 0) {
    return NextResponse.json({
      success: true,
      processed: 0,
      message: "처리할 북마크가 없습니다.",
    });
  }

  let processed = 0;
  let failed = 0;

  for (const bookmark of unprocessed) {
    try {
      const result = await analyzeContent({
        url: bookmark.originalUrl,
        platform: bookmark.platform,
        title: bookmark.title,
        description: bookmark.description,
        content: bookmark.content,
        authorName: bookmark.authorName,
      });

      await prisma.bookmark.update({
        where: { id: bookmark.id },
        data: {
          aiTitle: result.aiTitle,
          aiSummary: result.aiSummary,
          aiTags: JSON.stringify(result.aiTags),
          aiCategory: result.aiCategory,
          aiProcessed: true,
        },
      });

      processed++;
    } catch (err) {
      console.error(`AI processing failed for ${bookmark.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    failed,
    total: unprocessed.length,
  });
}
