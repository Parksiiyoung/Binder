"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Bookmark } from "@prisma/client";
import PlatformBadge from "@/components/PlatformIcon";

export default function BookmarkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetch(`/api/bookmarks/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setBookmark(data.bookmark);
        setNote(data.bookmark?.userNote || "");
      })
      .catch((err) => console.error("Failed to load bookmark:", err))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleSaveNote() {
    if (!bookmark) return;
    setSaving(true);
    const res = await fetch(`/api/bookmarks/${bookmark.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userNote: note }),
    });
    if (res.ok) {
      const data = await res.json();
      setBookmark(data.bookmark);
    }
    setSaving(false);
  }

  async function handleAnalyze() {
    if (!bookmark) return;
    setAnalyzing(true);
    const res = await fetch(`/api/ai/process/${bookmark.id}`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      setBookmark(data.bookmark);
    }
    setAnalyzing(false);
  }

  async function handleToggleFavorite() {
    if (!bookmark) return;
    const res = await fetch(`/api/bookmarks/${bookmark.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !bookmark.isFavorite }),
    });
    if (res.ok) {
      const data = await res.json();
      setBookmark(data.bookmark);
    }
  }

  async function handleToggleRead() {
    if (!bookmark) return;
    const res = await fetch(`/api/bookmarks/${bookmark.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: !bookmark.isRead }),
    });
    if (res.ok) {
      const data = await res.json();
      setBookmark(data.bookmark);
    }
  }

  async function handleDelete() {
    if (!bookmark || !confirm("이 북마크를 삭제할까요?")) return;
    await fetch(`/api/bookmarks/${bookmark.id}`, { method: "DELETE" });
    router.push("/");
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-gray-400">
        불러오는 중...
      </div>
    );
  }

  if (!bookmark) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-gray-500">북마크를 찾을 수 없습니다.</p>
        <Link href="/" className="text-blue-500 text-sm mt-2 inline-block">
          ← 홈으로
        </Link>
      </div>
    );
  }

  let tags: string[] = [];
  try {
    tags = bookmark.aiTags ? JSON.parse(bookmark.aiTags) : [];
  } catch { /* ignore malformed JSON */ }
  const isYouTube = bookmark.platform === "YOUTUBE";

  // Extract YouTube video ID for embed
  let youtubeId: string | null = null;
  if (isYouTube) {
    const match =
      bookmark.originalUrl.match(/[?&]v=([^&#]+)/) ||
      bookmark.originalUrl.match(/youtu\.be\/([^?&#]+)/) ||
      bookmark.originalUrl.match(/\/shorts\/([^?&#]+)/);
    const raw = match?.[1] || null;
    youtubeId = raw && /^[a-zA-Z0-9_-]+$/.test(raw) ? raw : null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/"
        className="text-gray-400 hover:text-gray-600 text-sm mb-6 inline-block"
      >
        ← 목록으로
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Header badges */}
        <div className="flex items-center gap-2 mb-4">
          <PlatformBadge platform={bookmark.platform} />
          {bookmark.aiCategory && (
            <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
              {bookmark.aiCategory}
            </span>
          )}
          {bookmark.isRead && (
            <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
              읽음
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto">
            {new Date(bookmark.createdAt).toLocaleString("ko-KR")}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {bookmark.aiTitle || bookmark.title || bookmark.originalUrl}
        </h1>

        {/* Author */}
        {bookmark.authorName && (
          <p className="text-sm text-gray-500 mb-4">{bookmark.authorName}</p>
        )}

        {/* YouTube embed */}
        {youtubeId && (
          <div className="mb-6 aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              className="w-full h-full rounded-lg"
              allowFullScreen
            />
          </div>
        )}

        {/* Thumbnail (non-YouTube) */}
        {!isYouTube && bookmark.thumbnailUrl && (
          <img
            src={bookmark.thumbnailUrl}
            alt=""
            className="w-full max-h-64 object-cover rounded-lg mb-6"
          />
        )}

        {/* AI Summary */}
        {bookmark.aiSummary && (
          <div className="bg-purple-50 rounded-lg p-4 mb-6">
            <h3 className="text-xs font-medium text-purple-600 mb-1">
              AI 요약
            </h3>
            <p className="text-sm text-gray-700">{bookmark.aiSummary}</p>
          </div>
        )}

        {/* Content / Description */}
        {(bookmark.content || bookmark.description) && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">본문</h3>
            <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed max-h-96 overflow-y-auto">
              {bookmark.content || bookmark.description}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-6">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Original URL */}
        <a
          href={bookmark.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:underline block mb-6"
        >
          원본 보기 →
        </a>

        {/* User note */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">내 메모</h3>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="메모를 남겨보세요..."
            className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSaveNote}
            disabled={saving}
            className="mt-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 disabled:opacity-50"
          >
            {saving ? "저장 중..." : "메모 저장"}
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100">
          <button
            onClick={handleToggleFavorite}
            className={`text-sm px-3 py-1.5 rounded transition-colors ${
              bookmark.isFavorite
                ? "text-yellow-600 bg-yellow-50"
                : "text-gray-500 bg-gray-50 hover:bg-yellow-50"
            }`}
          >
            {bookmark.isFavorite ? "★ 즐겨찾기 해제" : "☆ 즐겨찾기"}
          </button>
          <button
            onClick={handleToggleRead}
            className="text-sm px-3 py-1.5 rounded bg-gray-50 text-gray-500 hover:bg-green-50 transition-colors"
          >
            {bookmark.isRead ? "읽지 않음으로 표시" : "읽음으로 표시"}
          </button>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="text-sm px-3 py-1.5 rounded bg-purple-50 text-purple-600 hover:bg-purple-100 disabled:opacity-50 transition-colors"
          >
            {analyzing ? "분석 중..." : "AI 다시 분석"}
          </button>
          <button
            onClick={handleDelete}
            className="text-sm px-3 py-1.5 rounded text-red-500 bg-gray-50 hover:bg-red-50 transition-colors ml-auto"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
