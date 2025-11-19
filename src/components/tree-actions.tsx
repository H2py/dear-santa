"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrnamentType } from "@/src/lib/types";

type OrnamentSummary = {
  slotIndex: number;
};

type Props = {
  treeId: string;
  ornaments: OrnamentSummary[];
  canLike: boolean;
  likeCount: number;
};

type Drawn = {
  tempId: string;
  imageUrl: string;
};

const MAX_SLOTS = 10;

export function TreeActions({ treeId, ornaments, canLike, likeCount }: Props) {
  const router = useRouter();
  const [tickets, setTickets] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [drawn, setDrawn] = useState<Drawn | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [uploadUrl, setUploadUrl] = useState("");
  const [liked, setLiked] = useState<boolean>(!canLike);
  const [localLikeCount, setLocalLikeCount] = useState<number>(likeCount);

  const emptySlots = useMemo(() => {
    const filled = new Set(ornaments.map((o) => o.slotIndex));
    const empties = Array.from({ length: MAX_SLOTS }, (_, i) => i).filter(
      (i) => !filled.has(i)
    );
    return empties;
  }, [ornaments]);

  useEffect(() => {
    setSlot(emptySlots[0] ?? null);
  }, [emptySlots]);

  useEffect(() => {
    // fetch my info to show remaining tickets
    fetch("/api/me", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => setTickets(data.user.gachaTickets))
      .catch(() => setTickets(null));
  }, []);

  const ensureSlot = () => {
    if (slot === null) {
      setMessage("빈 슬롯을 선택하세요.");
      return false;
    }
    return true;
  };

  const attachOrnament = async ({
    slotIndex,
    type,
    imageUrl,
  }: {
    slotIndex: number;
    type: OrnamentType;
    imageUrl: string;
  }) => {
    const res = await fetch(`/api/trees/${treeId}/ornaments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotIndex, type, imageUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "부착에 실패했습니다.");
  };

  const handleDraw = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/gacha/draw", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "뽑기에 실패했습니다.");
      setDrawn(data.ornaments[0]);
      setTickets(data.remainingTickets ?? null);
      setMessage("오너먼트를 뽑았어요! 슬롯을 선택해 달아주세요.");
    } catch (err: any) {
      setMessage(err.message ?? "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleAttachDrawn = async () => {
    if (!drawn) return setMessage("먼저 오너먼트를 뽑아주세요.");
    if (!ensureSlot()) return;
    setLoading(true);
    setMessage(null);
    try {
      await attachOrnament({
        slotIndex: slot!,
        type: "FREE_GACHA",
        imageUrl: drawn.imageUrl,
      });
      setMessage("오너먼트를 달았어요!");
      setDrawn(null);
      router.refresh();
    } catch (err: any) {
      setMessage(err.message ?? "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handlePremium = async () => {
    if (!ensureSlot()) return;
    if (!uploadUrl.trim()) {
      setMessage("이미지 URL을 입력하세요.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const payRes = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentType: "PREMIUM_UPLOAD",
          metadata: { treeId, slotIndex: slot },
        }),
      });
      if (!payRes.ok) {
        const err = await payRes.json().catch(() => ({}));
        throw new Error(err?.error ?? "결제 실패");
      }
      await attachOrnament({
        slotIndex: slot!,
        type: "PAID_UPLOAD",
        imageUrl: uploadUrl.trim(),
      });
      setMessage("프리미엄 오너먼트를 달았습니다!");
      setUploadUrl("");
      router.refresh();
    } catch (err: any) {
      setMessage(err.message ?? "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (liked) return;
    setLiked(true);
    setLocalLikeCount((c) => c + 1);
    setMessage(null);
    try {
      const res = await fetch(`/api/trees/${treeId}/like`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "좋아요에 실패했습니다.");
      }
    } catch (err: any) {
      // rollback on failure
      setLiked(false);
      setLocalLikeCount((c) => Math.max(0, c - 1));
      setMessage(err.message ?? "오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-white">무료 가챠</p>
        </div>
        <button
          onClick={handleDraw}
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-pink-400 to-violet-400 px-4 py-3 text-center text-base font-semibold text-slate-900 shadow disabled:opacity-60"
        >
          🎁 오너먼트 뽑기
        </button>
        {drawn && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-200">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-white">뽑은 오너먼트</p>
            <span className="text-xs text-slate-400">{drawn.tempId.slice(0, 6)}</span>
          </div>
          <div className="flex items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-900/70 px-2 py-3">
            <img
              src={drawn.imageUrl}
              alt="ornament"
              className="max-h-40 w-full object-contain sm:max-h-56"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-300">슬롯</label>
            <select
              value={slot ?? ""}
              onChange={(e) => setSlot(Number(e.target.value))}
                className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
              >
                {emptySlots.map((s) => (
                  <option key={s} value={s}>
                    슬롯 {s + 1}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAttachDrawn}
              disabled={loading || slot === null}
              className="w-full rounded-lg border border-emerald-300/50 bg-emerald-400/20 px-3 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-60"
            >
              트리에 달기
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-white">이미지 업로드</p>
        </div>
        <input
          value={uploadUrl}
          onChange={(e) => setUploadUrl(e.target.value)}
          placeholder="이미지 URL을 붙여넣으세요"
          className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
        />
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <select
            value={slot ?? ""}
            onChange={(e) => setSlot(Number(e.target.value))}
            className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-white"
          >
            {emptySlots.map((s) => (
              <option key={s} value={s}>
                슬롯 {s + 1}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handlePremium}
          disabled={loading}
          className="w-full rounded-lg border border-amber-300/60 bg-amber-400/15 px-3 py-2 text-sm font-semibold text-amber-100 disabled:opacity-60"
        >
          보내기
        </button>
      </div>

      {canLike && !liked && (
        <button
          onClick={handleLike}
          disabled={loading}
          className="w-full rounded-xl border border-white/10 px-4 py-3 text-center text-base font-semibold text-white disabled:opacity-60"
        >
          ❤️ 좋아요
        </button>
      )}

      {message && (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-200">
          {message}
        </div>
      )}
    </div>
  );
}
