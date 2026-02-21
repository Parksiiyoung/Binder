import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractContent } from "@/lib/extractors";
import type { Platform } from "@/types/bookmark";

// POST /api/extract/:id - Re-extract content for a bookmark
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const bookmark = await prisma.bookmark.findUnique({
    where: { id: params.id },
  });

  if (!bookmark) {
    return NextResponse.json(
      { error: "북마크를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  try {
    const extracted = await extractContent(
      bookmark.originalUrl,
      bookmark.platform as Platform
    );

    const updated = await prisma.bookmark.update({
      where: { id: bookmark.id },
      data: {
        title: extracted.title || bookmark.title,
        description: extracted.description,
        content: extracted.content,
        thumbnailUrl: extracted.thumbnailUrl,
        authorName: extracted.authorName,
        publishedAt: extracted.publishedAt,
      },
    });

    return NextResponse.json({ bookmark: updated });
  } catch (err) {
    console.error(`Re-extraction failed for ${bookmark.originalUrl}:`, err);
    return NextResponse.json(
      { error: "콘텐츠 추출에 실패했습니다." },
      { status: 500 }
    );
  }
}
