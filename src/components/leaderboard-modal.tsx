"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { TreeSummary } from "@/src/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function LeaderboardModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trees, setTrees] = useState<TreeSummary[]>([]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/leaderboard?limit=10", { cache: "no-store" });
        if (!res.ok) throw new Error("리더보드를 불러오지 못했습니다.");
        const data = await res.json();
        setTrees((data?.trees as TreeSummary[]) ?? []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "로드 실패";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative h-[85vh] w-[92vw] max-w-4xl overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white shadow"
        >
          닫기
        </button>

        <div className="h-full overflow-y-auto px-5 pb-6 pt-12">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Leaderboard</p>
              <h2 className="text-xl font-bold">상위 트리</h2>
              <p className="text-sm text-slate-400">상위 10개만 빠르게 확인하세요.</p>
            </div>
            <Link
              href="/leaderboard"
              className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-900 shadow hover:-translate-y-[1px] hover:shadow-md transition"
            >
              전체 보기 →
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {loading && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                불러오는 중...
              </div>
            )}
            {error && (
              <div className="rounded-2xl border border-rose-200/60 bg-rose-100/20 p-4 text-sm text-rose-200">
                {error}
              </div>
            )}
            {!loading &&
              !error &&
              trees.map((t, idx) => (
                <Link
                  key={t.id}
                  href={`/tree/${t.id}`}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm hover:border-emerald-300/60"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/20 text-base font-bold text-emerald-200">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-white">트리 {t.id.slice(0, 6)}</p>
                      <p className="text-xs text-slate-400">
                        {t.status === "COMPLETED" ? "완성" : "진행중"} · ❤️ {t.likeCount}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Image
                      src="/tree.png"
                      alt="tree"
                      width={48}
                      height={48}
                      className="h-12 w-auto drop-shadow-[0_8px_18px_rgba(16,185,129,0.3)]"
                      priority
                    />
                    <span className="text-xs text-emerald-300 underline underline-offset-2">보기</span>
                  </div>
                </Link>
              ))}
            {!loading && !error && trees.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                리더보드에 표시할 트리가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
