"use client";

import { useState } from "react";

export function ShareActions({ url }: { url: string }) {
  const [message, setMessage] = useState<string | null>(null);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("링크를 클립보드에 복사했어요.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "복사에 실패했어요.";
      setMessage(msg);
    }
  };

  const webShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) {
      setMessage("공유 API를 사용할 수 없어요. 링크 복사를 이용해 주세요.");
      return;
    }
    try {
      await navigator.share({ url, text: "내 크리스마스 트리를 꾸며줘!" });
    } catch {
      // 사용자 취소 등은 무시
    }
  };

  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200">
      <p className="font-semibold text-white">친구에게 공유하기</p>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={copyLink}
            className="rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2 text-center text-sm font-semibold"
          >
            링크 복사
          </button>
          <button
            onClick={webShare}
            className="rounded-lg border border-emerald-300/50 bg-emerald-400/20 px-3 py-2 text-center text-sm font-semibold text-emerald-200"
          >
            공유하기
          </button>
        </div>
      </div>
      {message && (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-xs text-slate-300">
          {message}
        </div>
      )}
    </div>
  );
}
