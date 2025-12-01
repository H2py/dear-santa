"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useVolr } from "@volr/react-ui"; // re-exports core useVolr
import { useVolrModal } from "@volr/react-ui";
import { encodeFunctionData } from "viem";

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
const CHAIN_ID = 5115; // Volr 기본 체인 (필요 시 수정)

type Slide = { src: string; text: string };
const slides: Slide[] = [
  { src: "/home/santa-loading1.png", text: "산타가 열심히 리스트를 읽고 있습니다" },
  { src: "/home/santa-loading2.png", text: "루돌프가 산타 몰래 리스트를 먹고 있습니다!!" },
  { src: "/home/santa-loading3.png", text: "산타가 루돌프를 혼내고 돌아오겠네요! 곧 끝납니다" },
];

const TREE_PERMIT_ABI = [
  {
    type: "function",
    name: "mintWithSignature",
    inputs: [
      {
        name: "permit",
        type: "tuple",
        components: [
          { name: "to", type: "address" },
          { name: "treeId", type: "uint256" },
          { name: "backgroundId", type: "uint256" },
          { name: "uri", type: "string" },
          { name: "deadline", type: "uint256" },
          { name: "nonce", type: "uint256" },
        ],
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export function CreateTreeModal({
  onClose,
  onRequirePasskey,
}: {
  onClose: () => void;
  onRequirePasskey: () => void;
}) {
  const router = useRouter();
  const volr = useVolr();
  const { open: openVolrModal } = useVolrModal();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [successTreeId, setSuccessTreeId] = useState<string | null>(null);
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
    timerRef.current = setInterval(() => {
      setSlideIndex((prev) => Math.min(prev + 1, slides.length - 1));
    }, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading]);

  const ensureGuestSession = useCallback(async () => {
    try {
      await fetch("/api/auth/guest", { method: "POST", cache: "no-store", credentials: "include" });
    } catch {
      // ignore
    }
  }, []);

  const requestVolrSignature = async () => {
    if (!volr) {
      return;
    }
    const account = volr.evmAddress;
    const sendBatch = volr.evm(CHAIN_ID).sendBatch;

    console.log("[tree-create] signer check", {
      account,
      hasSend: !!sendBatch,
    });
 
    return { account };
  };

  const handleCreate = async () => {
    setMessage(null);
    setLoading(true);
    setSlideIndex(0);
    try {
      await ensureGuestSession();
      
      const res = await fetch("/api/trees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          background: selectedBg.id,
          shape: DEFAULT_SHAPE,
        }),
      });
      const data = await res.json();
      console.log("[tree-create] /api/trees response", res.status, data);
      if (!res.ok) {
        throw new Error(data?.error ?? `트리 생성에 실패했습니다. (status ${res.status})`);
      }
      const newTreeId = data?.tree?.id as string | undefined;
      const permit = data?.permit;
      const permitSig = data?.signature as string | undefined;
      const contractAddress = data?.contractAddress as string | undefined;
      if (!newTreeId) throw new Error("생성된 트리 ID를 확인할 수 없습니다.");
      // 지갑에서 직접 트랜잭션 실행 (mintWithSignature)
      if (permit && permitSig && contractAddress) {
        const wallet = (volr as any)?.evm?.(CHAIN_ID);
        const sendTransaction = wallet?.sendTransaction;
        if (!sendTransaction) {
          setMessage("지갑 트랜잭션 모듈을 불러오지 못했습니다. 다시 로그인 후 재시도해주세요.");
        } else {
          const dataField = encodeFunctionData({
            abi: TREE_PERMIT_ABI,
            functionName: "mintWithSignature",
            args: [permit, permitSig],
          });
          await sendTransaction({ to: contractAddress, data: dataField });
        }
      }
      setSuccessTreeId(newTreeId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "에러가 발생했습니다.";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
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

        {successTreeId ? (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-emerald-800">트리가 생성되었습니다!</h3>
            <p className="text-sm text-slate-700">ID: {successTreeId}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onClose();
                  router.push(`/tree/${successTreeId}`);
                }}
                className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-center text-base font-semibold text-white shadow-lg shadow-emerald-500/30"
              >
                트리 보러가기
              </button>
              <button
                onClick={() => {
                  setSuccessTreeId(null);
                  onClose();
                }}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                닫기
              </button>
            </div>
          </div>
        ) : !loading ? (
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
                    onClick={() => setBgIndex((prev) => (prev - 1 + backgrounds.length) % backgrounds.length)}
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
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 space-y-2">
                <p>{message}</p>
                <button
                  type="button"
                  onClick={() => {
                    onRequirePasskey();
                    openVolrModal?.();
                  }}
                  className="w-full rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                >
                  지갑 연결/패스키 확인하기
                </button>
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
