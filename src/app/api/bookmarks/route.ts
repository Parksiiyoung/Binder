import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectPlatform } from "@/lib/platform";
import { extractContent } from "@/lib/extractors";
import { analyzeContent } from "@/lib/ai";
import type { Platform } from "@/types/bookmark";

// GET /api/bookmarks - List bookmarks with filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const platform = searchParams.get("platform");
  const category = searchParams.get("category");
  const isFavorite = searchParams.get("isFavorite");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};

  if (platform) {
    where.platform = platform;
  }
  if (category) {
    where.aiCategory = category;
  }
  if (isFavorite === "true") {
    where.isFavorite = true;
  }
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { aiTitle: { contains: search } },
      { aiSummary: { contains: search } },
      { description: { contains: search } },
      { aiTags: { contains: search } },
      { originalUrl: { contains: search } },
    ];
  }

  const [bookmarks, total] = await Promise.all([
    prisma.bookmark.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.bookmark.count({ where }),
  ]);

  return NextResponse.json({
    bookmarks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// POST /api/bookmarks - Create a bookmark from URL
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { error: "URL은 필수입니다." },
      { status: 400 }
    );
  }

  // Validate URL format
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return NextResponse.json(
      { error: "올바른 URL 형식이 아닙니다." },
      { status: 400 }
    );
  }

  // Check for duplicate
  const existing = await prisma.bookmark.findFirst({
    where: { originalUrl: url },
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 저장된 URL입니다.", bookmark: existing },
      { status: 409 }
    );
  }

  const platform = detectPlatform(url);

  // Create bookmark immediately
  let bookmark = await prisma.bookmark.create({
    data: {
      originalUrl: url,
      platform,
      title: url,
    },
  });

  // Extract content in the background (non-blocking for the response)
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
    console.error(`Content extraction failed for ${url}:`, err);
  }

  // AI analysis (best-effort, don't block response on failure)
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const aiResult = await analyzeContent({
        url,
        platform,
        title: bookmark.title,
        description: bookmark.description,
        content: bookmark.content,
        authorName: bookmark.authorName,
      });
      bookmark = await prisma.bookmark.update({
        where: { id: bookmark.id },
        data: {
          aiTitle: aiResult.aiTitle,
          aiSummary: aiResult.aiSummary,
          aiTags: JSON.stringify(aiResult.aiTags),
          aiCategory: aiResult.aiCategory,
          aiProcessed: true,
        },
      });
    } catch (err) {
      console.error(`AI analysis failed for ${url}:`, err);
    }
  }

  return NextResponse.json({ bookmark }, { status: 201 });
}
