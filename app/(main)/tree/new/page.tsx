"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function CreateTreePage() {
  const router = useRouter();
  const [bgIndex, setBgIndex] = useState(0);
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
  const handleNext = () =>
    setBgIndex((prev) => (prev + 1) % backgrounds.length);

  const requestWalletSignature = async () => {
    type EthereumProvider = {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
    };
    const eth = (window as typeof window & { ethereum?: EthereumProvider })
      .ethereum;
    if (!eth)
      throw new Error("지갑이 감지되지 않았습니다 (MetaMask 등 설치 필요)");

    const accounts = await eth.request({ method: "eth_requestAccounts" });
    if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
      throw new Error("지갑 주소를 가져올 수 없습니다.");
    }
    const account = accounts[0];

    const signedMessage = `Zeta Tree: 배경 ${
      selectedBg.id
    } 트리 민트 승인 (${Date.now()})`;
    const signatureResult = await eth.request({
      method: "personal_sign",
      params: [signedMessage, account],
    });
    if (typeof signatureResult !== "string") {
      throw new Error("지갑 서명에 실패했습니다.");
    }
    const signature = signatureResult;
    return { account, signature, signedMessage };
  };

  const handleCreate = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const { account, signature, signedMessage } =
        await requestWalletSignature();

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
      setCreatedTreeId(data.tree.id);
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      setShareUrl(`${origin}/?treeId=${data.tree.id}`);
      setMessage(
        "트리를 만들었어요! 이제 친구를 초대해 오너먼트를 받아보세요."
      );
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "에러가 발생했습니다.";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 pb-20 pt-6 text-white">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Create
        </p>
        <h1 className="text-xl font-semibold">내 크리스마스 트리 만들기</h1>
        <p className="text-sm text-slate-400">
          배경을 선택하고 트리를 생성하세요. 지갑 서명/결제 연동은 다음 단계에서
          연결됩니다.
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
                <Image
                  src="/tree.png"
                  alt="tree"
                  width={224}
                  height={224}
                  className="h-56 w-auto drop-shadow-[0_10px_25px_rgba(16,185,129,0.35)]"
                  priority
                  draggable={false}
                />
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
              <span className="text-xs text-emerald-300">
                Price {selectedBg.price}
              </span>
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
                  } catch (err: unknown) {
                    const msg =
                      err instanceof Error
                        ? err.message
                        : "복사에 실패했습니다.";
                    setShareMsg(msg);
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
