export type Platform = "YOUTUBE" | "TWITTER" | "INSTAGRAM" | "WEB" | "OTHER";

export interface BookmarkListParams {
  page?: number;
  limit?: number;
  platform?: Platform;
  category?: string;
  tag?: string;
  isFavorite?: boolean;
  isRead?: boolean;
  search?: string;
}
