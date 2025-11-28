"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TreePreview } from "@/src/components/tree-preview";
import type { TreeDetail } from "@/src/lib/types";

type Props = {
  primaryTree: TreeDetail | null;
};

export function HomeHero({ primaryTree }: Props) {
  const router = useRouter();
  const [showGacha, setShowGacha] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showQuest, setShowQuest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [drawn, setDrawn] = useState<{ tempId: string; imageUrl: string } | null>(null);
  const [ornaments, setOrnaments] = useState(
    () => primaryTree?.ornaments ?? ([] as { slotIndex: number; imageUrl: string }[])
  );
  useEffect(() => {
    setOrnaments(primaryTree?.ornaments ?? []);
  }, [primaryTree]);
  const ownerLabel =
    primaryTree?.owner?.walletAddress?.slice(0, 6) ??
    primaryTree?.owner?.id?.slice(0, 6) ??
    "나";
  const ornamentCount = ornaments.length;

  const emptySlots = useMemo(() => {
    const filled = new Set(ornaments.map((o) => o.slotIndex));
    return Array.from({ length: 10 }, (_, i) => i).filter((i) => !filled.has(i));
  }, [ornaments]);

  const [slot, setSlot] = useState<number | null>(null);
  const selectedSlot = slot ?? emptySlots[0] ?? null;
  const [attendance, setAttendance] = useState(() =>
    Array.from({ length: 21 }, (_, i) => ({ day: i + 1, checked: i < 2 }))
  );
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const quests = [
    {
      id: "zeta-quiz",
      title: "ZetaChain 퀴즈",
      description: "ZetaChain의 강점이 아닌 것은? (3지선다)",
      reward: "+1 뽑기권",
    },
    {
      id: "partner-l2",
      title: "Partner L2 미션",
      description: "X 계정 팔로우 + 리트윗 인증",
      reward: "+1 뽑기권",
    },
    {
      id: "logo-ornament",
      title: "오너먼트 업로드 미션",
      description: "파트너 로고 오너먼트 업로드하고 트리에 달기",
      reward: "+2 뽑기권",
    },
  ];

  const playBoxSound = () => {
    try {
      const audio = new Audio("/box-click.mp3");
      void audio.play();
    } catch {
      // ignore sound errors
    }
  };

  const handleAttendanceCheck = () => {
    setAttendance((prev) => {
      const idx = prev.findIndex((d) => !d.checked);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], checked: true };
      return next;
    });
    setMessage("출석이 완료되었습니다!");
  };

  const ensureSlot = () => {
    if (selectedSlot === null) {
      setMessage("빈 슬롯을 선택하세요.");
      return false;
    }
    return true;
  };

  const moveSlot = (delta: number) => {
    if (emptySlots.length === 0) return;
    const currentIndex = selectedSlot !== null ? emptySlots.indexOf(selectedSlot) : 0;
    const nextIndex = Math.min(Math.max(currentIndex + delta, 0), emptySlots.length - 1);
    setSlot(emptySlots[nextIndex]);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) < 5) return;
    moveSlot(e.deltaY > 0 ? 1 : -1);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartY(e.touches[0]?.clientY ?? null);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartY === null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY;
    const diff = endY - touchStartY;
    if (Math.abs(diff) > 25) {
      moveSlot(diff > 0 ? 1 : -1);
    }
    setTouchStartY(null);
  };

  const requestWalletSignature = async () => {
    type EthereumProvider = {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
    const eth = (window as typeof window & { ethereum?: EthereumProvider }).ethereum;
    if (!eth) throw new Error("지갑이 감지되지 않았습니다 (MetaMask 등 설치 필요)");

    const accounts = await eth.request({ method: "eth_requestAccounts" });
    if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
      throw new Error("지갑 주소를 가져올 수 없습니다.");
    }
    const account = accounts[0];
    const signedMessage = `Zeta Ornament Gacha (${Date.now()})`;
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

  const handleDraw = async () => {
    if (!primaryTree) return;
    setMessage(null);
    setLoading(true);
    try {
      playBoxSound();
      const { account, signature, signedMessage } = await requestWalletSignature();
      const res = await fetch("/api/gacha/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account,
          signature,
          signedMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "뽑기에 실패했습니다.");
      const picked = data.ornaments?.[0];
      if (!picked) throw new Error("뽑기 결과가 없습니다.");
      setDrawn({
        tempId: picked.tempId ?? picked.ornamentId ?? "tmp",
        imageUrl: picked.imageUrl,
      });
      setMessage("오너먼트를 뽑았습니다! 슬롯을 선택해 달아주세요.");
      setShowGacha(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "오류가 발생했습니다.";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAttachDrawn = async () => {
    if (!primaryTree) return;
    if (!drawn) {
      setMessage("먼저 오너먼트를 뽑아주세요.");
      setShowGacha(true);
      return;
    }
    if (!ensureSlot()) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/trees/${primaryTree.id}/ornaments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotIndex: selectedSlot, type: "FREE_GACHA", imageUrl: drawn.imageUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string })?.error ?? "부착에 실패했습니다.");
      setMessage("트리에 오너먼트를 달았습니다!");
      setOrnaments((prev) => [...prev, { slotIndex: selectedSlot, imageUrl: drawn.imageUrl }]);
      setDrawn(null);
      setShowGacha(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "오류가 발생했습니다.";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-[32px] p-4 text-white shadow-xl"
      style={{
        backgroundImage: "url(/christmas-background.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* 분위기 오버레이 (밝은 강조) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-white/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.25),transparent_35%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_85%,rgba(255,255,255,0.18),transparent_45%)]" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(2px 2px at 15% 20%, rgba(255,255,255,0.7), transparent 50%), radial-gradient(2px 2px at 65% 35%, rgba(255,255,255,0.8), transparent 50%), radial-gradient(2px 2px at 35% 75%, rgba(255,255,255,0.7), transparent 50%), radial-gradient(2px 2px at 85% 55%, rgba(255,255,255,0.6), transparent 50%), radial-gradient(3px 3px at 50% 50%, rgba(255,255,255,0.5), transparent 60%)",
            backgroundRepeat: "no-repeat",
          }}
        />
      </div>

      {/* 상단바 */}
      <div className="relative z-10 flex items-center justify-between">
        <Link
          href="/me"
          className="flex items-center gap-2 rounded-full bg-black/20 px-3 py-2 text-sm font-semibold text-white shadow backdrop-blur"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full text-white font-bold shadow">
            👤
          </span>
          <div className="leading-tight">
            <p className="text-[11px] opacity-80">프로필</p>
            <p className="text-sm font-semibold">내 정보</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGacha(true)}
            className="flex items-center gap-3 rounded-full bg-white/95 px-4 py-3 text-base text-black font-semibold shadow-xl hover:-translate-y-[1px] hover:shadow-2xl transition"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-300 text-slate-900 text-lg font-bold shadow">
              🎁
            </span>
            <div className="flex flex-row leading-tight text-left">
              <span className="text-sm font-bold font-sans text-slate-900 mr-1">남은 횟수 :</span>
              <span className="text-sm font-bold font-sans text-slate-900">{ornamentCount}</span>
            </div>
          </button>
        </div>
      </div>

      {/* 타이틀 */}
      <div className="relative z-10 mt-4 text-center">
        <p className="font-christmas text-lg font-semibold tracking-wide text-white/90">{ownerLabel}의 트리</p>
        <h1 className="font-christmas text-6xl font-extrabold uppercase tracking-[0.14em] text-transparent bg-gradient-to-b from-white via-white to-purple-200 bg-clip-text drop-shadow-[0_12px_16px_rgba(120,0,160,0.35)]">
          Xmas Tree
        </h1>
      </div>

      {/* 메인 트리 영역 */}
      {primaryTree ? (
        <div className="relative z-10 mt-4 flex flex-col items-center gap-4">
          {/* 오른쪽 플로팅 아이콘: 출석체크 / 퀘스트 */}
          <div className="absolute right-0 top-32 z-20 flex flex-col gap-3 pr-1">
            <button
              type="button"
              onClick={() => setShowAttendance(true)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg text-emerald-600"
              aria-label="출석체크"
            >
              📅
            </button>
            <button
              type="button"
              onClick={() => setShowQuest(true)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg text-purple-700"
              aria-label="퀘스트"
            >
              📜
            </button>
          </div>

          <div className="relative w-full max-w-[360px]">
            <div className="rounded-[32px] bg-white/18 p-5 shadow-xl shadow-purple-900/30 backdrop-blur">
              <TreePreview
                treeId={primaryTree.id}
                background={primaryTree.background}
                shape={primaryTree.shape}
                likeCount={primaryTree.likeCount}
                liked={primaryTree.likedByCurrentUser}
                ornaments={primaryTree.ornaments.map((o) => ({
                  slotIndex: o.slotIndex,
                  imageUrl: o.imageUrl,
                }))}
              />
            </div>
          </div>

          <div className="flex w-full max-w-[360px] flex-col items-center gap-3 rounded-[28px] bg-gradient-to-b  px-4 py-6 shadow-lg backdrop-blur">
            {emptySlots.length === 0 ? (
              <div className="w-full rounded-2xl bg-white/15 px-4 py-3 text-center text-sm font-semibold text-white">
                빈 슬롯이 없습니다.
              </div>
            ) : (
              <div
                className="relative w-full overflow-hidden rounded-2xl bg-white/10 py-4"
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <div className="absolute inset-x-4 top-1/2 h-10 -translate-y-1/2 rounded-xl border border-white/30 bg-white/10" />
                <div className="flex flex-col items-center gap-2 py-4">
                  {emptySlots.map((s) => {
                    const idx = emptySlots.indexOf(selectedSlot ?? emptySlots[0]);
                    const myIdx = emptySlots.indexOf(s);
                    const dist = Math.abs(myIdx - idx);
                    const scale = dist === 0 ? 1 : dist === 1 ? 0.9 : 0.8;
                    const opacity = dist === 0 ? 1 : dist === 1 ? 0.75 : 0.5;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSlot(s)}
                        className={`w-full rounded-xl px-4 py-2 text-center text-base font-bold text-white transition`}
                        style={{
                          transform: `scale(${scale})`,
                          opacity,
                        }}
                      >
                        슬롯 {s + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleAttachDrawn}
              disabled={loading}
              className="w-full rounded-full bg-amber-300 px-6 py-4 text-center text-lg font-bold text-amber-900 shadow-[0_12px_0_rgba(0,0,0,0.18)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_0_rgba(0,0,0,0.2)] active:translate-y-0 active:shadow-[0_10px_0_rgba(0,0,0,0.16)] disabled:opacity-60"
            >
              오너먼트 달기
            </button>
            {message && <p className="text-center text-xs text-white/90">{message}</p>}
          </div>
        </div>
      ) : (
        <div className="relative z-10 mt-6 rounded-3xl border border-white/10 bg-white/10 p-4 text-white shadow-lg">
          <h2 className="text-xl font-bold">아직 트리가 없어요</h2>
          <p className="mt-2 text-sm text-white/90">
            트리를 만들고 친구에게 오너먼트를 부탁하세요. 출석 체크로 매일 1개씩 무료 오너먼트를 드립니다.
          </p>
          <Link
            href="/tree/new"
            className="mt-4 inline-flex rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-900 shadow"
          >
            🎄 트리 생성하기
          </Link>
        </div>
      )}

      {showGacha && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowGacha(false)}
        >
          <div
            className="modal-pop relative h-[70vh] w-[90vw] max-w-xl rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowGacha(false)}
              className="absolute right-4 top-4 text-sm font-semibold text-slate-500"
            >
              닫기
            </button>
            <div className="mt-4 flex h-full flex-col items-center justify-center gap-6 text-slate-900">
              {!drawn ? (
                <>
                  <Image
                    src="/giftbox.png"
                    alt="gift box"
                    width={340}
                    height={340}
                    className="h-64 w-64 object-contain"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={handleDraw}
                    disabled={loading}
                    className="inline-flex min-w-[240px] items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-400 px-8 py-4 text-2xl font-extrabold text-amber-900 shadow-[0_16px_0_rgba(0,0,0,0.18)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_18px_0_rgba(0,0,0,0.2)] active:translate-y-0 active:shadow-[0_14px_0_rgba(0,0,0,0.16)] disabled:opacity-60"
                  >
                    🎁 뽑기
                  </button>
                </>
              ) : (
                <div className="w-full max-w-sm text-center">
                  <p className="text-2xl font-christmas font-bold text-amber-800 pb-6">🎉 축하합니다!</p>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>뽑은 오너먼트</span>
                      <span className="text-slate-400">{drawn.tempId.slice(0, 6)}</span>
                    </div>
                  <div className="flex items-center justify-center">
                    <Image
                      src={drawn.imageUrl}
                      alt="drawn ornament"
                      width={260}
                      height={260}
                      className="max-h-64 rounded-xl object-contain drop-shadow-lg"
                      unoptimized
                    />
                  </div>
                  <div className="grid w-full grid-cols-2 gap-3 pt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setDrawn(null);
                        setShowGacha(false);
                      }}
                      className="w-full rounded-md border border-[#6b6153] bg-gradient-to-b from-[#7a6f60] to-[#5b5145] px-4 py-3 text-sm font-semibold text-[#f4e8d0] shadow-[0_6px_0_rgba(0,0,0,0.25)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_0_rgba(0,0,0,0.28)] active:translate-y-0 active:shadow-[0_6px_0_rgba(0,0,0,0.2)]"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleDraw}
                      disabled={loading}
                      className="w-full rounded-md border border-[#3d5f5d] bg-gradient-to-b from-[#4f8c89] to-[#3c6d6b] px-4 py-3 text-sm font-bold text-[#f2e8c6] shadow-[0_6px_0_rgba(0,0,0,0.25)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_0_rgba(0,0,0,0.28)] active:translate-y-0 active:shadow-[0_6px_0_rgba(0,0,0,0.2)] disabled:opacity-60"
                    >
                      다시 뽑기
                    </button>
                  </div>
                  </div>
                </div>
              )}
              {message && <p className="text-center text-xs text-slate-500">{message}</p>}
            </div>
          </div>
        </div>
      )}

      {showAttendance && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => {
            setShowAttendance(false);
            setMessage(null);
          }}
        >
          <div
            className="modal-pop relative w-[92vw] max-w-xl rounded-3xl bg-gradient-to-b from-amber-50 via-white to-pink-50 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setShowAttendance(false);
                setMessage(null);
              }}
              className="absolute right-4 top-4 text-sm font-semibold text-slate-500"
            >
              ✕
            </button>

            <div className="flex flex-col items-center gap-4 text-slate-900">
              <div className="flex flex-col items-center">
                <Image
                  src="/santa-check.png"
                  alt="출석 산타"
                  width={160}
                  height={160}
                  className="h-36 w-36 object-contain"
                  unoptimized
                />
                <div className="mt-3 rounded-full bg-gradient-to-r from-red-500 to-pink-500 px-5 py-1 text-sm font-bold text-white shadow">
                  출석 보상
                </div>
                <p className="mt-1 text-sm font-semibold text-amber-700">
                  누적 출석 {attendance.filter((d) => d.checked).length}일
                </p>
              </div>

              <div className="w-full rounded-3xl border border-amber-200 bg-white/90 p-4 shadow-inner">
                <div className="grid grid-cols-7 gap-2">
                  {attendance.map((d) => (
                    <div
                      key={d.day}
                      className={`flex h-10 w-full items-center justify-center rounded-lg border text-sm font-bold ${
                        d.checked
                          ? "border-amber-300 bg-amber-200 text-amber-800"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                    >
                      {d.day}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAttendanceCheck}
                className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-400 px-6 py-3 text-lg font-bold text-amber-900 shadow-[0_12px_0_rgba(0,0,0,0.18)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_0_rgba(0,0,0,0.2)] active:translate-y-0 active:shadow-[0_10px_0_rgba(0,0,0,0.16)]"
              >
                출석하기
              </button>
              {message && <p className="text-xs text-emerald-700">{message}</p>}
            </div>
          </div>
        </div>
      )}

      {showQuest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowQuest(false)}
        >
          <div
            className="modal-pop relative w-[92vw] max-w-xl rounded-3xl bg-gradient-to-b from-purple-50 via-white to-indigo-50 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowQuest(false)}
              className="absolute right-4 top-4 text-sm font-semibold text-slate-500"
            >
              ✕
            </button>
            <div className="flex flex-col items-center gap-4 text-slate-900">
              <div className="text-center space-y-1">
                <p className="text-xs uppercase font-semibold tracking-[0.2em] text-purple-500">Partner Quest</p>
                <p className="text-2xl font-christmas font-bold text-purple-800 drop-shadow-[0_4px_8px_rgba(128,0,255,0.25)]">
                  퀘스트 보드
                </p>
                <p className="text-sm text-slate-600">퀘스트를 완료하고 뽑기권을 받아보세요.</p>
              </div>
              <div className="w-full space-y-3">
                {quests.map((q) => (
                  <div
                    key={q.id}
                    className="space-y-2 rounded-2xl border border-purple-100 bg-white/90 p-4 shadow-inner"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{q.title}</p>
                        <p className="text-sm text-slate-600">{q.description}</p>
                      </div>
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                        {q.reward}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="w-full rounded-full bg-gradient-to-b from-amber-300 to-amber-400 px-4 py-2 text-sm font-bold text-amber-900 shadow-[0_8px_0_rgba(0,0,0,0.16)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_10px_0_rgba(0,0,0,0.18)] active:translate-y-0 active:shadow-[0_6px_0_rgba(0,0,0,0.14)]"
                      onClick={() => setMessage("퀘스트 검증/보상은 추후 연동 예정입니다.")}
                    >
                      완료하기
                    </button>
                  </div>
                ))}
              </div>
              {message && <p className="text-xs text-purple-700">{message}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
