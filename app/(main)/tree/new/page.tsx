"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BgOption = { id: string; label: string; price: string };
const backgrounds: BgOption[] = [
  { id: "1", label: "Aurora Mint", price: "0.5 XMAS" },
  { id: "2", label: "Cosmic Blue", price: "0.5 XMAS" },
  { id: "3", label: "Crimson Night", price: "0.5 XMAS" },
  { id: "4", label: "Nordic Snow", price: "0.5 XMAS" },
  { id: "5", label: "Cyber Neon", price: "0.5 XMAS" },
  { id: "6", label: "Starry Sky", price: "0.5 XMAS" },
  { id: "7", label: "Frosted Lake", price: "0.5 XMAS" },
  { id: "8", label: "Twilight Pink", price: "0.5 XMAS" },
  { id: "9", label: "Shadow Pine", price: "0.5 XMAS" },
  { id: "10", label: "Candy Cane", price: "0.5 XMAS" },
];

const shapes = [
  { id: "classic", label: "Classic" },
  { id: "pixel", label: "Pixel" },
  { id: "cyber", label: "Cyber" },
];
const shapeFilters: Record<string, string> = {
  classic: "none",
  pixel: "saturate(1.4)",
  cyber: "hue-rotate(120deg) saturate(1.2)",
};

export default function CreateTreePage() {
  const router = useRouter();
  const [bgIndex, setBgIndex] = useState(0);
  const [shape, setShape] = useState(shapes[0].id);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [createdTreeId, setCreatedTreeId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const selectedBg = backgrounds[bgIndex];
  const previewSrc = useMemo(
    () => `/bg/bg-${selectedBg.id}.png`,
    [selectedBg.id]
  );

  const handlePrev = () =>
    setBgIndex((prev) => (prev - 1 + backgrounds.length) % backgrounds.length);
  const handleNext = () => setBgIndex((prev) => (prev + 1) % backgrounds.length);

  const handleCreate = async () => {
    setMessage(null);
    setLoading(true);
    try {
      await fetch("/api/auth/guest", { method: "POST" });
      const res = await fetch("/api/trees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ background: selectedBg.id, shape }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "트리 생성에 실패했습니다.");
      setCreatedTreeId(data.tree.id);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setShareUrl(`${origin}/?treeId=${data.tree.id}`);
      setMessage("트리를 만들었어요! 이제 친구를 초대해 오너먼트를 받아보세요.");
      router.refresh();
    } catch (err: any) {
      setMessage(err.message ?? "에러가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 pb-20 pt-6 text-white">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Create</p>
        <h1 className="text-xl font-semibold">내 크리스마스 트리 만들기</h1>
        <p className="text-sm text-slate-400">
          배경을 선택하고 트리를 생성하세요. 지갑 서명/결제 연동은 다음 단계에서 연결됩니다.
        </p>
      </header>

      <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-lg">
        <div className="relative mx-auto flex max-w-xs flex-col items-center">
          <div className="relative w-full overflow-hidden rounded-2xl bg-slate-900/60 shadow-inner">
            <div
              className="aspect-square w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${previewSrc})` }}
            >
              <div className="relative flex h-full items-center justify-center">
                <img
                  src="/tree.png"
                  alt="tree"
                  className="h-56 w-auto drop-shadow-[0_10px_25px_rgba(16,185,129,0.35)]"
                  style={{ filter: shapeFilters[shape] ?? "none" }}
                />
                <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-3 py-1 text-sm font-semibold text-white">
                  {shapes.find((s) => s.id === shape)?.label ?? shape}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex w-full items-center justify-between text-sm text-slate-300">
            <button
              onClick={handlePrev}
              className="rounded-lg border border-white/10 px-3 py-2"
            >
              ⬅️
            </button>
            <div className="flex flex-col items-center">
              <span className="text-white">{selectedBg.label}</span>
              <span className="text-xs text-emerald-300">Price {selectedBg.price}</span>
            </div>
            <button
              onClick={handleNext}
              className="rounded-lg border border-white/10 px-3 py-2"
            >
              ➡️
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-white">트리 모양</p>
          <div className="grid grid-cols-3 gap-2">
            {shapes.map((s) => (
              <button
                key={s.id}
                onClick={() => setShape(s.id)}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  shape === s.id
                    ? "border-emerald-300 bg-emerald-400/20 text-emerald-100"
                    : "border-white/10 bg-white/5 text-slate-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 text-center text-base font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 disabled:opacity-60"
          >
            {loading ? "만드는 중..." : "🎄 이 배경으로 트리 만들기"}
          </button>
          {createdTreeId && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Link
                  href={`/tree/${createdTreeId}`}
                  className="flex-1 rounded-xl border border-emerald-300/60 bg-emerald-400/10 px-4 py-3 text-center text-sm font-semibold text-emerald-100"
                >
                  내 트리 보기
                </Link>
                <Link
                  href="/"
                  className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  홈으로
                </Link>
              </div>
              <button
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white"
                onClick={async () => {
                  if (!shareUrl) return;
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    setShareMsg("링크를 클립보드에 복사했어요.");
                  } catch (err: any) {
                    setShareMsg(err?.message ?? "복사에 실패했습니다.");
                  }
                }}
              >
                링크 복사해서 친구에게 보내기
              </button>
              {shareMsg && (
                <div className="rounded-lg border border-white/10 bg-white/[0.05] p-2 text-xs text-slate-200">
                  {shareMsg}
                </div>
              )}
            </div>
          )}
        </div>

        {message && (
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-3 text-sm text-slate-200">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
