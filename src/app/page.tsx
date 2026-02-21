"use client";

import { useState, useEffect, useCallback } from "react";
import type { Bookmark } from "@prisma/client";
import BookmarkCard from "@/components/BookmarkCard";
import AddBookmarkForm from "@/components/AddBookmarkForm";
import FilterBar from "@/components/FilterBar";

interface BookmarkResponse {
  bookmarks: Bookmark[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function HomePage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [platform, setPlatform] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchBookmarks = useCallback(
    async (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (platform) params.set("platform", platform);
      if (favoriteOnly) params.set("isFavorite", "true");
      if (searchDebounced) params.set("search", searchDebounced);

      try {
        const res = await fetch(`/api/bookmarks?${params}`);
        const data: BookmarkResponse = await res.json();
        setBookmarks(data.bookmarks);
        setPagination({
          page: data.pagination.page,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        });
      } catch (err) {
        console.error("Failed to fetch bookmarks:", err);
      } finally {
        setLoading(false);
      }
    },
    [platform, favoriteOnly, searchDebounced]
  );

  useEffect(() => {
    fetchBookmarks(1);
  }, [fetchBookmarks]);

  async function handleToggleFavorite(id: string, current: boolean) {
    await fetch(`/api/bookmarks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !current }),
    });
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isFavorite: !current } : b))
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("이 북마크를 삭제할까요?")) return;
    await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Binder</h1>
        <p className="text-sm text-gray-500">
          AI 슈퍼 북마크 · {pagination.total}개 저장됨
        </p>
      </header>

      {/* Add bookmark form */}
      <div className="mb-6">
        <AddBookmarkForm onAdded={() => fetchBookmarks(1)} />
      </div>

      {/* Filters */}
      <div className="mb-6">
        <FilterBar
          platform={platform}
          onPlatformChange={setPlatform}
          favoriteOnly={favoriteOnly}
          onFavoriteToggle={() => setFavoriteOnly(!favoriteOnly)}
          search={search}
          onSearchChange={setSearch}
        />
      </div>

      {/* Bookmark list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-2">저장된 북마크가 없습니다</p>
          <p className="text-sm text-gray-400">
            위에서 URL을 입력해 첫 북마크를 추가해보세요
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((bookmark) => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => fetchBookmarks(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50"
          >
            ← 이전
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-500">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchBookmarks(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50"
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  );
}
