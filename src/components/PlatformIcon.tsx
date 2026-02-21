"use client";

const PLATFORM_CONFIG: Record<string, { label: string; color: string }> = {
  YOUTUBE: { label: "YouTube", color: "bg-red-100 text-red-700" },
  TWITTER: { label: "Twitter", color: "bg-sky-100 text-sky-700" },
  INSTAGRAM: { label: "Instagram", color: "bg-pink-100 text-pink-700" },
  WEB: { label: "Web", color: "bg-gray-100 text-gray-700" },
  OTHER: { label: "기타", color: "bg-gray-100 text-gray-500" },
};

export default function PlatformBadge({ platform }: { platform: string }) {
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.OTHER;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}
