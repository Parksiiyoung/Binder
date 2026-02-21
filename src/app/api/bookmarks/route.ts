import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectPlatform } from "@/lib/platform";

// GET /api/bookmarks - List bookmarks with filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const platform = searchParams.get("platform");
  const isFavorite = searchParams.get("isFavorite");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};

  if (platform) {
    where.platform = platform;
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

  const bookmark = await prisma.bookmark.create({
    data: {
      originalUrl: url,
      platform,
      title: url, // Placeholder until extraction
    },
  });

  return NextResponse.json({ bookmark }, { status: 201 });
}
