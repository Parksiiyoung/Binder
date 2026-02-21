"use client";

import { useState } from "react";
import Link from "next/link";
import type { Bookmark } from "@prisma/client";
import PlatformBadge from "./PlatformIcon";

interface BookmarkCardProps {
  bookmark: Bookmark;
  onToggleFavorite: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  onUpdated: (bookmark: Bookmark) => void;
}

export default function BookmarkCard({
  bookmark,
  onToggleFavorite,
  onDelete,
  onUpdated,
}: BookmarkCardProps) {
  const [analyzing, setAnalyzing] = useState(false);

  const displayTitle =
    bookmark.aiTitle || bookmark.title || bookmark.originalUrl;
  const displaySummary = bookmark.aiSummary || bookmark.description;
  let tags: string[] = [];
  try {
    tags = bookmark.aiTags ? JSON.parse(bookmark.aiTags) : [];
  } catch { /* ignore malformed JSON */ }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/ai/process/${bookmark.id}`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.bookmark);
      }
    } catch (err) {
      console.error("AI analysis failed:", err);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Platform badge + category + date */}
          <div className="flex items-center gap-2 mb-2">
            <PlatformBadge platform={bookmark.platform} />
            {bookmark.aiCategory && (
              <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                {bookmark.aiCategory}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {new Date(bookmark.createdAt).toLocaleDateString("ko-KR")}
            </span>
          </div>

          {/* Title */}
          <Link href={`/bookmarks/${bookmark.id}`}>
            <h3 className="font-semibold text-gray-900 mb-1 truncate hover:text-blue-600 transition-colors">
              {displayTitle}
            </h3>
          </Link>

          {/* Author */}
          {bookmark.authorName && (
            <p className="text-xs text-gray-400 mb-1">
              {bookmark.authorName}
            </p>
          )}

          {/* Summary */}
          {displaySummary && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {displaySummary}
            </p>
          )}

          {/* URL */}
          <a
            href={bookmark.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline truncate block"
          >
            {bookmark.originalUrl}
          </a>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
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
        </div>

        {/* Thumbnail */}
        {bookmark.thumbnailUrl && (
          <img
            src={bookmark.thumbnailUrl}
            alt=""
            className="w-24 h-16 object-cover rounded flex-shrink-0"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={() => onToggleFavorite(bookmark.id, bookmark.isFavorite)}
          className={`text-sm px-2 py-1 rounded transition-colors ${
            bookmark.isFavorite
              ? "text-yellow-600 bg-yellow-50 hover:bg-yellow-100"
              : "text-gray-400 hover:text-yellow-600 hover:bg-yellow-50"
          }`}
        >
          {bookmark.isFavorite ? "★ 즐겨찾기" : "☆ 즐겨찾기"}
        </button>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="text-sm text-gray-400 hover:text-purple-600 px-2 py-1 rounded hover:bg-purple-50 transition-colors disabled:opacity-50"
        >
          {analyzing
            ? "분석 중..."
            : bookmark.aiProcessed
              ? "다시 분석"
              : "AI 분석"}
        </button>
        <button
          onClick={() => onDelete(bookmark.id)}
          className="text-sm text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors ml-auto"
        >
          삭제
        </button>
      </div>
    </div>
  );
}
