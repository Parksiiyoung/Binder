import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeContent } from "@/lib/ai";

// POST /api/ai/process/:id - AI-analyze a single bookmark
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
    const result = await analyzeContent({
      url: bookmark.originalUrl,
      platform: bookmark.platform,
      title: bookmark.title,
      description: bookmark.description,
      content: bookmark.content,
      authorName: bookmark.authorName,
    });

    const updated = await prisma.bookmark.update({
      where: { id: bookmark.id },
      data: {
        aiTitle: result.aiTitle,
        aiSummary: result.aiSummary,
        aiTags: JSON.stringify(result.aiTags),
        aiCategory: result.aiCategory,
        aiProcessed: true,
      },
    });

    return NextResponse.json({ bookmark: updated });
  } catch (err) {
    console.error(`AI processing failed for ${bookmark.id}:`, err);
    return NextResponse.json(
      { error: "AI 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
