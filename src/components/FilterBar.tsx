"use client";

const PLATFORMS = [
  { value: "", label: "전체" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "TWITTER", label: "Twitter" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "WEB", label: "Web" },
];

interface FilterBarProps {
  platform: string;
  onPlatformChange: (platform: string) => void;
  favoriteOnly: boolean;
  onFavoriteToggle: () => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export default function FilterBar({
  platform,
  onPlatformChange,
  favoriteOnly,
  onFavoriteToggle,
  search,
  onSearchChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="검색..."
        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
      />

      {/* Platform filter */}
      <div className="flex gap-1">
        {PLATFORMS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPlatformChange(p.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              platform === p.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Favorite toggle */}
      <button
        onClick={onFavoriteToggle}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          favoriteOnly
            ? "bg-yellow-100 text-yellow-700"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        {favoriteOnly ? "★ 즐겨찾기만" : "☆ 즐겨찾기"}
      </button>
    </div>
  );
}
