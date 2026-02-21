import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Binder - AI 슈퍼 북마크",
  description: "Threads로 수집하고, AI가 정리하는 나만의 북마크 앱",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body>
    </html>
  );
}
