"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SettingsContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const error = searchParams.get("error");

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    synced?: number;
    skipped?: number;
    error?: string;
  } | null>(null);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/sync/threads", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setSyncResult({ error: data.error });
      } else {
        setSyncResult({ synced: data.synced, skipped: data.skipped });
      }
    } catch {
      setSyncResult({ error: "네트워크 오류가 발생했습니다." });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      {/* Status messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          Threads 계정이 성공적으로 연동되었습니다!
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          연동 오류: {error}
        </div>
      )}

      {/* Threads Integration */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Threads 연동</h2>
        <p className="text-sm text-gray-600 mb-4">
          Threads 계정을 연동하면 공유한 링크가 자동으로 Binder에 저장됩니다.
        </p>

        <div className="flex flex-col gap-3">
          <a
            href="/api/auth/threads"
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors w-fit"
          >
            Threads 계정 연동하기
          </a>

          <div className="pt-3 border-t border-gray-100">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {syncing ? "동기화 중..." : "지금 동기화"}
            </button>

            {syncResult && (
              <div className="mt-3 text-sm">
                {syncResult.error ? (
                  <p className="text-red-600">{syncResult.error}</p>
                ) : (
                  <p className="text-green-600">
                    {syncResult.synced}개 새 북마크 저장됨 (
                    {syncResult.skipped}개 건너뜀)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Info */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">사용 방법</h2>
        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>
            모바일에서 유튜브, 인스타, 트위터 등의 콘텐츠를 Threads에 공유
          </li>
          <li>설정 페이지에서 &quot;지금 동기화&quot; 클릭</li>
          <li>Binder가 URL을 자동 추출하고 콘텐츠 정보를 가져옴</li>
          <li>홈 화면에서 정리된 북마크 확인</li>
        </ol>
      </section>
    </>
  );
}

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← 홈
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
      </div>

      <Suspense
        fallback={<div className="text-gray-400 text-sm">불러오는 중...</div>}
      >
        <SettingsContent />
      </Suspense>
    </div>
  );
}
