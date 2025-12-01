"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useVolr, useVolrModal } from "@volr/react-ui";

type BgOption = { id: string; label: string; price: string };
const backgrounds: BgOption[] = [
  { id: "1", label: "Aurora Mint", price: "0.5 zmas" },
  { id: "2", label: "Cosmic Blue", price: "0.5 zmas" },
  { id: "3", label: "Crimson Night", price: "0.5 zmas" },
  { id: "4", label: "Nordic Snow", price: "0.5 zmas" },
  { id: "5", label: "Cyber Neon", price: "0.5 zmas" },
  { id: "6", label: "Starry Sky", price: "0.5 zmas" },
  { id: "7", label: "Frosted Lake", price: "0.5 zmas" },
  { id: "8", label: "Twilight Pink", price: "0.5 zmas" },
  { id: "9", label: "Shadow Pine", price: "0.5 zmas" },
  { id: "10", label: "Candy Cane", price: "0.5 zmas" },
];

const DEFAULT_SHAPE = "classic";

type Slide = { src: string; text: string };
const slides: Slide[] = [
  { src: "/home/santa-loading1.png", text: "산타가 열심히 리스트를 읽고 있습니다" },
  { src: "/home/santa-loading2.png", text: "루돌프가 산타 몰래 리스트를 먹고 있습니다!!" },
  { src: "/home/santa-loading3.png", text: "산타가 루돌프를 혼내고 돌아오겠네요! 곧 끝납니다" },
];

export function CreateTreeModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { evm, evmAddress, isLoggedIn } = useVolr();
  const { open: openVolrModal } = useVolrModal();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [bgIndex, setBgIndex] = useState(0);

  const selectedBg = backgrounds[bgIndex];
  const previewSrc = useMemo(() => `/bg/bg-${selectedBg.id}.png`, [selectedBg.id]);

  const currentSlide = slides[Math.min(slideIndex, slides.length - 1)];

  useEffect(() => {
    if (!loading) {
      setSlideIndex(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    // 4초마다 다음 슬라이드, 최대 3번째(인덱스 2)에서 멈춤
    timerRef.current = setInterval(() => {
      setSlideIndex((prev) => Math.min(prev + 1, slides.length - 1));
    }, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading]);

  const requestVolrSignature = async () => {
    if (!isLoggedIn || !evm) {
      openVolrModal?.();
      throw new Error("로그인 후 다시 시도해주세요.");
    }
    const account = evmAddress;
    const signMessage = evm(5115)?.signMessage;
    if (!signMessage || !account) {
      openVolrModal?.();
      throw new Error("로그인 후 다시 시도해주세요.");
    }
    const signedMessage = `Zeta Tree: 트리 민트 승인 (${Date.now()})`;
    const signature = await signMessage({ message: signedMessage });
    return { account, signature, signedMessage };
  };

  const handleCreate = async () => {
    setMessage(null);
    setLoading(true);
    setSlideIndex(0); // 서명 시작 시 로딩 슬라이드 시작
    try {
      const { account, signature, signedMessage } = await requestVolrSignature();
      await fetch("/api/auth/guest", { method: "POST" });
      const res = await fetch("/api/trees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          background: selectedBg.id,
          shape: DEFAULT_SHAPE,
          walletAddress: account,
          signature,
          signedMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "트리 생성에 실패했습니다.");
      const newTreeId = data?.tree?.id as string | undefined;
      if (!newTreeId) throw new Error("생성된 트리 ID를 확인할 수 없습니다.");
      onClose();
      router.push(`/tree/${newTreeId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "에러가 발생했습니다.";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="modal-pop relative w-[90vw] max-w-xl rounded-3xl bg-white p-6 text-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-sm font-semibold text-slate-500"
        >
          ✕
        </button>

        {!loading ? (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">트리 만들기</h3>
            <p className="text-sm text-slate-600">
              배경을 고르고 지갑 서명만 하면 바로 트리가 생성됩니다. 홈에서 즉시 이어서 꾸밀 수 있어요.
            </p>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="relative mx-auto flex max-w-xs flex-col items-center">
                <div className="relative w-full overflow-hidden rounded-2xl bg-slate-900/60 shadow-inner">
                  <div
                    className="aspect-square w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${previewSrc})` }}
                  >
                    <div className="relative flex h-full items-center justify-center">
                      <Image
                        src="/tree.png"
                        alt="tree preview"
                        width={224}
                        height={224}
                        className="h-56 w-auto drop-shadow-[0_10px_25px_rgba(16,185,129,0.35)]"
                        priority
                        draggable={false}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex w-full items-center justify-between text-sm text-slate-600">
                  <button
                    onClick={() =>
                      setBgIndex((prev) => (prev - 1 + backgrounds.length) % backgrounds.length)
                    }
                    className="rounded-lg border border-white/10 bg-white px-3 py-2 shadow-sm"
                  >
                    ⬅️
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-slate-900">{selectedBg.label}</span>
                    <span className="text-xs text-emerald-500">Price {selectedBg.price}</span>
                  </div>
                  <button
                    onClick={() => setBgIndex((prev) => (prev + 1) % backgrounds.length)}
                    className="rounded-lg border border-white/10 bg-white px-3 py-2 shadow-sm"
                  >
                    ➡️
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 text-center text-base font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 disabled:opacity-60"
            >
              {loading ? "만드는 중..." : "🎄 트리 만들기"}
            </button>
            {message && (
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                {message}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-inner">
              <div className="relative mx-auto flex flex-col items-center gap-3 p-4 text-center">
                <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-xl bg-white">
                  <Image
                    src={currentSlide.src}
                    alt="산타 로딩"
                    fill
                    sizes="300px"
                    className="object-contain"
                    priority
                  />
                </div>
                <p className="text-base font-semibold text-slate-900">{currentSlide.text}</p>
              </div>
            </div>
            {message && (
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                {message}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
