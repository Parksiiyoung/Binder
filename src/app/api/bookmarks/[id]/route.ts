import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/bookmarks/:id
export async function GET(
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

  return NextResponse.json({ bookmark });
}

// PATCH /api/bookmarks/:id - Update bookmark fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();

  const allowedFields = [
    "title",
    "isFavorite",
    "isRead",
    "userNote",
    "userTags",
  ];
  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      data[field] = body[field];
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "수정할 필드가 없습니다." },
      { status: 400 }
    );
  }

  const bookmark = await prisma.bookmark.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ bookmark });
}

// DELETE /api/bookmarks/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.bookmark.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
